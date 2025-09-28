// src/services/authService.js
const prisma = require('../prismaClient');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

function normalizePhone(phone) {
  if (!phone) return null;
  return String(phone).replace(/\D/g, ''); // digits only
}

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

  // Basic validation
  if (!name || !email || !password) {
    const e = new Error('Missing required fields: name, email, password');
    e.status = 400;
    throw e;
  }

  const emailNorm = String(email).trim().toLowerCase();
  const phoneNorm = normalizePhone(phone);

  // Check unique email
  const existingEmail = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existingEmail) {
    const e = new Error('Email already in use');
    e.status = 400;
    throw e;
  }

  // Check unique phone if provided
  if (phoneNorm) {
    const existingPhone = await prisma.user.findUnique({ where: { phone: phoneNorm } }).catch(() => null);
    if (existingPhone) {
      const e = new Error('Phone number already in use');
      e.status = 400;
      throw e;
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email: emailNorm,
      phone: phoneNorm,
      passwordHash,
      role: 'organizer'
    }
  });

  // Create organizer profile (note the Prisma model name is organizerprofile)
  // If your Prisma model name differs, adjust this to match exactly.
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

  // Optionally store hashed refresh token
  const refreshTokenHash = await hashPassword(refreshTokenPlain);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshTokenHash } });

  const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  return { user: safeUser, accessToken, refreshToken: refreshTokenPlain };
}

async function login(email, password) {
  if (!email || !password) {
    const e = new Error('Missing email or password');
    e.status = 400;
    throw e;
  }

  const emailNorm = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (!user) {
    const e = new Error('Invalid credentials');
    e.status = 401;
    throw e;
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    const e = new Error('Invalid credentials');
    e.status = 401;
    throw e;
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshTokenPlain = signRefreshToken({ userId: user.id });
  const refreshTokenHash = await hashPassword(refreshTokenPlain);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshTokenHash } });

  const safeUser = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  return { user: safeUser, accessToken, refreshToken: refreshTokenPlain };
}

module.exports = { register, login };
