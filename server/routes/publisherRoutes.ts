/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Publisher Content & Management API Routes (/api/v1/publisher/*)
 */

import { Router } from 'express';
import { authService } from '../services/authService.js';
import { publisherService } from '../services/publisherService.js';
import { db } from '../db/store.js';

export const publisherRouter = Router();

// Middleware: Authenticate Publisher (via JWT Bearer OR CMS API Key)
function requirePublisher(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] || authHeader;

  // 1. Try API Key
  if (apiKeyHeader) {
    const pub = publisherService.validateApiKey(apiKeyHeader as string);
    if (pub) {
      req.publisher = pub;
      req.user = db.users.get(pub.userId);
      return next();
    }
  }

  // 2. Try JWT Session Token
  const user = authService.validateToken(authHeader);
  if (user) {
    const roleNorm = (user.role || '').toLowerCase();
    if (roleNorm !== 'publisher' && roleNorm !== 'admin') {
      return res.status(401).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this area.'
        }
      });
    }

    req.user = user;
    if (user.publisherProfile) {
      req.publisher = user.publisherProfile;
    } else {
      // Find publisher by userId
      for (const p of db.publishers.values()) {
        if (p.userId === user.id) {
          req.publisher = p;
          break;
        }
      }
    }
    if (!req.publisher && roleNorm === 'admin') {
      // Admin proxying as default publisher
      req.publisher = Array.from(db.publishers.values())[0];
    }
    if (req.publisher) return next();
  }

  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED_PUBLISHER',
      message: 'Active verified Publisher authorization required.'
    }
  });
}

// 1. Get all content for current publisher
publisherRouter.get('/content', requirePublisher, (req: any, res) => {
  try {
    const content = publisherService.getPublisherContent(req.publisher.id);
    return res.json({ publisher: req.publisher, content });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'FETCH_ERROR', message: err.message } });
  }
});

// 2. Register single content (Article, Newspaper, Media)
publisherRouter.post('/content', requirePublisher, (req: any, res) => {
  try {
    const { contentType, title, bodyText, editionDate, fileUrl, mediaType, durationSeconds } = req.body;

    if (!contentType) {
      return res.status(400).json({ error: { code: 'MISSING_TYPE', message: 'contentType is required.' } });
    }

    if (contentType === 'article') {
      if (!title || !bodyText) {
        return res.status(400).json({ error: { code: 'INVALID_ARTICLE', message: 'Title and bodyText are required.' } });
      }
      const result = publisherService.registerArticle(req.publisher.id, title, bodyText, 'web');
      return res.status(201).json(result);
    } else if (contentType === 'newspaper') {
      if (!title || !editionDate || !fileUrl) {
        return res.status(400).json({ error: { code: 'INVALID_NEWSPAPER', message: 'Title, editionDate, and fileUrl are required.' } });
      }
      const result = publisherService.registerNewspaper(req.publisher.id, title, editionDate, fileUrl, bodyText || '', 'web');
      return res.status(201).json(result);
    } else if (contentType === 'media') {
      if (!fileUrl || !mediaType) {
        return res.status(400).json({ error: { code: 'INVALID_MEDIA', message: 'fileUrl and mediaType are required.' } });
      }
      const result = publisherService.registerMedia(req.publisher.id, mediaType, fileUrl, durationSeconds, 'web');
      return res.status(201).json(result);
    } else {
      return res.status(400).json({ error: { code: 'UNSUPPORTED_TYPE', message: 'Unsupported contentType.' } });
    }
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'REGISTRATION_FAILED', message: err.message } });
  }
});

// 3. AF-07: CMS Bulk Content Registration
publisherRouter.post('/content/bulk', requirePublisher, (req: any, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { code: 'INVALID_ITEMS', message: 'Items array is required for bulk upload.' } });
    }
    const results = publisherService.bulkRegister(req.publisher.id, items);
    return res.status(201).json({ count: results.length, results });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'BULK_FAILED', message: err.message } });
  }
});

