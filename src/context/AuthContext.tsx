/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Authentication & Active Persona Context
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchPersona: (role: UserRole) => Promise<void>;
  quotaRemaining: number;
  quotaLimit: number;
  decrementQuota: () => void;
  refreshQuota: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [quotaRemaining, setQuotaRemaining] = useState<number>(25);
  const [quotaLimit, setQuotaLimit] = useState<number>(25);

  useEffect(() => {
    // Initial bootstrap with demo reader account
    switchPersona('user');
  }, []);

  const switchPersona = async (role: UserRole) => {
    if (role === 'guest') {
      setUser(null);
      setToken(null);
      setQuotaRemaining(5);
      setQuotaLimit(5);
      return;
    }

    try {
      const emailMap: Record<string, string> = {
        admin: 'admin@test.com',
        ADMIN: 'admin@test.com',
        reviewer: 'senior@test.com',
        senior_verification_analyst: 'senior@test.com',
        SENIOR_VERIFICATION_ANALYST: 'senior@test.com',
        news_analyst: 'news.analyst@test.com',
        publisher_analyst: 'publisher.analyst@test.com',
        action_analyst: 'action.analyst@test.com',
        publisher: 'publisher@test.com',
        PUBLISHER: 'publisher@test.com',
        user: 'user@test.com',
        USER: 'user@test.com'
      };

      const email = emailMap[role] || 'user@test.com';

      let res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'TruthCode2026!' })
      });

      if (!res.ok) {
        res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'test@123' })
        });
      }

      if (!res.ok) {
        // Fallback to reference accounts if needed
        const roleLower = String(role).toLowerCase();
        const fallbackEmail = roleLower === 'admin' 
          ? 'admin@truthcode.org' 
          : (roleLower === 'publisher' ? 'publisher@truthcode.org' : 'arjun.mehta@college.edu');
        const fallbackRes = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: fallbackEmail })
        });
        if (!fallbackRes.ok) throw new Error('Login failed');
        const fallbackData = await fallbackRes.json();
        setUser(fallbackData.user);
        setToken(fallbackData.token);
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setToken(data.token);

      const rNorm = (role as string).toLowerCase();
      if (rNorm === 'publisher' || rNorm === 'admin' || rNorm === 'reviewer' || rNorm === 'senior_verification_analyst') {
        setQuotaRemaining(9999);
        setQuotaLimit(9999);
      } else {
        setQuotaRemaining(25);
        setQuotaLimit(25);
      }
    } catch (err) {
      console.error('Error switching persona:', err);
    }
  };

  const login = async (email: string, password?: string) => {
    let res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: password || 'TruthCode2026!' })
    });
    if (!res.ok && !password) {
      res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'test@123' })
      });
    }
    if (!res.ok) {
      let msg = 'Invalid email or password.';
      try {
        const err = await res.json();
        msg = err.error?.message || msg;
      } catch {
        // Ignore non-JSON errors
      }
      throw new Error(msg);
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    setUser(null);
    setToken(null);
    setQuotaRemaining(5);
    setQuotaLimit(5);
  };

  const decrementQuota = () => {
    if (user?.role === 'publisher' || user?.role === 'admin' || user?.role === 'reviewer' || user?.role === 'senior_verification_analyst') return;
    setQuotaRemaining(prev => Math.max(0, prev - 1));
  };

  const refreshQuota = () => {
    if (user?.role === 'user') {
      setQuotaRemaining(25);
      setQuotaLimit(25);
    } else if (!user) {
      setQuotaRemaining(5);
      setQuotaLimit(5);
    }
  };

  const currentRole: UserRole = user ? user.role : 'guest';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: currentRole,
        login,
        logout,
        switchPersona,
        quotaRemaining,
        quotaLimit,
        decrementQuota,
        refreshQuota
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
