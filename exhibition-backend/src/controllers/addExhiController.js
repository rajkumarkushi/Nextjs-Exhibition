// src/controllers/addExhiController.js
const service = require('../services/addExhiService');

async function createAddExhi(req, res) {
  try {
    // organizerId can be passed in body or derived from req.user if you have auth middleware
    const organizerId = req.body.organizerId || null;
    const result = await service.createAddExhi(organizerId, req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error('createAddExhi error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

async function listAddExhi(req, res) {
  try {
    // optional filters can be added here (e.g., ?status=published)
    const list = await service.listAddExhi(req.query);
    return res.json({ items: list });
  } catch (err) {
    console.error('listAddExhi error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAddExhi(req, res) {
  try {
    const id = req.params.id;
    const item = await service.getAddExhiById(id);
    if (!item) return res.status(404).json({ error: 'Exhibition not found' });
    return res.json({ item });
  } catch (err) {
    console.error('getAddExhi error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateAddExhi(req, res) {
  try {
    const id = req.params.id;
    const updated = await service.updateAddExhi(id, req.body);
    return res.json({ item: updated });
  } catch (err) {
    console.error('updateAddExhi error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

async function deleteAddExhi(req, res) {
  try {
    const id = req.params.id;
    await service.deleteAddExhi(id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteAddExhi error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

module.exports = { createAddExhi, listAddExhi, getAddExhi, updateAddExhi, deleteAddExhi };
