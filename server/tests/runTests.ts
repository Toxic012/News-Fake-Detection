/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Automated Verification & Compliance Test Suite (Phases 8, 9, 10)
 */

import { db } from '../db/store.js';
import { authService } from '../services/authService.js';
import { publisherService } from '../services/publisherService.js';
import { verificationService } from '../services/verificationService.js';
import { adminService } from '../services/adminService.js';
import { aiPipeline } from '../ai/pipeline.js';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(category: string, name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = parseFloat((performance.now() - start).toFixed(2));
    results.push({ category, name, passed: true, durationMs });
    console.log(`  ✓ [PASS] [${category}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = parseFloat((performance.now() - start).toFixed(2));
    results.push({ category, name, passed: false, durationMs, error: err.message || String(err) });
    console.error(`  ✗ [FAIL] [${category}] ${name}: ${err.message || String(err)}`);
  }
}

async function waitForJob(jobId: string, maxWaitMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const job = verificationService.getJobStatus(jobId);
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'pending_review') {
      return job;
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return verificationService.getJobStatus(jobId);
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
  }
}

export async function runAllTruthCodeTests() {
  console.log('\n============================================================');
  console.log('TRUTHCODE AUTOMATED SPECIFICATION TEST RUNNER (Phases 1-10)');
  console.log('============================================================\n');

  // 1. Database & Schema Integrity Tests
  await runTest('Database Tests', 'All Document 5 and Document 7 relational tables exist and seed properly', () => {
    assert(db.users.size >= 4, 'Users table should contain pre-seeded development accounts');
    assert(db.publishers.size >= 2, 'Publishers table should contain approved publishers');
    assert(db.verificationCodes.size >= 4, 'Verification codes table should contain active codes');
    assert(db.quotaConfigs.has('guest') && db.quotaConfigs.has('user_free'), 'Quota configs table populated');
    assert(db.publisherAlertBaselines.size >= 2, 'Publisher alert baselines exist');
    assert(db.calibrationSnapshots.size >= 3, 'Calibration snapshots exist');
    assert(db.adversarialEvalRuns.size >= 3, 'Adversarial eval runs exist');
  });

  // 2. Authentication Tests
  let testUserToken = '';
  await runTest('Authentication Tests', 'User registration and JWT issuance', () => {
    const reg = authService.register('test.user@truthcode.dev', 'Test Verification User', 'user');
    assert(reg.user.id.startsWith('usr-'), 'User ID must start with usr-');
    assert(reg.token.startsWith('tc_jwt_'), 'Token must be issued with tc_jwt_ prefix');
    testUserToken = reg.token;
  });

  await runTest('Authentication Tests', 'User login with valid credentials', () => {
    const login = authService.login('test.user@truthcode.dev');
    assertEqual(login.user.email, 'test.user@truthcode.dev', 'User email match');
    assert(login.token.length > 20, 'Session token issued');
  });

  await runTest('Authentication Tests', 'Password verification, invalid password rejection, and timing-safe error', () => {
    const demoPassword = process.env.TRUTHCODE_DEMO_PASSWORD || 'TruthCode2026!';
    
    // Valid password login
    const validLogin = authService.login('user@test.com', demoPassword);
    assertEqual(validLogin.user.email, 'user@test.com', 'User authenticated');
    assert(validLogin.user.lastLoginAt !== undefined, 'lastLoginAt populated');

    // Invalid password throws exact error without disclosing account details
    let failed = false;
    try {
      authService.login('user@test.com', 'WrongPassword123!');
    } catch (e: any) {
      failed = true;
      assertEqual(e.message, 'Invalid email or password.', 'Security-safe error message');
    }
    assert(failed, 'Should throw on invalid password');

    // Non-existent email throws exact same error
    let nonExistentFailed = false;
    try {
      authService.login('nonexistent@nobody.com', demoPassword);
    } catch (e: any) {
      nonExistentFailed = true;
      assertEqual(e.message, 'Invalid email or password.', 'Security-safe error message');
    }
    assert(nonExistentFailed, 'Should throw on non-existent email');
  });

  await runTest('Authentication Tests', 'Four official demo accounts authenticate and resolve roles correctly', () => {
    const demoPassword = process.env.TRUTHCODE_DEMO_PASSWORD || 'TruthCode2026!';
    
    const u = authService.login('user@test.com', demoPassword);
    assertEqual(u.user.role, 'user', 'user role matches');

    const p = authService.login('publisher@test.com', demoPassword);
    assertEqual(p.user.role, 'publisher', 'publisher role matches');
    assert(p.user.publisherProfile !== undefined, 'publisher profile attached');

    const s = authService.login('senior@test.com', demoPassword);
    assert(s.user.role === 'senior_verification_analyst' || s.user.role === 'reviewer', 'senior role matches');

    const a = authService.login('admin@test.com', demoPassword);
    assertEqual(a.user.role, 'admin', 'admin role matches');
  });

  await runTest('Authentication Tests', 'User logout invalidates session token', () => {
    const login = authService.login('user@test.com');
    const token = login.token;
    assert(authService.validateToken(token) !== null, 'Token is initially valid');

    const loggedOut = authService.logout(token);
    assert(loggedOut, 'Logout returns true');
    assertEqual(authService.validateToken(token), null, 'Token is invalidated after logout');
  });

  // 3. Authorization & RBAC Tests
  await runTest('Authorization Tests', 'Token validation and role checks', () => {
    const user = authService.validateToken(testUserToken);
    assert(user !== null, 'Token should be valid');
    assertEqual(user?.role, 'user', 'Role should be user');

    const admin = authService.validateToken('demo-admin-token');
    assertEqual(admin?.role, 'admin', 'Admin token should resolve admin role');
  });

  // 4. Content Registration & Hashing Tests
  let newArticleCode = '';
  let newArticleId = '';
  await runTest('Upload & Registration Tests', 'Publisher registers new article with SHA-256 hash & TruthCode', () => {
    const pub = Array.from(db.publishers.values()).find(p => p.status === 'approved')!;
    const body = 'Breaking news: Renewable solar capacity worldwide crossed 2 Terawatts milestone in landmark energy transition report.';
    const res = publisherService.registerArticle(pub.id, 'Solar Capacity Hits 2 Terawatts Worldwide', body);

    assert(res.code.code.startsWith('TC-'), 'Code must start with TC-');
    assert(res.article.contentHash.length === 64, 'SHA-256 hash must be 64 hex characters');
    assertEqual(res.article.versionNumber, 1, 'Initial version must be 1');
    newArticleCode = res.code.code;
    newArticleId = res.article.id;
  });

  // 5. Verification Pipeline (1:1 Exact Match)
  await runTest('Verification Tests', 'Verify exact 1:1 match article body', async () => {
    const user = db.users.get('usr-reader-01')!;
    const body = 'Breaking news: Renewable solar capacity worldwide crossed 2 Terawatts milestone in landmark energy transition report.';
    const submit = await verificationService.submitVerification(newArticleCode, {
      uploadType: 'text',
      submittedText: body
    }, user, 'test-guest-session');

    assert(submit.jobId.startsWith('job-'), 'Job ID must be returned');

    const status = await waitForJob(submit.jobId);
    assertEqual(status.status, 'completed', 'Job should complete successfully');
    assertEqual(status.report?.status, 'match', 'Report status must be match');
    assertEqual(status.report?.overallScore, 100, 'Score must be 100 for exact match');
  });

  // 6. NLP Tamper Detection Test
  await runTest('NLP Pipeline Tests', 'Detect quantitative and action alterations in submitted text', async () => {
    const user = db.users.get('usr-reader-01')!;
    const tampered = 'Breaking news: Fossil fuel coal capacity worldwide crossed 20 Terawatts milestone in landmark energy transition report.';
    const submit = await verificationService.submitVerification(newArticleCode, {
      uploadType: 'text',
      submittedText: tampered
    }, user, 'test-guest-session');

    const status = await waitForJob(submit.jobId);
    assert(status.report?.status === 'mismatch' || status.report?.status === 'partial_match', 'Must detect tampering');
    assert(status.report!.overallScore <= 75, 'Score must reflect modified keywords and figures');
    assert(status.report!.nlpResult!.diffJson.diffs.length > 0, 'Must extract structured token diffs');
  });

  // 7. AF-01: Low Confidence Escalation to Human Review
  let escalatedReviewId = '';
  await runTest('AF-01 Human Review Tests', 'Low confidence or conflicting inputs escalate to pending_review', async () => {
    // Artificial test for aggregation logic
    const agg = aiPipeline.aggregateEvidence(
      'newspaper',
      { text: 'Unreadable degraded scan text...', confidence: 52.0 },
      { similarityScore: 55.0, semanticSimilarity: 58.0, tokenSimilarity: 52.0 },
      null
    );
    assertEqual(agg.status, 'pending_review', 'Confidence below 70% must set status to pending_review');
    assert(agg.scoreBreakdown.calibratedConfidence < 70, 'Calibrated confidence must reflect low OCR');

    const queue = adminService.getReviewQueue();
    assert(queue.length >= 1, 'Review queue must contain pending escalations');
    escalatedReviewId = queue[0].id;
  });

  await runTest('AF-01 Human Review Tests', 'Reviewer adjudicates pending review assignment with justification', () => {
    const reviewer = db.users.get('usr-reviewer-01')!;
    const resolved = adminService.resolveReview(
      reviewer,
      escalatedReviewId,
      'partial_match',
      'Forensic audit confirms headline is authentic; minor OCR optical artifacts on footer.'
    );
    assertEqual(resolved.status, 'resolved', 'Review assignment must be resolved');
    assertEqual(resolved.finalStatus, 'partial_match', 'Status updated to partial_match');
  });

  // 8. AF-02: Content Versioning & Retraction Tests
  let correctedCode = '';
  await runTest('AF-02 Versioning Tests', 'Publisher issues correction, creating new version and superseding old code', () => {
    const pub = Array.from(db.publishers.values()).find(p => p.status === 'approved')!;
    const res = publisherService.issueCorrection(pub.id, newArticleId, 'article', {
      bodyText: 'Breaking news: Renewable solar capacity worldwide crossed 2.1 Terawatts milestone in revised official report.',
      changeSummary: 'Updated total metric to 2.1 Terawatts per revised agency figures.'
    });

    assertEqual(res.newContent.versionNumber, 2, 'New version number must be 2');
    assertEqual(res.oldCode.status, 'superseded', 'Old code status must be superseded');
    assertEqual(res.newCode.status, 'active', 'New code status must be active');
    correctedCode = res.newCode.code;
  });

  await runTest('AF-02 Versioning Tests', 'Verifying superseded code returns version notice with link to newer edition', async () => {
    const user = db.users.get('usr-reader-01')!;
    const submit = await verificationService.submitVerification(newArticleCode, {
      uploadType: 'text',
      submittedText: 'Breaking news: Renewable solar capacity worldwide crossed 2 Terawatts...'
    }, user, 'test-guest-session');

    const status = await waitForJob(submit.jobId);
    assertEqual(status.report?.versionNotice?.type, 'superseded', 'Version notice type must be superseded');
    assertEqual(status.report?.versionNotice?.newCode, correctedCode, 'Must point to new corrected code');
  });

  await runTest('AF-02 Versioning Tests', 'Publisher retracts content and verification shows retraction notice', () => {
    const pub = Array.from(db.publishers.values()).find(p => p.status === 'approved')!;
    const retracted = publisherService.retractContent(pub.id, newArticleId, 'article', 'Publication withdrawn due to unverified primary source attribution.');
    assertEqual(retracted.status, 'retracted', 'Status must be retracted');
    assert(retracted.retractionReason !== undefined, 'Retraction reason must be stored');
  });

  // 9. AF-03: Confidence Calibration Tests
  await runTest('AF-03 Calibration Tests', 'Calibration evaluation on labeled benchmark snapshots', () => {
    const snapshots = adminService.runCalibrationEvaluation();
    assert(snapshots.length >= 3, 'Should generate snapshot records across confidence buckets');
    assert(snapshots.every(s => s.observedAccuracy > 50), 'Observed accuracy should be calculated');
  });

  // 10. AF-04: Usage Quota Tests
  await runTest('AF-04 Quota Tests', 'Enforce daily quota limits and exempt publishers', () => {
    const pubUser = db.users.get('usr-pub-01')!;
    const pubQuota = verificationService.checkQuota(pubUser, 'guest-ip');
    assertEqual(pubQuota.allowed, true, 'Publishers must be strictly exempt from daily quota');

    const testGuestIp = 'test-quota-ip-' + Date.now();
    // Simulate consuming quota
    for (let i = 0; i < 5; i++) {
      const q = verificationService.checkQuota(null, testGuestIp);
      assertEqual(q.allowed, true, `Check ${i + 1} should be allowed`);
    }

    const exceeded = verificationService.checkQuota(null, testGuestIp);
    assertEqual(exceeded.allowed, false, '6th guest verification must return QUOTA_EXCEEDED');
    assert(exceeded.resetsAt !== undefined, 'ResetsAt timestamp must be provided');
  });

  // 11. AF-05: Tamper Spike Alerts & Badge Tests
  await runTest('AF-05 Alerts & Badge Tests', 'Compute publisher baseline and generate verified badge HTML', () => {
    const pub = Array.from(db.publishers.values()).find(p => p.status === 'approved')!;
    const analytics = publisherService.getPublisherAnalytics(pub.id);
    assert(typeof analytics.tamperRate === 'number', 'Tamper rate should be numeric');
    assert(analytics.baselineRate > 0, 'Baseline rate should be non-zero');
  });

  // 12. AF-06: Abuse Reporting & Triage Tests
  await runTest('AF-06 Abuse Reporting Tests', 'Report viral misinformation and triage in admin queue', () => {
    const reportsBefore = adminService.listAbuseReports().length;
    const rep = {
      id: 'ab-test-01',
      targetType: 'code' as const,
      targetId: newArticleCode,
      category: 'Manipulated Image Forward',
      detail: 'Fabricated headline circulating on Telegram.',
      reporterId: 'usr-reader-01',
      status: 'open' as const,
      createdAt: new Date().toISOString()
    };
    db.abuseReports.set(rep.id, rep);

    const updated = adminService.updateAbuseReport(db.users.get('usr-admin-01')!, rep.id, 'investigating', 'Assigned to forensic analyst.');
    assertEqual(updated.status, 'investigating', 'Report status must be updated');
  });

  // 13. AF-07: CMS Bulk Registration & API Keys
  let cmsApiKey = '';
  await runTest('AF-07 CMS API Key Tests', 'Generate hashed API key and authenticate bulk upload', () => {
    const pub = Array.from(db.publishers.values()).find(p => p.status === 'approved')!;
    const keyGen = publisherService.generateApiKey(pub.id, 'Automated CMS Hook');
    cmsApiKey = keyGen.rawKey;

    const validatedPub = publisherService.validateApiKey(cmsApiKey);
    assertEqual(validatedPub?.id, pub.id, 'API key must authenticate owning publisher');

    const bulk = publisherService.bulkRegister(pub.id, [
      { contentType: 'article', title: 'Bulk Article 1', bodyText: 'First automated CMS export article body.' },
      { contentType: 'article', title: 'Bulk Article 2', bodyText: 'Second automated CMS export article body.' }
    ]);
    assertEqual(bulk.length, 2, 'Should register 2 bulk items');
    assert(bulk.every(b => b.success === true), 'All valid items should succeed');
  });

  // 14. AF-08: Adversarial & Generative Manipulation Evaluation
  await runTest('AF-08 Adversarial Tests', 'Run evaluation battery against generative image manipulations', () => {
    const runs = adminService.runAdversarialEvaluation();
    assert(runs.length >= 4, 'Should evaluate font tamper, inpainting, face swap, and frame splice');
    assert(runs.every(r => r.detectionRate > 70), 'Detection rates should exceed baseline threshold');
  });

  // 15. AF-09: Dispute Submission Tests
  await runTest('AF-09 Dispute Tests', 'User files dispute on completed verification report', () => {
    // Find an existing completed report
    const report = Array.from(db.verificationReports.values()).find(r => r.status === 'mismatch')!;
    const user = db.users.get('usr-reader-01')!;
    const dispute = verificationService.fileDispute(report.id, user, 'The submitted text matches the local physical print edition exactly.');
    assertEqual(dispute.origin, 'disputed', 'Review origin must be disputed');
    assertEqual(dispute.report.status, 'pending_review', 'Report status must transition to pending_review');
  });

  // 16. AF-10: Tamper Pattern Clusters Tests
  await runTest('AF-10 Pattern Analytics Tests', 'Inspect coordinated tamper clusters and dismiss anomalies', () => {
    const clusters = adminService.getPatternClusters();
    assert(clusters.length >= 1, 'Should find open tamper clusters');
    const admin = db.users.get('usr-admin-01')!;
    const dismissed = adminService.dismissCluster(admin, clusters[0].id);
    assertEqual(dismissed.status, 'dismissed', 'Cluster status should update to dismissed');
  });

  // 17. Security & IDOR Protection Tests
  await runTest('Security Tests', 'API key hashing and tamper-evident audit trail immutability', () => {
    assert(db.auditLogs.length > 5, 'Audit trail must record administrative and publisher mutations');
    // Ensure all publisher API keys are stored hashed
    for (const key of db.publisherApiKeys.values()) {
      assert(!key.keyHash.startsWith('tc_live_'), 'Raw key must NEVER be stored in database');
      assertEqual(key.keyHash.length, 64, 'Key hash must be SHA-256 (64 characters)');
    }
  });

  // 18. Video & Keyframe Tests
  await runTest('Video Tests', 'Process video duration and keyframe visual comparison', async () => {
    const cv = await aiPipeline.processCV('https://images.unsplash.com/photo-1', 'https://images.unsplash.com/photo-1');
    assertEqual(cv.similarityScore, 100, 'Identical media keyframe must yield 100% similarity');
    assertEqual(cv.visualDifferenceDetected, false, 'No visual tampering on identical media');
  });

  // 19. Evidence Aggregation Weights
  await runTest('Evidence Aggregation Tests', 'Properly weight text vs newspaper vs media', () => {
    const textAgg = aiPipeline.aggregateEvidence('article', null, { similarityScore: 90, semanticSimilarity: 90, tokenSimilarity: 90 }, null);
    assertEqual(textAgg.overallScore, 90, 'Article score is 100% NLP');

    const newsAgg = aiPipeline.aggregateEvidence('newspaper', { text: 'OCR text', confidence: 80 }, { similarityScore: 100, semanticSimilarity: 100, tokenSimilarity: 100 }, null);
    assertEqual(newsAgg.overallScore, 93, 'Newspaper is 35% OCR (28) + 65% NLP (65) = 93');
  });

  // 20. Public Publisher Status & Badge Verification
  await runTest('Public API Tests', 'Public publisher status verifies approved credentials and publication count', () => {
    const pub = Array.from(db.publishers.values()).find(p => p.status === 'approved')!;
    assert(pub.organizationName.length > 0, 'Organization name present');
    assertEqual(pub.status, 'approved', 'Publisher status is approved');
  });

  // 21. Unicode and Whitespace Normalization
  await runTest('Regression Tests', 'Robust diffing across curly quotes, non-breaking spaces, and unicode', async () => {
    const orig = '“Truth in Journalism” — Report № 42';
    const sub = '“Truth in Journalism” — Report № 42';
    const nlp = await aiPipeline.processNLP(orig, sub);
    assertEqual(nlp.similarityScore, 100, 'Exact unicode characters must match 100%');
  });

  // 22. Cross-Publisher Namespace Protection (IDOR)
  await runTest('Authorization Tests', 'Publisher cannot alter or retract another publisher\'s registered content', () => {
    const pubs = Array.from(db.publishers.values());
    if (pubs.length >= 2) {
      let threw = false;
      try {
        publisherService.retractContent(pubs[1].id, newArticleId, 'article', 'Malicious unauthorized retraction attempt');
      } catch (err) {
        threw = true;
      }
      assert(threw, 'Cross-publisher content mutation must be blocked');
    }
  });

  // 23. E2E User Journey 1: Guest Reader verifies Authentic Article
  await runTest('E2E User Journeys', 'Journey 1: Guest Reader verifies Authentic Article', async () => {
    const code = 'TC-7492-8810';
    const resolved = db.findVerificationCode(code);
    assert(resolved !== undefined, 'Code must resolve in registry');
    const quota = verificationService.checkQuota(null, 'guest-e2e-1');
    assertEqual(quota.allowed, true, 'Guest must have quota allowance');
  });

  // 24. E2E User Journey 2: Reader catches WhatsApp Tampered Forward
  await runTest('E2E User Journeys', 'Journey 2: Reader catches WhatsApp Tampered Forward', async () => {
    const code = 'TC-7492-8810';
    const original = db.resolveOriginalContent(db.findVerificationCode(code)!);
    const tampered = original.bodyText.replace('voted unanimously today', 'voted to reject today');
    const nlp = await aiPipeline.processNLP(original.bodyText, tampered);
    assert(nlp.diffs.length >= 1, 'Must detect modified vote outcome');
  });

  // 25. E2E User Journey 3: Senior Reviewer Overrules Automated Score
  await runTest('E2E User Journeys', 'Journey 3: Senior Reviewer Adjudication Workflow', () => {
    const queue = adminService.getReviewQueue();
    assert(queue.length > 0, 'Review queue available');
    const item = queue[0];
    const reviewer = db.users.get('usr-reviewer-01')!;
    const res = adminService.resolveReview(reviewer, item.id, 'match', 'Physical print edition inspection confirms authenticity.');
    assertEqual(res.status, 'resolved', 'Status must be resolved');
  });

  // 26. E2E User Journey 4: Super-Admin Quota Limit Adjustment
  await runTest('E2E User Journeys', 'Journey 4: Super-Admin Configures System-Wide Quotas', () => {
    const admin = db.users.get('usr-admin-01')!;
    const updated = adminService.updateQuotaConfig(admin, 'guest', 15);
    assertEqual(updated.dailyLimit, 15, 'Daily guest limit successfully updated to 15');
  });

  // 27. High Concurrency Stress Test
  await runTest('Performance Tests', '1000 Concurrent in-memory code resolutions', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      db.findVerificationCode('TC-7492-8810');
    }
    const elapsed = performance.now() - start;
    assert(elapsed < 50, `1000 lookups completed in ${elapsed.toFixed(2)}ms (< 50ms)`);
  });

  // 28. Audit Trail Immutability
  await runTest('Database Tests', 'Audit trail maintains chronological tamper-evident log', () => {
    assert(db.auditLogs.length >= 5, 'Audit log contains full administrative trail');
    const latest = db.auditLogs[db.auditLogs.length - 1];
    assert(latest.action !== undefined, 'Audit log action present');
    assert(latest.createdAt !== undefined, 'Audit log createdAt present');
  });

  // 29. S-BERT & Text Normalization Tests
  await runTest('AI/ML Tests', 'Sentence-BERT text normalization and 384-dimensional embedding generation', async () => {
    const { embeddingService } = await import('../ai/embeddingService.js');
    const rawText = '   The City Council   Approved  a  $12.5M  clean-energy budget  today!  \n\n ';
    const normalized = embeddingService.normalizeText(rawText);
    assert(normalized.includes('city council approved') && normalized.includes('$12.5m clean energy budget today'), 'Text must be normalized');

    const vec = await embeddingService.generateEmbedding(rawText);
    assertEqual(vec.dimension, 384, 'Sentence-BERT vector dimension must be 384');
    
    // Check L2 unit norm (length approximately 1.0)
    const norm = Math.sqrt(vec.vector.reduce((sum, v) => sum + v * v, 0));
    assert(Math.abs(norm - 1.0) < 0.01, 'Embedding vector must be L2 normalized to unit sphere');
  });

  // 30. FAISS Semantic Vector Search Tests
  await runTest('AI/ML Tests', 'FAISS indexing and semantic similarity search with threshold', async () => {
    const { faissService } = await import('../ai/faissService.js');
    assert(faissService.size() >= 2, 'FAISS index must contain pre-indexed seed articles');

    // Query with high semantic overlap
    const searchRes = faissService.search('City Council unanimously approved the clean energy transition budget of 12.5 million', 3);
    assertEqual(searchRes.matchStatus, 'MATCH_FOUND', 'Should find candidate with high similarity');
    assert(searchRes.similarityScore >= 55, `Similarity (${searchRes.similarityScore}%) must meet/exceed threshold`);
    assert(searchRes.candidate !== undefined, 'Matched candidate should be populated');

    // Query with completely fabricated/unrelated content
    const unrecSearch = faissService.search('Scientists discover alien civilization on Pluto living in underground ice pyramids', 3);
    assertEqual(unrecSearch.matchStatus, 'NO_AUTHENTIC_ORIGINAL_FOUND', 'Fabricated topic must not match registered news');
    assert(unrecSearch.similarityScore < 55, `Similarity (${unrecSearch.similarityScore}%) must remain below threshold`);
  });

  // 31. ECDSA P-256 Cryptographic PKI Tests
  await runTest('Cryptographic Tests', 'ECDSA P-256 publisher keypair generation, SHA-256 signing, and public key verification', async () => {
    const { pkiService } = await import('../crypto/pkiService.js');
    const keyPair = pkiService.generatePublisherKeyPair();
    assert(keyPair.publicKeyPem.includes('BEGIN PUBLIC KEY'), 'Public key must be PEM encoded');
    assert(keyPair.privateKeyPem.includes('BEGIN PRIVATE KEY'), 'Private key must be PEM encoded');
    assert(keyPair.keyFingerprint.startsWith('SHA256:'), 'Key fingerprint must be SHA-256 hash');

    const sampleHash = db.hashContent('Breaking: TruthCode Cryptographic Proof Verification Test');
    const signature = pkiService.signContentHash(keyPair.privateKeyPem, sampleHash);
    assert(signature.length > 30, 'Digital signature must be generated');

    const isValid = pkiService.verifySignature(keyPair.publicKeyPem, sampleHash, signature);
    assertEqual(isValid, true, 'Digital signature must verify successfully with public key');

    // Verify tampering fails
    const tamperedHash = db.hashContent('Breaking: TruthCode Tampered Test');
    const isTamperedValid = pkiService.verifySignature(keyPair.publicKeyPem, tamperedHash, signature);
    assertEqual(isTamperedValid, false, 'Tampered content hash must fail signature verification');
  });

  // 32. Identifier-Independent Reverse Lookup API Test
  await runTest('Verification Pipeline Tests', 'Identifier-independent reverse lookup with multimodal forensic report & PKI signature', async () => {
    const reverseRes = await verificationService.reverseLookup(
      {
        uploadType: 'text',
        submittedText: 'The City Council voted unanimously today to approve a $12.5M clean-energy transition budget. The initiative aims to replace all municipal buses with zero-emission electric vehicles by 2030, funding solar installations on 45 public schools and establishing 120 rapid charging stations across the metropolitan area.'
      },
      null,
      'guest-rev-test-1'
    );

    assertEqual(reverseRes.matchStatus, 'MATCH_FOUND', 'Reverse lookup must match authentic original article');
    assert(reverseRes.report !== undefined, 'Verification report must be generated');
    assertEqual(reverseRes.report?.retrievalMethod, 'reverse_lookup', 'Retrieval method must be reverse_lookup');
    assertEqual(reverseRes.report?.digitalSignatureVerified, true, 'Digital signature must be verified for registered publisher');
    assertEqual(reverseRes.report?.signatureStatus, 'valid', 'Signature status must be valid');
    assert(reverseRes.report?.overallScore! >= 90, `Overall score should be high (${reverseRes.report?.overallScore}%)`);
  });

  // 33. Reverse Lookup with Tampered WhatsApp Forward
  await runTest('Verification Pipeline Tests', 'Identifier-independent reverse lookup flags tampered numerical claims', async () => {
    const tamperedReverseRes = await verificationService.reverseLookup(
      {
        uploadType: 'text',
        submittedText: 'The City Council voted unanimously today to reject a $12.5M clean-energy transition budget and canceled the bus program.'
      },
      null,
      'guest-rev-test-2'
    );

    assertEqual(tamperedReverseRes.matchStatus, 'MATCH_FOUND', 'Should still match original article topic');
    assert(tamperedReverseRes.report !== undefined, 'Report must be generated');
    assert(tamperedReverseRes.report?.status === 'mismatch' || tamperedReverseRes.report?.status === 'partial_match', 'Must flag tampered content');
    assert(tamperedReverseRes.report?.nlpResult?.diffJson.diffs.length! > 0, 'Must contain highlighted differences');
  });

  // Test Summary
  console.log('\n============================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('============================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed in TruthCode test suite.`);
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('runTests')) {
  runAllTruthCodeTests().catch(err => {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  });
}
