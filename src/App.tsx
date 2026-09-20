/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - AI-Powered News Authenticity Verification & Tamper Detection Platform
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/common/Navbar.js';
import { VerifyPage } from './components/user/VerifyPage.js';
import { VerificationReportPage } from './components/user/VerificationReportPage.js';
import { UserHistoryPage } from './components/user/UserHistoryPage.js';
import { PublisherPortal } from './components/publisher/PublisherPortal.js';
import { AdminCenter } from './components/admin/AdminCenter.js';
import { PublicPublisherBadgePage } from './components/public/PublicPublisherBadgePage.js';
import { LatestNewsPage } from './components/public/LatestNewsPage.js';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<'verify' | 'report' | 'history' | 'publisher' | 'admin' | 'public_badge' | 'news'>('news');
  const [currentReportId, setCurrentReportId] = useState<string>('rep-seed-01');
  const [selectedPublisherId, setSelectedPublisherId] = useState<string>('pub-01');
  const [prefilledCode, setPrefilledCode] = useState<string | undefined>(undefined);
  const [prefilledText, setPrefilledText] = useState<string | undefined>(undefined);

  const handleReportGenerated = (reportId: string) => {
    setCurrentReportId(reportId);
    setActiveTab('report');
  };

  const handleVerifyFromNews = (articleText: string, code?: string) => {
    setPrefilledText(articleText);
    if (code) setPrefilledCode(code);
    setActiveTab('verify');
  };

  const handleSelectHistoryReport = (reportId: string) => {
    setCurrentReportId(reportId);
    setActiveTab('report');
  };

  const handleNavigateToCode = async (code: string) => {
    // When clicking a corrected edition link from a superseded notice banner
    try {
      const res = await fetch(`/api/v1/verify/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.report) {
        setCurrentReportId(data.report.id);
        setActiveTab('report');
      } else {
        // Switch to verify page with this code pre-filled
        setPrefilledCode(code);
        setActiveTab('verify');
      }
    } catch (err) {
      setPrefilledCode(code);
      setActiveTab('verify');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#1F2933] flex flex-col font-sans selection:bg-[#2E6F95] selection:text-white">
      {/* Navigation Bar with Live Persona Switcher & AF-04 Quota Indicator */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content View Container */}
      <main className="flex-1">
        {activeTab === 'news' && (
          <LatestNewsPage
            onVerifyArticle={handleVerifyFromNews}
            onSelectPublisherBadge={(pubId) => {
              setSelectedPublisherId(pubId);
              setActiveTab('public_badge');
            }}
          />
        )}

        {activeTab === 'verify' && (
          <VerifyPage
            onReportGenerated={handleReportGenerated}
            initialCode={prefilledCode}
            initialText={prefilledText}
          />
        )}

        {activeTab === 'report' && (
          <VerificationReportPage
            reportIdOrJobId={currentReportId}
            onBack={() => setActiveTab('verify')}
            onNavigateToCode={handleNavigateToCode}
          />
        )}

        {activeTab === 'history' && (
          <UserHistoryPage onSelectReport={handleSelectHistoryReport} />
        )}

        {activeTab === 'publisher' && (
          <PublisherPortal />
        )}

        {activeTab === 'admin' && (
          <AdminCenter />
        )}

        {activeTab === 'public_badge' && (
          <PublicPublisherBadgePage
            publisherId={selectedPublisherId}
            onBack={() => setActiveTab('verify')}
          />
        )}
      </main>

      {/* Editorial Platform Footer */}
      <footer className="bg-[#E1E7EC] border-t border-[#D0D7DE] mt-16 py-4 px-6 text-xs text-[#6B7280]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-[#16233F]">&copy; 2026 TruthCode Platform</span>
            <span>•</span>
            <span className="text-[#6B7280]">Digital Journalism Authenticity Infrastructure</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-[#6B7280]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E8B57]" />
            <span>Secured by SHA-256 Content Notarization & Multi-Modal AI Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
