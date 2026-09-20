/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Top Navigation Bar & Persona Switcher (Editorial Aesthetic)
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/index.js';
import {
  ShieldCheck, Search, History, Newspaper, ShieldAlert,
  UserCheck, Layers, ChevronDown, Check, Zap
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'verify' | 'report' | 'history' | 'publisher' | 'admin' | 'public_badge' | 'news';
  setActiveTab: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, role, switchPersona, logout, quotaRemaining, quotaLimit } = useAuth();
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);

  const personas: Array<{ role: UserRole; title: string; email: string; desc: string; icon: any; initials: string }> = [
    { role: 'user', title: 'NEWS READER (Public User)', email: 'user@test.com', desc: 'Browse latest news, verify WhatsApp forwards & viral text', icon: UserCheck, initials: 'RD' },
    { role: 'news_analyst', title: 'NEWS ANALYST (Marcus Sterling)', email: 'news.analyst@test.com', desc: 'Inspects AI evidence vs original, approves or rejects reports', icon: ShieldCheck, initials: 'NA' },
    { role: 'publisher_analyst', title: 'PUBLISHER ANALYST (Sarah Chen)', email: 'publisher.analyst@test.com', desc: 'Reviews press credentials and manages signing key issuance', icon: ShieldCheck, initials: 'PA' },
    { role: 'action_analyst', title: 'ACTION ANALYST (David Ross)', email: 'action.analyst@test.com', desc: 'Reviews escalated cases, recommends publisher suspensions', icon: ShieldAlert, initials: 'AA' },
    { role: 'publisher', title: 'PUBLISHER (Press Desk)', email: 'publisher@test.com', desc: 'Registers articles, issues corrections & manages ECDSA keys', icon: Newspaper, initials: 'PB' },
    { role: 'admin', title: 'ADMINISTRATOR (System Admin)', email: 'admin@test.com', desc: 'Full platform administration, model calibration & role configuration', icon: ShieldAlert, initials: 'AD' },
    { role: 'guest', title: 'GUEST (Unauthenticated)', email: 'public / rate-limited', desc: 'Anonymous 5-check daily rate limit', icon: Layers, initials: 'GS' }
  ];

  const currentPersona = personas.find(p => p.role === role) || personas[0];

  return (
    <header className="sticky top-0 z-40 bg-[#16233F] border-b border-[#2A3B5C] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity (Editorial Serif) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('verify')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#2E6F95] flex items-center justify-center shadow-md text-white group-hover:bg-[#3983ad] transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-serif font-bold text-2xl tracking-tight text-white">TruthCode</span>
                <div className="h-5 w-[1px] bg-[#2A3B5C] hidden sm:block"></div>
                <div className="text-[11px] uppercase tracking-widest text-[#9AA7B5] font-semibold hidden sm:block">
                  Verification Engine v1.0
                </div>
              </div>
            </button>
          </div>

          {/* Editorial Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button
              onClick={() => setActiveTab('news')}
              className={`pb-1 transition-colors cursor-pointer ${
                activeTab === 'news'
                  ? 'text-[#5B9BBF] border-b-2 border-[#5B9BBF] font-semibold'
                  : 'text-slate-300 hover:text-[#5B9BBF]'
              }`}
            >
              Latest News
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`pb-1 transition-colors cursor-pointer ${
                activeTab === 'verify' || activeTab === 'report'
                  ? 'text-[#5B9BBF] border-b-2 border-[#5B9BBF] font-semibold'
                  : 'text-slate-300 hover:text-[#5B9BBF]'
              }`}
            >
              Verify News
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-1 transition-colors cursor-pointer ${
                  activeTab === 'history'
                    ? 'text-[#5B9BBF] border-b-2 border-[#5B9BBF] font-semibold'
                    : 'text-slate-300 hover:text-[#5B9BBF]'
                }`}
              >
                Verification Records
              </button>
            )}

            {(role === 'publisher' || role === 'admin') && (
              <button
                onClick={() => setActiveTab('publisher')}
                className={`pb-1 transition-colors cursor-pointer ${
                  activeTab === 'publisher'
                    ? 'text-[#5B9BBF] border-b-2 border-[#5B9BBF] font-semibold'
                    : 'text-slate-300 hover:text-[#5B9BBF]'
                }`}
              >
                Publisher Portal
              </button>
            )}

            {(role === 'admin' || role === 'reviewer' || role === 'news_analyst' || role === 'publisher_analyst' || role === 'action_analyst') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`pb-1 transition-colors cursor-pointer ${
                  activeTab === 'admin'
                    ? 'text-[#5B9BBF] border-b-2 border-[#5B9BBF] font-semibold'
                    : 'text-slate-300 hover:text-[#5B9BBF]'
                }`}
              >
                Global Audit & Review
              </button>
            )}
          </nav>

          {/* Right Controls: Quota Indicator & Editorial Avatar Switcher */}
          <div className="flex items-center gap-3">
            {/* Daily Quota Indicator (AF-04) */}
            {(role === 'user' || role === 'guest') && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1F2F52] border border-[#2A3B5C] text-xs font-mono text-[#9AA7B5]" title="AF-04 Daily Quota">
                <Zap className="w-3.5 h-3.5 text-[#C77D28]" />
                <span className="text-white font-bold">{quotaRemaining}/{quotaLimit}</span>
                <span className="text-[10px] uppercase">daily</span>
              </div>
            )}

            {/* Persona Switcher Dropdown with Avatar */}
            <div className="relative">
              <button
                onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-[#1F2F52] hover:bg-[#283C66] border border-[#2A3B5C] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#2E6F95] flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                  {currentPersona.initials}
                </div>
                <span className="font-semibold hidden sm:inline">
                  {role === 'user' ? 'Reader' : role === 'news_analyst' ? 'News Analyst' : role === 'publisher_analyst' ? 'Pub Analyst' : role === 'action_analyst' ? 'Action Analyst' : role === 'reviewer' ? 'Analyst' : role === 'publisher' ? 'Publisher' : role === 'admin' ? 'Admin' : 'Guest'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#9AA7B5]" />
              </button>

              {personaMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#16233F] border border-[#2A3B5C] shadow-2xl py-2 z-50 animate-in fade-in">
                  <div className="px-3 py-1.5 border-b border-[#2A3B5C] text-[10px] font-bold text-[#9AA7B5] uppercase tracking-wider">
                    Switch Active Persona (Demo Testing)
                  </div>
                  <div className="p-1 space-y-0.5">
                    {personas.map((p) => {
                      const Icon = p.icon;
                      const isSelected = role === p.role;
                      return (
                        <button
                          key={p.role}
                          onClick={async () => {
                            setPersonaMenuOpen(false);
                            await switchPersona(p.role);
                            if (p.role === 'publisher') setActiveTab('publisher');
                            else if (p.role === 'admin' || p.role === 'reviewer' || p.role === 'news_analyst' || p.role === 'publisher_analyst' || p.role === 'action_analyst') setActiveTab('admin');
                            else setActiveTab('news');
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#2E6F95]/30 text-white border border-[#2E6F95]/60' : 'hover:bg-[#1F2F52] text-slate-300'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-[#2E6F95]/40 flex items-center justify-center text-[10px] font-bold text-white mt-0.5 shrink-0">
                            {p.initials}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-semibold flex items-center justify-between">
                              <span>{p.title}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#5B9BBF]" />}
                            </div>
                            <div className="text-[10px] font-mono text-[#5B9BBF]">
                              {p.email}
                            </div>
                            <div className="text-[11px] text-[#9AA7B5] leading-tight mt-0.5">
                              {p.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {user && (
                    <div className="pt-1 mt-1 border-t border-[#2A3B5C] px-1">
                      <button
                        onClick={async () => {
                          await logout();
                          setPersonaMenuOpen(false);
                          setActiveTab('verify');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Sign Out (Clear Session)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
