/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Crowd-Sourced Abuse & Misinformation Reporting Modal (AF-06)
 */

import React, { useState } from 'react';
import { X, Flag, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface AbuseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'code' | 'publisher' | 'upload';
  targetIdentifier: string;
}

export const AbuseReportModal: React.FC<AbuseReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetIdentifier
}) => {
  const { token } = useAuth();
  const [category, setCategory] = useState('Misleading Social Media / WhatsApp Campaign');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    'Misleading Social Media / WhatsApp Campaign',
    'Doctored Screenshot with Authentic Code Attached',
    'AI-Generated Deepfake Photo / Video with Fake Attribution',
    'Unregistered Impersonator Claiming Publisher Status',
    'Coordinated Multi-Platform Disinformation Swarm'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/public/abuse-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          targetType,
          targetIdentifier,
          category,
          detail
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Submission failed');
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setDetail('');
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Error submitting report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-rose-600" />
            <h3 className="font-semibold text-slate-900">
              Report Abuse / Misinformation Campaign (AF-06)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Report Logged</h4>
            <p className="text-sm text-slate-600 mt-1">
              Thank you. The report has been added to the administrative threat triage queue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Reference
              </label>
              <div className="font-mono text-xs bg-slate-100 px-3 py-2 rounded-lg text-slate-800 border border-slate-200">
                {targetType.toUpperCase()}: {targetIdentifier}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Abuse Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Context & Circulation Evidence
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Where is this false copy circulating? (e.g., WhatsApp forwards in Mumbai group, X viral screenshot with 20k impressions...)"
                rows={3}
                className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {error}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
