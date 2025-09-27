// src/utils/hash.js
const bcrypt = require('bcryptjs'); // pure JS implementation, works on all platforms
const SALT_ROUNDS = 10;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(plain, hashed) {
  if (!hashed) return false;
  return bcrypt.compare(plain, hashed);
}

module.exports = { hashPassword, comparePassword };
