// src/controllers/purchaseController.js
const service = require('../services/purchaseService');

async function createPurchase(req, res) {
  try {
    const result = await service.createPurchase(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error('createPurchase error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

module.exports = { createPurchase };
