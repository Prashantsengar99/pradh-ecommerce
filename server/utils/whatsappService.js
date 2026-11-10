/**
 * 📲 WhatsApp Alert Service
 * Sends WhatsApp messages via CallMeBot (free) or Twilio WhatsApp API.
 *
 * --- CallMeBot Setup (RECOMMENDED — FREE for personal use) ---
 * 1. Open WhatsApp, send this message to: +34 600 83 67 87
 *    "I allow callmebot to send me messages"
 *    (Or use the bot assigned for your country — see callmebot.com)
 * 2. You'll receive an API key instantly.
 * 3. Add to .env:
 *    WHATSAPP_PROVIDER=callmebot
 *    ADMIN_WHATSAPP_NUMBER=919999999999   (country code + number, no + or spaces)
 *    WHATSAPP_API_KEY=xxxxxxx              (from step 2)
 *
 * --- Twilio Setup (for production / bulk messaging) ---
 * 1. Create account at twilio.com
 * 2. Enable WhatsApp sandbox (or approved WhatsApp Business sender)
 * 3. Add to .env:
 *    WHATSAPP_PROVIDER=twilio
 *    TWILIO_ACCOUNT_SID=ACxxxxxx
 *    TWILIO_AUTH_TOKEN=xxxxxx
 *    TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (sandbox / your sender)
 *    ADMIN_WHATSAPP_NUMBER=whatsapp:+919999999999
 *
 * If no provider is configured, alerts fall back to console + email
 * (so security events are still logged).
 */

const https = require('https');
const http = require('http');

// Load config once
const PROVIDER = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_NUMBER || '';
const CALLMEBOT_KEY = process.env.WHATSAPP_API_KEY || '';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM || '';

/**
 * Check if WhatsApp is configured.
 */
function isWhatsAppConfigured() {
  if (PROVIDER === 'callmebot' && ADMIN_PHONE && CALLMEBOT_KEY) return true;
  if (PROVIDER === 'twilio' && TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && ADMIN_PHONE) return true;
  return false;
}

/**
 * Send via CallMeBot — simple HTTPS GET.
 */
function sendViaCallMeBot(phone, message) {
  return new Promise((resolve) => {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&apikey=${encodeURIComponent(CALLMEBOT_KEY)}&text=${encodeURIComponent(message)}`;
    https.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        const ok = res.statusCode === 200 && /message queued|success/i.test(body);
        resolve({ success: ok, status: res.statusCode, body, provider: 'callmebot' });
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message, provider: 'callmebot' });
    });
  });
}

/**
 * Send via Twilio WhatsApp API — POST form-encoded.
 */
function sendViaTwilio(to, message) {
  return new Promise((resolve) => {
    const toNum = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/\D/g, '')}`;
    const payload = `From=${encodeURIComponent(TWILIO_FROM)}&To=${encodeURIComponent(toNum)}&Body=${encodeURIComponent(message)}`;
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(body); } catch { parsed = null; }
        const ok = res.statusCode >= 200 && res.statusCode < 300 && parsed && parsed.sid;
        resolve({ success: ok, status: res.statusCode, body, sid: parsed && parsed.sid, provider: 'twilio' });
      });
    });
    req.on('error', (err) => {
      resolve({ success: false, error: err.message, provider: 'twilio' });
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Send a WhatsApp message to the admin.
 * @param {string} message — plain text (max ~1000 chars on CallMeBot free tier)
 * @returns {Promise<{success:boolean, provider?:string, error?:string}>}
 */
async function sendWhatsAppAlert(message) {
  if (!isWhatsAppConfigured()) {
    console.warn('⚠️  WhatsApp not configured — logging alert instead:');
    console.warn('   =>', message);
    return { success: false, provider: 'none', error: 'WhatsApp not configured' };
  }

  // Truncate to safe length for WhatsApp
  const safeMsg = (message || '').slice(0, 1500);

  try {
    if (PROVIDER === 'callmebot') {
      const result = await sendViaCallMeBot(ADMIN_PHONE, safeMsg);
      if (result.success) {
        console.log('📲 WhatsApp alert sent via CallMeBot to', ADMIN_PHONE);
      } else {
        console.error('❌ CallMeBot send failed:', result.status, result.body || result.error);
      }
      return result;
    }
    if (PROVIDER === 'twilio') {
      const result = await sendViaTwilio(ADMIN_PHONE, safeMsg);
      if (result.success) {
        console.log('📲 WhatsApp alert sent via Twilio to', ADMIN_PHONE);
      } else {
        console.error('❌ Twilio send failed:', result.status, result.body || result.error);
      }
      return result;
    }
  } catch (err) {
    console.error('❌ WhatsApp alert exception:', err.message);
    return { success: false, error: err.message };
  }

  return { success: false, provider: 'none', error: 'Unknown provider' };
}

/**
 * Build a branded security alert message.
 */
function buildSecurityAlertMessage({ event, attempts, ip, userAgent, lockMinutes, timestamp }) {
  const time = new Date(timestamp || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const lines = [
    '🚨 *PRADH ADMIN SECURITY ALERT* 🚨',
    '',
    `*Event:* ${event}`,
    `*Failed Attempts:* ${attempts}`,
    `*Time (IST):* ${time}`,
    `*IP Address:* ${ip || 'unknown'}`,
    `*Device:* ${userAgent || 'unknown'}`,
  ];
  if (lockMinutes) {
    lines.push(`*Account Locked For:* ${lockMinutes} minutes`);
  }
  lines.push('');
  lines.push('⚠️ If this was NOT you, please:');
  lines.push('1. Change admin password immediately');
  lines.push('2. Check server logs for full trace');
  lines.push('3. Block suspicious IPs');
  lines.push('');
  lines.push('_PRADH Desi Fuel • Security System_');
  return lines.join('\n');
}

module.exports = {
  sendWhatsAppAlert,
  buildSecurityAlertMessage,
  isWhatsAppConfigured,
};
