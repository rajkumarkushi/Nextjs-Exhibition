// src/prismaClient.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Graceful shutdown in dev
process.on('SIGINT', async () => {
  try {
    await prisma.$disconnect();
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  } catch (e) {
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
});

module.exports = prisma;
