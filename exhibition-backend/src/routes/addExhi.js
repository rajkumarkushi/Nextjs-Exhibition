// src/routes/addExhi.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/addExhiController');

// create an exhibition
router.post('/', controller.createAddExhi);

// list all exhibitions (query params allowed)
router.get('/', controller.listAddExhi);

// get single
router.get('/:id', controller.getAddExhi);

// update
router.put('/:id', controller.updateAddExhi);

// delete
router.delete('/:id', controller.deleteAddExhi);

module.exports = router;
