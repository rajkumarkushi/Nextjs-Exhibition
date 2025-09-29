const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const authController = require('../controllers/authController');

router.post('/register', auth, authController.register);
router.post('/login', authController.login);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// add these:
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/test', (req, res) => res.json({ ok: 'auth router works' }));
router.put('/me', auth, authController.updateProfile);


module.exports = router;
