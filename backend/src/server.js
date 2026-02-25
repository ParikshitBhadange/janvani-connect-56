import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './lib/db.js';
import { ENV } from './lib/env.js';

import authRoutes      from './routes/Auth.js';
import complaintRoutes from './routes/complaints.js';
import userRoutes      from './routes/users.js';

// ── Connect to MongoDB ─────────────────────────────────────────
await connectDB();

const app = express();

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({
  origin      : ENV.CLIENT_URL,
  credentials : true,
}));

app.use(express.json({ limit: '10mb' }));    // 10mb for base64 images
app.use(express.urlencoded({ extended: true }));

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users',      userRoutes);

// ── Health check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: ENV.NODE_ENV, time: new Date().toISOString() });
});

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler (Express 5 compatible) ───────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status  = err.status || err.statusCode || 500;
  const message = ENV.NODE_ENV === 'production' ? 'Server error' : (err.message || 'Server error');
  console.error(`[ERROR] ${status} — ${message}`);
  if (!res.headersSent) {
    res.status(status).json({ success: false, message });
  }
});

// ── Start server ───────────────────────────────────────────────
app.listen(ENV.PORT, () => {
  console.log(`🚀 JANVANI backend running on http://localhost:${ENV.PORT}`);
  console.log(`📡 Environment: ${ENV.NODE_ENV}`);
});