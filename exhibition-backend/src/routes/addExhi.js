// src/routes/addExhi.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/addExhiController'); // use single variable
const auth = require('../middleware/auth');
const upload = require('../utils/upload'); // multer config (see upload.js)

// quick test route (helpful to verify router is mounted)
router.get('/test', (req, res) => res.json({ ok: 'addExhi route works' }));

// create - accepts JSON or multipart/form-data (files field name: eventImages)
// upload middleware will run only for multipart/form-data requests
router.post('/', auth, upload.array('eventImages', 6), ctrl.createAddExhi);

// list all exhibitions (public)
router.get('/', ctrl.listAddExhi);

// list this organiser's exhibitions (requires auth)
router.get('/my', auth, ctrl.listMyAddExhi);

// get single exhibition
router.get('/:id', ctrl.getAddExhi);

// update exhibition - supports optional file uploads
router.put('/:id', auth, upload.array('eventImages', 6), ctrl.updateAddExhi);

// delete exhibition
router.delete('/:id', auth, ctrl.deleteAddExhi);

module.exports = router;
