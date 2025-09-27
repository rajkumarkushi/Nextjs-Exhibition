// src/controllers/lookupController.js
const service = require('../services/lookupService');

async function listLocations(req, res) {
  try {
    const items = await service.listLocations(req.query || {});
    return res.json({ items });
  } catch (err) {
    console.error('listLocations error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getLocationById(req, res) {
  try {
    const item = await service.getLocationById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json({ item });
  } catch (err) {
    console.error('getLocationById error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createLocation(req, res) {
  try {
    const item = await service.createLocation(req.body);
    return res.status(201).json({ item });
  } catch (err) {
    console.error('createLocation error', err && err.stack ? err.stack : err);
    return res.status(err.status || 400).json({ error: err.message || 'Create failed' });
  }
}

async function updateLocation(req, res) {
  try {
    const item = await service.updateLocation(req.params.id, req.body);
    return res.json({ item });
  } catch (err) {
    console.error('updateLocation error', err && err.stack ? err.stack : err);
    return res.status(err.status || 400).json({ error: err.message || 'Update failed' });
  }
}

async function deleteLocation(req, res) {
  try {
    await service.deleteLocation(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteLocation error', err && err.stack ? err.stack : err);
    return res.status(err.status || 400).json({ error: err.message || 'Delete failed' });
  }
}

/* Event types */
async function listEventTypes(req, res) {
  try {
    const items = await service.listEventTypes(req.query || {});
    return res.json({ items });
  } catch (err) {
    console.error('listEventTypes error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getEventTypeById(req, res) {
  try {
    const item = await service.getEventTypeById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json({ item });
  } catch (err) {
    console.error('getEventTypeById error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createEventType(req, res) {
  try {
    const item = await service.createEventType(req.body);
    return res.status(201).json({ item });
  } catch (err) {
    console.error('createEventType error', err && err.stack ? err.stack : err);
    return res.status(err.status || 400).json({ error: err.message || 'Create failed' });
  }
}

async function updateEventType(req, res) {
  try {
    const item = await service.updateEventType(req.params.id, req.body);
    return res.json({ item });
  } catch (err) {
    console.error('updateEventType error', err && err.stack ? err.stack : err);
    return res.status(err.status || 400).json({ error: err.message || 'Update failed' });
  }
}

async function deleteEventType(req, res) {
  try {
    await service.deleteEventType(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteEventType error', err && err.stack ? err.stack : err);
    return res.status(err.status || 400).json({ error: err.message || 'Delete failed' });
  }
}

module.exports = {
  listLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  listEventTypes,
  getEventTypeById,
  createEventType,
  updateEventType,
  deleteEventType
};
