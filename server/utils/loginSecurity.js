/**
 * 🛡️ Login Security Service
 * Tracks failed admin login attempts in MongoDB (persists across Render sleeps).
 *
 * Flow (defaults, admin-configurable via /api/admin/login-security/config):
 *   Attempts 1–(warningThreshold-1)  → normal warnings
 *   Attempts warningThreshold–(maxAttempts-1) → "X attempts left" warning
 *   Attempt maxAttempts  → Account LOCKED + WhatsApp alert
 *   After lock  → Must wait for cooldown; further attempts rejected
 *
 * Config is read from DB (Setting collection) with in-memory cache.
 * Falls back to defaults if DB unavailable.
 */

const whatsappService = require('./whatsappService');

// Default config (used if DB has no setting, or DB unavailable)
const DEFAULT_CONFIG = {
  maxAttempts: 5,             // Total attempts allowed before lock
  warningThreshold: 3,        // When to start showing "warning" level
  lockDurationMinutes: 30,    // How long account stays locked
  whatsappSoftAlert: true,    // Send WhatsApp ping on warning threshold
  whatsappHardAlert: true,    // Send WhatsApp alert on lock
};

// Config cache (refreshed every 60 seconds or on explicit refresh)
let cachedConfig = null;
let cachedAt = 0;
const CONFIG_CACHE_TTL_MS = 60 * 1000;

// Setting model — set from server.js via setSettingModel()
let SettingModel = null;
function setSettingModel(model) {
  SettingModel = model;
}

// Will be initialised from server.js (mongoose model)
let LoginAttempt;

function setLoginAttemptModel(model) {
  LoginAttempt = model;
}

/**
 * Get a stable key for the attempted login (username + normalised IP).
 */
function buildAttemptKey(username, ip) {
  const cleanUser = (username || 'unknown').toLowerCase().trim();
  const cleanIp = (ip || 'unknown').replace(/[:.]/g, '-'); // ipv6 safe
  return `${cleanUser}__${cleanIp}`;
}

/**
 * Get client IP (handle proxy / x-forwarded-for).
 */
function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Get short user-agent string for logs / alerts.
 */
function getUserAgentSummary(req) {
  const ua = req.headers['user-agent'] || '';
  if (!ua) return 'unknown';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Other';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown';
  return `${browser}/${os}`;
}

/**
 * Read config from DB (Setting collection) with in-memory cache.
 * Falls back to defaults if DB unavailable.
 */
