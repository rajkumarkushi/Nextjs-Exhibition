// src/controllers/addExhiController.js
const service = require('../services/addExhiService');

async function createAddExhi(req, res) {
  try {
    // auth middleware must have set req.user.id
    const organizerId = req.user && req.user.id;
    if (!organizerId) return res.status(401).json({ error: 'Unauthorized' });

    const created = await service.createAddExhi(organizerId, req.body);
    return res.status(201).json({ item: created });
  } catch (err) {
    console.error('createAddExhi error:', err && (err.message || err));
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

async function listAddExhi(req, res) {
  try {
    const items = await service.listAddExhi();
    return res.json({ items });
  } catch (err) {
    console.error('listAddExhi error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function listMyAddExhi(req, res) {
  try {
    const organizerId = req.user && req.user.id;
    if (!organizerId) return res.status(401).json({ error: 'Unauthorized' });

    const items = await service.listAddExhi({ organizerId });
    return res.json({ items });
  } catch (err) {
    console.error('listMyAddExhi error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAddExhi(req, res) {
  try {
    const id = req.params.id;
    const item = await service.getAddExhiById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json({ item });
  } catch (err) {
    console.error('getAddExhi error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateAddExhi(req, res) {
  try {
    const id = req.params.id;
    const existing = await service.getAddExhiById(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && existing.organizerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await service.updateAddExhi(id, req.body);
    return res.json({ item: updated });
  } catch (err) {
    console.error('updateAddExhi error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function deleteAddExhi(req, res) {
  try {
    const id = req.params.id;
    const existing = await service.getAddExhiById(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && existing.organizerId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await service.deleteAddExhi(id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteAddExhi error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  createAddExhi,
  listAddExhi,
  listMyAddExhi,
  getAddExhi,
  updateAddExhi,
  deleteAddExhi
};
