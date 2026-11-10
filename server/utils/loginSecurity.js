/**
 * 🛡️ Login Security Service
 * Tracks failed admin login attempts in MongoDB (persists across Render sleeps).
 *
 * Flow:
 *   Attempts 1–3  → "X attempts left" warnings (2 remaining)
 *   Attempts 4–5  → "Final warning, last X attempts"
 *   Attempt 5     → Account LOCKED for 30 min + WhatsApp alert sent
 *   After lock    → Must wait for cooldown; further attempts are rejected
 *
 * Public API:
 *   checkLockStatus()        → before login: see if locked
 *   recordFailedAttempt()    → after a bad password
 *   recordSuccessfulLogin()  → reset counter on success
 *   getAttemptHistory()      → admin dashboard view
 */

const whatsappService = require('./whatsappService');

// Config
const MAX_ATTEMPTS_BEFORE_WARNING = 3;  // After 3 fails, warn "2 attempts left"
const MAX_ATTEMPTS_BEFORE_LOCK = 5;     // After 5 fails, lock account
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // Track attempts within last 1 hour
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // Don't spam WhatsApp — 1 alert per 30 min

// Will be initialised from server.js (mongoose model)
let LoginAttempt;

function setLoginAttemptModel(model) {
  LoginAttempt = model;
}

/**
 * Get a stable key for the attempted login (username + normalised IP).
 * Locks per attacker (IP+username), not globally — so legitimate admin from
 * another device can still log in.
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
  // Pull browser + OS in compact form
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
 * Check current lock status for an attempt key.
 * Returns: { locked, lockExpiresAt, attemptsRemaining, attemptsUsed, whatsappAlertSent }
 */
async function checkLockStatus(username, ip) {
  if (!LoginAttempt) {
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS_BEFORE_LOCK, attemptsUsed: 0 };
  }
  const key = buildAttemptKey(username, ip);
  const now = new Date();

  const record = await LoginAttempt.findOne({ attemptKey: key });
  if (!record) {
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS_BEFORE_LOCK, attemptsUsed: 0 };
  }

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
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS_BEFORE_LOCK, attemptsUsed: 0 };
  }

  // Not locked — show remaining
  const remaining = Math.max(0, MAX_ATTEMPTS_BEFORE_LOCK - record.failedAttempts);
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
 *   warningLevel: 'normal' | 'warning' | 'final' | 'locked'
 */
async function recordFailedAttempt(req, username) {
  const ip = getClientIp(req);
  const userAgent = getUserAgentSummary(req);
  const key = buildAttemptKey(username, ip);
  const now = new Date();

  if (!LoginAttempt) {
    return { attemptsUsed: 1, attemptsRemaining: 4, locked: false, whatsappSent: false, warningLevel: 'normal' };
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
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS_BEFORE_LOCK - attemptsUsed);

  let warningLevel = 'normal';
  if (attemptsUsed >= 1 && attemptsUsed < MAX_ATTEMPTS_BEFORE_WARNING) {
    warningLevel = 'normal';
  } else if (attemptsUsed >= MAX_ATTEMPTS_BEFORE_WARNING && attemptsUsed < MAX_ATTEMPTS_BEFORE_LOCK) {
    warningLevel = 'warning';
  } else if (attemptsUsed >= MAX_ATTEMPTS_BEFORE_LOCK) {
    warningLevel = 'locked';
  }

  let whatsappSent = false;
  let lockExpiresAt = null;

  if (attemptsUsed >= MAX_ATTEMPTS_BEFORE_LOCK) {
    record.lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
    lockExpiresAt = record.lockedUntil;

    // Send WhatsApp alert (only once per cooldown window)
    const canSendAlert = !record.lastAlertAt || (now - record.lastAlertAt) > ALERT_COOLDOWN_MS;
    if (canSendAlert && !record.whatsappAlertSent) {
      const message = whatsappService.buildSecurityAlertMessage({
        event: '🚨 Admin login LOCKED — 5 failed attempts detected',
        attempts: attemptsUsed,
        ip,
        userAgent,
        lockMinutes: Math.round(LOCK_DURATION_MS / 60000),
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
  } else if (attemptsUsed === MAX_ATTEMPTS_BEFORE_WARNING) {
    // Soft warning at 3 attempts — also send a low-priority WhatsApp ping
    const canSendSoftAlert = !record.lastAlertAt || (now - record.lastAlertAt) > ALERT_COOLDOWN_MS;
    if (canSendSoftAlert) {
      const message = whatsappService.buildSecurityAlertMessage({
        event: '⚠️ Suspicious admin login activity — 3 failed attempts',
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
  checkLockStatus,
  recordFailedAttempt,
  recordSuccessfulLogin,
  getAttemptHistory,
  clearLock,
  getClientIp,
  getUserAgentSummary,
  MAX_ATTEMPTS_BEFORE_WARNING,
  MAX_ATTEMPTS_BEFORE_LOCK,
  LOCK_DURATION_MS,
};
