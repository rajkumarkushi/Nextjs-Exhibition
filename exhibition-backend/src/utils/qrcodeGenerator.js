// src/utils/qrcodeGenerator.js
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateQRCodeToFile(payloadString, filename) {
  ensureDir(path.dirname(filename));
  await QRCode.toFile(filename, payloadString, { type: 'png', width: 300, margin: 2 });
  return filename;
}

module.exports = { generateQRCodeToFile, ensureDir };
