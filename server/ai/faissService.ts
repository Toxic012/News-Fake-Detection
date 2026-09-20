/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * TruthCode - FAISS Vector Index & Retrieval Service
 * Architecture: FAISS IndexFlatIP (Inner Product on L2-Normalized Vectors = Cosine Similarity)
 */

import { embeddingService, EmbeddingResult } from './embeddingService.js';

export interface VectorEntityMetadata {
  vectorId: string;
  entityId: string;
  contentType: 'article' | 'newspaper' | 'media';
  title: string;
  publisherId: string;
  publisherName: string;
  publisherReg: string;
  contentHash: string;
  versionNumber: number;
  publishedAt: string;
  code?: string;
  excerpt: string;
}

export interface VectorSearchCandidate {
  candidateArticleId: string;
  contentType: 'article' | 'newspaper' | 'media';
  title: string;
  publisherId: string;
  publisherName: string;
  publisherReg: string;
  contentHash: string;
  versionNumber: number;
  publishedAt: string;
  code?: string;
  similarityScore: number; // 0 - 100 percentage
  cosineSimilarity: number; // -1.0 to 1.0 raw dot product
  matchedVectorId: string;
  excerpt: string;
}

export interface ReverseLookupResult {
  matchStatus: 'MATCH_FOUND' | 'NO_AUTHENTIC_ORIGINAL_FOUND';
  candidate?: VectorSearchCandidate;
  similarityScore: number;
  threshold: number;
  topCandidates: VectorSearchCandidate[];
  queryTokenCount: number;
  searchDurationMs: number;
}

export class FAISSService {
  public readonly indexType = 'IndexFlatIP';
  public readonly dimension = 384;
  
  // Configurable acceptance threshold (default 55.0% similarity)
  private reverseLookupThreshold: number = parseFloat(process.env.REVERSE_LOOKUP_THRESHOLD || '55.0');

  // Memory vector index: vectorId -> L2 normalized float array
  private vectorStore: Map<string, number[]> = new Map();
  // Vector mapping: vectorId -> Entity Metadata
  private entityMappings: Map<string, VectorEntityMetadata> = new Map();
  // Article lookup: entityId -> vectorId
  private entityToVector: Map<string, string> = new Map();

  constructor() {
    console.log(`[FAISSService] Initialized ${this.indexType} vector store (dimension: ${this.dimension}, threshold: ${this.reverseLookupThreshold}%)`);
  }

  /**
   * Configures the dynamic reverse lookup acceptance threshold.
   */
  public setThreshold(threshold: number): void {
    if (threshold > 0 && threshold <= 100) {
      this.reverseLookupThreshold = threshold;
    }
  }

  /**
   * Retrieves the current reverse lookup threshold.
   */
  public getThreshold(): number {
    return this.reverseLookupThreshold;
  }

  /**
   * Adds an article or content item to the FAISS vector index.
   */
  public addVector(
    entityId: string,
    text: string,
    metadata: Omit<VectorEntityMetadata, 'vectorId' | 'entityId' | 'excerpt'>
  ): string {
    const vectorId = `vec-${entityId}-${Date.now().toString(36)}`;
    const embedding = embeddingService.generateEmbedding(text);

    // Remove old vector if entity was previously indexed
    if (this.entityToVector.has(entityId)) {
      const oldVecId = this.entityToVector.get(entityId)!;
      this.vectorStore.delete(oldVecId);
      this.entityMappings.delete(oldVecId);
    }

    const excerpt = text.length > 180 ? text.substring(0, 180) + '...' : text;

    this.vectorStore.set(vectorId, embedding.vector);
    this.entityMappings.set(vectorId, {
      ...metadata,
      vectorId,
      entityId,
      excerpt
    });
    this.entityToVector.set(entityId, vectorId);

    return vectorId;
  }

