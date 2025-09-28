// src/routes/purchase.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/purchaseController');
const auth = require('../middleware/auth'); // protect organiser route

router.post('/', controller.createPurchase);
// Organizer: see bookings for their exhibitions
router.get('/my', auth, controller.listMyBookings);

module.exports = router;
