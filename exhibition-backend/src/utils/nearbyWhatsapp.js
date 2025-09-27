// src/utils/nearbyWhatsapp.js
const axios = require('axios');
const BASE = 'https://otp.nearbydoctors.in/public/api';

/**
 * Normalize phone to 10 digits (Indian mobile). If it can't be normalized,
 * throw an error so caller knows.
 */
function toLocal10(phone) {
  if (!phone) throw new Error('Missing phone');
  // keep digits only
  const digits = String(phone).replace(/\D/g, '');
  // if starts with country code (91) and length > 10, take last 10
  if (digits.length > 10 && digits.endsWith(digits.slice(-10))) {
    // fallback, take last 10
    return digits.slice(-10);
  }
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  // otherwise return last 10 if possible
  if (digits.length > 10) return digits.slice(-10);
  throw new Error('Phone must be 10 digits (after removing country code)');
}

/**
 * Send booking message using the NearbyDoctors endpoint.
 * We POST { phone, message } where phone is 10-digit (without +91).
 * If provider ignores message and sends OTP only, that's provider-side limitation.
 */
async function sendBookingMessage(phone, message) {
  const url = `${BASE}/mobile-send-otp`;
  const phone10 = toLocal10(phone); // will throw if invalid
  try {
    const res = await axios.post(url, { phone: phone10, message }, { timeout: 10000 });
    return res.data;
  } catch (err) {
    const payload = err.response?.data ?? err.message ?? String(err);
    throw new Error(typeof payload === 'string' ? payload : JSON.stringify(payload));
  }
}

module.exports = { sendBookingMessage, toLocal10 };
