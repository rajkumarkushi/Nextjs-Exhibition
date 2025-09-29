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
// remove token issuing on register; only create user

async function register(req, res) {
  try {
    // use createUserOnly to create user without issuing tokens
    const user = await authService.createUserOnly(req.body);
    return res.status(201).json({
      ok: true,
      user: { id: user.id, email: user.email, phone: user.phone, name: user.name }
    });
  } catch (err) {
    console.error('register error:', err && err.stack ? err.stack : err);
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
    if (!phone || !otp) {
      return res.status(400).json({ error: "phone and otp required" });
    }

    // call provider
    const resp = await axios.post(`${OTP_BASE}/mobile-verify-otp`, { phone, otp });
    const providerData = resp?.data;
    console.log("OTP provider response:", JSON.stringify(providerData));

    // check if provider says success
    const ok =
      providerData &&
      (providerData.success === true ||
        providerData.status === true ||
        providerData.status === "success" ||
        (typeof providerData.message === "string" &&
          providerData.message.toLowerCase().includes("verified")) ||
        providerData.code === 200);

    if (!ok) {
      const msg = providerData?.message || providerData?.error || JSON.stringify(providerData);
      console.warn("OTP verify failed - provider:", msg);
      return res.status(400).json({ ok: false, provider: providerData });
    }

    // make placeholder email if column is still required
    const placeholderEmail = `${String(phone).replace(/\D/g, "")}@noemail.local`;

    // find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, email: placeholderEmail, role: "organizer", isVerified: true }
      });
      console.log("verifyOtp -> created new user:", user.id);
    } else if (!user.isVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true }
      });
      console.log("verifyOtp -> updated user to isVerified:", user.id);
    }

    // issue tokens
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshTokenPlain = signRefreshToken({ userId: user.id });

    // store hashed refresh token
    const refreshTokenHash = await hashPassword(refreshTokenPlain);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshTokenHash }
    });

    console.log("verifyOtp -> issued tokens for user:", user.id);

    // set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      domain: COOKIE_DOMAIN || undefined,
      path: "/"
    };
    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: ACCESS_TOKEN_MAXAGE_MS });
    res.cookie("refreshToken", refreshTokenPlain, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAXAGE_MS });

    // return tokens + user + provider info
    return res.json({
      ok: true,
      user: { id: user.id, phone: user.phone, role: user.role },
      accessToken,
      refreshToken: refreshTokenPlain,
      provider: providerData
    });
  } catch (err) {
    console.error("verifyOtp error", err?.response?.data || err.message || err);
    return res.status(500).json({ error: "OTP verification failed", detail: err?.response?.data || err?.message });
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

// update profile (authenticated) - PUT /api/auth/me
async function updateProfile(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // allowed fields to update
    const { name, email, phone, password, panNumber, panFileName, bankName, accountNumber, ifsc, accountHolderName } = req.body || {};

    const data = {};
    if (name) data.name = name;
    if (email) data.email = String(email).trim().toLowerCase();
    if (phone) data.phone = String(phone).replace(/\D/g, '');
    if (password) {
      // hash password before storing
      const hashed = await hashPassword(password);
      data.passwordHash = hashed;
    }

    // update user basic fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data
    });

    // update organizer profile details (create if missing)
    const profileData = {};
    if (panNumber !== undefined) profileData.panNumber = panNumber;
    if (panFileName !== undefined) profileData.panFileName = panFileName;
    if (bankName !== undefined) profileData.bankName = bankName;
    if (accountNumber !== undefined) profileData.accountNumber = accountNumber;
    if (ifsc !== undefined) profileData.ifsc = ifsc;
    if (accountHolderName !== undefined) profileData.accountHolderName = accountHolderName;

    if (Object.keys(profileData).length > 0) {
      // try update, or create if missing
      const existing = await prisma.organizerprofile.findUnique({ where: { userId }});
      if (existing) {
        await prisma.organizerprofile.update({ where: { userId }, data: profileData });
      } else {
        await prisma.organizerprofile.create({ data: { userId, ...profileData }});
      }
    }

    // return minimal safe user
    const safeUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified
    };
    return res.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error('updateProfile error', err && err.stack ? err.stack : err);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to update profile' });
  }
}


module.exports = {
  register,
  login,
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,updateProfile
};
