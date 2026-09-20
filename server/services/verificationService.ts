/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Verification Orchestration & Asynchronous AI Worker (Doc 1..7)
 */

import crypto from 'crypto';
import { db } from '../db/store.js';
import { aiPipeline } from '../ai/pipeline.js';
import { faissService } from '../ai/faissService.js';
import { pkiService } from '../crypto/pkiService.js';
import {
  VerificationReport, Upload, OCRResult, NLPResult, CVResult,
  VerificationJobStatusResponse, ReviewAssignment, VersionNotice, User
} from '../../src/types/index.js';

interface InFlightJob {
  jobId: string;
  uploadId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'pending_review';
  progress: number;
  stage: 'extracting_ocr' | 'comparing_nlp' | 'analyzing_cv' | 'aggregating_evidence' | 'calibrating' | 'vector_search';
  report?: VerificationReport;
  error?: { code: string; message: string; correlationId: string };
  createdAt: number;
}

export class VerificationService {
  private jobs: Map<string, InFlightJob> = new Map();

  /**
   * AF-04: Check & Increment Daily Usage Quota
   */
  public checkQuota(user: User | null, guestSessionId: string): { allowed: boolean; resetsAt?: string; currentCount?: number; limit?: number } {
    // Publishers are strictly exempt from daily verification quotas per BR-10
    if (user && (user.role === 'publisher' || user.role === 'admin' || user.role === 'reviewer')) {
      return { allowed: true };
    }

    const tier = user ? 'user_free' : 'guest';
    const subjectId = user ? user.id : guestSessionId;
    const limit = db.quotaConfigs.get(tier)?.dailyLimit || (tier === 'guest' ? 5 : 25);

    // Compute 24-hour window start (midnight UTC)
    const now = new Date();
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const counterKey = `${tier}_${subjectId}_${windowStart}`;

    let counter = db.usageCounters.get(counterKey);
    if (!counter) {
      counter = {
        id: crypto.randomUUID(),
        subjectType: tier === 'user_free' ? 'user' : 'guest',
        subjectId,
        windowStart,
        requestCount: 0
      };
      db.usageCounters.set(counterKey, counter);
    }

    if (counter.requestCount >= limit) {
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      return {
        allowed: false,
        resetsAt: tomorrow.toISOString(),
        currentCount: counter.requestCount,
        limit
      };
    }

    // Increment request count
    counter.requestCount++;
    return {
      allowed: true,
      currentCount: counter.requestCount,
      limit
    };
  }

  /**
   * Performs Cryptographic Signature Verification for original registered content
   */
  private verifyOriginalSignature(publisherId: string, contentHash: string, digitalSignature?: string): { verified: boolean; status: 'valid' | 'invalid' | 'unsigned'; fingerprint?: string } {
    if (!digitalSignature) {
      return { verified: false, status: 'unsigned' };
    }
    const publisher = db.publishers.get(publisherId);
    if (!publisher || !publisher.publicKey) {
      return { verified: false, status: 'unsigned' };
    }

    const isValid = pkiService.verifySignature(publisher.publicKey, contentHash, digitalSignature);
    return {
      verified: isValid,
      status: isValid ? 'valid' : 'invalid',
      fingerprint: publisher.keyFingerprint
    };
  }

