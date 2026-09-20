/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Status Badge Component (Editorial Aesthetic)
 */

import React from 'react';
import { ReportStatus, VerificationCodeStatus } from '../../types/index.js';
import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: ReportStatus | VerificationCodeStatus | 'pending' | 'approved' | 'rejected' | 'suspended' | 'open' | 'investigating' | 'closed';
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, score, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-bold tracking-wide uppercase',
    lg: 'px-3.5 py-1.5 text-sm font-bold tracking-wide uppercase'
  }[size];

  switch (status) {
    case 'match':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-[6px] bg-[#E8F5E9] text-[#2E8B57] border border-[#2E8B57]/30 ${sizeClasses}`}>
          <CheckCircle2 className="w-4 h-4 text-[#2E8B57] shrink-0" />
          <span>AUTHENTIC MATCH {score !== undefined ? `(${score}%)` : ''}</span>
        </span>
      );

    case 'partial_match':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-[6px] bg-[#FEF3C7] text-[#C77D28] border border-[#C77D28]/30 ${sizeClasses}`}>
          <AlertTriangle className="w-4 h-4 text-[#C77D28] shrink-0" />
          <span>PARTIAL MATCH {score !== undefined ? `(${score}%)` : ''}</span>
        </span>
      );

    case 'mismatch':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-[6px] bg-[#FEF2F2] text-[#B23A48] border border-[#B23A48]/30 ${sizeClasses}`}>
          <XCircle className="w-4 h-4 text-[#B23A48] shrink-0" />
          <span>TAMPER DETECTED {score !== undefined ? `(${score}%)` : ''}</span>
        </span>
      );

    case 'pending_review':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-[6px] bg-[#EEF2F6] text-[#2E6F95] border border-[#2E6F95]/30 ${sizeClasses}`}>
          <Clock className="w-4 h-4 text-[#2E6F95] shrink-0 animate-pulse" />
          <span>PENDING REVIEW {score !== undefined ? `(${score}%)` : ''}</span>
        </span>
      );

    case 'superseded':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-[6px] bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/30 ${sizeClasses}`}>
          <RefreshCw className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>SUPERSEDED</span>
        </span>
      );

    case 'retracted':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-[6px] bg-[#FEE2E2] text-[#991B1B] border border-[#991B1B]/30 ${sizeClasses}`}>
          <Ban className="w-4 h-4 text-[#991B1B] shrink-0" />
          <span>RETRACTED</span>
        </span>
      );

    case 'active':
    case 'approved':
    case 'closed':
      return (
        <span className={`inline-flex items-center gap-1 rounded-[6px] bg-slate-100 text-slate-700 border border-[#E1E7EC] ${sizeClasses}`}>
          <span className="w-2 h-2 rounded-full bg-[#2E8B57]" />
          <span className="capitalize">{status}</span>
        </span>
      );

    case 'pending':
    case 'investigating':
      return (
        <span className={`inline-flex items-center gap-1 rounded-[6px] bg-[#FEF3C7] text-[#C77D28] border border-[#C77D28]/30 ${sizeClasses}`}>
          <span className="w-2 h-2 rounded-full bg-[#C77D28] animate-ping" />
          <span className="capitalize">{status}</span>
        </span>
      );

    case 'rejected':
    case 'suspended':
      return (
        <span className={`inline-flex items-center gap-1 rounded-[6px] bg-[#FEF2F2] text-[#B23A48] border border-[#B23A48]/30 ${sizeClasses}`}>
          <span className="w-2 h-2 rounded-full bg-[#B23A48]" />
          <span className="capitalize">{status}</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-[6px] bg-slate-100 text-slate-700 border border-[#E1E7EC] ${sizeClasses}`}>
          <span className="capitalize">{status}</span>
        </span>
      );
  }
};
