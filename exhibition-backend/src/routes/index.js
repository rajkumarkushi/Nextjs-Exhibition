const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const addExhiRoutes = require('./addExhi'); 
// Import individual route files
const userRoutes = require('./user');
const purchaseRoutes = require('./purchase');
const lookups = require('./lookups');
// Example future routes:
// const eventRoutes = require('./event');
// const gstRoutes = require('./gst');

router.use('/purchase', purchaseRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/add-exhi', addExhiRoutes)
router.use('/lookups', lookups);
console.log('Auth routes loaded:', Object.keys(authRoutes));

// router.use('/events', eventRoutes);
// router.use('/gst', gstRoutes);

module.exports = router;
