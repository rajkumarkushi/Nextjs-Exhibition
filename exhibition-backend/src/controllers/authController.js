const authService = require('../services/authService');

async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error('register error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    console.error('login error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Login failed' });
  }
}

module.exports = { register, login };
