/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - Server-Side Gemini Client Initialization
 */

import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[TruthCode AI] GEMINI_API_KEY is not set. Operating in local algorithmic mode.');
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return aiClient;
}