  /**
   * Submit Verification Job: Accepts Verification Code + Uploaded content / text
   */
  public async submitVerification(
    codeStr: string,
    submission: {
      uploadType: 'text' | 'image' | 'video';
      submittedText?: string;
      fileUrl?: string;
    },
    user: User | null,
    guestSessionId: string
  ): Promise<{ jobId: string }> {
    const cleanCode = codeStr.trim().toUpperCase();
    const codeObj = db.findVerificationCode(cleanCode);
    if (!codeObj) {
      throw {
        status: 404,
        code: 'CODE_NOT_FOUND',
        message: `Verification code "${codeStr}" was not found in the TruthCode publisher registry. Please check the code or scan the QR on the official publication.`
      };
    }

    // Quota Enforcement (AF-04)
    const quota = this.checkQuota(user, guestSessionId);
    if (!quota.allowed) {
      throw {
        status: 429,
        code: 'QUOTA_EXCEEDED',
        message: `Daily verification limit of ${quota.limit} checks reached for ${user ? 'free tier account' : 'guest session'}.`,
        resetsAt: quota.resetsAt
      };
    }

    const resolvedContent = db.resolveOriginalContent(codeObj);
    if (!resolvedContent) {
      throw {
        status: 404,
        code: 'ORIGINAL_CONTENT_MISSING',
        message: 'The original content record linked to this verification code is unavailable.'
      };
    }

    // Create Upload record
    const uploadId = 'upl-' + crypto.randomBytes(6).toString('hex');
    const upload: Upload = {
      id: uploadId,
      verificationCodeId: codeObj.id,
      userId: user?.id || null,
      fileUrl: submission.fileUrl || '',
      uploadType: submission.uploadType,
      status: 'processing',
      submittedText: submission.submittedText || '',
      createdAt: new Date().toISOString()
    };
    db.uploads.set(upload.id, upload);

    const jobId = 'job-' + crypto.randomBytes(8).toString('hex');
    const job: InFlightJob = {
      jobId,
      uploadId: upload.id,
      status: 'queued',
      progress: 5,
      stage: 'extracting_ocr',
      createdAt: Date.now()
    };
    this.jobs.set(jobId, job);

    // Dispatch asynchronous worker
    this.executeAsyncVerification(job, codeObj, resolvedContent, submission, upload);

    return { jobId };
  }

