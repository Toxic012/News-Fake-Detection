/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - User Dispute Filing Modal (AF-09)
 */

import React, { useState } from 'react';
import { X, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  code: string;
  onDisputeSuccess: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  reportId,
  code,
  onDisputeSuccess
}) => {
  const { token, user } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Please provide a substantive justification (at least 10 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/verify/reports/${reportId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to file dispute');
      }

      setSubmitted(true);
      setTimeout(() => {
        onDisputeSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Error submitting dispute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">
              Escalate to Senior Human Review (AF-09)
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
            <h4 className="text-lg font-bold text-slate-900">Dispute Escalated</h4>
            <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
              Your submission for <strong>{code}</strong> has been routed to the Senior Verification Analyst queue. The evidence report status has been updated to <em>Pending Review</em>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="text-xs text-slate-600 leading-relaxed bg-indigo-50/70 p-3 rounded-lg border border-indigo-100">
              If you believe optical noise, newspaper column alignment, or an algorithmic OCR error misclassified this submission, explain the discrepancy below for human verification.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Verification Code
              </label>
              <div className="font-mono text-sm bg-slate-100 px-3 py-2 rounded-lg text-slate-800 border border-slate-200 font-semibold">
                {code}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Detailed Dispute Justification *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Example: The OCR transcription skipped the middle paragraph due to a page fold in the printed newspaper edition..."
                rows={4}
                required
                className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition-all"
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
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Escalating...' : 'Submit for Analyst Review'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
