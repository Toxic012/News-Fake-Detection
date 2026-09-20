/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Cryptographic Public-Key Infrastructure (PKI) Service
 * Standards: ECDSA P-256 (secp256r1 / prime256v1) + SHA-256 Digest
 */

import crypto from 'crypto';

export interface KeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
  keyFingerprint: string;
  algorithm: string;
  curve: string;
}

export interface SignatureResult {
  signatureBase64: string;
  algorithm: string;
  contentHash: string;
  keyFingerprint: string;
  signedAt: string;
}

export class PKIService {
  private readonly algorithm = 'ECDSA-P256';
  private readonly namedCurve = 'prime256v1'; // NIST P-256 / secp256r1
  private readonly hashAlgorithm = 'sha256';

  /**
   * Generates a new ECDSA P-256 cryptographic key pair for an accredited publisher.
   */
  public generatePublisherKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: this.namedCurve,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    const keyFingerprint = this.computeKeyFingerprint(publicKey);

    return {
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
      keyFingerprint,
      algorithm: this.algorithm,
      curve: this.namedCurve
    };
  }

  /**
   * Computes the SHA-256 fingerprint of a public key.
   */
  public computeKeyFingerprint(publicKeyPem: string): string {
    const cleanPem = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s+/g, '');
    const derBuffer = Buffer.from(cleanPem, 'base64');
    return 'SHA256:' + crypto.createHash(this.hashAlgorithm).update(derBuffer).digest('hex');
  }

  /**
   * Computes the canonical SHA-256 hash of a content string with Unicode normalization.
   */
  public computeContentHash(content: string): string {
    const normalized = content.normalize('NFC').trim();
    return crypto.createHash(this.hashAlgorithm).update(normalized, 'utf8').digest('hex');
  }

  /**
   * Signs a canonical content hash using the publisher's private key.
   */
  public signContentHash(privateKeyPem: string, contentHash: string): string {
    const signer = crypto.createSign('SHA256');
    signer.update(contentHash);
    signer.end();
    return signer.sign(privateKeyPem, 'base64');
  }

  /**
   * Verifies an ECDSA P-256 signature against the canonical content hash and publisher public key.
   */
  public verifySignature(publicKeyPem: string, contentHash: string, signatureBase64: string): boolean {
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(contentHash);
      verifier.end();
      return verifier.verify(publicKeyPem, signatureBase64, 'base64');
    } catch (err) {
      console.warn('[PKIService] Verification error:', err);
      return false;
    }
  }

  /**
   * Complete signing package for an article/content item.
   */
  public signArticle(privateKeyPem: string, publicKeyPem: string, bodyText: string): SignatureResult {
    const contentHash = this.computeContentHash(bodyText);
    const signatureBase64 = this.signContentHash(privateKeyPem, contentHash);
    const keyFingerprint = this.computeKeyFingerprint(publicKeyPem);

    return {
      signatureBase64,
      algorithm: this.algorithm,
      contentHash,
      keyFingerprint,
      signedAt: new Date().toISOString()
    };
  }
}

export const pkiService = new PKIService();
