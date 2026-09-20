/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Authentication & Session Service
 */

import crypto from 'crypto';
import { db } from '../db/store.js';
import { pkiService } from '../crypto/pkiService.js';
import { User, UserRole, Publisher } from '../../src/types/index.js';

export class AuthService {
  // Simple token map: token -> { userId, expiresAt }
  private tokens: Map<string, { userId: string; expiresAt: number }> = new Map();

  public generateToken(user: User): string {
    const token = 'tc_jwt_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    this.tokens.set(token, { userId: user.id, expiresAt });
    return token;
  }

  public validateToken(token?: string): User | null {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const session = this.tokens.get(cleanToken);
    if (!session) {
      // Check if it's one of our demo fixed tokens for convenience
      if (cleanToken === 'demo-admin-token') {
        return db.findUserByEmail('admin@test.com') || db.users.get('usr-admin-01') || null;
      }
      if (cleanToken === 'demo-senior-token' || cleanToken === 'demo-reviewer-token') {
        return db.findUserByEmail('senior@test.com') || db.users.get('usr-reviewer-01') || null;
      }
      if (cleanToken === 'demo-pub-token') {
        return db.findUserByEmail('publisher@test.com') || db.users.get('usr-pub-01') || null;
      }
      if (cleanToken === 'demo-user-token') {
        return db.findUserByEmail('user@test.com') || db.users.get('usr-reader-01') || null;
      }
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.tokens.delete(cleanToken);
      return null;
    }

    const user = db.users.get(session.userId);
    return user || null;
  }

  public logout(token?: string): boolean {
    if (!token) return false;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const session = this.tokens.get(cleanToken);
    if (session) {
      const user = db.users.get(session.userId);
      if (user) {
        db.logAudit(user.id, user.email, 'USER_LOGOUT', 'users', user.id);
        db.logActivity(user.id, 'LOGOUT', `User ${user.email} logged out securely.`);
      }
      this.tokens.delete(cleanToken);
      return true;
    }
    return false;
  }

  public register(
    email: string,
    fullName: string,
    role: UserRole = 'user',
    publisherData?: { organizationName: string; registrationNumber: string; websiteUrl?: string },
    password?: string
  ): { user: User; token: string } {
    const existing = db.findUserByEmail(email);
    if (existing) {
      throw new Error('Email is already registered in the TruthCode registry.');
    }

    const userId = 'usr-' + crypto.randomBytes(6).toString('hex');
    const salt = db.generateSalt();
    const effectivePassword = password || process.env.TRUTHCODE_DEMO_PASSWORD || 'TruthCode2026!';
    const passwordHash = db.hashPassword(effectivePassword, salt);

    const newUser: User = {
      id: userId,
      email,
      fullName,
      role: publisherData ? 'publisher' : role,
      status: 'active',
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (publisherData) {
      const pubId = 'pub-' + crypto.randomBytes(6).toString('hex');
      const pubKeyPair = pkiService.generatePublisherKeyPair();
      db.setPublisherPrivateKey(pubId, pubKeyPair.privateKeyPem);

      const pub: Publisher = {
        id: pubId,
        userId: newUser.id,
        organizationName: publisherData.organizationName,
        registrationNumber: publisherData.registrationNumber,
        status: 'pending', // Requires admin approval per FR-P2
        websiteUrl: publisherData.websiteUrl,
        publicKey: pubKeyPair.publicKeyPem,
        keyAlgorithm: pubKeyPair.algorithm,
        keyFingerprint: pubKeyPair.keyFingerprint,
        createdAt: new Date().toISOString()
      };
      db.publishers.set(pub.id, pub);
      newUser.publisherProfile = pub;
      db.logAudit(newUser.id, newUser.email, 'PUBLISHER_REGISTERED', 'publishers', pub.id, { org: pub.organizationName });
    }

    db.users.set(newUser.id, newUser);
    db.logAudit(newUser.id, newUser.email, 'USER_REGISTERED', 'users', newUser.id);

    const token = this.generateToken(newUser);
    return { user: newUser, token };
  }

  public login(email: string, password?: string): { user: User; token: string } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = db.findUserByEmail(cleanEmail);

    if (!user) {
      // Security requirement 26: Do not reveal whether a specific email exists
      throw new Error('Invalid email or password.');
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      // Security requirement 26: Inactive account error message
      throw new Error('Your account is inactive.');
    }

    // Password verification
    if (user.passwordHash && user.salt) {
      if (password) {
        const isValid = db.verifyPassword(password, user.passwordHash, user.salt);
        if (!isValid) {
          db.logAudit(user.id, user.email, 'LOGIN_FAILED', 'users', user.id, { reason: 'Incorrect password' });
          throw new Error('Invalid email or password.');
        }
      } else {
        // Password omitted: only permit if in non-production/test context or if user has no passwordHash
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Invalid email or password.');
        }
      }
    }

    // Attach publisher profile if publisher
    if (user.role === 'publisher' || (user.role as string).toLowerCase() === 'publisher') {
      for (const p of db.publishers.values()) {
        if (p.userId === user.id) {
          user.publisherProfile = p;
          break;
        }
      }
    }

    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    const token = this.generateToken(user);
    db.logAudit(user.id, user.email, 'USER_LOGIN', 'users', user.id, { role: user.role });
    db.logActivity(user.id, 'LOGIN', `User ${user.email} authenticated successfully.`);
    return { user, token };
  }

  public requestPasswordReset(email: string): { message: string } {
    // Timing-safe response: never reveal whether email exists
    return {
      message: 'If your email address is registered, instructions to reset your password have been issued.'
    };
  }
}

export const authService = new AuthService();
