/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Admin Oversight & Operations API Routes (/api/v1/admin/*)
 */

import { Router } from 'express';
import crypto from 'crypto';
import { adminService } from '../services/adminService.js';
import { authService } from '../services/authService.js';
import { db } from '../db/store.js';

export const adminRouter = Router();

// Middleware: Helper to test role
function isRoleMatch(userRole: string, allowedRoles: string[]): boolean {
  const norm = (userRole || '').toLowerCase();
  return allowedRoles.some(r => {
    const nr = r.toLowerCase();
    if (nr === 'reviewer' || nr === 'senior_verification_analyst') {
      return norm === 'reviewer' || norm === 'senior_verification_analyst';
    }
    return norm === nr;
  });
}

// Middleware: Require Admin or Senior Verification Analyst / Reviewer role
function requireAdminOrReviewer(req: any, res: any, next: any) {
  const token = req.headers.authorization;
  const user = authService.validateToken(token);
  if (!user || !isRoleMatch(user.role, ['admin', 'reviewer', 'senior_verification_analyst'])) {
    return res.status(401).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to access this area.' } });
  }
  req.user = user;
  next();
}

function requireAdminOnly(req: any, res: any, next: any) {
  const token = req.headers.authorization;
  const user = authService.validateToken(token);
  if (!user || !isRoleMatch(user.role, ['admin'])) {
    return res.status(401).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to access this area.' } });
  }
  req.user = user;
  next();
}

// 0. Platform Health & Overview Statistics
adminRouter.get('/stats', requireAdminOrReviewer, (req, res) => {
  const totalPublishers = db.publishers.size;
  const pendingPublishers = Array.from(db.publishers.values()).filter(p => p.status === 'pending').length;
  const totalUsers = db.users.size;
  const totalArticles = db.articles.size + db.newspapers.size;
  const totalVerifications = db.verificationReports.size;
  const modifiedReports = Array.from(db.verificationReports.values()).filter(r => r.status === 'mismatch' || r.status === 'partial_match').length;
  const pendingReviews = Array.from(db.reviewAssignments.values()).filter(a => a.status === 'pending').length;
  const securityEvents = db.auditLogs.filter(l => l.action.includes('ALERT') || l.action.includes('SUSPEND') || l.action.includes('ABUSE')).length;

  return res.json({
    totalPublishers,
    pendingPublishers,
    totalUsers,
    totalArticles,
    totalVerifications,
    modifiedReports,
    pendingReviews,
    securityEvents,
    systemStatus: 'healthy',
    faissDimension: 384,
    pkiAlgorithm: 'ECDSA-P256',
    timestamp: new Date().toISOString()
  });
});

// 1. Pending & All Publishers (FR-A1)
adminRouter.get('/publishers', requireAdminOrReviewer, (req, res) => {
  const publishers = Array.from(db.publishers.values());
  return res.json({ publishers });
});

const handlePublisherStatusUpdate = (req: any, res: any) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Status must be approved, rejected, or suspended.' } });
    }
    const updated = adminService.updatePublisherStatus(req.user, req.params.id, status);
    return res.json({ publisher: updated });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
};

adminRouter.post('/publishers/:id/status', requireAdminOnly, handlePublisherStatusUpdate);
adminRouter.patch('/publishers/:id', requireAdminOnly, handlePublisherStatusUpdate);
adminRouter.post('/publishers/:id', requireAdminOnly, handlePublisherStatusUpdate);

// 2. Human Review Queue (AF-01 & AF-09)
adminRouter.get('/review-queue', requireAdminOrReviewer, (req, res) => {
  const queue = adminService.getReviewQueue();
  return res.json({ queue, items: queue });
});

adminRouter.post('/review-queue/:id/resolve', requireAdminOrReviewer, (req: any, res) => {
  try {
    const { finalStatus, justification } = req.body;
    if (!finalStatus || !justification) {
      return res.status(400).json({ error: { code: 'INVALID_DECISION', message: 'finalStatus and justification are required.' } });
    }
    const resolved = adminService.resolveReview(req.user, req.params.id, finalStatus, justification);
    return res.json({ review: resolved });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'RESOLUTION_FAILED', message: err.message } });
  }
});

