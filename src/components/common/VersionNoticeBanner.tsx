/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Content Version & Retraction Notice Banner (AF-02) (Editorial Aesthetic)
 */

import React from 'react';
import { VersionNotice } from '../../types/index.js';
import { RefreshCw, Ban, ArrowRight } from 'lucide-react';

interface VersionNoticeBannerProps {
  notice?: VersionNotice;
  onNavigateToCode?: (code: string) => void;
}

export const VersionNoticeBanner: React.FC<VersionNoticeBannerProps> = ({ notice, onNavigateToCode }) => {
  if (!notice) return null;

  if (notice.type === 'superseded') {
    return (
      <div className="rounded-[12px] border border-[#2E6F95]/30 bg-[#EEF2F6] p-5 text-[#16233F] shadow-xs mb-6">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-white rounded-[8px] border border-[#2E6F95]/30 text-[#2E6F95] shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2E6F95] font-sans">
              Editorial Notice: Content Superseded by Publisher Correction
            </h4>
            <p className="text-sm text-[#16233F] mt-1 font-serif leading-relaxed">
              {notice.reason || 'The publisher has issued a subsequent corrected edition for this article.'}
            </p>
            {notice.newCode && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs font-bold text-[#16233F]">Corrected Edition Code:</span>
                <span className="font-mono font-bold bg-white px-2.5 py-1 rounded-[6px] border border-[#E1E7EC] text-[#16233F] text-xs">
                  {notice.newCode}
                </span>
                {onNavigateToCode && (
                  <button
                    onClick={() => onNavigateToCode(notice.newCode!)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2E6F95] hover:text-[#255A7A] underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    <span>Verify Corrected Version</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (notice.type === 'retracted') {
    return (
      <div className="rounded-[12px] border border-[#B23A48]/30 bg-[#FEF2F2] p-5 text-[#16233F] shadow-xs mb-6">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-white rounded-[8px] border border-[#B23A48]/30 text-[#B23A48] shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#B23A48] font-sans">
              Official Notice: Article Retracted by Publisher
            </h4>
            <p className="text-sm text-[#16233F] mt-1 leading-relaxed font-serif">
              <strong>Retraction Statement:</strong> {notice.reason || 'This publication was retracted and withdrawn from distribution.'}
            </p>
            <p className="text-xs text-[#6B7280] mt-2 font-sans">
              Note: This verification record is preserved in the immutable archive for historical accountability.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