  /**
   * Searches the FAISS index for the top-K nearest original articles using Cosine Similarity.
   */
  public search(queryText: string, topK: number = 3): ReverseLookupResult {
    const start = performance.now();
    const queryEmbedding = embeddingService.generateEmbedding(queryText);
    const results: VectorSearchCandidate[] = [];

    const queryNormalized = embeddingService.normalizeText(queryText);
    const queryTokens = embeddingService.tokenize(queryNormalized).filter(t => t.length > 2);

    for (const [vectorId, indexedVec] of this.vectorStore.entries()) {
      const meta = this.entityMappings.get(vectorId);
      if (!meta) continue;

      // Inner Product on L2 normalized vectors = Dense Cosine Similarity
      let dotProduct = 0;
      for (let i = 0; i < this.dimension; i++) {
        dotProduct += queryEmbedding.vector[i] * indexedVec[i];
      }

      // Raw dot product on normalized vectors in [-1.0, 1.0]
      const clampedDot = Math.max(-1.0, Math.min(1.0, dotProduct));

      // Asymmetric Query Passage Coverage (Dense-Lexical Hybrid for short queries against long articles)
      const docNormalized = embeddingService.normalizeText(`${meta.title} ${meta.excerpt}`);
      const docTokens = new Set(embeddingService.tokenize(docNormalized));
      let matchedTokens = 0;
      for (const t of queryTokens) {
        if (docTokens.has(t)) matchedTokens++;
      }
      const queryCoverage = queryTokens.length > 0 ? (matchedTokens / queryTokens.length) : 0;

      // Dense vector cosine similarity (40%) + Asymmetric topic coverage (60%)
      const similarityScore = parseFloat((Math.min(100, Math.max(0, clampedDot * 40 + queryCoverage * 60))).toFixed(2));

      results.push({
        candidateArticleId: meta.entityId,
        contentType: meta.contentType,
        title: meta.title,
        publisherId: meta.publisherId,
        publisherName: meta.publisherName,
        publisherReg: meta.publisherReg,
        contentHash: meta.contentHash,
        versionNumber: meta.versionNumber,
        publishedAt: meta.publishedAt,
        code: meta.code,
        similarityScore,
        cosineSimilarity: clampedDot,
        matchedVectorId: vectorId,
        excerpt: meta.excerpt
      });
    }

    // Sort descending by similarity score
    results.sort((a, b) => b.similarityScore - a.similarityScore);
    const topCandidates = results.slice(0, topK);
    const topMatch = topCandidates.length > 0 ? topCandidates[0] : undefined;

    const matchFound = !!topMatch && topMatch.similarityScore >= this.reverseLookupThreshold;
    const durationMs = parseFloat((performance.now() - start).toFixed(2));

    return {
      matchStatus: matchFound ? 'MATCH_FOUND' : 'NO_AUTHENTIC_ORIGINAL_FOUND',
      candidate: matchFound ? topMatch : undefined,
      similarityScore: topMatch ? topMatch.similarityScore : 0,
      threshold: this.reverseLookupThreshold,
      topCandidates,
      queryTokenCount: queryEmbedding.tokenCount,
      searchDurationMs: durationMs
    };
  }

  /**
   * Returns total indexed vectors.
   */
  public size(): number {
    return this.vectorStore.size;
  }

  public count(): number {
    return this.vectorStore.size;
  }


  /**
   * Removes an entity from the vector index.
   */
  public removeVector(entityId: string): boolean {
    const vectorId = this.entityToVector.get(entityId);
    if (!vectorId) return false;
    this.vectorStore.delete(vectorId);
    this.entityMappings.delete(vectorId);
    this.entityToVector.delete(entityId);
    return true;
  }

  /**
   * Returns vector store statistics and telemetry.
   */
  public getStats() {
    return {
      totalVectors: this.vectorStore.size,
      dimension: this.dimension,
      indexType: this.indexType,
      embeddingModel: embeddingService.modelName,
      threshold: this.reverseLookupThreshold
    };
  }

  /**
   * Clears the vector index.
   */
  public clear(): void {
    this.vectorStore.clear();
    this.entityMappings.clear();
    this.entityToVector.clear();
  }
}

export const faissService = new FAISSService();