// 3. Abuse Reports (AF-06)
adminRouter.get('/abuse-reports', requireAdminOrReviewer, (req, res) => {
  const reports = adminService.listAbuseReports();
  return res.json({ reports });
});

adminRouter.patch('/abuse-reports/:id', requireAdminOrReviewer, (req: any, res) => {
  try {
    const { status, adminNotes } = req.body;
    const updated = adminService.updateAbuseReport(req.user, req.params.id, status, adminNotes);
    return res.json({ report: updated });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

adminRouter.post('/abuse-reports/:id', requireAdminOrReviewer, (req: any, res) => {
  try {
    const { status, adminNotes } = req.body;
    const updated = adminService.updateAbuseReport(req.user, req.params.id, status, adminNotes);
    return res.json({ report: updated });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

// 4. Quota Configuration (AF-04)
adminRouter.get('/quota-config', requireAdminOnly, (req, res) => {
  const configs = adminService.getQuotaConfigs();
  return res.json({ configs });
});

adminRouter.put('/quota-config', requireAdminOnly, (req: any, res) => {
  try {
    const { tier, dailyLimit } = req.body;
    const updated = adminService.updateQuotaConfig(req.user, tier, Number(dailyLimit));
    return res.json({ config: updated });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'QUOTA_UPDATE_FAILED', message: err.message } });
  }
});

// 5. Confidence Calibration & Model Health (AF-03)
adminRouter.get('/calibration', requireAdminOrReviewer, (req, res) => {
  const snapshots = Array.from(db.calibrationSnapshots.values());
  return res.json({ snapshots });
});

adminRouter.post('/calibration/evaluate', requireAdminOnly, (req, res) => {
  const snapshots = adminService.runCalibrationEvaluation();
  return res.json({ snapshots });
});

adminRouter.get('/model-weights', requireAdminOrReviewer, (req, res) => {
  const snapshots = Array.from(db.calibrationSnapshots.values());
  const latest = snapshots[0];
  return res.json({
    weights: {
      ocrWeight: 0.20,
      nlpWeight: 0.50,
      cvWeight: 0.30,
      escalationThreshold: 70,
      version: latest?.weightingVersion || 'v1.0'
    },
    snapshots
  });
});

adminRouter.post('/model-weights', requireAdminOnly, (req: any, res) => {
  try {
    const { ocrWeight, nlpWeight, cvWeight, escalationThreshold, version } = req.body;
    db.logAudit(req.user.id, req.user.email, 'UPDATE_MODEL_WEIGHTS', 'MODEL_CALIBRATION', version, {
      ocrWeight, nlpWeight, cvWeight, escalationThreshold
    });
    return res.json({
      success: true,
      weights: {
        ocrWeight: Number(ocrWeight) || 0.20,
        nlpWeight: Number(nlpWeight) || 0.50,
        cvWeight: Number(cvWeight) || 0.30,
        escalationThreshold: Number(escalationThreshold) || 70,
        version: version || 'v1.1'
      }
    });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

// 6. Adversarial & Generative Manipulation Resilience (AF-08)
adminRouter.get('/adversarial', requireAdminOrReviewer, (req, res) => {
  const runs = Array.from(db.adversarialEvalRuns.values());
  return res.json({ runs, testSuite: runs });
});

adminRouter.post('/adversarial/evaluate', requireAdminOnly, (req, res) => {
  const runs = adminService.runAdversarialEvaluation();
  return res.json({ runs, testSuite: runs });
});

adminRouter.get('/adversarial-suite', requireAdminOrReviewer, (req, res) => {
  const runs = Array.from(db.adversarialEvalRuns.values());
  return res.json({ runs, testSuite: runs });
});

adminRouter.post('/adversarial-suite', requireAdminOnly, (req, res) => {
  const runs = adminService.runAdversarialEvaluation();
  return res.json({ runs, testSuite: runs });
});

// 7. Tamper Pattern Clusters (AF-10)
adminRouter.get('/patterns', requireAdminOrReviewer, (req, res) => {
  const clusters = adminService.getPatternClusters();
  return res.json({ clusters });
});

adminRouter.post('/patterns/:id/dismiss', requireAdminOrReviewer, (req: any, res) => {
  try {
    const dismissed = adminService.dismissCluster(req.user, req.params.id);
    return res.json({ cluster: dismissed });
  } catch (err: any) {
    return res.status(400).json({ error: { code: 'DISMISS_FAILED', message: err.message } });
  }
});

// 8. Audit Logs (FR-A4)
adminRouter.get('/audit-logs', requireAdminOnly, (req, res) => {
  return res.json({ logs: db.auditLogs });
});

// 9. All Users List (FR-A2)
adminRouter.get('/users', requireAdminOnly, (req, res) => {
  const users = Array.from(db.users.values());
  return res.json({ users });
});

// Create User (Admin)
adminRouter.post('/users', requireAdminOnly, (req: any, res) => {
  try {
    const { email, fullName, role, status, password, permissions } = req.body;
    if (!email || !fullName || !role) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email, Full Name, and Role are required.' } });
    }
    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: { code: 'USER_EXISTS', message: 'User with this email already exists.' } });
    }

    const salt = db.generateSalt();
    const newUser = {
      id: 'usr-' + crypto.randomBytes(6).toString('hex'),
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      role: role as any,
      status: status || 'active',
      salt,
      passwordHash: db.hashPassword(password || 'TruthCode2026!', salt),
      permissions: permissions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.users.set(newUser.id, newUser);
    db.logAudit(req.user.id, req.user.email, 'USER_CREATED', 'users', newUser.id, { role, email });

    return res.status(201).json({ user: newUser });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'CREATE_USER_FAILED', message: err.message } });
  }
});