// 4. AF-02: Issue Correction
publisherRouter.post('/content/:id/correct', requirePublisher, (req: any, res) => {
  try {
    const { contentType, title, bodyText, fileUrl, changeSummary } = req.body;
    if (!contentType || !changeSummary) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'contentType and changeSummary are required.' } });
    }
    const result = publisherService.issueCorrection(req.publisher.id, req.params.id, contentType, {
      title,
      bodyText,
      fileUrl,
      changeSummary
    });
    return res.status(201).json(result);
  } catch (err: any) {
    const isForbidden = err.message?.includes('another publisher') || err.message?.includes('privilege');
    return res.status(isForbidden ? 401 : 400).json({ error: { code: isForbidden ? 'FORBIDDEN' : 'CORRECTION_FAILED', message: err.message } });
  }
});

// 5. AF-02: Retract Content
publisherRouter.post('/content/:id/retract', requirePublisher, (req: any, res) => {
  try {
    const { contentType, retractionReason } = req.body;
    if (!contentType || !retractionReason) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'contentType and retractionReason are required.' } });
    }
    const code = publisherService.retractContent(req.publisher.id, req.params.id, contentType, retractionReason);
    return res.json({ message: 'Content retracted successfully.', code });
  } catch (err: any) {
    const isForbidden = err.message?.includes('another publisher') || err.message?.includes('privilege');
    return res.status(isForbidden ? 401 : 400).json({ error: { code: isForbidden ? 'FORBIDDEN' : 'RETRACTION_FAILED', message: err.message } });
  }
});

// 6. AF-02: Version Chain
publisherRouter.get('/content/:id/versions', (req, res) => {
  try {
    const contentType = (req.query.contentType as any) || 'article';
    const chain = publisherService.getVersionChain(req.params.id, contentType);
    return res.json({ chain });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'VERSION_FETCH_FAILED', message: err.message } });
  }
});

// 7. AF-07: API Key Management
publisherRouter.get('/api-keys', requirePublisher, (req: any, res) => {
  const keys: any[] = [];
  for (const k of db.publisherApiKeys.values()) {
    if (k.publisherId === req.publisher.id && !k.revokedAt) {
      keys.push(k);
    }
  }
  return res.json({ keys });
});

publisherRouter.post('/api-keys', requirePublisher, (req: any, res) => {
  try {
    const { label } = req.body;
    const result = publisherService.generateApiKey(req.publisher.id, label);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'API_KEY_ERROR', message: err.message } });
  }
});

publisherRouter.delete('/api-keys/:id', requirePublisher, (req: any, res) => {
  try {
    publisherService.revokeApiKey(req.publisher.id, req.params.id);
    return res.json({ message: 'API key revoked successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'REVOCATION_FAILED', message: err.message } });
  }
});

// 8. Analytics & Spike Alerts (FR-P7 & AF-05)
publisherRouter.get('/analytics', requirePublisher, (req: any, res) => {
  try {
    const analytics = publisherService.getPublisherAnalytics(req.publisher.id);
    return res.json(analytics);
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'ANALYTICS_ERROR', message: err.message } });
  }
});

// 10. ECDSA P-256 PKI Key Management
publisherRouter.get('/keys', requirePublisher, (req: any, res) => {
  const pub = req.publisher;
  return res.json({
    publisherId: pub.id,
    organizationName: pub.organizationName,
    publicKey: pub.publicKey || null,
    keyAlgorithm: pub.keyAlgorithm || 'ECDSA-P256',
    keyFingerprint: pub.keyFingerprint || null,
    hasPrivateKey: !!db.getPublisherPrivateKey(pub.id)
  });
});

publisherRouter.post('/keys/generate', requirePublisher, (req: any, res) => {
  try {
    const result = publisherService.generateOrRegisterKeys(req.publisher.id);
    return res.status(201).json({
      message: 'New ECDSA P-256 key pair generated and registered.',
      ...result
    });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'KEY_GEN_FAILED', message: err.message } });
  }
});

publisherRouter.post('/keys/register', requirePublisher, (req: any, res) => {
  try {
    const { publicKeyPem } = req.body;
    if (!publicKeyPem) {
      return res.status(400).json({ error: { code: 'MISSING_KEY', message: 'publicKeyPem is required.' } });
    }
    const result = publisherService.generateOrRegisterKeys(req.publisher.id, publicKeyPem);
    return res.status(200).json({
      message: 'Publisher public key registered successfully.',
      ...result
    });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'KEY_REG_FAILED', message: err.message } });
  }
});

