/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Instant News Verification Screen (Doc 3 §6 & Doc 4 §7.2)
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  ShieldCheck, Upload, FileText, Image as ImageIcon, QrCode,
  ArrowRight, Sparkles, CheckCircle2, AlertCircle, AlertTriangle,
  RotateCw, HelpCircle, Layers, Sliders, ExternalLink
} from 'lucide-react';

interface VerifyPageProps {
  onReportGenerated: (reportIdOrJobId: string) => void;
  initialCode?: string;
  initialText?: string;
}

export const VerifyPage: React.FC<VerifyPageProps> = ({ onReportGenerated, initialCode, initialText }) => {
  const { token, role, quotaRemaining, decrementQuota } = useAuth();

  const [code, setCode] = useState(initialCode || 'TC-7492-8810');
  const [activeInputType, setActiveInputType] = useState<'text' | 'image'>('text');
  const [submittedText, setSubmittedText] = useState(
    initialText ||
    'The Central Bank Monetary Policy Committee voted unanimously today to lower the benchmark repo rate by 25 basis points to 6.25%, aiming to invigorate private investment and ease borrowing costs for manufacturing sectors. Governor Alistair Finch stated during the quarterly economic review that headline inflation has stabilized at 4.1%, providing sufficient monetary headroom for an accommodative policy stance. The committee projected gross domestic growth at 6.8% for the upcoming fiscal year, citing resilient agricultural output and robust export performance.'
  );

  React.useEffect(() => {
    if (initialCode) setCode(initialCode);
    if (initialText) setSubmittedText(initialText);
  }, [initialCode, initialText]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Job Submission & Async Status
  const [submitting, setSubmitting] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStage, setJobStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotaExceededModal, setQuotaExceededModal] = useState<any | null>(null);

  // Pre-configured Test Scenarios for fast, rigorous verification testing
  const sampleScenarios = [
    {
      id: 'exact-match',
      label: 'Exact Authentic Match',
      badge: 'Match (100%)',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      code: 'TC-7492-8810',
      type: 'text' as const,
      text: 'The Central Bank Monetary Policy Committee voted unanimously today to lower the benchmark repo rate by 25 basis points to 6.25%, aiming to invigorate private investment and ease borrowing costs for manufacturing sectors. Governor Alistair Finch stated during the quarterly economic review that headline inflation has stabilized at 4.1%, providing sufficient monetary headroom for an accommodative policy stance. The committee projected gross domestic growth at 6.8% for the upcoming fiscal year, citing resilient agricultural output and robust export performance.'
    },
    {
      id: 'number-tamper',
      label: 'Quantitative Number Tampering',
      badge: 'Mismatch (32%)',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      code: 'TC-7492-8810',
      type: 'text' as const,
      text: 'The Central Bank Monetary Policy Committee voted unanimously today to RAISE the benchmark repo rate by 125 basis points to 7.25%, aiming to curtail consumer spending. Governor Alistair Finch stated during the quarterly economic review that headline inflation has surged to 8.9%, triggering emergency tightening measures. The committee projected gross domestic growth at 1.8% for the upcoming fiscal year.'
    },
    {
      id: 'newspaper-scan',
      label: 'Fusion Energy Newspaper Scan',
      badge: 'OCR & NLP (94%)',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      code: 'TC-9301-4421',
      type: 'text' as const,
      text: 'NATIONAL LABS ACHIEVE NET POSITIVE FUSION ENERGY IN REPEAT BENCHMARK TRIAL. Scientists at the High-Flux Thermal Reactor facility sustained a magnetically confined plasma reaction generating 3.4 Megajoules from a 2.1 Megajoule laser driver input for 42 consecutive seconds. Chief Scientific Officer Dr. Aris Thorne confirmed the diagnostic metrics were verified by three independent spectroscopy consortia. Commercial scalability remains targeted for the mid-2030s grid connection timeline.'
    },
    {
      id: 'escalation-af01',
      label: 'Low-Confidence Scan (AF-01 Escalation)',
      badge: 'Pending Review (54%)',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      code: 'TC-9301-4421',
      type: 'text' as const,
      text: 'NATI0NAL LABS ACHVE NET POSITIVE FUS10N ENRGY IN REPEAT... [low optical resolution scan with unreadable optical character artifacts and fold noise]'
    },
    {
      id: 'superseded-af02',
      label: 'Superseded Correction Notice (AF-02)',
      badge: 'Superseded Notice',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      code: 'TC-3310-0010',
      type: 'text' as const,
      text: 'Metropolitan Transportation Authority announces that subway fare increases of $0.50 will take effect across all zones starting September 1st.'
    },
    {
      id: 'retracted-af02',
      label: 'Retracted Story (AF-02)',
      badge: 'Retraction Statement',
      badgeClass: 'bg-red-50 text-red-800 border-red-200',
      code: 'TC-8832-6619',
      type: 'text' as const,
      text: 'Exclusive report claiming major autonomous vehicle manufacturer is recalling all commercial fleet vehicles immediately.'
    }
  ];

  const handleApplyScenario = (scenario: typeof sampleScenarios[0]) => {
    setCode(scenario.code);
    setActiveInputType(scenario.type);
    setSubmittedText(scenario.text);
    setImagePreview(null);
    setErrorMessage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setActiveInputType('image');
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Please provide a valid TruthCode verification code or scan a QR.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setJobProgress(10);
    setJobStage('Initiating cryptographic verification...');

    try {
      const res = await fetch('/api/v1/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: code.trim(),
          uploadType: activeInputType,
          submittedText: submittedText,
          fileUrl: imagePreview || ''
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setQuotaExceededModal(data.error);
          setSubmitting(false);
          return;
        }
        throw new Error(data.error?.message || 'Verification request failed');
      }

      decrementQuota();
      const jobId = data.jobId;

      // Poll background AI worker
      pollJobStatus(jobId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit verification request.');
      setSubmitting(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/v1/verify/jobs/${jobId}`);
        const statusData = await res.json();

        if (statusData.progress) {
          setJobProgress(statusData.progress);
        }

        if (statusData.stage) {
          const stageNames: Record<string, string> = {
            extracting_ocr: 'Extracting OCR text & optical metrics...',
            comparing_nlp: 'Comparing NLP semantic similarity & token diffs...',
            analyzing_cv: 'Analyzing CV image diffs & bounding regions...',
            aggregating_evidence: 'Aggregating calibrated confidence score (AF-03)...'
          };
          setJobStage(stageNames[statusData.stage] || 'Processing verification pipeline...');
        }

        if (statusData.status === 'completed' || statusData.status === 'pending_review' || statusData.report) {
          clearInterval(interval);
          setJobProgress(100);
          setJobStage('Evidence aggregation complete.');
          setTimeout(() => {
            setSubmitting(false);
            onReportGenerated(statusData.report?.id || jobId);
          }, 600);
        } else if (statusData.status === 'failed' || attempts > 25) {
          clearInterval(interval);
          setSubmitting(false);
          setErrorMessage(statusData.error?.message || 'Verification analysis timed out.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 450);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header & Vision Statement (Editorial Style) */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF2F6] border border-[#2E6F95]/30 text-[#2E6F95] text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Objective News Authenticity Verification</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#16233F] tracking-tight">
          Verify News Against Publisher Originals
        </h1>
        <p className="text-sm text-[#6B7280] mt-2 leading-relaxed font-sans">
          Paste the TruthCode from any article or scan the QR to inspect word-by-word modifications, altered quantitative figures, and visual tamper regions.
        </p>
      </div>

      {/* Preset Test Scenarios Bar */}
      <div className="mb-6 bg-white border border-[#E1E7EC] rounded-[12px] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#16233F] flex items-center gap-1.5 font-sans">
            <Sparkles className="w-3.5 h-3.5 text-[#2E6F95]" />
            Quick-Load Verification Test Presets
          </span>
          <span className="text-[11px] text-[#9AA7B5] font-sans">Click any scenario to populate payload</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {sampleScenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleApplyScenario(sc)}
              className="text-left p-3 rounded-[8px] bg-[#F6F8FA] border border-[#E1E7EC] hover:border-[#2E6F95] hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between gap-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#16233F] group-hover:text-[#2E6F95] transition-colors">
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-[10px] bg-white border border-[#E1E7EC] px-1.5 py-0.5 rounded text-[#16233F] font-bold">
                  {sc.code}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sc.badgeClass}`}>
                  {sc.badge}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Verification Submission Card */}
      <div className="bg-white rounded-[12px] border border-[#E1E7EC] shadow-sm p-6 sm:p-8">
        <form onSubmit={handleVerify} className="space-y-6">
          {/* Code Input & Preflight Info */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#16233F]">
                TruthCode Verification Identifier (or QR Code) *
              </label>
              <span className="text-xs text-[#6B7280]">Found alongside registered news items</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                <QrCode className="w-5 h-5 text-[#2E6F95]" />
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. TC-7492-8810"
                className="w-full pl-11 pr-4 py-3 text-base font-mono font-bold text-[#16233F] bg-[#F6F8FA] rounded-[8px] border border-[#E1E7EC] focus:bg-white focus:ring-2 focus:ring-[#2E6F95] focus:border-[#2E6F95] outline-hidden tracking-wider transition-all"
                required
              />
            </div>
          </div>

          {/* Submission Format Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#16233F]">
                Content Received to Verify *
              </label>
              <div className="flex items-center gap-1 bg-[#F6F8FA] p-1 rounded-[8px] border border-[#E1E7EC]">
                <button
                  type="button"
                  onClick={() => setActiveInputType('text')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs font-bold transition-colors cursor-pointer ${
                    activeInputType === 'text' ? 'bg-white text-[#16233F] shadow-xs border border-[#E1E7EC]' : 'text-[#6B7280] hover:text-[#16233F]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#2E6F95]" />
                  <span>Text / Forward Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputType('image')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-xs font-bold transition-colors cursor-pointer ${
                    activeInputType === 'image' ? 'bg-white text-[#16233F] shadow-xs border border-[#E1E7EC]' : 'text-[#6B7280] hover:text-[#16233F]'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#2E6F95]" />
                  <span>Screenshot / Photo Upload</span>
                </button>
              </div>
            </div>

            {activeInputType === 'text' ? (
              <textarea
                value={submittedText}
                onChange={(e) => setSubmittedText(e.target.value)}
                placeholder="Paste the received news forward, WhatsApp message, or digital paragraph here to compare against publisher original..."
                rows={6}
                className="w-full text-base font-serif text-[#16233F] bg-[#F6F8FA] rounded-[8px] border border-[#E1E7EC] p-4 focus:bg-white focus:ring-2 focus:ring-[#2E6F95] focus:border-[#2E6F95] outline-hidden leading-relaxed transition-all"
                required
              />
            ) : (
              <div className="border-2 border-dashed border-[#E1E7EC] hover:border-[#2E6F95] rounded-[8px] p-6 text-center bg-[#F6F8FA] transition-colors">
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Uploaded screenshot preview"
                      className="max-h-48 mx-auto rounded-lg shadow-xs border border-[#E1E7EC] object-contain"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <label className="text-xs font-bold text-[#2E6F95] hover:text-[#16233F] cursor-pointer">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[#9AA7B5]">•</span>
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="text-xs font-bold text-[#B23A48] hover:text-rose-800 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-10 h-10 text-[#9AA7B5] mx-auto mb-2" />
                    <span className="text-sm font-bold text-[#16233F] block">
                      Upload news screenshot, scan, or photo
                    </span>
                    <span className="text-xs text-[#6B7280] block mt-1">
                      PNG, JPG, WebP up to 15MB • OCR extraction will run automatically
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#B23A48]/30 rounded-[8px] text-xs text-[#B23A48] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#B23A48] shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#6B7280] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#2E6F95]" />
              <span>AI Pipeline: Multimodal OCR • NLP Token Diff • CV Structural Tamper Detection</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-[8px] bg-[#2E6F95] hover:bg-[#255A7A] text-white font-bold text-sm uppercase tracking-wider shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? 'Verifying Content...' : 'Run Verification'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Asynchronous Processing Modal Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16233F]/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[12px] max-w-md w-full p-6 shadow-2xl border border-[#E1E7EC] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#EEF2F6] text-[#2E6F95] mx-auto flex items-center justify-center">
              <RotateCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-[#16233F]">
                Verifying Against Registered Original
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">{jobStage}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#F6F8FA] rounded-full overflow-hidden border border-[#E1E7EC]">
              <div
                className="h-full bg-[#2E6F95] transition-all duration-300 rounded-full"
                style={{ width: `${jobProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-[#6B7280]">
              <span>Code: {code}</span>
              <span>{jobProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Quota Exceeded Modal (AF-04) */}
      {quotaExceededModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16233F]/70 backdrop-blur-xs">
          <div className="bg-white rounded-[12px] max-w-md w-full p-6 shadow-2xl border border-[#E1E7EC] space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FEF3C7] text-[#C77D28] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-serif font-bold text-[#16233F]">
                Daily Verification Quota Reached (AF-04)
              </h3>
              <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
                {quotaExceededModal.message}
              </p>
              {quotaExceededModal.resetsAt && (
                <div className="mt-3 text-xs font-mono bg-[#F6F8FA] text-[#16233F] p-2 rounded border border-[#E1E7EC]">
                  Resets At: {new Date(quotaExceededModal.resetsAt).toLocaleTimeString()} UTC
                </div>
              )}
            </div>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setQuotaExceededModal(null)}
                className="w-full py-2 bg-[#16233F] hover:bg-[#25385E] text-white text-xs font-bold uppercase tracking-wider rounded-[6px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