  /**
   * Identifier-Independent Reverse Lookup Verification Pipeline
   * (Text / Scan / Image Upload without knowing the TruthCode identifier)
   */
  public async reverseLookup(
    submission: {
      uploadType: 'text' | 'image' | 'video';
      submittedText?: string;
      fileUrl?: string;
    },
    user: User | null,
    guestSessionId: string
  ): Promise<{
    matchStatus: 'MATCH_FOUND' | 'NO_AUTHENTIC_ORIGINAL_FOUND';
    report?: VerificationReport;
    similarityScore: number;
    threshold: number;
    topCandidates: any[];
    extractedText?: string;
    message: string;
  }> {
    // Quota Enforcement
    const quota = this.checkQuota(user, guestSessionId);
    if (!quota.allowed) {
      throw {
        status: 429,
        code: 'QUOTA_EXCEEDED',
        message: `Daily verification limit of ${quota.limit} checks reached for ${user ? 'free tier account' : 'guest session'}.`,
        resetsAt: quota.resetsAt
      };
    }

    let queryText = submission.submittedText || '';
    let ocrResultObj: OCRResult | null = null;

    // Step 1: OCR text extraction if image/scan is uploaded
    if (submission.uploadType === 'image' || submission.uploadType === 'video') {
      const ocr = await aiPipeline.processOCR(submission.fileUrl || '', submission.submittedText);
      queryText = ocr.text || submission.submittedText || '';
      ocrResultObj = {
        id: 'ocr-' + crypto.randomBytes(6).toString('hex'),
        uploadId: 'upl-rev-' + crypto.randomBytes(4).toString('hex'),
        extractedText: queryText,
        confidenceScore: ocr.confidence,
        createdAt: new Date().toISOString()
      };
    }

    if (!queryText.trim()) {
      throw {
        status: 400,
        code: 'EMPTY_SUBMISSION',
        message: 'No readable text could be extracted from the submission for semantic reverse lookup.'
      };
    }

    // Step 2: Query FAISS Vector Index using Sentence-BERT Embeddings
    const searchResult = faissService.search(queryText, 3);

    if (searchResult.matchStatus === 'NO_AUTHENTIC_ORIGINAL_FOUND' || !searchResult.candidate) {
      return {
        matchStatus: 'NO_AUTHENTIC_ORIGINAL_FOUND',
        similarityScore: searchResult.similarityScore,
        threshold: searchResult.threshold,
        topCandidates: searchResult.topCandidates,
        extractedText: queryText,
        message: `No matching authenticated original news article found in the TruthCode publisher registry (best candidate match was ${searchResult.similarityScore}%, which is below the strict ${searchResult.threshold}% confidence threshold).`
      };
    }

    // Step 3: Match Found -> Retrieve Canonical Record and Run Multimodal Forensic Verification
    const candidate = searchResult.candidate;
    let codeObj: any;
    if (candidate.code) {
      codeObj = db.findVerificationCode(candidate.code);
    }
    if (!codeObj) {
      for (const c of db.verificationCodes.values()) {
        if (c.contentId === candidate.candidateArticleId) {
          codeObj = c;
          break;
        }
      }
    }

    let resolvedContent = codeObj ? db.resolveOriginalContent(codeObj) : null;
    if (!resolvedContent) {
      const art = db.articles.get(candidate.candidateArticleId);
      if (art) {
        const pub = db.publishers.get(art.publisherId);
        resolvedContent = {
          type: 'article',
          id: art.id,
          title: art.title,
          bodyText: art.bodyText,
          publishedAt: art.publishedAt,
          publisherId: art.publisherId,
          publisherName: pub?.organizationName || candidate.publisherName || 'Verified Publisher',
          publisherReg: pub?.registrationNumber || candidate.publisherReg || '',
          contentHash: art.contentHash,
          versionNumber: art.versionNumber,
          digitalSignature: art.digitalSignature
        };
      }
    }

    // Fallback code object if needed
    if (!codeObj) {
      codeObj = {
        id: 'code-rev-matched',
        code: candidate.code || 'TC-REVERSE-LOOKUP',
        contentType: candidate.contentType,
        contentId: candidate.candidateArticleId,
        status: 'active'
      };
    }

    const finalResolved = resolvedContent || {
      type: candidate.contentType,
      id: candidate.candidateArticleId,
      title: candidate.title,
      bodyText: candidate.excerpt,
      publisherId: candidate.publisherId,
      publisherName: candidate.publisherName,
      publisherReg: candidate.publisherReg,
      contentHash: candidate.contentHash,
      versionNumber: candidate.versionNumber,
      publishedAt: candidate.publishedAt
    };

    // Step 4: NLP Forensic Comparison
    const originalText = finalResolved.bodyText || finalResolved.title || '';
    const nlp = await aiPipeline.processNLP(originalText, queryText);
    const nlpResultObj: NLPResult = {
      id: 'nlp-' + crypto.randomBytes(6).toString('hex'),
      uploadId: ocrResultObj?.uploadId || 'upl-rev-' + crypto.randomBytes(4).toString('hex'),
      similarityScore: nlp.similarityScore,
      diffJson: nlp,
      createdAt: new Date().toISOString()
    };

    // Step 5: CV Comparison if media
    let cvResultObj: CVResult | null = null;
    if (submission.uploadType === 'image' && resolvedContent.fileUrl) {
      const cv = await aiPipeline.processCV(resolvedContent.fileUrl, submission.fileUrl || '');
      cvResultObj = {
        id: 'cv-' + crypto.randomBytes(6).toString('hex'),
        uploadId: nlpResultObj.uploadId,
        similarityScore: cv.similarityScore,
        diffRegionsJson: cv,
        createdAt: new Date().toISOString()
      };
    }

    // Step 6: Evidence Aggregation
    const agg = aiPipeline.aggregateEvidence(
      codeObj.contentType,
      ocrResultObj ? { text: ocrResultObj.extractedText, confidence: ocrResultObj.confidenceScore } : null,
      nlpResultObj ? { similarityScore: nlpResultObj.similarityScore, semanticSimilarity: nlpResultObj.diffJson.semanticSimilarity, tokenSimilarity: nlpResultObj.diffJson.tokenSimilarity } : null,
      cvResultObj ? { similarityScore: cvResultObj.similarityScore, structuralSimilarity: cvResultObj.diffRegionsJson.structuralSimilarity, visualDifferenceDetected: cvResultObj.diffRegionsJson.visualDifferenceDetected } : null
    );

    // Step 7: Cryptographic Digital Signature Verification
    const sigCheck = this.verifyOriginalSignature(
      resolvedContent.publisherId || candidate.publisherId,
      resolvedContent.contentHash || candidate.contentHash,
      resolvedContent.digitalSignature
    );

    const reportId = 'rep-rev-' + crypto.randomBytes(6).toString('hex');
    const report: VerificationReport = {
      id: reportId,
      uploadId: nlpResultObj.uploadId,
      overallScore: agg.overallScore,
      status: agg.status,
      weightingVersion: agg.scoreBreakdown.weightingVersion,
      scoreBreakdown: agg.scoreBreakdown,
      reportPdfUrl: `/api/v1/verify/${reportId}/report.pdf`,
      createdAt: new Date().toISOString(),
      ocrResult: ocrResultObj || undefined,
      nlpResult: nlpResultObj,
      cvResult: cvResultObj || undefined,
      retrievalMethod: 'reverse_lookup',
      vectorSimilarity: searchResult.similarityScore,
      matchedCandidateId: candidate.candidateArticleId,
      digitalSignatureVerified: sigCheck.verified,
      signatureStatus: sigCheck.status,
      signatureAlgorithm: 'ECDSA-P256',
      publisherKeyFingerprint: sigCheck.fingerprint,
      code: codeObj.code,
      originalContent: {
        type: codeObj.contentType,
        title: resolvedContent.title || candidate.title,
        bodyText: resolvedContent.bodyText,
        fileUrl: resolvedContent.fileUrl,
        publishedAt: resolvedContent.publishedAt || candidate.publishedAt,
        publisherName: resolvedContent.publisherName || candidate.publisherName,
        publisherReg: resolvedContent.publisherReg || candidate.publisherReg,
        contentHash: resolvedContent.contentHash || candidate.contentHash,
        versionNumber: resolvedContent.versionNumber || candidate.versionNumber,
        digitalSignature: resolvedContent.digitalSignature
      },
      submittedContent: {
        text: queryText,
        fileUrl: submission.fileUrl,
        uploadType: submission.uploadType
      }
    };

    db.verificationReports.set(report.id, report);

    if (user) {
      db.logActivity(user.id, 'REVERSE_LOOKUP_COMPLETED', `Reverse lookup matched article "${candidate.title}" with status: ${report.status} (${report.overallScore}%)`);
    }

    return {
      matchStatus: 'MATCH_FOUND',
      report,
      similarityScore: searchResult.similarityScore,
      threshold: searchResult.threshold,
      topCandidates: searchResult.topCandidates,
      extractedText: queryText,
      message: `Matched canonical article "${candidate.title}" by ${candidate.publisherName} (${searchResult.similarityScore}% vector similarity).`
    };
  }

