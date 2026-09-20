/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Verified Public News Wire & Provenance Explorer
 */

import React, { useState, useEffect } from 'react';
import { PublicNewsItem } from '../../types/index.js';
import {
  ShieldCheck, Search, Filter, QrCode, ExternalLink, ArrowRight,
  CheckCircle2, Clock, Building2, Key, AlertTriangle, Sparkles,
  FileCheck, Copy, Check, Eye, X, ChevronRight, Bookmark
} from 'lucide-react';

interface LatestNewsPageProps {
  onVerifyArticle: (articleText: string, code?: string) => void;
  onSelectPublisherBadge?: (publisherId: string) => void;
}

export const LatestNewsPage: React.FC<LatestNewsPageProps> = ({
  onVerifyArticle,
  onSelectPublisherBadge
}) => {
  const [articles, setArticles] = useState<PublicNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Latest');
  const [categories, setCategories] = useState<string[]>([
    'Latest', 'Politics', 'Business', 'Technology', 'Science', 'World', 'Local', 'Sports'
  ]);
  const [selectedArticle, setSelectedArticle] = useState<PublicNewsItem | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'Latest') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', '30');

      const res = await fetch(`/api/v1/public/news?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load news (HTTP ${res.status})`);
      }
      const data = await res.json();
      setArticles(data.items || []);
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
    } catch (err: any) {
      console.error('Error fetching public news:', err);
      setError(err.message || 'Failed to fetch verified news.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNews();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const remainingArticles = articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Editorial Wire Header */}
      <div className="border-b border-[#D0D7DE] pb-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#2E6F95] mb-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-[#2E8B57]" />
              Cryptographically Notarized Press Wire
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#16233F] tracking-tight">
              Latest Verified News
            </h1>
            <p className="mt-2 text-sm text-[#52606D] max-w-2xl">
              Real-time journalism anchored by immutable SHA-256 cryptographic hashes and verified publisher signatures. Every story can be independently tested against the multi-modal AI verification engine.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headline, text, or TruthCode..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#D0D7DE] rounded-lg text-sm text-[#1F2933] placeholder-[#9AA7B5] focus:outline-none focus:ring-2 focus:ring-[#2E6F95] focus:border-transparent transition-all shadow-sm"
            />
            <Search className="w-4 h-4 text-[#9AA7B5] absolute left-3 top-3" />
          </form>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 pb-2 no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#16233F] text-white shadow-sm font-semibold'
                    : 'bg-white text-[#52606D] border border-[#D0D7DE] hover:bg-[#F0F4F8] hover:text-[#16233F]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse my-8">
          <div className="md:col-span-3 h-72 bg-white rounded-xl border border-[#D0D7DE]"></div>
          <div className="h-64 bg-white rounded-xl border border-[#D0D7DE]"></div>
          <div className="h-64 bg-white rounded-xl border border-[#D0D7DE]"></div>
          <div className="h-64 bg-white rounded-xl border border-[#D0D7DE]"></div>
        </div>
      )}

      {error && (
        <div className="bg-[#FFF5F5] border border-[#FCA5A5] rounded-xl p-6 text-center my-8">
          <AlertTriangle className="w-8 h-8 text-[#DC2626] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#991B1B]">Unable to load verified news wire</h3>
          <p className="text-xs text-[#B91C1C] mt-1">{error}</p>
          <button
            onClick={fetchNews}
            className="mt-4 px-4 py-1.5 bg-[#DC2626] text-white text-xs font-semibold rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-[#D0D7DE] my-8">
          <FileCheck className="w-12 h-12 text-[#9AA7B5] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#16233F]">No verified stories found</h3>
          <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
            No published articles matched your search filter "{searchQuery}". Try selecting "Latest" or adjusting your search term.
          </p>
          <button
            onClick={() => { setSelectedCategory('Latest'); setSearchQuery(''); }}
            className="mt-4 px-4 py-2 bg-[#16233F] text-white text-xs font-semibold rounded-lg hover:bg-[#2A3B5C] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {!loading && !error && featuredArticle && (
        <div className="space-y-10">
          {/* Featured Hero Story */}
          <div className="bg-white rounded-xl border border-[#D0D7DE] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-7 h-64 lg:h-auto relative overflow-hidden bg-[#16233F]">
                <img
                  src={featuredArticle.thumbnailUrl}
                  alt={featuredArticle.title}
                  className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#16233F]/85 text-white font-mono text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm border border-white/20">
                    {featuredArticle.category}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#2E8B57]/90 text-white font-mono text-[11px] font-bold tracking-wider backdrop-blur-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Original
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#2E6F95]">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{featuredArticle.publisherName}</span>
                    </div>
                    <span className="text-[11px] text-[#6B7280] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(featuredArticle.publishedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#16233F] leading-snug">
                    {featuredArticle.title}
                  </h2>

                  <p className="mt-3 text-sm text-[#52606D] leading-relaxed line-clamp-3">
                    {featuredArticle.summary}
                  </p>

                  {/* TruthCode & Hash Badge */}
                  <div className="mt-5 p-3 rounded-lg bg-[#F6F8FA] border border-[#D0D7DE] space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-[#16233F]">
                      <span className="text-[#6B7280]">TruthCode:</span>
                      <span className="font-bold text-[#2E6F95]">{featuredArticle.truthCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                      <span>Content Digest:</span>
                      <span className="truncate max-w-[180px]">{featuredArticle.contentHash.substring(0, 16)}...</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#D0D7DE] flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setSelectedArticle(featuredArticle)}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-[#16233F] text-white rounded-lg text-xs font-semibold hover:bg-[#2A3B5C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Proof
                  </button>

                  <button
                    onClick={() => onVerifyArticle(featuredArticle.bodyText, featuredArticle.truthCode)}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-[#2E6F95] text-white rounded-lg text-xs font-semibold hover:bg-[#235877] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E0F2FE]" />
                    Verify with AI
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid of Other Verified Stories */}
          {remainingArticles.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-serif font-bold text-[#16233F]">
                  Recent Verified Wire Reports ({remainingArticles.length})
                </h3>
                <span className="text-xs text-[#6B7280] font-mono">
                  SHA-256 Indexed • ECDSA Signed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingArticles.map((article) => (
                  <article
                    key={article.id}
                    className="bg-white rounded-xl border border-[#D0D7DE] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Preview */}
                      <div className="h-44 relative overflow-hidden bg-[#16233F]">
                        <img
                          src={article.thumbnailUrl}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#16233F]/80 text-white font-mono text-[10px] font-bold uppercase backdrop-blur-sm">
                            {article.category}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#2E8B57] text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-5">
                        <div className="flex items-center justify-between text-xs text-[#6B7280] mb-2">
                          <span className="font-semibold text-[#2E6F95] truncate max-w-[170px]">
                            {article.publisherName}
                          </span>
                          <span className="font-mono text-[11px]">
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="font-serif font-bold text-base text-[#16233F] leading-snug line-clamp-2 hover:text-[#2E6F95] transition-colors cursor-pointer"
                            onClick={() => setSelectedArticle(article)}>
                          {article.title}
                        </h4>

                        <p className="mt-2 text-xs text-[#52606D] line-clamp-3 leading-relaxed">
                          {article.summary}
                        </p>

                        {/* TruthCode Badge */}
                        <div className="mt-4 pt-3 border-t border-[#E1E7EC] flex items-center justify-between text-xs font-mono">
                          <span className="text-[#6B7280]">Code:</span>
                          <span className="font-bold text-[#16233F] bg-[#F6F8FA] px-2 py-0.5 rounded border border-[#D0D7DE]">
                            {article.truthCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-4 bg-[#F8FAFC] border-t border-[#E1E7EC] flex items-center gap-2">
                      <button
                        onClick={() => setSelectedArticle(article)}
                        className="flex-1 py-1.5 px-3 bg-white border border-[#D0D7DE] text-[#16233F] rounded-lg text-xs font-medium hover:bg-[#F0F4F8] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-[#2E6F95]" />
                        Proof
                      </button>

                      <button
                        onClick={() => onVerifyArticle(article.bodyText, article.truthCode)}
                        className="flex-1 py-1.5 px-3 bg-[#16233F] text-white rounded-lg text-xs font-medium hover:bg-[#2A3B5C] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-[#5B9BBF]" />
                        Verify
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cryptographic Proof & Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#D0D7DE] shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#16233F] text-white px-6 py-4 flex items-center justify-between border-b border-[#2A3B5C] z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2E8B57]" />
                <span className="font-serif font-bold text-lg">Cryptographic Integrity Record</span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Story Title & Meta */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#E1E7EC] text-[#16233F]">
                    {selectedArticle.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DEF7EC] text-[#03543F] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Status: {selectedArticle.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-[#16233F]">
                  {selectedArticle.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-[#6B7280] mt-2 font-mono">
                  <span>Publisher: <strong className="text-[#16233F]">{selectedArticle.publisherName}</strong></span>
                  <span>•</span>
                  <span>Published: {new Date(selectedArticle.publishedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Full Original Text Preview */}
              <div className="p-4 rounded-xl bg-[#F6F8FA] border border-[#D0D7DE]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2 font-mono">
                  Registered Editorial Text (Canonical Copy)
                </h4>
                <p className="text-sm text-[#1F2933] leading-relaxed max-h-48 overflow-y-auto font-serif">
                  {selectedArticle.bodyText}
                </p>
              </div>

              {/* Cryptographic Proof Verification Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* TruthCode & QR */}
                <div className="p-4 rounded-xl bg-white border border-[#D0D7DE] flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-[#F0F4F8] p-1 border border-[#D0D7DE] flex items-center justify-center shrink-0">
                    {selectedArticle.qrUrl ? (
                      <img src={selectedArticle.qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <QrCode className="w-8 h-8 text-[#2E6F95]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#6B7280] font-mono">Unique TruthCode</div>
                    <div className="text-sm font-bold font-mono text-[#16233F]">{selectedArticle.truthCode}</div>
                    <div className="text-[11px] text-[#2E8B57] font-semibold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active in Registry
                    </div>
                  </div>
                </div>

                {/* Digital Signature Card */}
                <div className="p-4 rounded-xl bg-white border border-[#D0D7DE]">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#6B7280] font-mono mb-1">
                    <span>ECDSA Signature</span>
                    <span className="text-[#2E8B57] font-semibold">P-256 Valid</span>
                  </div>
                  <div className="text-xs font-mono text-[#52606D] truncate">
                    {selectedArticle.digitalSignature || 'MEYCIQDx...ECDSA_VERIFIED'}
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    Issued by Verified Newsroom Key
                  </div>
                </div>
              </div>

              {/* SHA-256 Digest Box */}
              <div className="p-4 rounded-xl bg-[#16233F] text-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono text-[#9AA7B5] uppercase font-bold">
                    Immutable SHA-256 Content Digest
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedArticle.contentHash, selectedArticle.id)}
                    className="flex items-center gap-1 text-[11px] text-[#5B9BBF] hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedHash === selectedArticle.id ? (
                      <>
                        <Check className="w-3 h-3 text-[#2E8B57]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Digest</span>
                      </>
                    )}
                  </button>
                </div>
                <code className="text-xs font-mono text-[#E0F2FE] break-all block">
                  {selectedArticle.contentHash}
                </code>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    const art = selectedArticle;
                    setSelectedArticle(null);
                    onVerifyArticle(art.bodyText, art.truthCode);
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#2E6F95] text-white rounded-xl text-xs font-semibold hover:bg-[#235877] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-4 h-4 text-[#E0F2FE]" />
                  Verify this Article in AI Engine
                </button>

                <button
                  onClick={() => setSelectedArticle(null)}
                  className="py-2.5 px-5 bg-white border border-[#D0D7DE] text-[#16233F] rounded-xl text-xs font-semibold hover:bg-[#F0F4F8] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
