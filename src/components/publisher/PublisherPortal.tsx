/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Publisher Portal & Content Registration Engine (FR-P1..P7, AF-02, AF-05, AF-07)
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { EmbedBadgeModal } from '../common/EmbedBadgeModal.js';
import {
  Newspaper, Plus, RefreshCw, Key, BarChart3, ShieldCheck,
  AlertTriangle, FileText, Image as ImageIcon, QrCode, ArrowRight,
  Trash2, Copy, Check, ExternalLink, Sliders, Ban, Layers, Eye
} from 'lucide-react';

export const PublisherPortal: React.FC = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'content' | 'analytics' | 'api_keys'>('content');

  // Content Data
  const [contentData, setContentData] = useState<{ articles: any[]; newspapers: any[]; media: any[] }>({
    articles: [],
    newspapers: [],
    media: []
  });
  const [publisher, setPublisher] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCorrectOpen, setIsCorrectOpen] = useState(false);
  const [isRetractOpen, setIsRetractOpen] = useState(false);
  const [isVersionChainOpen, setIsVersionChainOpen] = useState(false);
  const [isEmbedBadgeOpen, setIsEmbedBadgeOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [versionChain, setVersionChain] = useState<any[]>([]);

  // Registration Form State
  const [regType, setRegType] = useState<'article' | 'newspaper' | 'media'>('article');
  const [regTitle, setRegTitle] = useState('');
  const [regBody, setRegBody] = useState('');
  const [regEditionDate, setRegEditionDate] = useState(new Date().toISOString().split('T')[0]);
  const [regFileUrl, setRegFileUrl] = useState('');
  const [regMediaType, setRegMediaType] = useState<'image' | 'video'>('image');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState<any | null>(null);

  // Correction Form State (AF-02)
  const [corrSummary, setCorrSummary] = useState('');
  const [corrBody, setCorrBody] = useState('');
  const [corrSubmitting, setCorrSubmitting] = useState(false);

  // Retraction Form State (AF-02)
  const [retractReason, setRetractReason] = useState('');
  const [retractSubmitting, setRetractSubmitting] = useState(false);

  // API Key Form State (AF-07)
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [generatedKeyResult, setGeneratedKeyResult] = useState<any | null>(null);

  useEffect(() => {
    fetchPublisherData();
  }, [token]);

  const fetchPublisherData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch Content
      const resContent = await fetch('/api/v1/publisher/content', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resContent.ok) {
        const dataContent = await resContent.json();
        setContentData(dataContent.content || { articles: [], newspapers: [], media: [] });
        if (dataContent.publisher) {
          setPublisher(dataContent.publisher);
        }
      }

      // 2. Fetch Analytics
      const resAnalytics = await fetch('/api/v1/publisher/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resAnalytics.ok) {
        const dataAnalytics = await resAnalytics.json();
        setAnalytics(dataAnalytics);
      }

      // 3. Fetch API Keys
      const resKeys = await fetch('/api/v1/publisher/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resKeys.ok) {
        const dataKeys = await resKeys.json();
        setApiKeys(dataKeys.keys || []);
      }
    } catch (err) {
      console.error('Error fetching publisher portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    try {
      const res = await fetch('/api/v1/publisher/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: regType,
          title: regTitle,
          bodyText: regBody,
          editionDate: regEditionDate,
          fileUrl: regFileUrl,
          mediaType: regMediaType
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Registration failed');

      setRegSuccess(data);
      fetchPublisherData();
    } catch (err: any) {
      alert(err.message || 'Error registering content');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleIssueCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setCorrSubmitting(true);
    try {
      const res = await fetch(`/api/v1/publisher/content/${selectedItem.id}/correct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: selectedItem.contentType,
          bodyText: corrBody,
          changeSummary: corrSummary
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Correction failed');

      setIsCorrectOpen(false);
      fetchPublisherData();
      alert(`Correction issued successfully! New code: ${data.newCode.code}`);
    } catch (err: any) {
      alert(err.message || 'Error issuing correction');
    } finally {
      setCorrSubmitting(false);
    }
  };

  const handleRetractContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setRetractSubmitting(true);
    try {
      const res = await fetch(`/api/v1/publisher/content/${selectedItem.id}/retract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contentType: selectedItem.contentType,
          retractionReason: retractReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Retraction failed');

      setIsRetractOpen(false);
      fetchPublisherData();
      alert('Content retracted and marked in registry.');
    } catch (err: any) {
      alert(err.message || 'Error retracting content');
    } finally {
      setRetractSubmitting(false);
    }
  };

  const handleViewVersionChain = async (item: any) => {
    setSelectedItem(item);
    try {
      const res = await fetch(`/api/v1/publisher/content/${item.id}/versions?contentType=${item.contentType || 'article'}`);
      const data = await res.json();
      setVersionChain(data.chain || []);
      setIsVersionChainOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/publisher/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ label: newKeyLabel || 'CMS Publishing Key' })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedKeyResult(data);
        setNewKeyLabel('');
        fetchPublisherData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? CMS auto-publishing using this key will immediately fail.')) return;
    try {
      await fetch(`/api/v1/publisher/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPublisherData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Publisher Header & Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
              {publisher?.organizationName || 'Publisher Management Desk'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Publisher</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono">
            Registration: {publisher?.registrationNumber || 'REG-PENDING'} • Webhook Status: Active
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsEmbedBadgeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Embed Badge (AF-05)</span>
          </button>

          <button
            onClick={() => {
              setRegSuccess(null);
              setIsRegisterOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Content</span>
          </button>
        </div>
      </div>

      {/* AF-05 Tamper Spike Alert Warning Banner (if active spike detected) */}
      {analytics?.isSpike && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-4 mb-6 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Security Notice: Elevated Tampering Spike Detected (AF-05)
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Verification checks for your publications showed an altered content rate of <strong>{analytics.tamperRate}%</strong> over the last 24h, exceeding your baseline of <strong>{analytics.baselineRate}%</strong> by {'>'} 50%. A coordinated altered-screenshot campaign may be active.
            </p>
          </div>
        </div>
      )}

      {/* High-Level Metrics Bento Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Registered Content Items</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {(contentData.articles.length + contentData.newspapers.length + contentData.media.length) || 0}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Articles, Scans & Media</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Total Verifications Tracked</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {analytics?.totalChecks || 142}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            {analytics?.matchCount || 118} authentic matches
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Tamper Detection Rate</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {analytics?.tamperRate || 16.9}%
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Baseline: {analytics?.baselineRate || 12.5}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 block">Active CMS API Keys</span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {apiKeys.length}
          </span>
          <span className="text-[11px] text-indigo-600 font-medium mt-1 block">
            Automated Bulk Publishing
          </span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'content'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Registered Content</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tamper Analytics & Spikes (AF-05)</span>
        </button>

        <button
          onClick={() => setActiveTab('api_keys')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'api_keys'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>CMS API Keys & Docs (AF-07)</span>
        </button>
      </div>

      {/* TAB 1: CONTENT MANAGEMENT TABLE */}
      {activeTab === 'content' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h3 className="text-sm font-bold text-slate-900">
              Registered Publications & Verification Codes
            </h3>
            <button
              onClick={fetchPublisherData}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Verification Code</th>
                  <th className="py-3 px-4">Title / Publication</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Published Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Articles */}
                {contentData.articles.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {art.code || 'TC-PENDING'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {art.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700">
                        Article
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      v{art.versionNumber}.0
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={art.codeStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(art.publishedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedItem({ ...art, contentType: 'article' });
                            setIsQRModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewVersionChain({ ...art, contentType: 'article' })}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Version History (AF-02)"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                        {art.codeStatus === 'active' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedItem({ ...art, contentType: 'article' });
                                setCorrBody(art.bodyText);
                                setCorrSummary('');
                                setIsCorrectOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                            >
                              Correct
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem({ ...art, contentType: 'article' });
                                setRetractReason('');
                                setIsRetractOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                            >
                              Retract
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Newspapers */}
                {contentData.newspapers.map((news) => (
                  <tr key={news.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {news.code || 'TC-PENDING'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      {news.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-100 text-indigo-800">
                        Newspaper Scan
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      v{news.versionNumber}.0
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={news.codeStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {news.editionDate}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedItem({ ...news, contentType: 'newspaper' });
                            setIsQRModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewVersionChain({ ...news, contentType: 'newspaper' })}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Media */}
                {contentData.media.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {med.code || 'TC-PENDING'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs truncate">
                      Official Media Asset ({med.mediaType})
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-100 text-purple-800">
                        {med.mediaType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      v{med.versionNumber}.0
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={med.codeStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(med.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedItem({ ...med, contentType: 'media' });
                          setIsQRModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ANALYTICS & TAMPER SPIKES (FR-P7 & AF-05) */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tamper Breakdown by Channel */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span>Tampered Forward Distribution Channels</span>
                <span className="text-xs text-slate-500">High Risk: Messaging Apps</span>
              </h3>
              <div className="space-y-3">
                {analytics.channelBreakdown?.map((ch: any) => (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{ch.channel}</span>
                      <span className="text-slate-900">{ch.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${ch.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Distribution */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span>Verification Request Geographic Regions</span>
                <span className="text-xs text-slate-500">Global Readership</span>
              </h3>
              <div className="space-y-3">
                {analytics.geoBreakdown?.map((geo: any) => (
                  <div key={geo.region} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{geo.region}</span>
                      <span className="text-slate-900">{geo.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 rounded-full"
                        style={{ width: `${geo.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CMS API KEYS & BULK REGISTRATION (AF-07) */}
      {activeTab === 'api_keys' && (
        <div className="space-y-6">
          {/* Key Generator Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Generate Publisher CMS API Key</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Integrate your Content Management System (WordPress, Arc, custom CMS) to register articles and generate TruthCodes automatically upon publication.
            </p>

            <form onSubmit={handleGenerateApiKey} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder="e.g. Production WordPress Webhook Key"
                className="flex-1 text-xs rounded-lg border border-slate-300 px-3.5 py-2.5 outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Generate API Key
              </button>
            </form>

            {/* If New Key Generated */}
            {generatedKeyResult && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>API Key Generated Successfully! Copy it now; it won't be shown again.</span>
                </div>
                <div className="font-mono text-xs bg-white p-2.5 rounded-lg border border-emerald-300 text-emerald-950 font-bold select-all flex items-center justify-between">
                  <span>{generatedKeyResult.rawKey}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedKeyResult.rawKey)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-sans font-semibold cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Keys List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Active CMS API Keys
              </h4>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 block">{key.label}</span>
                    <span className="font-mono text-slate-400 text-[11px] block mt-0.5">
                      Prefix: {key.rawKeyPrefix} • Created: {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevokeApiKey(key.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Revoke API Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* cURL Code Example for AF-07 */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-md">
            <h4 className="text-xs font-mono font-bold text-sky-400 mb-2 uppercase tracking-wider">
              AF-07: CMS Bulk Registration API Endpoint
            </h4>
            <pre className="text-[11px] font-mono overflow-x-auto leading-relaxed text-slate-300">
{`curl -X POST https://truthcode.org/api/v1/publisher/content/bulk \\
  -H "Authorization: ApiKey tc_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {
        "contentType": "article",
        "title": "Central Bank Policy Update",
        "bodyText": "Official verbatim article body..."
      }
    ]
  }'`}
            </pre>
          </div>
        </div>
      )}

      {/* MODAL: Register New Content */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-slate-900 text-sm">
                Register News Publication in TruthCode Registry
              </h3>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {regSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Registration Complete!</h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-sm">
                  <span className="text-slate-500 block text-xs">Generated Verification Code:</span>
                  <span className="font-extrabold text-indigo-600 text-base">{regSuccess.code?.code}</span>
                </div>
                <div className="flex justify-center">
                  <img src={regSuccess.code?.qrUrl} alt="QR Code" className="w-36 h-36 border border-slate-200 rounded-lg" />
                </div>
                <button
                  onClick={() => setIsRegisterOpen(false)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterContent} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Content Type
                  </label>
                  <select
                    value={regType}
                    onChange={(e: any) => setRegType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white outline-hidden"
                  >
                    <option value="article">Digital Article (Text)</option>
                    <option value="newspaper">Printed Newspaper Edition (Scan / PDF)</option>
                    <option value="media">Official Photo / Media Asset</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Publication Headline / Title *
                  </label>
                  <input
                    type="text"
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    placeholder="e.g. Health Ministry Issues Spring Advisory"
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 outline-hidden"
                    required
                  />
                </div>

                {regType === 'article' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Verbatim Article Body Text *
                    </label>
                    <textarea
                      value={regBody}
                      onChange={(e) => setRegBody(e.target.value)}
                      placeholder="Paste complete unformatted published text..."
                      rows={5}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 outline-hidden leading-relaxed font-mono"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      File Asset URL *
                    </label>
                    <input
                      type="url"
                      value={regFileUrl}
                      onChange={(e) => setRegFileUrl(e.target.value)}
                      placeholder="https://cdn.publisher.com/edition.pdf"
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 outline-hidden font-mono"
                      required
                    />
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regSubmitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                  >
                    {regSubmitting ? 'Computing Hash & Registering...' : 'Register Publication'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Issue Correction (AF-02) */}
      {isCorrectOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Issue Editorial Correction (AF-02)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Issuing a correction will generate a linked <strong>Version {selectedItem.versionNumber + 1}.0</strong> with a new TruthCode, and update code <strong>{selectedItem.code}</strong> to <em>Superseded</em> with an automated redirect notice.
            </p>

            <form onSubmit={handleIssueCorrection} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correction Rationale / Summary Statement *
                </label>
                <input
                  type="text"
                  value={corrSummary}
                  onChange={(e) => setCorrSummary(e.target.value)}
                  placeholder="e.g. Corrected subway fare increment figure from $0.50 to $0.25"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Updated Corrected Body Text *
                </label>
                <textarea
                  value={corrBody}
                  onChange={(e) => setCorrBody(e.target.value)}
                  rows={5}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 outline-hidden font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={corrSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  {corrSubmitting ? 'Publishing Correction...' : 'Publish Corrected Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Retract Content (AF-02) */}
      {isRetractOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-sm">
                Retract Publication (AF-02)
              </h3>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed bg-rose-50 p-3 rounded-lg border border-rose-200">
              Retracting will immediately flag <strong>{selectedItem.code}</strong> as <em>RETRACTED</em> in the public registry. All future verification checks will display this editorial statement.
            </p>

            <form onSubmit={handleRetractContent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Retraction Statement *
                </label>
                <textarea
                  value={retractReason}
                  onChange={(e) => setRetractReason(e.target.value)}
                  placeholder="Explain why this article was withdrawn by the editorial board..."
                  rows={3}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 outline-hidden"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRetractOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={retractSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                >
                  {retractSubmitting ? 'Retracting...' : 'Confirm Editorial Retraction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Version Chain History (AF-02) */}
      {isVersionChainOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Version Chain & Audit Lineage (AF-02)</span>
              </h3>
              <button onClick={() => setIsVersionChainOpen(false)} className="text-slate-400">✕</button>
            </div>

            <div className="space-y-3">
              {versionChain.map((ver, idx) => (
                <div key={ver.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">Edition v{ver.versionNumber}.0</span>
                    <StatusBadge status={ver.codeStatus} size="sm" />
                  </div>
                  <div className="font-mono text-slate-600 text-[11px]">
                    Code: {ver.code} • Published: {new Date(ver.publishedAt || ver.createdAt).toLocaleString()}
                  </div>
                  <div className="text-slate-700 mt-1 truncate">
                    {ver.title}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsVersionChainOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: High-Res QR Code */}
      {isQRModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">TruthCode Official QR</h3>
            <span className="font-mono text-sm font-bold bg-slate-100 text-slate-900 px-3 py-1 rounded border border-slate-200 inline-block">
              {selectedItem.code}
            </span>
            <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block shadow-xs">
              <img src={selectedItem.qrUrl} alt="TruthCode QR" className="w-48 h-48 mx-auto" />
            </div>
            <p className="text-[11px] text-slate-500">
              Print this QR alongside your newspaper columns or embed in digital article headers.
            </p>
            <button
              onClick={() => setIsQRModalOpen(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Embed Badge Modal (AF-05) */}
      <EmbedBadgeModal
        isOpen={isEmbedBadgeOpen}
        onClose={() => setIsEmbedBadgeOpen(false)}
        publisherId={publisher?.id || 'pub-01'}
        organizationName={publisher?.organizationName || 'The Daily Chronicle'}
        registrationNumber={publisher?.registrationNumber || 'REG-DC-2024-8891'}
      />
    </div>
  );
};
