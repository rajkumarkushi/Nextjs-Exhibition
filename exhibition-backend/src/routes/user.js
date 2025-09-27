// src/routes/user.js
const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET /api/users -> list all users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ users });
  } catch (err) {
    console.error('GET /api/users error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:id -> get single user
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id param' });

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('GET /api/users/:id error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
