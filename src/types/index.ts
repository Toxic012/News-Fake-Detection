/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Complete Data Types & API Specifications (Docs 1-7)
 */

export type UserRole =
  | 'guest'
  | 'user'
  | 'publisher'
  | 'admin'
  | 'reviewer'
  | 'senior_verification_analyst'
  | 'news_analyst'
  | 'publisher_analyst'
  | 'action_analyst'
  | 'USER'
  | 'PUBLISHER'
  | 'SENIOR_VERIFICATION_ANALYST'
  | 'ADMIN';

export type AccountStatus = 'active' | 'suspended' | 'deleted';
export type PublisherStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ContentType = 'newspaper' | 'article' | 'media';
export type MediaType = 'image' | 'video';
export type VerificationCodeStatus = 'active' | 'superseded' | 'retracted';
export type UploadStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type ReportStatus = 'match' | 'partial_match' | 'mismatch' | 'inconclusive' | 'pending_review';
export type ReviewStatus = 'pending' | 'in_review' | 'resolved';
export type ReviewOrigin = 'low_confidence' | 'disputed';
export type AbuseReportTarget = 'code' | 'publisher' | 'upload';
export type AbuseReportStatus = 'open' | 'investigating' | 'closed';
export type PatternClusterStatus = 'open' | 'dismissed' | 'escalated';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
  passwordHash?: string;
  salt?: string;
  lastLoginAt?: string;
  publisherProfile?: Publisher;
}

export interface Publisher {
  id: string;
  userId: string;
  organizationName: string;
  registrationNumber: string;
  status: PublisherStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  websiteUrl?: string;
  contactEmail?: string;
  verificationDocumentUrl?: string;
  publicKey?: string; // PEM-encoded ECDSA P-256 public key
  keyAlgorithm?: string; // 'ECDSA-P256'
  keyFingerprint?: string; // SHA-256 fingerprint
}

export interface Newspaper {
  id: string;
  publisherId: string;
  title: string;
  editionDate: string;
  fileUrl: string;
  contentHash: string; // SHA-256
  digitalSignature?: string; // ECDSA P-256 signature
  embeddingId?: string; // FAISS vector ID
  previousVersionId?: string | null;
  versionNumber: number;
  source: 'web' | 'api';
  createdAt: string;
  extractedText?: string;
}

export interface Article {
  id: string;
  publisherId: string;
  title: string;
  bodyText: string;
  contentHash: string; // SHA-256
  digitalSignature?: string; // ECDSA P-256 signature
  embeddingId?: string; // FAISS vector ID
  publishedAt: string;
  previousVersionId?: string | null;
  versionNumber: number;
  source: 'web' | 'api';
  createdAt: string;
}

export interface Media {
  id: string;
  publisherId: string;
  mediaType: MediaType;
  fileUrl: string;
  contentHash: string; // SHA-256
  digitalSignature?: string; // ECDSA P-256 signature
  embeddingId?: string; // FAISS vector ID
  durationSeconds?: number;
  previousVersionId?: string | null;
  versionNumber: number;
  source: 'web' | 'api';
  createdAt: string;
}

