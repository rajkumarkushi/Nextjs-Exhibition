// src/routes/purchase.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/purchaseController');

router.post('/', controller.createPurchase);

module.exports = router;