// Update User (Admin)
adminRouter.patch('/users/:id', requireAdminOnly, (req: any, res) => {
  try {
    const user = db.users.get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    }
    const { role, status, fullName, permissions } = req.body;
    if (role) user.role = role;
    if (status) user.status = status;
    if (fullName) user.fullName = fullName;
    if (permissions) (user as any).permissions = permissions;
    user.updatedAt = new Date().toISOString();

    db.logAudit(req.user.id, req.user.email, 'USER_UPDATED', 'users', user.id, { role, status });
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'UPDATE_USER_FAILED', message: err.message } });
  }
});

// 10. Analyst Roles & Granular RBAC Permissions (Doc & Requirement 19)
adminRouter.get('/roles', requireAdminOrReviewer, (req, res) => {
  const roles = Array.from(db.analystRoles.values());
  return res.json({ roles });
});

adminRouter.post('/roles', requireAdminOnly, (req: any, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name || !description || !Array.isArray(permissions)) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Role name, description, and permissions list are required.' } });
    }

    const roleId = 'role-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const role = {
      id: roleId,
      name,
      description,
      permissions,
      userCount: 0,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.analystRoles.set(role.id, role);
    db.logAudit(req.user.id, req.user.email, 'ROLE_CREATED', 'analyst_roles', role.id, { name, permissions });
    return res.status(201).json({ role });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'CREATE_ROLE_FAILED', message: err.message } });
  }
});

adminRouter.patch('/roles/:id', requireAdminOnly, (req: any, res) => {
  try {
    const role = db.analystRoles.get(req.params.id);
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analyst role not found.' } });
    }
    const { name, description, permissions } = req.body;
    if (name) role.name = name;
    if (description) role.description = description;
    if (permissions && Array.isArray(permissions)) role.permissions = permissions;
    role.updatedAt = new Date().toISOString();

    db.logAudit(req.user.id, req.user.email, 'ROLE_UPDATED', 'analyst_roles', role.id, { permissions });
    return res.json({ role });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'UPDATE_ROLE_FAILED', message: err.message } });
  }
});

adminRouter.delete('/roles/:id', requireAdminOnly, (req: any, res) => {
  try {
    const role = db.analystRoles.get(req.params.id);
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found.' } });
    }
    if (role.isSystem) {
      return res.status(400).json({ error: { code: 'CANNOT_DELETE_SYSTEM_ROLE', message: 'System analyst roles cannot be deleted.' } });
    }
    db.analystRoles.delete(role.id);
    db.logAudit(req.user.id, req.user.email, 'ROLE_DELETED', 'analyst_roles', role.id, { name: role.name });
    return res.json({ success: true, message: `Role ${role.name} deleted.` });
  } catch (err: any) {
    return res.status(500).json({ error: { code: 'DELETE_ROLE_FAILED', message: err.message } });
  }
});
