// src/controllers/authController.js
const axios = require('axios');
const prisma = require('../prismaClient');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt');
const authService = require('../services/authService');

const OTP_BASE = process.env.OTP_SERVICE_BASE || 'https://otp.nearbydoctors.in/public/api';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_SECURE = (process.env.COOKIE_SECURE === 'true');
const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'lax';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
const ACCESS_TOKEN_MAXAGE_MS = (Number(process.env.ACCESS_TOKEN_EXPIRES_MINUTES || 15) || 15) * 60 * 1000;
const REFRESH_TOKEN_MAXAGE_MS = REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;

// ----------------- register / login (reuse authService) -----------------
async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error('register error:', err);
    return res.status(err.status || 400).json({ error: err.message || 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // set cookies for convenience (HttpOnly)
    try {
      const accessToken = result.accessToken;
      const refreshTokenPlain = result.refreshToken;
      const cookieOptions = {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: COOKIE_SAME_SITE,
        domain: COOKIE_DOMAIN,
        path: '/'
      };
      res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: ACCESS_TOKEN_MAXAGE_MS });
      res.cookie('refreshToken', refreshTokenPlain, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAXAGE_MS });
    } catch (e) {
      console.warn('Failed to set cookies at login:', e && e.message ? e.message : e);
    }

    return res.json(result);
  } catch (err) {
    console.error('login error:', err);
    return res.status(err.status || 400).json({ error: err.message || 'Login failed' });
  }
}

// ----------------- OTP endpoints -----------------
async function sendOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const resp = await axios.post(`${OTP_BASE}/mobile-send-otp`, { phone });
    return res.json({ ok: true, provider: resp.data });
  } catch (err) {
    console.error('sendOtp error:', err?.response?.data || err.message || err);
    const message = err?.response?.data || 'Failed to send OTP';
    return res.status(500).json({ error: message });
  }
}

async function verifyOtp(req, res) {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: "phone and otp required" });

    const resp = await axios.post(`${OTP_BASE}/mobile-verify-otp`, { phone, otp });
    const providerData = resp?.data;
    console.log("OTP provider response:", JSON.stringify(providerData));

    // permissive detection for provider success
    const ok =
      providerData &&
      (providerData.success === true ||
       providerData.status === true ||
       providerData.status === 'success' ||
       (typeof providerData.message === 'string' && providerData.message.toLowerCase().includes('verified')) ||
       providerData.code === 200);

    if (!ok) {
      const msg = providerData?.message || providerData?.error || JSON.stringify(providerData);
      console.warn('OTP verify failed - provider:', msg);
      return res.status(400).json({ ok: false, provider: providerData });
    }

    // create placeholder email if email column still required (remove after making email nullable)
    const placeholderEmail = `${String(phone).replace(/\D/g, '')}@noemail.local`;

    // find or create user (phone unique)
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, email: placeholderEmail, role: "organizer", isVerified: true }
      });
    } else if (!user.isVerified) {
      user = await prisma.user.update({ where: { id: user.id }, data: { isVerified: true }});
    }

    // issue tokens
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshTokenPlain = signRefreshToken({ userId: user.id });

    // store hashed refresh token
    const refreshTokenHash = await hashPassword(refreshTokenPlain);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshTokenHash }});

    // set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      domain: COOKIE_DOMAIN || undefined,
      path: '/'
    };
    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: ACCESS_TOKEN_MAXAGE_MS });
    res.cookie('refreshToken', refreshTokenPlain, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAXAGE_MS });

    return res.json({ ok: true, user: { id: user.id, phone: user.phone, role: user.role }, accessToken, refreshToken: refreshTokenPlain, provider: providerData });
  } catch (err) {
    console.error('verifyOtp error', err?.response?.data || err.message || err);
    return res.status(500).json({ error: 'OTP verification failed', detail: err?.response?.data || err?.message });
  }
}

// ----------------- Refresh token endpoint -----------------
// POST /api/auth/refresh
// Accepts refresh token from cookie / body / header
async function refreshToken(req, res) {
  try {
    const incoming = (req.cookies && req.cookies.refreshToken) || req.body.refreshToken || req.headers['x-refresh-token'];
    if (!incoming) return res.status(401).json({ error: 'No refresh token provided' });

    // verify signature & decode
    let payload;
    try {
      payload = verifyRefreshToken(incoming);
    } catch (e) {
      console.warn('refreshToken: invalid signature', e && e.message);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const userId = payload.userId || payload.id;
    if (!userId) return res.status(401).json({ error: 'Invalid refresh payload' });

    const user = await prisma.user.findUnique({ where: { id: userId }});
    if (!user || !user.refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found for user' });
    }

    // compare hash
    const match = await comparePassword(incoming, user.refreshToken);
    if (!match) {
      return res.status(401).json({ error: 'Refresh token mismatch' });
    }

    // rotate refresh token (recommended)
    const newAccessToken = signAccessToken({ userId: user.id, role: user.role });
    const newRefreshPlain = signRefreshToken({ userId: user.id });
    const newRefreshHash = await hashPassword(newRefreshPlain);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshHash }});

    const cookieOptions = { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAME_SITE, domain: COOKIE_DOMAIN || undefined, path: '/' };
    res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: ACCESS_TOKEN_MAXAGE_MS });
    res.cookie('refreshToken', newRefreshPlain, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAXAGE_MS });

    return res.json({ ok: true, accessToken: newAccessToken, refreshToken: newRefreshPlain });
  } catch (err) {
    console.error('refreshToken error', err && (err.response || err.message || err));
    return res.status(500).json({ error: 'Refresh failed' });
  }
}

// ----------------- Logout endpoint -----------------
// POST /api/auth/logout
async function logout(req, res) {
  try {
    // try to get user id from authenticated request, or from body
    const userId = (req.user && req.user.id) || req.body.userId;
    if (userId) {
      // clear stored refresh token
      await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } }).catch(() => {});
    }

    // clear cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    return res.json({ ok: true });
  } catch (err) {
    console.error('logout error', err);
    return res.status(500).json({ error: 'Logout failed' });
  }
}

module.exports = {
  register,
  login,
  sendOtp,
  verifyOtp,
  refreshToken,
  logout
};
