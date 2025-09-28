// src/server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

// simple request logger
app.use((req, res, next) => {
  const t0 = Date.now();
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    console.log(`[RES] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now()-t0}ms)`);
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS: allow your frontend origin and credentials
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));

// serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// health ping
app.get('/api/ping', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

// mount api routes
try {
  const apiRouter = require('./routes/index');
  app.use('/api', apiRouter);
} catch (err) {
  console.error('Failed to mount API routes:', err && err.stack ? err.stack : err);
}

// root helpful message
app.get('/', (req, res) => res.send('Server OK. Use /api/ping or /api/lookups/...'));

// error handler
app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Debug server running at http://localhost:${PORT}`));
