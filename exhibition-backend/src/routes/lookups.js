// src/routes/lookups.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/lookupController');

// Public GET endpoints
router.get('/locations', controller.listLocations);
router.get('/locations/:id', controller.getLocationById);

router.get('/event-types', controller.listEventTypes);
router.get('/event-types/:id', controller.getEventTypeById);

// Admin (CRUD) - optional protection later
router.post('/locations', controller.createLocation);
router.put('/locations/:id', controller.updateLocation);
router.delete('/locations/:id', controller.deleteLocation);

router.post('/event-types', controller.createEventType);
router.put('/event-types/:id', controller.updateEventType);
router.delete('/event-types/:id', controller.deleteEventType);

module.exports = router;
