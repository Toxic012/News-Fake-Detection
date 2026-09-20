/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Verification API Routes (/api/v1/verify/*)
 */

import { Router } from 'express';
import { verificationService } from '../services/verificationService.js';
import { authService } from '../services/authService.js';
import { db } from '../db/store.js';

export const verifyRouter = Router();

// Fast preflight code resolver
verifyRouter.get('/resolve-code/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const codeObj = db.findVerificationCode(code);
  if (!codeObj) {
    return res.status(404).json({
      error: {
        code: 'CODE_NOT_FOUND',
        message: `Verification code "${code}" is not registered in the TruthCode database.`
      }
    });
  }

  const resolved = db.resolveOriginalContent(codeObj);
  return res.json({
    code: codeObj.code,
    contentType: codeObj.contentType,
    status: codeObj.status,
    supersededByCodeId: codeObj.supersededByCodeId,
    retractionReason: codeObj.retractionReason,
    original: resolved
      ? {
          title: resolved.title,
          publisherName: resolved.publisherName,
          publishedAt: resolved.publishedAt || resolved.editionDate,
          versionNumber: resolved.versionNumber
        }
      : null
  });
});

// 1. Submit Verification Request (with known TruthCode identifier)
verifyRouter.post('/', async (req, res) => {
  try {
    const { code, uploadType, submittedText, fileUrl } = req.body;
    if (!code) {
      return res.status(400).json({ error: { code: 'MISSING_CODE', message: 'Verification code is required.' } });
    }

    const token = req.headers.authorization;
    const user = authService.validateToken(token);
    const guestSessionId = (req.headers['x-guest-session-id'] as string) || req.ip || 'guest-default';

    const result = await verificationService.submitVerification(
      code,
      {
        uploadType: uploadType || 'text',
        submittedText,
        fileUrl
      },
      user,
      guestSessionId
    );

    return res.status(202).json(result);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({
      error: {
        code: err.code || 'SUBMISSION_FAILED',
        message: err.message || 'Could not process verification submission.',
        resetsAt: err.resetsAt
      }
    });
  }
});

// 1b. Identifier-Independent Reverse Lookup (FAISS Semantic Retrieval + Multimodal Forensics)
verifyRouter.post('/reverse-lookup', async (req, res) => {
  try {
    const { uploadType, submittedText, fileUrl } = req.body;
    if (!submittedText && !fileUrl) {
      return res.status(400).json({
        error: {
          code: 'MISSING_INPUT',
          message: 'Either text content (submittedText) or a file/image URL (fileUrl) must be provided for reverse lookup.'
        }
      });
    }

    const token = req.headers.authorization;
    const user = authService.validateToken(token);
    const guestSessionId = (req.headers['x-guest-session-id'] as string) || req.ip || 'guest-default';

    const result = await verificationService.reverseLookup(
      {
        uploadType: uploadType || 'text',
        submittedText,
        fileUrl
      },
      user,
      guestSessionId
    );

    return res.json(result);
  } catch (err: any) {
    const status = err.status || 400;
    return res.status(status).json({
      error: {
        code: err.code || 'REVERSE_LOOKUP_FAILED',
        message: err.message || 'Could not complete reverse lookup.',
        resetsAt: err.resetsAt
      }
    });
  }
});

// 2. Poll Job Status
verifyRouter.get('/jobs/:jobId', (req, res) => {
  try {
    const status = verificationService.getJobStatus(req.params.jobId);
    return res.json(status);
  } catch (err: any) {
    return res.status(err.status || 404).json({ error: { code: err.code || 'NOT_FOUND', message: err.message } });
  }
});

// 3. Get Full Evidence Report
verifyRouter.get('/reports/:reportId', (req, res) => {
  try {
    const report = verificationService.getReport(req.params.reportId);
    return res.json({ report });
  } catch (err: any) {
    return res.status(err.status || 404).json({ error: { code: err.code || 'NOT_FOUND', message: err.message } });
  }
});

// 4. AF-09: File Human Review Dispute
verifyRouter.post('/reports/:reportId/dispute', (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = authService.validateToken(token);
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'You must be signed in to dispute a verification result.' } });
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: { code: 'INVALID_REASON', message: 'A detailed reason (min 10 characters) is required for human dispute escalation.' } });
    }

    const review = verificationService.fileDispute(req.params.reportId, user, reason);
    return res.status(201).json({ message: 'Dispute filed successfully and escalated to the Senior Human Review Queue.', review });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'DISPUTE_FAILED', message: err.message } });
  }
});

// 5. User Verification History (Doc 3 §11)
verifyRouter.get('/history', (req, res) => {
  const token = req.headers.authorization;
  const user = authService.validateToken(token);
  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required for user history.' } });
  }

  const reports = verificationService.getUserHistory(user.id);
  return res.json({ history: reports });
});