export interface VerificationCode {
  id: string;
  code: string;
  contentType: ContentType;
  contentId: string;
  qrUrl: string;
  status: VerificationCodeStatus;
  supersededByCodeId?: string | null;
  retractionReason?: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

export interface Upload {
  id: string;
  verificationCodeId: string;
  userId?: string | null;
  fileUrl: string;
  uploadType: 'text' | 'image' | 'video';
  status: UploadStatus;
  createdAt: string;
  submittedText?: string;
}

export interface DiffItem {
  type: 'added' | 'removed' | 'modified' | 'number_changed' | 'entity_changed';
  originalText?: string;
  submittedText?: string;
  position?: number;
  explanation?: string;
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  changeType: 'overlay' | 'crop' | 'inpainting' | 'face_swap' | 'text_edit' | 'altered';
  confidence: number;
}

export interface OCRResult {
  id: string;
  uploadId: string;
  extractedText: string;
  confidenceScore: number;
  createdAt: string;
}

export interface NLPResult {
  id: string;
  uploadId: string;
  similarityScore: number;
  diffJson: {
    diffs: DiffItem[];
    semanticSimilarity: number;
    tokenSimilarity: number;
    summary: string;
  };
  createdAt: string;
}

export interface CVResult {
  id: string;
  uploadId: string;
  similarityScore: number;
  diffRegionsJson: {
    regions: DiffRegion[];
    structuralSimilarity: number;
    visualDifferenceDetected: boolean;
    tamperType?: string;
  };
  createdAt: string;
}

export interface ScoreBreakdown {
  ocr?: number | null;
  nlp?: number | null;
  cv?: number | null;
  weightingVersion: string;
  calibratedConfidence: number;
  explanation: string;
}

export interface VersionNotice {
  type: 'superseded' | 'retracted';
  newCode?: string;
  reason?: string;
  supersedingDate?: string;
}

export interface VerificationReport {
  id: string;
  uploadId: string;
  overallScore: number;
  status: ReportStatus;
  weightingVersion: string;
  scoreBreakdown: ScoreBreakdown;
  reportPdfUrl?: string;
  createdAt: string;
  ocrResult?: OCRResult;
  nlpResult?: NLPResult;
  cvResult?: CVResult;
  versionNotice?: VersionNotice;
  // Verification method and Cryptographic Provenance
  retrievalMethod?: 'direct_code' | 'reverse_lookup';
  digitalSignatureVerified?: boolean;
  signatureStatus?: 'valid' | 'invalid' | 'unsigned';
  signatureAlgorithm?: string;
  publisherKeyFingerprint?: string;
  vectorSimilarity?: number;
  matchedCandidateId?: string;
  // Resolved content metadata
  originalContent?: {
    type: ContentType;
    title: string;
    bodyText?: string;
    fileUrl?: string;
    publishedAt: string;
    publisherName: string;
    publisherReg: string;
    contentHash: string;
    versionNumber: number;
    digitalSignature?: string;
  };
  submittedContent?: {
    text?: string;
    fileUrl?: string;
    uploadType: string;
  };
  code: string;
}

export interface ArticleEmbedding {
  id: string;
  articleId: string;
  vectorDimension: number;
  embeddingModel: string;
  vectorId: string;
  indexedInFaiss: boolean;
  createdAt: string;
}

export interface ReviewAssignment {
  id: string;
  uploadId: string;
  reviewerId?: string | null;
  status: ReviewStatus;
  finalStatus?: ReportStatus;
  justification?: string | null;
  origin: ReviewOrigin;
  disputeReason?: string | null;
  queuedAt: string;
  resolvedAt?: string | null;
  // Hydrated fields for UI
  upload?: Upload;
  report?: VerificationReport;
  reviewerName?: string;
}

export interface UsageCounter {
  id: string;
  subjectType: 'user' | 'guest';
  subjectId: string;
  windowStart: string;
  requestCount: number;
}

export interface QuotaConfig {
  id: string;
  tier: 'guest' | 'user_free';
  dailyLimit: number;
  updatedAt: string;
}

export interface PublisherAlertBaseline {
  id: string;
  publisherId: string;
  baselineRate: number;
  sampleCount: number;
  computedAt: string;
}

export interface PublisherAlert {
  id: string;
  publisherId: string;
  observedRate: number;
  baselineRate: number;
  tamperSpikeMagnitude: string;
  sentAt: string;
  notificationStatus: 'sent' | 'pending';
}

export interface AbuseReport {
  id: string;
  targetType: AbuseReportTarget;
  targetId: string;
  category: string;
  detail?: string;
  reporterId?: string | null;
  status: AbuseReportStatus;
  createdAt: string;
  resolvedAt?: string;
  adminNotes?: string;
}

export interface PublisherApiKey {
  id: string;
  publisherId: string;
  keyHash: string;
  rawKeyPrefix: string;
  label: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

export interface CalibrationSnapshot {
  id: string;
  weightingVersion: string;
  datasetSize: number;
  reportedConfidenceBucket: string;
  observedAccuracy: number;
  driftFlagged: boolean;
  runAt: string;
}

export interface AdversarialEvalRun {
  id: string;
  datasetVersion: string;
  sampleSize: number;
  detectionRate: number;
  manipulationType: 'face_swap' | 'inpainting' | 'upscale_alter' | 'font_tamper' | 'video_frame_splice';
  flagged: boolean;
  runAt: string;
}

export interface TamperPatternCluster {
  id: string;
  patternType: 'cross_code_similarity' | 'concentration_burst' | 'coordinated_headline_swap' | 'reused_doctored_image';
  confidence: number;
  status: PatternClusterStatus;
  description: string;
  detectedAt: string;
  uploadIds: string[];
  affectedCodes: string[];
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  activityType: string;
  description: string;
  createdAt: string;
}

export interface VerificationJobStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'pending_review';
  progress?: number;
  stage?: 'extracting_ocr' | 'comparing_nlp' | 'analyzing_cv' | 'aggregating_evidence' | 'calibrating' | 'vector_search';
  report?: VerificationReport;
  error?: {
    code: string;
    message: string;
    correlationId: string;
  };
}

export interface AnalystRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount?: number;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicNewsItem {
  id: string;
  title: string;
  summary: string;
  bodyText: string;
  category: 'Politics' | 'Business' | 'Technology' | 'Science' | 'World' | 'Local' | 'Entertainment' | 'Sports';
  publishedAt: string;
  publisherId: string;
  publisherName: string;
  publisherWebsite?: string;
  isVerifiedPublisher: boolean;
  truthCode: string;
  qrUrl: string;
  contentHash: string;
  digitalSignature?: string;
  versionNumber: number;
  thumbnailUrl: string;
  contentType: 'article' | 'newspaper' | 'media';
  status: 'active' | 'superseded' | 'retracted';
}
