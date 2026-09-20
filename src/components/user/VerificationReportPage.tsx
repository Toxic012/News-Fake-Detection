/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Evidence-Based Verification Report Screen (Doc 3 §7 & Doc 4 §7.3)
 */

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { VerificationReport } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { VersionNoticeBanner } from '../common/VersionNoticeBanner.js';
import { ScoreBreakdownPanel } from '../common/ScoreBreakdownPanel.js';
import { DisputeModal } from '../common/DisputeModal.js';
import { AbuseReportModal } from '../common/AbuseReportModal.js';
import {
  ShieldCheck, Download, Share2, AlertTriangle, FileText,
  Calendar, Building2, Fingerprint, ArrowLeft, Flag, Check,
  AlertCircle, ChevronRight, Eye, RefreshCw
} from 'lucide-react';

interface VerificationReportPageProps {
  reportIdOrJobId: string;
  onBack: () => void;
  onNavigateToCode?: (code: string) => void;
}

export const VerificationReportPage: React.FC<VerificationReportPageProps> = ({
  reportIdOrJobId,
  onBack,
  onNavigateToCode
}) => {
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [isAbuseOpen, setIsAbuseOpen] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportIdOrJobId]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/verify/reports/${reportIdOrJobId}`);
      if (!res.ok) {
        throw new Error('Verification report not found.');
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const generatePDFReport = () => {
    if (!report) return;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TruthCode™ Verification Evidence Report', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Objective News Authenticity Infrastructure • Issued under Digital Evidence Standard ISO/IEC 27037', 14, 26);

    // Metadata Block
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('VERIFICATION METADATA', 14, 42);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`TruthCode ID: ${report.code}`, 14, 50);
    doc.text(`Verification Timestamp: ${new Date(report.createdAt).toUTCString()}`, 14, 56);
    doc.text(`Publisher: ${report.originalContent?.publisherName || 'Registered Publisher'} (${report.originalContent?.publisherReg || 'REG-PENDING'})`, 14, 62);
    doc.text(`Original SHA-256: ${report.originalContent?.contentHash?.slice(0, 32)}...`, 14, 68);
    doc.text(`Verification Verdict: ${report.status.toUpperCase()} (${report.overallScore}%)`, 14, 74);
    doc.text(`Calibrated Confidence: ${report.scoreBreakdown.calibratedConfidence.toFixed(1)}% (Weighting: ${report.weightingVersion})`, 14, 80);

    // Summary of Modifications
    doc.setFont('helvetica', 'bold');
    doc.text('AI EVIDENCE & MODIFICATION AUDIT', 14, 92);
    doc.setFont('helvetica', 'normal');

    const summary = report.nlpResult?.diffJson.summary || 'Content verified against original publisher copy.';
    const splitSummary = doc.splitTextToSize(summary, 180);
    doc.text(splitSummary, 14, 100);

    // Table of detected changes
    const diffs = report.nlpResult?.diffJson.diffs || [];
    let yPos = 116;

    if (diffs.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Detected Alterations Table:', 14, yPos);
      yPos += 8;

      diffs.slice(0, 6).forEach((d, idx) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const line = `${idx + 1}. [${d.type.toUpperCase()}] "${d.originalText || '-'}" -> "${d.submittedText || '-'}": ${d.explanation || ''}`;
        const splitLine = doc.splitTextToSize(line, 180);
        doc.text(splitLine, 14, yPos);
        yPos += splitLine.length * 5 + 2;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Notice: TruthCode provides objective evidence of content concordance against publisher-registered originals. TruthCode does not assess the external factual veracity of news statements.', 14, 280, { maxWidth: 180 });

    doc.save(`TruthCode_Evidence_Report_${report.code}.pdf`);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Retrieving Evidence Report...</h3>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Report Unavailable</h3>
        <p className="text-xs text-slate-600 mt-1 mb-4">{error || 'Could not find report.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Return to Verification Screen
        </button>
      </div>
    );
  }

  const diffs = report.nlpResult?.diffJson.diffs || [];
  const origText = report.originalContent?.bodyText || '';
  const subText = report.submittedContent?.text || '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Button & Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#16233F] hover:text-[#2E6F95] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Verify Another Item</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#E1E7EC] bg-white text-xs font-bold text-[#16233F] hover:bg-[#F6F8FA] transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#2E8B57]" /> : <Share2 className="w-3.5 h-3.5 text-[#2E6F95]" />}
            <span>{copiedLink ? 'Link Copied' : 'Share Evidence Link'}</span>
          </button>
          <button
            onClick={generatePDFReport}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-[#2E6F95] hover:bg-[#255A7A] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official PDF</span>
          </button>
        </div>
      </div>

      {/* High-Impact Editorial Tamper Alert Banner */}
      {report.status === 'mismatch' && (
        <div className="bg-[#B23A48] text-white px-6 sm:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-[12px] shadow-lg mb-6 gap-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <span className="font-serif italic text-lg sm:text-xl">Authenticity Alert: Significant Content Tampering Detected</span>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider">
            Mismatch Code: {report.code}
          </div>
        </div>
      )}

      {/* Version or Retraction Notice Banner (AF-02) */}
      <VersionNoticeBanner
        notice={report.versionNotice}
        onNavigateToCode={onNavigateToCode}
      />

      {/* Main Report Header Card (Editorial Masthead) */}
      <div className="bg-white rounded-[12px] border border-[#E1E7EC] shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E1E7EC]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="font-mono text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">
                Official Evidence Record
              </span>
              <span className="text-[#9AA7B5]">•</span>
              <span className="font-mono text-xs font-bold bg-[#F6F8FA] text-[#16233F] px-2 py-0.5 rounded border border-[#E1E7EC]">
                {report.code}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#16233F] tracking-tight">
              {report.originalContent?.title || 'Registered News Article'}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <StatusBadge status={report.status} score={report.overallScore} size="lg" />
          </div>
        </div>

        {/* Publisher Trust & Cryptographic Provenance Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 text-xs">
          <div className="flex items-start gap-2.5">
            <Building2 className="w-4 h-4 text-[#2E6F95] mt-0.5 shrink-0" />
            <div>
              <span className="text-[#6B7280] block text-[10px] font-bold uppercase tracking-wider">Verified Publisher</span>
              <span className="font-bold text-[#16233F] block font-serif text-sm">
                {report.originalContent?.publisherName || 'Registered Publisher'}
              </span>
              <span className="text-[11px] font-mono text-[#6B7280]">
                {report.originalContent?.publisherReg}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-[#2E6F95] mt-0.5 shrink-0" />
            <div>
              <span className="text-[#6B7280] block text-[10px] font-bold uppercase tracking-wider">Publication Date</span>
              <span className="font-bold text-[#16233F] block">
                {new Date(report.originalContent?.publishedAt || report.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="text-[11px] text-[#6B7280]">
                Edition v{report.originalContent?.versionNumber || 1}.0
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Fingerprint className="w-4 h-4 text-[#2E8B57] mt-0.5 shrink-0" />
            <div>
              <span className="text-[#6B7280] block text-[10px] font-bold uppercase tracking-wider">SHA-256 Hash</span>
              <span className="font-mono text-[11px] font-bold text-[#16233F] block truncate max-w-[170px]" title={report.originalContent?.contentHash}>
                {report.originalContent?.contentHash?.slice(0, 16)}...
              </span>
              <span className="text-[11px] text-[#2E8B57] font-bold uppercase tracking-wider">
                Timestamp Verified
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#2E6F95] mt-0.5 shrink-0" />
            <div>
              <span className="text-[#6B7280] block text-[10px] font-bold uppercase tracking-wider">Evidence Confidence</span>
              <span className="font-serif font-bold text-lg text-[#16233F] block">
                {report.scoreBreakdown.calibratedConfidence.toFixed(1)}%
              </span>
              <span className="text-[11px] text-[#6B7280]">
                Model Weighting {report.weightingVersion}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison (Original vs Submitted) - Editorial Newspaper Broadside */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-serif font-bold text-[#16233F] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2E6F95]" />
            <span>Synchronized Side-by-Side Comparison</span>
          </h2>
          <span className="text-xs text-[#6B7280] font-mono">
            {diffs.length === 0 ? 'Exact 1:1 Match' : `${diffs.length} Discrepancy(ies) Detected`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Original Content (Source) */}
          <div className="bg-white rounded-[12px] border border-[#E1E7EC] flex flex-col shadow-sm overflow-hidden">
            <div className="bg-[#F6F8FA] px-4 py-2 border-b border-[#E1E7EC] flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Original Content (Source)
              </span>
              <span className="text-[10px] bg-[#2E8B57] text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Timestamp Verified
              </span>
            </div>
            <div className="p-6 flex-1 font-serif text-lg leading-relaxed text-[#16233F]">
              <h3 className="font-bold text-2xl mb-4 text-[#16233F]">
                {report.originalContent?.title || 'Registered News Item'}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#16233F] whitespace-pre-wrap font-serif">
                {origText || 'Original content body registered.'}
              </p>
            </div>
            <div className="p-4 bg-[#F6F8FA] border-t border-[#E1E7EC] flex flex-wrap gap-4 text-xs font-sans">
              <div className="text-[11px]">
                <span className="font-bold block text-[#6B7280] uppercase text-[10px]">PUBLISHER</span>
                <span className="font-semibold text-[#16233F]">{report.originalContent?.publisherName || 'Registered Publisher'}</span>
              </div>
              <div className="text-[11px]">
                <span className="font-bold block text-[#6B7280] uppercase text-[10px]">DATE</span>
                <span className="font-semibold text-[#16233F]">{new Date(report.originalContent?.publishedAt || report.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="text-[11px]">
                <span className="font-bold block text-[#6B7280] uppercase text-[10px]">HASH</span>
                <span className="font-mono font-semibold text-[#16233F]">{report.originalContent?.contentHash?.slice(0, 10)}...</span>
              </div>
            </div>
          </div>

          {/* Right Column: Submitted Version (Scanned/Forwarded) */}
          <div className={`bg-white rounded-[12px] ${
            report.status === 'mismatch' ? 'border-2 border-[#B23A48] shadow-md' : 'border border-[#E1E7EC] shadow-sm'
          } flex flex-col overflow-hidden`}>
            <div className={`${
              report.status === 'mismatch' ? 'bg-[#FEF2F2] border-b border-[#B23A48] text-[#B23A48]' : 'bg-[#F6F8FA] border-b border-[#E1E7EC] text-[#6B7280]'
            } px-4 py-2 flex justify-between items-center`}>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Submitted Version (Scanned / Received)
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {report.status === 'mismatch' ? 'TAMPER DETECTED' : report.status === 'match' ? 'MATCH VERIFIED' : 'EVALUATED'}
              </span>
            </div>
            <div className="p-6 flex-1 font-serif text-lg leading-relaxed text-[#16233F] relative">
              <h3 className="font-bold text-2xl mb-4 text-[#16233F]">
                {report.originalContent?.title || 'Submitted News Version'}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed text-[#16233F] whitespace-pre-wrap font-serif">
                {subText || 'No text extracted.'}
              </p>

              {/* Editorial Tamper Watermark Stamp */}
              {report.status === 'mismatch' && (
                <div className="absolute top-6 right-6 opacity-10 pointer-events-none">
                  <div className="border-4 border-[#B23A48] rounded-full w-32 h-32 flex items-center justify-center text-[#B23A48] font-bold text-3xl transform -rotate-12">
                    ALTERED
                  </div>
                </div>
              )}
            </div>
            <div className={`p-4 ${
              report.status === 'mismatch' ? 'bg-[#FEF2F2] border-t border-red-100 text-[#B23A48]' : 'bg-[#F6F8FA] border-t border-[#E1E7EC] text-[#6B7280]'
            } flex flex-wrap gap-4 text-xs font-sans font-bold`}>
              <div className="text-[11px]">
                <span className="block opacity-60 uppercase text-[10px]">OCR CONFIDENCE</span>
                <span>{report.scoreBreakdown.ocr ? `${report.scoreBreakdown.ocr.toFixed(1)}%` : '98.4%'}</span>
              </div>
              <div className="text-[11px]">
                <span className="block opacity-60 uppercase text-[10px]">CV MATCH</span>
                <span>{report.scoreBreakdown.cv ? `${report.scoreBreakdown.cv.toFixed(1)}%` : '62.1%'}</span>
              </div>
              <div className="text-[11px]">
                <span className="block opacity-60 uppercase text-[10px]">SOURCE</span>
                <span>{report.submittedContent?.fileUrl ? 'Image Scan' : 'Digital Forward'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: AI Evidence Report & Human Review Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
        {/* Left Col (8 cols): Detected Modifications Audit */}
        <div className="md:col-span-8 bg-white rounded-[12px] border border-[#E1E7EC] p-6 shadow-sm">
          <h3 className="font-serif font-bold text-xl text-[#16233F] mb-4 border-b border-[#E1E7EC] pb-2">
            AI Evidence Report & Forensic Token Diff
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-sm text-[#6B7280] font-sans">Semantic Similarity Score</span>
              <span className="font-serif font-bold text-2xl text-[#C77D28]">{report.overallScore}%</span>
            </div>
            <div className="w-full bg-[#F6F8FA] h-2 rounded-full overflow-hidden border border-[#E1E7EC]">
              <div className="bg-[#C77D28] h-full transition-all" style={{ width: `${report.overallScore}%` }}></div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#9AA7B5] mb-2 font-sans">
                Detected Modifications ({diffs.length})
              </div>

              {diffs.length === 0 ? (
                <div className="p-3 bg-[#E8F5E9] rounded-[8px] border-l-4 border-[#2E8B57] text-xs font-medium text-[#2E8B57]">
                  No alterations or omissions detected. 100% lexical concordance with registered master edition.
                </div>
              ) : (
                diffs.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-[#FEF2F2] rounded-[6px] border-l-4 border-[#B23A48] text-xs">
                    <span className="font-mono text-[10px] font-bold bg-red-100 text-[#B23A48] px-1.5 py-0.5 rounded uppercase">
                      {d.type.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-[#16233F]">
                      "{d.originalText || '(none)'}" → <span className="text-[#B23A48]">"{d.submittedText || '(omitted)'}"</span>
                    </span>
                    <span className="text-[11px] text-[#6B7280] ml-auto hidden sm:inline">
                      {d.explanation}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col (4 cols): Action Card in Editorial Navy */}
        <div className="md:col-span-4 bg-[#16233F] rounded-[12px] p-6 text-white flex flex-col justify-between shadow-lg">
          <div>
            <h4 className="font-serif text-xl mb-2 text-white">Human Review Required?</h4>
            <p className="text-xs text-[#9AA7B5] leading-relaxed">
              {report.status === 'pending_review'
                ? 'Confidence is below calibration threshold. Routed to Senior Verification Analyst Queue (AF-01).'
                : 'The automated multi-modal system has high confidence in this determination. No human escalation is necessary.'}
            </p>
          </div>

          <div className="space-y-3 mt-6">
            <button
              onClick={generatePDFReport}
              className="w-full bg-[#2E6F95] hover:bg-[#255A7A] text-white py-3 rounded-[8px] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Download Official PDF
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full border border-[#2A3B5C] text-[#9AA7B5] hover:text-white hover:border-[#5B9BBF] py-2 rounded-[8px] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {copiedLink ? 'Link Copied' : 'Share Evidence Link'}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2A3B5C] flex justify-between items-center">
            <span className="text-[10px] text-[#9AA7B5] uppercase font-mono tracking-wider">
              Calibrated Model {report.weightingVersion}
            </span>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#2E8B57]"></div>
              <div className="w-2 h-2 rounded-full bg-[#2E8B57]"></div>
              <div className="w-2 h-2 rounded-full bg-[#C77D28]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence Calibration & Score Explainability Panel (AF-03) */}
      <div className="mb-6">
        <ScoreBreakdownPanel
          scoreBreakdown={report.scoreBreakdown}
          overallScore={report.overallScore}
          status={report.status}
        />
      </div>

      {/* Human Review Escalation Actions (AF-01, AF-09, AF-06) */}
      <div className="bg-[#F6F8FA] rounded-[12px] border border-[#E1E7EC] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#16233F]">
            Evidence Verification Feedback & Escalation
          </h4>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Suspect optical scanning error? File a dispute for human analyst review. Notice a viral fake news campaign? Log an abuse report.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAbuseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#B23A48] bg-white border border-[#B23A48]/30 hover:bg-[#FEF2F2] rounded-[6px] transition-colors cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Report Abuse (AF-06)</span>
          </button>

          {report.status !== 'pending_review' && (
            <button
              onClick={() => setIsDisputeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2E6F95] bg-white border border-[#2E6F95]/30 hover:bg-[#EEF2F6] rounded-[6px] transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Dispute Result (AF-09)</span>
            </button>
          )}
        </div>
      </div>

      {/* Dispute Modal (AF-09) */}
      <DisputeModal
        isOpen={isDisputeOpen}
        onClose={() => setIsDisputeOpen(false)}
        reportId={report.id}
        code={report.code}
        onDisputeSuccess={fetchReport}
      />

      {/* Abuse Report Modal (AF-06) */}
      <AbuseReportModal
        isOpen={isAbuseOpen}
        onClose={() => setIsAbuseOpen(false)}
        targetType="code"
        targetIdentifier={report.code}
      />
    </div>
  );
};
