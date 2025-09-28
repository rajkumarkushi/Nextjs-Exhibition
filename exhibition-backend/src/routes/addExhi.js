const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/addExhiController');
const auth = require('../middleware/auth');

router.post('/', auth, ctrl.createAddExhi);
router.get('/', ctrl.listAddExhi);
router.get('/my', auth, ctrl.listMyAddExhi);
router.get('/:id', ctrl.getAddExhi);
router.put('/:id', auth, ctrl.updateAddExhi);
router.delete('/:id', auth, ctrl.deleteAddExhi);

module.exports = router;
