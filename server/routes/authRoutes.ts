/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Authentication API Routes (/api/v1/auth/*)
 */

import { Router } from 'express';
import { authService } from '../services/authService.js';
import { db } from '../db/store.js';

export const authRouter = Router();

authRouter.post('/register', (req, res) => {
  try {
    const { email, fullName, role, publisherData } = req.body;
    if (!email || !fullName) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email and full name are required.' } });
    }
    const result = authService.register(email, fullName, role, publisherData);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'REGISTRATION_FAILED', message: err.message } });
  }
});

authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email is required.' } });
    }
    const result = authService.login(email, password);
    return res.json(result);
  } catch (err: any) {
    return res.status(401).json({ error: { code: 'AUTH_FAILED', message: err.message } });
  }
});

authRouter.post('/logout', (req, res) => {
  const token = req.headers.authorization;
  authService.logout(token);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email address is required.' } });
  }
  const result = authService.requestPasswordReset(email);
  return res.json(result);
});

authRouter.get('/me', (req, res) => {
  const token = req.headers.authorization;
  const user = authService.validateToken(token);
  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Valid authentication token required.' } });
  }
  return res.json({ user });
});

authRouter.get('/demo-accounts', (req, res) => {
  const accounts = Array.from(db.users.values()).map(u => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    orgName: u.publisherProfile?.organizationName
  }));
  return res.json({ accounts });
});
