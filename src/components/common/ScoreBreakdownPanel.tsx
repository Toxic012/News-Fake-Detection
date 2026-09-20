/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Score Explainability & Calibration Panel (AF-03) (Editorial Aesthetic)
 */

import React from 'react';
import { ScoreBreakdown, ReportStatus } from '../../types/index.js';
import { Sliders, ShieldCheck, AlertCircle, Cpu, FileText, Image as ImageIcon } from 'lucide-react';

interface ScoreBreakdownPanelProps {
  scoreBreakdown?: ScoreBreakdown;
  overallScore: number;
  status: ReportStatus;
}

export const ScoreBreakdownPanel: React.FC<ScoreBreakdownPanelProps> = ({
  scoreBreakdown,
  overallScore,
  status
}) => {
  if (!scoreBreakdown) return null;

  const isLowConfidence = (scoreBreakdown.calibratedConfidence ?? 100) < 70;

  return (
    <div className="bg-white rounded-[12px] border border-[#E1E7EC] p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#E1E7EC]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#2E6F95]" />
          <h3 className="text-base font-serif font-bold text-[#16233F]">
            Score Breakdown & Confidence Calibration (AF-03)
          </h3>
        </div>
        <span className="text-xs font-mono bg-[#F6F8FA] text-[#16233F] font-bold px-2 py-0.5 rounded-[6px] border border-[#E1E7EC]">
          Weighting: {scoreBreakdown.weightingVersion || 'v1.0'}
        </span>
      </div>

      {/* Primary Calibration Bar */}
      <div className="mt-4 p-4 bg-[#F6F8FA] rounded-[8px] border border-[#E1E7EC]">
        <div className="flex items-center justify-between text-xs mb-1.5 font-sans">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2E6F95]" />
            <span className="font-bold text-[#16233F] uppercase tracking-wider text-[11px]">Calibrated Confidence Level</span>
          </div>
          <span className="font-mono font-bold text-sm text-[#16233F]">
            {scoreBreakdown.calibratedConfidence?.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-[#E1E7EC] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isLowConfidence
                ? 'bg-[#C77D28]'
                : scoreBreakdown.calibratedConfidence > 90
                ? 'bg-[#2E8B57]'
                : 'bg-[#2E6F95]'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, scoreBreakdown.calibratedConfidence || 0))}%` }}
          />
        </div>
        {isLowConfidence && (
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-[#C77D28] font-medium bg-[#FEF3C7] p-2.5 rounded-[6px] border border-[#C77D28]/30">
            <AlertCircle className="w-4 h-4 text-[#C77D28] shrink-0" />
            <span>
              Confidence below 70.0% standard benchmark — automated escalation to Human Review Queue engaged (AF-01).
            </span>
          </div>
        )}
      </div>

      {/* Sub-Score Pipeline Components */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {/* OCR Score */}
        <div className="p-3.5 rounded-[8px] border border-[#E1E7EC] bg-white">
          <div className="flex items-center justify-between text-xs text-[#6B7280] mb-1">
            <span className="flex items-center gap-1 font-bold text-[#16233F]">
              <FileText className="w-3.5 h-3.5 text-[#2E6F95]" />
              OCR Accuracy
            </span>
            <span className="font-mono font-bold text-[#16233F]">
              {scoreBreakdown.ocr !== null && scoreBreakdown.ocr !== undefined ? `${scoreBreakdown.ocr.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {scoreBreakdown.ocr !== null ? 'Text density & clarity' : 'Direct digital text feed'}
          </div>
        </div>

        {/* NLP Score */}
        <div className="p-3.5 rounded-[8px] border border-[#E1E7EC] bg-white">
          <div className="flex items-center justify-between text-xs text-[#6B7280] mb-1">
            <span className="flex items-center gap-1 font-bold text-[#16233F]">
              <Cpu className="w-3.5 h-3.5 text-[#2E6F95]" />
              NLP Similarity
            </span>
            <span className="font-mono font-bold text-[#16233F]">
              {scoreBreakdown.nlp !== null && scoreBreakdown.nlp !== undefined ? `${scoreBreakdown.nlp.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div className="text-[11px] text-[#6B7280]">
            Token diffs & semantic match
          </div>
        </div>

        {/* CV Score */}
        <div className="p-3.5 rounded-[8px] border border-[#E1E7EC] bg-white">
          <div className="flex items-center justify-between text-xs text-[#6B7280] mb-1">
            <span className="flex items-center gap-1 font-bold text-[#16233F]">
              <ImageIcon className="w-3.5 h-3.5 text-[#2E6F95]" />
              CV Structural
            </span>
            <span className="font-mono font-bold text-[#16233F]">
              {scoreBreakdown.cv !== null && scoreBreakdown.cv !== undefined ? `${scoreBreakdown.cv.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {scoreBreakdown.cv !== null ? 'Visual bounding & layout' : 'Text comparison mode'}
          </div>
        </div>
      </div>

      {/* Rationale Text */}
      {scoreBreakdown.explanation && (
        <div className="mt-4 text-xs text-[#16233F] bg-[#F6F8FA] p-3.5 rounded-[8px] border border-[#E1E7EC] leading-relaxed">
          <strong className="text-[#16233F] font-bold">Model Rationale:</strong> {scoreBreakdown.explanation}
        </div>
      )}
    </div>
  );
};
