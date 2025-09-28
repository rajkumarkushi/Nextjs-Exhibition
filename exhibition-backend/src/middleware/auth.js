// src/middleware/auth.js
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../prismaClient');

async function authMiddleware(req, res, next) {
  try {
    const token =
      (req.cookies && req.cookies.accessToken) ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      // Detect expired token separately so client can call /auth/refresh
      if (err && err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'token_expired' });
      }
      console.error('authMiddleware token verify error:', err && err.message ? err.message : err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = payload?.userId || payload?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = { id: user.id, role: user.role };
    return next();
  } catch (err) {
    console.error('authMiddleware error:', err && err.message ? err.message : err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = authMiddleware;
