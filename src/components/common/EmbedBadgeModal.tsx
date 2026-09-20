/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Publisher Embed Badge Modal (AF-05)
 */

import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check } from 'lucide-react';

interface EmbedBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  publisherId: string;
  organizationName: string;
  registrationNumber: string;
}

export const EmbedBadgeModal: React.FC<EmbedBadgeModalProps> = ({
  isOpen,
  onClose,
  publisherId,
  organizationName,
  registrationNumber
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const badgeHtml = `<a href="https://truthcode.org/verify/publisher/${publisherId}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#0f172a;color:#38bdf8;border:1px solid #1e293b;border-radius:6px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,0.05);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>TruthCode™ Verified Publisher</a>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(badgeHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">
              Verified Publisher Embed Badge (AF-05)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Embed this official Trust Badge on your website header, footer, or digital news articles. Readers clicking this badge will be directed to your verified TruthCode registry certification page.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Live Badge Preview
            </label>
            <div className="p-5 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
              <a
                href={`#/public-badge/${publisherId}`}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-sky-400 border border-slate-800 rounded-lg text-xs font-semibold shadow-xs hover:bg-slate-800 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>TruthCode™ Verified Publisher</span>
              </a>
              <span className="text-[11px] text-slate-500 font-mono">
                {organizationName} • {registrationNumber}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                HTML Embed Code Snippet
              </label>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={badgeHtml}
              rows={4}
              className="w-full font-mono text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg border border-slate-700 outline-hidden select-all"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
