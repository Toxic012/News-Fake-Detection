/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Backend Express Application Server Entry Point
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './server/routes/authRoutes.js';
import { publisherRouter } from './server/routes/publisherRoutes.js';
import { verifyRouter } from './server/routes/verifyRoutes.js';
import { adminRouter } from './server/routes/adminRoutes.js';
import { publicRouter } from './server/routes/publicRoutes.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 50MB payload limits for base64 images, PDFs and video frames
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'TruthCode Verification Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Routers under /api/v1
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/publisher', publisherRouter);
  app.use('/api/v1/verify', verifyRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/public', publicRouter);

  // 404 JSON handler for unhandled API routes (prevents falling through to Vite/SPA HTML)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} not found.`
      }
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TruthCode Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