async function getConfig() {
  // Return cache if fresh
  if (cachedConfig && (Date.now() - cachedAt) < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  if (!SettingModel) {
    cachedConfig = DEFAULT_CONFIG;
    cachedAt = Date.now();
    return cachedConfig;
  }

  try {
    const doc = await SettingModel.findOne({ key: 'global' }).lean();
    if (doc && doc.loginSecurityConfig) {
      // Merge with defaults to ensure all fields exist
      cachedConfig = {
        maxAttempts: Number(doc.loginSecurityConfig.maxAttempts) || DEFAULT_CONFIG.maxAttempts,
        warningThreshold: Number(doc.loginSecurityConfig.warningThreshold) || DEFAULT_CONFIG.warningThreshold,
        lockDurationMinutes: Number(doc.loginSecurityConfig.lockDurationMinutes) || DEFAULT_CONFIG.lockDurationMinutes,
        whatsappSoftAlert: doc.loginSecurityConfig.whatsappSoftAlert !== false,
        whatsappHardAlert: doc.loginSecurityConfig.whatsappHardAlert !== false,
      };
    } else {
      cachedConfig = DEFAULT_CONFIG;
    }
  } catch (err) {
    console.error('Login security config read error:', err.message);
    cachedConfig = DEFAULT_CONFIG;
  }

  cachedAt = Date.now();
  return cachedConfig;
}

/**
 * Force refresh config cache (called after admin updates config).
 */
function refreshConfigCache() {
  cachedConfig = null;
  cachedAt = 0;
}

/**
 * Validate a config object (admin input). Returns cleaned config or throws.
 */
function validateConfig(input) {
  const maxAttempts = parseInt(input.maxAttempts, 10);
  const warningThreshold = parseInt(input.warningThreshold, 10);
  const lockDurationMinutes = parseInt(input.lockDurationMinutes, 10);

  if (!Number.isFinite(maxAttempts) || maxAttempts < 3 || maxAttempts > 20) {
    throw new Error('Max attempts must be between 3 and 20');
  }
  if (!Number.isFinite(warningThreshold) || warningThreshold < 1 || warningThreshold >= maxAttempts) {
    throw new Error(`Warning threshold must be between 1 and ${maxAttempts - 1}`);
  }
  if (!Number.isFinite(lockDurationMinutes) || lockDurationMinutes < 1 || lockDurationMinutes > 1440) {
    throw new Error('Lock duration must be between 1 and 1440 minutes (24 hours)');
  }

  return {
    maxAttempts,
    warningThreshold,
    lockDurationMinutes,
    whatsappSoftAlert: !!input.whatsappSoftAlert,
    whatsappHardAlert: !!input.whatsappHardAlert,
  };
}

// Convenience constants for backward compatibility with old code that imports these
// (Note: these are DEFAULTS — actual values come from getConfig() per-request)
const MAX_ATTEMPTS_BEFORE_WARNING = DEFAULT_CONFIG.warningThreshold;
const MAX_ATTEMPTS_BEFORE_LOCK = DEFAULT_CONFIG.maxAttempts;
const LOCK_DURATION_MS = DEFAULT_CONFIG.lockDurationMinutes * 60 * 1000;

/**
 * Check current lock status for an attempt key.
 * Returns: { locked, lockExpiresAt, attemptsRemaining, attemptsUsed, whatsappAlertSent }
 */
async function checkLockStatus(username, ip) {
  const config = await getConfig();

  if (!LoginAttempt) {
    return { locked: false, attemptsRemaining: config.maxAttempts, attemptsUsed: 0 };
  }
  const key = buildAttemptKey(username, ip);
  const now = new Date();

  const record = await LoginAttempt.findOne({ attemptKey: key });
  if (!record) {
    return { locked: false, attemptsRemaining: config.maxAttempts, attemptsUsed: 0 };
  }

  const lockMs = config.lockDurationMinutes * 60 * 1000;

  // Check lock expiry
  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      locked: true,
      lockExpiresAt: record.lockedUntil,
      attemptsRemaining: 0,
      attemptsUsed: record.failedAttempts,
      whatsappAlertSent: record.whatsappAlertSent,
      lockMinutesRemaining: Math.ceil((record.lockedUntil - now) / 60000),
    };
  }

  // Lock expired → reset counter (but keep record for history)
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.failedAttempts = 0;
    record.lockedUntil = null;
    record.whatsappAlertSent = false;
    await record.save();
    return { locked: false, attemptsRemaining: config.maxAttempts, attemptsUsed: 0 };
  }

  // Not locked — show remaining
  const remaining = Math.max(0, config.maxAttempts - record.failedAttempts);
  return {
    locked: false,
    attemptsRemaining: remaining,
    attemptsUsed: record.failedAttempts,
    whatsappAlertSent: record.whatsappAlertSent,
  };
}

/**
 * Record a failed login attempt. Handles:
 *  - counter increment
 *  - locking when threshold reached
 *  - WhatsApp alert dispatch (with cooldown to avoid spam)
 *
 * Returns: { attemptsUsed, attemptsRemaining, locked, lockExpiresAt, whatsappSent, warningLevel }
 *   warningLevel: 'normal' | 'warning' | 'locked'
 */
