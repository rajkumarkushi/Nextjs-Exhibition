// src/controllers/purchaseController.js
const service = require('../services/purchaseService');

async function createPurchase(req, res) {
  try {
    const payload = req.body;
    const ticket = await service.createPurchase(payload);
    return res.status(201).json({ ticket, message: 'Ticket booked successfully' });
  } catch (err) {
    console.error('createPurchase error:', err && err.message ? err.message : err);
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

async function listMyBookings(req, res) {
  try {
    const organizerId = req.user && req.user.id;
    if (!organizerId) return res.status(401).json({ error: 'Unauthorized' });

    const tickets = await service.listMyBookings(organizerId);
    return res.json({ tickets });
  } catch (err) {
    console.error('listMyBookings error:', err && err.message ? err.message : err);
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

module.exports = {
  createPurchase,
  listMyBookings
};