  /**
   * Asynchronous AI Pipeline Worker (OCR -> NLP -> CV -> Evidence Aggregation + ECDSA PKI)
   */
  private async executeAsyncVerification(
    job: InFlightJob,
    codeObj: any,
    resolvedContent: any,
    submission: { uploadType: 'text' | 'image' | 'video'; submittedText?: string; fileUrl?: string },
    upload: Upload
  ) {
    try {
      job.status = 'processing';
      job.progress = 20;
      job.stage = 'extracting_ocr';

      let extractedText = submission.submittedText || '';
      let ocrResultObj: OCRResult | null = null;

      // 1. OCR Stage
      if (submission.uploadType === 'image' || submission.uploadType === 'video' || codeObj.contentType === 'newspaper') {
        const ocr = await aiPipeline.processOCR(submission.fileUrl || '', resolvedContent.bodyText || submission.submittedText);
        extractedText = submission.submittedText || ocr.text;

        ocrResultObj = {
          id: 'ocr-' + crypto.randomBytes(6).toString('hex'),
          uploadId: upload.id,
          extractedText,
          confidenceScore: ocr.confidence,
          createdAt: new Date().toISOString()
        };
        db.ocrResults.set(ocrResultObj.id, ocrResultObj);
      }

      job.progress = 50;
      job.stage = 'comparing_nlp';

      // 2. NLP Stage
      let nlpResultObj: NLPResult | null = null;
      const originalText = resolvedContent.bodyText || resolvedContent.title || '';
      if (originalText && extractedText) {
        const nlp = await aiPipeline.processNLP(originalText, extractedText);
        nlpResultObj = {
          id: 'nlp-' + crypto.randomBytes(6).toString('hex'),
          uploadId: upload.id,
          similarityScore: nlp.similarityScore,
          diffJson: nlp,
          createdAt: new Date().toISOString()
        };
        db.nlpResults.set(nlpResultObj.id, nlpResultObj);
      }

      job.progress = 75;
      job.stage = 'analyzing_cv';

      // 3. CV Stage
      let cvResultObj: CVResult | null = null;
      if (codeObj.contentType === 'media' || submission.uploadType === 'image') {
        const cv = await aiPipeline.processCV(resolvedContent.fileUrl || '', submission.fileUrl || '');
        cvResultObj = {
          id: 'cv-' + crypto.randomBytes(6).toString('hex'),
          uploadId: upload.id,
          similarityScore: cv.similarityScore,
          diffRegionsJson: cv,
          createdAt: new Date().toISOString()
        };
        db.cvResults.set(cvResultObj.id, cvResultObj);
      }

      job.progress = 90;
      job.stage = 'aggregating_evidence';

      // 4. Evidence Aggregation & Calibrated Scoring (AF-03)
      const agg = aiPipeline.aggregateEvidence(
        codeObj.contentType,
        ocrResultObj ? { text: ocrResultObj.extractedText, confidence: ocrResultObj.confidenceScore } : null,
        nlpResultObj ? { similarityScore: nlpResultObj.similarityScore, semanticSimilarity: nlpResultObj.diffJson.semanticSimilarity, tokenSimilarity: nlpResultObj.diffJson.tokenSimilarity } : null,
        cvResultObj ? { similarityScore: cvResultObj.similarityScore, structuralSimilarity: cvResultObj.diffRegionsJson.structuralSimilarity, visualDifferenceDetected: cvResultObj.diffRegionsJson.visualDifferenceDetected } : null
      );

      // 5. Cryptographic Digital Signature Verification
      const sigCheck = this.verifyOriginalSignature(
        resolvedContent.publisherId,
        resolvedContent.contentHash,
        resolvedContent.digitalSignature
      );

      // 6. Check for Version Notice (AF-02)
      let versionNotice: VersionNotice | undefined;
      if (codeObj.status === 'superseded') {
        let newerCode: any;
        if (codeObj.supersededByCodeId) {
          for (const c of db.verificationCodes.values()) {
            if (c.id === codeObj.supersededByCodeId || c.code === codeObj.supersededByCodeId) {
              newerCode = c;
              break;
            }
          }
        }
        versionNotice = {
          type: 'superseded',
          newCode: newerCode?.code,
          reason: 'A corrected version of this registered article was subsequently issued by the publisher.'
        };
      } else if (codeObj.status === 'retracted') {
        versionNotice = {
          type: 'retracted',
          reason: codeObj.retractionReason || 'Withdrawn by publisher editorial board.'
        };
      }

      const reportId = 'rep-' + crypto.randomBytes(6).toString('hex');
      const report: VerificationReport = {
        id: reportId,
        uploadId: upload.id,
        overallScore: agg.overallScore,
        status: agg.status,
        weightingVersion: agg.scoreBreakdown.weightingVersion,
        scoreBreakdown: agg.scoreBreakdown,
        reportPdfUrl: `/api/v1/verify/${job.jobId}/report.pdf`,
        createdAt: new Date().toISOString(),
        ocrResult: ocrResultObj || undefined,
        nlpResult: nlpResultObj || undefined,
        cvResult: cvResultObj || undefined,
        versionNotice,
        retrievalMethod: 'direct_code',
        digitalSignatureVerified: sigCheck.verified,
        signatureStatus: sigCheck.status,
        signatureAlgorithm: 'ECDSA-P256',
        publisherKeyFingerprint: sigCheck.fingerprint,
        code: codeObj.code,
        originalContent: {
          type: codeObj.contentType,
          title: resolvedContent.title || 'Official Published Edition',
          bodyText: resolvedContent.bodyText,
          fileUrl: resolvedContent.fileUrl,
          publishedAt: resolvedContent.publishedAt || resolvedContent.editionDate || new Date().toISOString(),
          publisherName: resolvedContent.publisherName,
          publisherReg: resolvedContent.publisherReg,
          contentHash: resolvedContent.contentHash,
          versionNumber: resolvedContent.versionNumber || 1,
          digitalSignature: resolvedContent.digitalSignature
        },
        submittedContent: {
          text: extractedText,
          fileUrl: submission.fileUrl,
          uploadType: submission.uploadType
        }
      };

      db.verificationReports.set(report.id, report);
      upload.status = 'completed';

      // 7. AF-01 Human Review Escalation Queue
      if (agg.status === 'pending_review') {
        const reviewId = 'rev-' + crypto.randomBytes(6).toString('hex');
        const reviewAssignment: ReviewAssignment = {
          id: reviewId,
          uploadId: upload.id,
          reviewerId: null,
          status: 'pending',
          origin: 'low_confidence',
          queuedAt: new Date().toISOString(),
          upload,
          report
        };
        db.reviewAssignments.set(reviewAssignment.id, reviewAssignment);
        db.logAudit(null, 'AI_System', 'REVIEW_ESCALATED', 'review_assignments', reviewAssignment.id, {
          confidence: agg.scoreBreakdown.calibratedConfidence,
          code: codeObj.code
        });
      }

      job.progress = 100;
      job.status = agg.status === 'pending_review' ? 'pending_review' : 'completed';
      job.report = report;

      if (upload.userId) {
        db.logActivity(upload.userId, 'VERIFICATION_COMPLETED', `Verified code ${codeObj.code} with result: ${agg.status} (${agg.overallScore}%)`);
      }
    } catch (err: any) {
      console.error('[Verification Worker] Error processing verification job:', err);
      job.status = 'failed';
      job.error = {
        code: 'PROCESSING_ERROR',
        message: err.message || 'An error occurred during AI verification analysis.',
        correlationId: crypto.randomUUID()
      };
      upload.status = 'failed';
    }
  }