async function recordFailedAttempt(req, username) {
  const config = await getConfig();
  const ip = getClientIp(req);
  const userAgent = getUserAgentSummary(req);
  const key = buildAttemptKey(username, ip);
  const now = new Date();
  const lockMs = config.lockDurationMinutes * 60 * 1000;
  const ALERT_COOLDOWN_MS = Math.max(5 * 60 * 1000, lockMs); // Don't spam WhatsApp

  if (!LoginAttempt) {
    return {
      attemptsUsed: 1,
      attemptsRemaining: config.maxAttempts - 1,
      locked: false,
      whatsappSent: false,
      warningLevel: 'normal',
      ip,
      userAgent,
    };
  }

  let record = await LoginAttempt.findOne({ attemptKey: key });
  if (!record) {
    record = new LoginAttempt({
      attemptKey: key,
      username: username,
      ip: ip,
      userAgent: userAgent,
      failedAttempts: 0,
      history: [],
    });
  }

  // If lock was expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.failedAttempts = 0;
    record.lockedUntil = null;
    record.whatsappAlertSent = false;
  }

  record.failedAttempts += 1;
  record.lastAttemptAt = now;
  record.ip = ip;
  record.userAgent = userAgent;
  record.history.push({ timestamp: now, ip, userAgent, success: false });
  // Keep history bounded (last 20)
  if (record.history.length > 20) record.history = record.history.slice(-20);

  const attemptsUsed = record.failedAttempts;
  const attemptsRemaining = Math.max(0, config.maxAttempts - attemptsUsed);

  let warningLevel = 'normal';
  if (attemptsUsed >= config.maxAttempts) {
    warningLevel = 'locked';
  } else if (attemptsUsed >= config.warningThreshold) {
    warningLevel = 'warning';
  }

  let whatsappSent = false;
  let lockExpiresAt = null;

  if (warningLevel === 'locked') {
    record.lockedUntil = new Date(now.getTime() + lockMs);
    lockExpiresAt = record.lockedUntil;

    // Send WhatsApp alert (only once per cooldown window)
    const canSendAlert = !record.lastAlertAt || (now - record.lastAlertAt) > ALERT_COOLDOWN_MS;
    if (canSendAlert && !record.whatsappAlertSent && config.whatsappHardAlert) {
      const message = whatsappService.buildSecurityAlertMessage({
        event: '🚨 Admin login LOCKED — ' + attemptsUsed + ' failed attempts detected',
        attempts: attemptsUsed,
        ip,
        userAgent,
        lockMinutes: config.lockDurationMinutes,
        timestamp: now,
      });
      try {
        const result = await whatsappService.sendWhatsAppAlert(message);
        whatsappSent = result.success;
        if (whatsappSent) {
          record.whatsappAlertSent = true;
          record.lastAlertAt = now;
        }
      } catch (err) {
        console.error('WhatsApp alert error:', err.message);
      }
    }
  } else if (attemptsUsed === config.warningThreshold && config.whatsappSoftAlert) {
    // Soft warning at threshold — also send a low-priority WhatsApp ping
    const canSendSoftAlert = !record.lastAlertAt || (now - record.lastAlertAt) > ALERT_COOLDOWN_MS;
    if (canSendSoftAlert) {
      const message = whatsappService.buildSecurityAlertMessage({
        event: '⚠️ Suspicious admin login activity — ' + attemptsUsed + ' failed attempts',
        attempts: attemptsUsed,
        ip,
        userAgent,
        lockMinutes: 0,
        timestamp: now,
      });
      try {
        const result = await whatsappService.sendWhatsAppAlert(message);
        if (result.success) {
          record.lastAlertAt = now;
          whatsappSent = true;
        }
      } catch (err) {
        console.error('WhatsApp soft-alert error:', err.message);
      }
    }
  }

  await record.save();

  return {
    attemptsUsed,
    attemptsRemaining,
    locked: warningLevel === 'locked',
    lockExpiresAt,
    lockMinutesRemaining: lockExpiresAt ? Math.ceil((lockExpiresAt - now) / 60000) : 0,
    whatsappSent,
    warningLevel,
    ip,
    userAgent,
    config, // include config so caller can reference thresholds if needed
  };
}

/**
 * Reset counter after successful login.
 */
async function recordSuccessfulLogin(req, username) {
  const ip = getClientIp(req);
  const key = buildAttemptKey(username, ip);
  if (!LoginAttempt) return;

  const record = await LoginAttempt.findOne({ attemptKey: key });
  if (record) {
    record.failedAttempts = 0;
    record.lockedUntil = null;
    record.whatsappAlertSent = false;
    record.lastSuccessAt = new Date();
    record.history.push({ timestamp: new Date(), ip, userAgent: getUserAgentSummary(req), success: true });
    if (record.history.length > 20) record.history = record.history.slice(-20);
    await record.save();
  }
}

/**
 * Admin dashboard: list all attempt records (most recent first).
 */
async function getAttemptHistory(limit = 50) {
  if (!LoginAttempt) return [];
  return LoginAttempt.find({})
    .sort({ lastAttemptAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Admin: manually clear a specific lock (by attemptKey).
 */
async function clearLock(attemptKey) {
  if (!LoginAttempt) return { success: false };
  const result = await LoginAttempt.updateOne(
    { attemptKey },
    { $set: { failedAttempts: 0, lockedUntil: null, whatsappAlertSent: false } }
  );
  return { success: result.modifiedCount > 0, modified: result.modifiedCount };
}

module.exports = {
  setLoginAttemptModel,
  setSettingModel,
  getConfig,
  validateConfig,
  refreshConfigCache,
  checkLockStatus,
  recordFailedAttempt,
  recordSuccessfulLogin,
  getAttemptHistory,
  clearLock,
  getClientIp,
  getUserAgentSummary,
  // Expose defaults for backward compatibility
  MAX_ATTEMPTS_BEFORE_WARNING,
  MAX_ATTEMPTS_BEFORE_LOCK,
  LOCK_DURATION_MS,
  DEFAULT_CONFIG,
};
