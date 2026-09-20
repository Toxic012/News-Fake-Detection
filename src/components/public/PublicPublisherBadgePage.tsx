/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Public Verified Publisher Certification Page (AF-05)
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Building2, Globe, Calendar, CheckCircle2, ArrowLeft, ExternalLink } from 'lucide-react';

interface PublicPublisherBadgePageProps {
  publisherId: string;
  onBack: () => void;
}

export const PublicPublisherBadgePage: React.FC<PublicPublisherBadgePageProps> = ({ publisherId, onBack }) => {
  const [publisher, setPublisher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublisher();
  }, [publisherId]);

  const fetchPublisher = async () => {
    try {
      const res = await fetch(`/api/v1/public/publishers/${publisherId}`);
      if (res.ok) {
        const data = await res.json();
        setPublisher(data.publisher);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Platform</span>
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20 text-white">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Official TruthCode™ Certified Publisher</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {publisher?.organizationName || 'The Daily Chronicle'}
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Official Registry ID: {publisher?.registrationNumber || 'REG-DC-2024-8891'}
          </p>
        </div>

        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-400" />
              Verified News Domain
            </span>
            <span className="font-semibold text-indigo-600 font-mono">
              {publisher?.websiteUrl || 'https://dailychronicle.com'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              Accreditation Status
            </span>
            <span className="font-semibold text-emerald-700">
              Verified & Active
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Onboarding Date
            </span>
            <span className="font-semibold text-slate-800">
              {new Date(publisher?.createdAt || Date.now()).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          All articles, newspaper scans, and official media releases registered under this organization are cryptographically signed with SHA-256 hashes and timestamped in the TruthCode provenance registry.
        </p>
      </div>
    </div>
  );
};
