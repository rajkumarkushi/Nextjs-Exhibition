// src/controllers/addExhiController.js
const service = require('../services/addExhiService');
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8000';

function _fileUrlsFromReq(req) {
  const files = req.files || [];
  return files.map(f => `${APP_BASE_URL.replace(/\/$/, '')}/uploads/${f.filename}`);
}

function _parseMaybeJson(val) {
  if (val === undefined || val === null) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return val; }
  }
  return val;
}

async function createAddExhi(req, res) {
  try {
    const files = req.files || [];
    const imageUrls = _fileUrlsFromReq(req);

    const body = req.body || {};

    const payload = {
      title: body.title,
      contactPhone: body.contactPhone,
      venueAddress: body.venueAddress,
      registrationDocuments: _parseMaybeJson(body.registrationDocuments),
      eventTypeId: body.eventTypeId || null,
      // legacy field kept for backwards compatibility:
      eventType: body.eventType || null,
      startingTicketPrice: body.startingTicketPrice ? parseFloat(body.startingTicketPrice) : null,
      description: body.description || null,
      totalStalls: body.totalStalls ? parseInt(body.totalStalls, 10) : null,
      amenities: _parseMaybeJson(body.amenities),
      locationId: body.locationId || null,
      location: body.location || null,
      termsAccepted: (body.termsAccepted === 'true' || body.termsAccepted === true),
      eventImages: (body.eventImages ? _parseMaybeJson(body.eventImages) : []).concat(imageUrls)
    };

    const organizerId = req.user && req.user.id;
    const result = await service.createAddExhi({ ...payload, organizerId });

    return res.status(201).json({ item: result });
  } catch (err) {
    console.error('createAddExhi error', err && (err.stack || err.message || err));
    return res.status(err.status || 500).json({ error: err.message || 'Create failed' });
  }
}

async function listAddExhi(req, res) {
  try {
    const items = await service.listAddExhi();
    return res.json({ items });
  } catch (err) {
    console.error('listAddExhi error:', err && (err.stack || err.message || err));
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
    console.error('listMyAddExhi error:', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAddExhi(req, res) {
  try {
    const id = req.params.id;
    const item = await service.getAddExhiById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    // if item.eventImages is a JSON string, ensure we return array
    if (item && item.eventImages && typeof item.eventImages === 'string') {
      try { item.eventImages = JSON.parse(item.eventImages); } catch (e) { /* ignore */ }
    }
    return res.json({ item });
  } catch (err) {
    console.error('getAddExhi error:', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateAddExhi(req, res) {
  try {
    const files = req.files || [];
    const imageUrls = _fileUrlsFromReq(req);

    const body = req.body || {};
    const updates = { ...body };

    // merge file urls
    const incomingEventImages = _parseMaybeJson(body.eventImages) || [];
    updates.eventImages = Array.isArray(incomingEventImages) ? incomingEventImages.concat(imageUrls) : (incomingEventImages ? [incomingEventImages].concat(imageUrls) : imageUrls);

    // parse amenities if present
    if (typeof updates.amenities === 'string') {
      try { updates.amenities = JSON.parse(updates.amenities); } catch (e) { /* ignore */ }
    }

    if (updates.startingTicketPrice) updates.startingTicketPrice = parseFloat(updates.startingTicketPrice);
    if (updates.totalStalls) updates.totalStalls = parseInt(updates.totalStalls, 10);
    if (updates.termsAccepted !== undefined) updates.termsAccepted = (updates.termsAccepted === 'true' || updates.termsAccepted === true);

    const organizerId = req.user && req.user.id;
    const id = req.params.id;
    const item = await service.updateAddExhi(id, updates, organizerId);
    return res.json({ item });
  } catch (err) {
    console.error('updateAddExhi error', err && (err.stack || err.message || err));
    return res.status(err.status || 500).json({ error: err.message || 'Update failed' });
  }
}

async function deleteAddExhi(req, res) {
  try {
    const id = req.params.id;
    const existing = await service.getAddExhiById(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin && existing.organizerId !== (req.user && req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await service.deleteAddExhi(id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteAddExhi error:', err && (err.stack || err.message || err));
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
