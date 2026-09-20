/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Administrative & Senior Reviewer Center (AF-01, AF-03, AF-06, AF-08, FR-A1..A7)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { ScoreBreakdownPanel } from '../common/ScoreBreakdownPanel.js';
import { AnalystRole, User } from '../../types/index.js';
import {
  ShieldAlert, CheckCircle2, XCircle, Sliders, Play, Flag,
  Building2, History, RefreshCw, FileText, AlertTriangle,
  ArrowRight, Check, Eye, ShieldCheck, Zap, Users, UserCheck,
  Shield, KeyRound, Plus, Edit3, Lock, CheckSquare, Square
} from 'lucide-react';

export const AdminCenter: React.FC = () => {
  const { token, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'review_queue' | 'calibration' | 'adversarial' | 'abuse_queue' | 'publishers' | 'audit_logs' | 'analyst_roles'>('review_queue');

  // Review Queue State (AF-01 & AF-09)
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null);
  const [reviewerVerdict, setReviewerVerdict] = useState<string>('mismatch');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Calibration State (AF-03)
  const [weights, setWeights] = useState({
    ocr: 0.20,
    nlp: 0.50,
    cv: 0.30,
    threshold: 70
  });
  const [calibVersion, setCalibVersion] = useState('v1.0');
  const [calibSaved, setCalibSaved] = useState(false);

  // Adversarial Testing Suite State (AF-08)
  const [adversarialResults, setAdversarialResults] = useState<any | null>(null);
  const [runningAdversarial, setRunningAdversarial] = useState(false);

  // Abuse Reports State (AF-06)
  const [abuseReports, setAbuseReports] = useState<any[]>([]);

  // Publishers Queue State
  const [publishers, setPublishers] = useState<any[]>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Granular Analyst Roles & RBAC State (Doc Requirement 19)
  const [rolesList, setRolesList] = useState<AnalystRole[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<AnalystRole | null>(null);
  const [roleSaveSuccess, setRoleSaveSuccess] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);


  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, [token, activeTab]);

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === 'review_queue') {
        const res = await fetch('/api/v1/admin/review-queue', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || data.queue || [];
          setReviewQueue(items);
          if (items.length > 0 && !selectedReviewItem) {
            setSelectedReviewItem(items[0]);
          }
        }
      } else if (activeTab === 'calibration') {
        const res = await fetch('/api/v1/admin/model-weights', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.weights) {
            setWeights({
              ocr: data.weights.ocrWeight,
              nlp: data.weights.nlpWeight,
              cv: data.weights.cvWeight,
              threshold: data.weights.escalationThreshold || 70
            });
            setCalibVersion(data.weights.version || 'v1.0');
          }
        }
      } else if (activeTab === 'abuse_queue') {
        const res = await fetch('/api/v1/admin/abuse-reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAbuseReports(data.reports || []);
        }
      } else if (activeTab === 'publishers') {
        const res = await fetch('/api/v1/admin/publishers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPublishers(data.publishers || []);
        }
      } else if (activeTab === 'audit_logs') {
        const res = await fetch('/api/v1/admin/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } else if (activeTab === 'analyst_roles') {
        const [rolesRes, usersRes] = await Promise.all([
          fetch('/api/v1/admin/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/v1/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (rolesRes.ok) {
          const rData = await rolesRes.json();
          setRolesList(rData.roles || []);
          if (rData.roles?.length > 0 && !selectedRole) {
            setSelectedRole(rData.roles[0]);
            setEditingPermissions([...(rData.roles[0].permissions || [])]);
          }
        }
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsersList(uData.users || []);
        }
      }
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // AF-01 Reviewer Decision
  const handleResolveReview = async () => {
    if (!selectedReviewItem || !reviewerNotes.trim()) {
      alert('Please provide substantive reviewer justification notes.');
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/review-queue/${selectedReviewItem.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          verdict: reviewerVerdict,
          analystNotes: reviewerNotes
        })
      });

      if (!res.ok) throw new Error('Resolution failed');

      alert('Item resolved and evidence report updated successfully.');
      setSelectedReviewItem(null);
      setReviewerNotes('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Error resolving review item');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // AF-03 Save Calibration
  const handleSaveWeights = async () => {
    try {
      const nextVer = `v${(parseFloat(calibVersion.replace('v', '')) + 0.1).toFixed(1)}`;
      const res = await fetch('/api/v1/admin/model-weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ocrWeight: weights.ocr,
          nlpWeight: weights.nlp,
          cvWeight: weights.cv,
          escalationThreshold: weights.threshold,
          version: nextVer
        })
      });

      if (res.ok) {
        setCalibVersion(nextVer);
        setCalibSaved(true);
        setTimeout(() => setCalibSaved(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // AF-08 Run Adversarial Test Suite
  const handleRunAdversarial = async () => {
    setRunningAdversarial(true);
    try {
      const res = await fetch('/api/v1/admin/adversarial-suite', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAdversarialResults(data.testSuite);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningAdversarial(false);
    }
  };

  // AF-06 Update Abuse Report Status
  const handleUpdateAbuseStatus = async (reportId: string, status: string) => {
    try {
      await fetch(`/api/v1/admin/abuse-reports/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Approve / Reject Publisher
  const handleUpdatePublisherStatus = async (publisherId: string, status: 'approved' | 'rejected' | 'suspended') => {
    try {
      await fetch(`/api/v1/admin/publishers/${publisherId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // RBAC Permission Management (Doc Requirement 19)
  const availablePermissions = [
    { key: 'news.review', label: 'Review News Content', desc: 'Inspect diffs and evaluate claims' },
    { key: 'news.approve', label: 'Approve News Verdict', desc: 'Mark articles as authentic match' },
    { key: 'news.reject', label: 'Reject News Verdict', desc: 'Confirm tamper/mismatch verdicts' },
    { key: 'news.escalate', label: 'Escalate News Case', desc: 'Route disputed cases to action queue' },
    { key: 'publisher.review', label: 'Review Publisher KYC', desc: 'Verify editorial & incorporation docs' },
    { key: 'publisher.approve', label: 'Approve Publisher', desc: 'Certify publisher and authorize PKI keys' },
    { key: 'publisher.reject', label: 'Reject Publisher', desc: 'Deny publisher onboarding' },
    { key: 'publisher.suspend_recommendation', label: 'Recommend Suspension', desc: 'Propose publisher suspension' },
    { key: 'reports.review', label: 'Review Abuse Reports', desc: 'Triage user-submitted fraud reports' },
    { key: 'reports.assign', label: 'Assign Reports', desc: 'Delegate reports to analyst teams' },
    { key: 'reports.escalate', label: 'Escalate Reports', desc: 'Trigger high-priority investigation' },
    { key: 'evidence.view', label: 'View Deep Evidence', desc: 'Access raw embeddings and OCR vectors' },
    { key: 'evidence.export', label: 'Export Forensic Evidence', desc: 'Download legal chain-of-custody packages' },
    { key: 'content.restrict', label: 'Restrict Content', desc: 'Suppress deceptive verification codes' },
    { key: 'audit.view', label: 'View System Audit Logs', desc: 'Inspect administrative audit trails' },
    { key: 'models.calibrate', label: 'Calibrate Models', desc: 'Update OCR, NLP, and CV scoring weights' },
    { key: 'admin.roles.manage', label: 'Manage RBAC Roles', desc: 'Configure role permissions and assignments' }
  ];

  const handleTogglePermission = (permKey: string) => {
    if (editingPermissions.includes(permKey)) {
      setEditingPermissions(editingPermissions.filter(p => p !== permKey));
    } else {
      setEditingPermissions([...editingPermissions, permKey]);
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    setSavingRole(true);
    setRoleSaveSuccess(false);
    try {
      const res = await fetch(`/api/v1/admin/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          permissions: editingPermissions
        })
      });
      if (res.ok) {
        setRoleSaveSuccess(true);
        setTimeout(() => setRoleSaveSuccess(false), 3000);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update role permissions:', err);
    } finally {
      setSavingRole(false);
    }
  };

  const handleAssignUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to assign user role:', err);
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E1E7EC] mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#16233F] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#2E6F95]" />
            <span>Platform Governance & Human Review Center</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Senior Verification Analyst Queue (AF-01), Calibration Tuning (AF-03), Adversarial Robustness (AF-08), and Abuse Triage (AF-06).
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#16233F] bg-white border border-[#E1E7EC] hover:bg-[#F6F8FA] rounded-[6px] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#2E6F95]" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E1E7EC] mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('review_queue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer uppercase tracking-wider ${
            activeTab === 'review_queue'
              ? 'border-[#2E6F95] text-[#2E6F95]'
              : 'border-transparent text-[#6B7280] hover:text-[#16233F]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Human Review Queue ({reviewQueue.filter(r => r.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer uppercase tracking-wider ${
            activeTab === 'calibration'
              ? 'border-[#2E6F95] text-[#2E6F95]'
              : 'border-transparent text-[#6B7280] hover:text-[#16233F]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Model Calibration (AF-03)</span>
        </button>

        <button
          onClick={() => setActiveTab('adversarial')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer uppercase tracking-wider ${
            activeTab === 'adversarial'
              ? 'border-[#2E6F95] text-[#2E6F95]'
              : 'border-transparent text-[#6B7280] hover:text-[#16233F]'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Adversarial Testing (AF-08)</span>
        </button>

        <button
          onClick={() => setActiveTab('abuse_queue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer uppercase tracking-wider ${
            activeTab === 'abuse_queue'
              ? 'border-[#2E6F95] text-[#2E6F95]'
              : 'border-transparent text-[#6B7280] hover:text-[#16233F]'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Abuse Reports (AF-06)</span>
        </button>

        <button
          onClick={() => setActiveTab('publishers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer uppercase tracking-wider ${
            activeTab === 'publishers'
              ? 'border-[#2E6F95] text-[#2E6F95]'
              : 'border-transparent text-[#6B7280] hover:text-[#16233F]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Publishers KYC</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer uppercase tracking-wider ${
            activeTab === 'audit_logs'
              ? 'border-[#2E6F95] text-[#2E6F95]'
              : 'border-transparent text-[#6B7280] hover:text-[#16233F]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Log Trail</span>
        </button>

        <button
          onClick={() => setActiveTab('analyst_roles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer uppercase tracking-wider ${
            activeTab === 'analyst_roles'
              ? 'border-[#2E6F95] text-[#2E6F95]'
              : 'border-transparent text-[#6B7280] hover:text-[#16233F]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Analyst Roles & RBAC</span>
        </button>
      </div>

      {/* TAB 1: HUMAN REVIEW QUEUE (AF-01 & AF-09) */}
      {activeTab === 'review_queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pb-1">
              <span>Pending Human Reviews</span>
              <span>{reviewQueue.length} items total</span>
            </div>

            {reviewQueue.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                Review queue is clear. No escalated items pending analyst resolution.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {reviewQueue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedReviewItem(item);
                      setReviewerNotes('');
                    }}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedReviewItem?.id === item.id
                        ? 'bg-indigo-50/70 border-indigo-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-slate-900">{item.code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        item.escalationReason === 'user_dispute'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {item.escalationReason?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-slate-800 font-semibold truncate mb-1">
                      {item.report?.originalContent?.title || 'Escalated Submission'}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Status: {item.status}</span>
                      <span>Score: {item.report?.overallScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Item Review & Override Workspace */}
          <div className="lg:col-span-7">
            {selectedReviewItem ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                      Review Workspace • {selectedReviewItem.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedReviewItem.report?.originalContent?.title || 'News Item'}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800">
                    {selectedReviewItem.status.toUpperCase()}
                  </span>
                </div>

                {/* Escalation Context Banner */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Escalation Trigger: {selectedReviewItem.escalationReason}
                  </div>
                  <div className="text-slate-600">
                    <strong>User / Model Note:</strong> {selectedReviewItem.disputeReason || 'Confidence level was below 70% threshold in automated aggregation layer.'}
                  </div>
                </div>

                {/* Comparison Texts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Original Registered Copy:</span>
                    <div className="text-slate-600 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {selectedReviewItem.report?.originalContent?.bodyText}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Submitted Forward / Scan:</span>
                    <div className="text-slate-800 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {selectedReviewItem.report?.submittedContent?.text}
                    </div>
                  </div>
                </div>

                {/* Reviewer Resolution Form */}
                <div className="pt-3 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Senior Analyst Final Verdict
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'match', label: 'Match (100%)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                        { id: 'partial_match', label: 'Partial Match', color: 'text-amber-700 bg-amber-50 border-amber-300' },
                        { id: 'mismatch', label: 'Mismatch', color: 'text-rose-700 bg-rose-50 border-rose-300' },
                        { id: 'ambiguous', label: 'Ambiguous', color: 'text-slate-700 bg-slate-100 border-slate-300' }
                      ].map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setReviewerVerdict(v.id)}
                          className={`p-2 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                            reviewerVerdict === v.id
                              ? `${v.color} ring-2 ring-indigo-500`
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Analyst Forensic Audit Notes *
                    </label>
                    <textarea
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      placeholder="Specify reasoning (e.g., Reviewed newspaper scan; fold artifact accounted for, confirmed authentic headline text with publisher editorial desk)..."
                      rows={3}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleResolveReview}
                      disabled={reviewSubmitting || selectedReviewItem.status === 'resolved'}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {reviewSubmitting ? 'Resolving Item...' : 'Submit Resolution & Update Report'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500">
                Select an item from the human review queue to inspect and resolve.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MODEL CALIBRATION & WEIGHTS (AF-03) */}
      {activeTab === 'calibration' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                AF-03: Score Explainability & Weight Calibration Tuning
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust the dynamic multimodal weighting coefficients used by the evidence aggregator.
              </p>
            </div>
            <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded font-bold text-slate-800 border border-slate-200">
              Active Version: {calibVersion}
            </span>
          </div>

          <div className="space-y-5 text-xs">
            {/* OCR Slider */}
            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1.5">
                <span>OCR Character Accuracy Weight (w_ocr)</span>
                <span className="font-mono">{(weights.ocr * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.ocr}
                onChange={(e) => setWeights({ ...weights, ocr: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* NLP Slider */}
            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1.5">
                <span>NLP Semantic & Token Match Weight (w_nlp)</span>
                <span className="font-mono">{(weights.nlp * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.nlp}
                onChange={(e) => setWeights({ ...weights, nlp: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* CV Slider */}
            <div>
              <div className="flex justify-between font-bold text-slate-800 mb-1.5">
                <span>Computer Vision Structural Weight (w_cv)</span>
                <span className="font-mono">{(weights.cv * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.cv}
                onChange={(e) => setWeights({ ...weights, cv: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Escalation Threshold */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between font-bold text-slate-800 mb-1.5">
                <span>AF-01 Escalation Confidence Threshold (%)</span>
                <span className="font-mono">{weights.threshold.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="1"
                value={weights.threshold}
                onChange={(e) => setWeights({ ...weights, threshold: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Any verification evaluation returning confidence lower than this benchmark triggers automatic routing to the Senior Review Queue.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {calibSaved ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Calibration weights updated system-wide!
              </span>
            ) : <span />}

            <button
              onClick={handleSaveWeights}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Deploy New Weights Version
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ADVERSARIAL TESTING SUITE (AF-08) */}
      {activeTab === 'adversarial' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                <span>AF-08: Automated Adversarial Robustness Test Suite</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Simulates state-actor evasion attacks: Homoglyph spoofing, zero-width space injections, number alterations, prompt injection attempts, and synthetic noise.
              </p>
            </div>

            <button
              onClick={handleRunAdversarial}
              disabled={runningAdversarial}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Play className="w-4 h-4" />
              <span>{runningAdversarial ? 'Executing Adversarial Attacks...' : 'Run Adversarial Battery'}</span>
            </button>
          </div>

          {adversarialResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500">Adversarial Resilience</span>
                  <span className="text-2xl font-extrabold text-emerald-600 block mt-1">
                    {adversarialResults.resilienceScore}%
                  </span>
                  <span className="text-[11px] text-slate-400">Target: {'>'} 90.0%</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500">Attack Vectors Tested</span>
                  <span className="text-2xl font-extrabold text-slate-900 block mt-1">
                    {adversarialResults.totalTests}
                  </span>
                  <span className="text-[11px] text-slate-400">All Passed Verification</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500">Suite Status</span>
                  <span className="text-2xl font-extrabold text-emerald-600 block mt-1">
                    {adversarialResults.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400">{new Date(adversarialResults.executedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Attack Vector Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Expected Result</th>
                      <th className="py-3 px-4">Actual AI Score</th>
                      <th className="py-3 px-4">Forensic Detection Notes</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {adversarialResults.tests.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{t.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 uppercase text-[10px]">{t.category}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{t.expectedResult}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{t.actualScore}%</td>
                        <td className="py-3.5 px-4 text-slate-600">{t.details}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" /> PASS
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ABUSE REPORTS QUEUE (AF-06) */}
      {activeTab === 'abuse_queue' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <h3 className="text-sm font-bold text-slate-900">
              Crowd-Sourced Misinformation & Coordinated Campaign Triage (AF-06)
            </h3>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Target Ref</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Circulation Context</th>
                <th className="py-3 px-4">Reported Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {abuseReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {r.targetIdentifier}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-rose-700">{r.category}</td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-sm">{r.detail}</td>
                  <td className="py-3.5 px-4 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleUpdateAbuseStatus(r.id, 'investigating')}
                        className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Investigate
                      </button>
                      <button
                        onClick={() => handleUpdateAbuseStatus(r.id, 'closed')}
                        className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: PUBLISHERS KYC */}
      {activeTab === 'publishers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <h3 className="text-sm font-bold text-slate-900">
              Publisher Onboarding & Verification KYC
            </h3>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Official Registration ID</th>
                <th className="py-3 px-4">Website Domain</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {publishers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{p.organizationName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{p.registrationNumber}</td>
                  <td className="py-3.5 px-4 text-indigo-600">{p.websiteUrl}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={p.verificationStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.verificationStatus !== 'approved' && (
                        <button
                          onClick={() => handleUpdatePublisherStatus(p.id, 'approved')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {p.verificationStatus === 'approved' && (
                        <button
                          onClick={() => handleUpdatePublisherStatus(p.id, 'suspended')}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70">
            <h3 className="text-sm font-bold text-slate-900">
              Immutable Cryptographic System Audit Trail
            </h3>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 uppercase">{log.action}</td>
                  <td className="py-3 px-4 text-indigo-700">{log.userId}</td>
                  <td className="py-3 px-4 text-slate-600 font-sans text-xs">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: GRANULAR ANALYST ROLES & RBAC (Doc Requirement 19) */}
      {activeTab === 'analyst_roles' && (
        <div className="space-y-8">
          {/* Top Banner explaining RBAC */}
          <div className="bg-white rounded-xl border border-[#D0D7DE] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2E6F95] font-mono">
                  <ShieldCheck className="w-4 h-4 text-[#2E8B57]" />
                  Granular Role-Based Access Control (RBAC)
                </div>
                <h2 className="text-xl font-serif font-bold text-[#16233F] mt-1">
                  Analyst Permissions & Role Governance
                </h2>
                <p className="text-xs text-[#52606D] mt-1 max-w-3xl">
                  Configure specific permissions for news fact-checkers, publisher KYC verification officers, and dispute action analysts. Changes take effect across active sessions immediately.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#DEF7EC] text-[#03543F] font-mono text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {rolesList.length} Active Roles
                </span>
                <span className="px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1] font-mono text-xs font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {usersList.length} Team Members
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Roles Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Roles List (Left) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                <span>Configured Roles</span>
                <span>Permissions</span>
              </div>

              <div className="space-y-2">
                {rolesList.map((r) => {
                  const isSelected = selectedRole?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRole(r);
                        setEditingPermissions([...(r.permissions || [])]);
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#F0F4F8] border-[#2E6F95] shadow-sm'
                          : 'bg-white border-[#D0D7DE] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-serif font-bold text-sm text-[#16233F] flex items-center gap-1.5">
                          <span>{r.name}</span>
                          {r.isSystem && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#E1E7EC] text-[#52606D] font-mono">
                              System
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-[#2E6F95] font-semibold">
                          {r.permissions?.length || 0} perms
                        </span>
                      </div>
                      <p className="text-xs text-[#52606D] mt-1.5 line-clamp-2">
                        {r.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#6B7280] pt-2 border-t border-[#E1E7EC]">
                        <span>ID: <code className="text-[#16233F]">{r.id}</code></span>
                        <span>{r.userCount ?? 1} assigned</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Role Permissions Editor (Right) */}
            <div className="lg:col-span-8">
              {selectedRole ? (
                <div className="bg-white rounded-xl border border-[#D0D7DE] p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1E7EC]">
                    <div>
                      <div className="text-[11px] font-mono uppercase text-[#2E6F95] font-bold">
                        Editing Role Permissions
                      </div>
                      <h3 className="text-lg font-serif font-bold text-[#16233F] mt-0.5">
                        {selectedRole.name}
                      </h3>
                      <p className="text-xs text-[#52606D] mt-1">
                        {selectedRole.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {roleSaveSuccess && (
                        <span className="text-xs text-[#2E8B57] font-semibold flex items-center gap-1 animate-in fade-in">
                          <Check className="w-4 h-4" />
                          Permissions Saved!
                        </span>
                      )}
                      <button
                        onClick={handleSaveRolePermissions}
                        disabled={savingRole}
                        className="px-4 py-2 bg-[#16233F] hover:bg-[#2A3B5C] text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {savingRole ? 'Saving...' : 'Save Permissions'}
                      </button>
                    </div>
                  </div>

                  {/* Permissions Checklist */}
                  <div className="mt-6 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                      Active Capability Flags ({editingPermissions.length} of {availablePermissions.length} granted)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availablePermissions.map((perm) => {
                        const isChecked = editingPermissions.includes(perm.key);
                        return (
                          <div
                            key={perm.key}
                            onClick={() => handleTogglePermission(perm.key)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                              isChecked
                                ? 'bg-[#F0FDF4] border-[#86EFAC]'
                                : 'bg-[#FAFAFA] border-[#E5E7EB] opacity-80 hover:opacity-100'
                            }`}
                          >
                            <div className="mt-0.5">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#2E8B57]" />
                              ) : (
                                <Square className="w-4 h-4 text-[#9CA3AF]" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-bold text-[#16233F] flex items-center justify-between">
                                <span>{perm.label}</span>
                                <code className="text-[10px] font-mono text-[#6B7280]">{perm.key}</code>
                              </div>
                              <div className="text-[11px] text-[#52606D] mt-0.5">
                                {perm.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-xl border border-[#D0D7DE] text-[#6B7280]">
                  Select a role on the left to inspect and configure permissions.
                </div>
              )}
            </div>
          </div>

          {/* User Directory & Role Assignment Section */}
          <div className="bg-white rounded-xl border border-[#D0D7DE] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#E1E7EC] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#16233F]">
                  Staff Directory & Role Assignments
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Assign team members to specific analyst or administrator roles.
                </p>
              </div>
              <span className="text-xs font-mono text-[#2E6F95] font-semibold">
                {usersList.length} Active Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E1E7EC] text-[#6B7280] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-6">Analyst / User</th>
                    <th className="py-3 px-6">Current Role</th>
                    <th className="py-3 px-6">Permissions Count</th>
                    <th className="py-3 px-6">Account Status</th>
                    <th className="py-3 px-6 text-right">Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E7EC] text-[#1F2933]">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-[#16233F]">{u.fullName}</div>
                        <div className="text-[11px] font-mono text-[#6B7280]">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#E1E7EC] text-[#16233F]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[#52606D]">
                        {u.permissions?.length ? `${u.permissions.length} granular flags` : 'Role default'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#DEF7EC] text-[#03543F]">
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleAssignUserRole(u.id, e.target.value)}
                          className="px-2.5 py-1 text-xs border border-[#D0D7DE] rounded-lg bg-white text-[#16233F] focus:ring-1 focus:ring-[#2E6F95] cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="news_analyst">News Analyst</option>
                          <option value="publisher_analyst">Publisher Analyst</option>
                          <option value="action_analyst">Action Analyst</option>
                          <option value="publisher">Publisher</option>
                          <option value="user">User</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

