const express = require('express');
const router = express.Router();
console.log('[ROUTES] auth.js loaded from', __filename);

const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// add these:
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/test', (req, res) => res.json({ ok: 'auth router works' }));


module.exports = router;
