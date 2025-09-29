// src/services/authService.js
const prisma = require('../prismaClient');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

// ----------------- Helper -----------------
function normalizePhone(phone) {
  if (!phone) return null;
  return String(phone).replace(/\D/g, ''); // digits only
}

// ----------------- Register (with tokens) -----------------
async function register(payload) {
  const {
    name,
    email,
    password,
    phone,
    panNumber,
    panFileName,
    bankName,
    accountNumber,
    ifsc,
    accountHolderName
  } = payload || {};

  if (!name || !email || !password) {
    const e = new Error('Missing required fields: name, email, password');
    e.status = 400;
    throw e;
  }

  const emailNorm = String(email).trim().toLowerCase();
  const phoneNorm = normalizePhone(phone);

  // Uniqueness checks
  if (await prisma.user.findUnique({ where: { email: emailNorm } })) {
    const e = new Error('Email already in use'); e.status = 400; throw e;
  }
  if (phoneNorm && await prisma.user.findUnique({ where: { phone: phoneNorm } })) {
    const e = new Error('Phone number already in use'); e.status = 400; throw e;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email: emailNorm, phone: phoneNorm, passwordHash, role: 'organizer' }
  });

  // create organizer profile
  await prisma.organizerprofile.create({
    data: {
      userId: user.id,
      panNumber: panNumber ?? null,
      panFileName: panFileName ?? null,
      bankName: bankName ?? null,
      accountNumber: accountNumber ?? null,
      ifsc: ifsc ?? null,
      accountHolderName: accountHolderName ?? null
    }
  });

  // Issue tokens
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshTokenPlain = signRefreshToken({ userId: user.id });

  const refreshTokenHash = await hashPassword(refreshTokenPlain);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshTokenHash } });

  const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  return { user: safeUser, accessToken, refreshToken: refreshTokenPlain };
}

// ----------------- Register (NO tokens) -----------------
async function createUserOnly(payload) {
  const { name, email, password, phone } = payload || {};
  if (!name || !email || !password) {
    const e = new Error('Missing required fields: name, email, password');
    e.status = 400;
    throw e;
  }

  const emailNorm = String(email).trim().toLowerCase();
  const phoneNorm = normalizePhone(phone);

  if (await prisma.user.findUnique({ where: { email: emailNorm } })) {
    const e = new Error('Email already in use'); e.status = 400; throw e;
  }
  if (phoneNorm && await prisma.user.findUnique({ where: { phone: phoneNorm } })) {
    const e = new Error('Phone number already in use'); e.status = 400; throw e;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email: emailNorm, phone: phoneNorm, passwordHash, role: 'organizer', isVerified: false }
  });

  // create skeleton organizer profile (optional)
  try {
    await prisma.organizerprofile.create({ data: { userId: user.id } });
  } catch (e) {
    // ignore if organizerprofile not required
  }

  return user;
}

// ----------------- Login -----------------
async function login(email, password) {
  if (!email || !password) {
    const e = new Error('Missing email or password'); e.status = 400; throw e;
  }

  const emailNorm = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (!user) {
    const e = new Error('Invalid credentials'); e.status = 401; throw e;
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    const e = new Error('Invalid credentials'); e.status = 401; throw e;
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshTokenPlain = signRefreshToken({ userId: user.id });

  const refreshTokenHash = await hashPassword(refreshTokenPlain);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshTokenHash } });

  const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  return { user: safeUser, accessToken, refreshToken: refreshTokenPlain };
}

// ----------------- Exports -----------------
module.exports = {
  register,        // full register (with tokens)
  createUserOnly,  // no tokens
  login
};