  /**
   * Poll Verification Job Status
   */
  public getJobStatus(jobId: string): VerificationJobStatusResponse {
    const job = this.jobs.get(jobId);
    if (!job) {
      // Check if report was already stored directly
      for (const rep of db.verificationReports.values()) {
        if (rep.uploadId === jobId || rep.id === jobId) {
          return {
            jobId,
            status: rep.status === 'pending_review' ? 'pending_review' : 'completed',
            progress: 100,
            report: rep
          };
        }
      }
      throw { status: 404, code: 'JOB_NOT_FOUND', message: 'Verification job not found or expired.' };
    }

    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      report: job.report,
      error: job.error
    };
  }

  /**
   * Retrieve Final Verification Report
   */
  public getReport(reportIdOrJobId: string): VerificationReport {
    // Search by report ID
    const byId = db.verificationReports.get(reportIdOrJobId);
    if (byId) return byId;

    // Search by job ID
    const job = this.jobs.get(reportIdOrJobId);
    if (job?.report) return job.report;

    // Search by uploadId
    for (const r of db.verificationReports.values()) {
      if (r.uploadId === reportIdOrJobId) return r;
    }

    throw { status: 404, code: 'REPORT_NOT_FOUND', message: 'Evidence report not found.' };
  }

  /**
   * AF-09: File a Dispute on a Completed Report
   */
  public fileDispute(reportId: string, user: User, reason: string): ReviewAssignment {
    const report = this.getReport(reportId);
    if (report.status === 'pending_review') {
      throw new Error('This report is already under human review.');
    }

    // Check if duplicate dispute already exists
    for (const rev of db.reviewAssignments.values()) {
      if (rev.uploadId === report.uploadId && rev.origin === 'disputed') {
        throw new Error('A dispute has already been filed for this verification report.');
      }
    }

    const reviewId = 'rev-disp-' + crypto.randomBytes(6).toString('hex');
    const upload = db.uploads.get(report.uploadId);

    const reviewAssignment: ReviewAssignment = {
      id: reviewId,
      uploadId: report.uploadId,
      reviewerId: null,
      status: 'pending',
      origin: 'disputed',
      disputeReason: reason,
      queuedAt: new Date().toISOString(),
      upload,
      report
    };

    // Update report status to pending_review
    report.status = 'pending_review';
    db.reviewAssignments.set(reviewAssignment.id, reviewAssignment);

    db.logAudit(user.id, user.email, 'DISPUTE_FILED', 'review_assignments', reviewAssignment.id, {
      reportId: report.id,
      reason
    });

    return reviewAssignment;
  }

  /**
   * User Verification History (Doc 3 §11)
   */
  public getUserHistory(userId: string): VerificationReport[] {
    const reports: VerificationReport[] = [];
    for (const upl of db.uploads.values()) {
      if (upl.userId === userId) {
        for (const rep of db.verificationReports.values()) {
          if (rep.uploadId === upl.id) {
            reports.push(rep);
            break;
          }
        }
      }
    }
    return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const verificationService = new VerificationService();

