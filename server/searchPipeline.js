/**
 * Search Pipeline Module
 *
 * Implements the complete search pipeline:
 * Query → Embed → ANN candidates → Feature build → Re-rank → Results
 */

const mlClient = require("./mlClient");
const { vectorIndex } = require("./db");

/**
 * Generate embedding for a single text
 * @param {string} text - Input text
 * @returns {Promise<Float32Array>} - Embedding vector
 */
async function embed(text) {
  try {
    const result = await mlClient.embed([text], true);
    return new Float32Array(result.vectors[0]);
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Search for candidate entities using vector similarity
 * @param {string} type - Entity type
 * @param {Float32Array} queryVec - Query vector
 * @param {number} topK - Number of candidates to return
 * @returns {Promise<Array<{id: string, distance: number}>>} - Candidate results
 */
async function candidateSearch(type, queryVec, topK = 100) {
  try {
    const candidates = vectorIndex.annSearch(type, Array.from(queryVec), topK);
    return candidates;
  } catch (error) {
    console.error("Candidate search failed:", error);
    throw new Error(`Candidate search failed: ${error.message}`);
  }
}

/**
 * Build feature vector for a candidate
 * @param {Object} candidate - Candidate with id, distance, queryVec
 * @param {Object} opts - Additional options (for future features)
 * @returns {number[]} - Feature vector
 */
function buildFeatures(candidate, opts = {}) {
  const { id, distance, queryVec } = candidate;

  // Feature 0: Similarity (1 - distance)
  const f0 = 1 - distance;

  // Feature 1: Recency (placeholder - days since creation, normalized)
  // TODO: Implement actual recency calculation
  const f1 = 0; // Placeholder: recencyDaysNormalized

  // Feature 2: Trust score (placeholder - user/entity trust score, normalized)
  // TODO: Implement actual trust score calculation
  const f2 = 0; // Placeholder: trustScoreNormalized

  // Feature 3: Geographic proximity (placeholder - distance in km, normalized)
  // TODO: Implement actual geographic distance calculation
  const f3 = 0; // Placeholder: geoKmNormalized

  return [f0, f1, f2, f3];
}

/**
 * Re-rank candidates using ML model or fallback
 * @param {number[][]} featuresBatch - Array of feature vectors
 * @returns {Promise<number[]>} - Ranking scores
 */
async function rerank(featuresBatch) {
  if (process.env.ML_RERANK === "1") {
    try {
      // Call ML re-ranker
      const result = await mlClient.rank(featuresBatch);
      return result.scores;
    } catch (error) {
      console.error("ML re-ranking failed, using fallback:", error.message);
      // Fallback to similarity-only scoring
      return featuresBatch.map((features) => features[0]); // f0 = similarity
    }
  } else {
    // Fallback: use similarity score only
    return featuresBatch.map((features) => features[0]); // f0 = similarity
  }
}

/**
 * Perform complete semantic search
 * @param {string} type - Entity type to search
 * @param {string} query - Search query text
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array<{id: string, score: number}>>} - Search results
 */
async function search(type, query, topK = 20) {
  try {
    console.log(`Searching for "${query}" in type "${type}" (topK=${topK})`);

    // Step 1: Generate query embedding
    const queryVec = await embed(query);
    console.log(`Generated query embedding (${queryVec.length} dims)`);

    // Step 2: Find candidate entities (use larger candidate set for better recall)
    const candidateCount = Math.max(topK * 5, 100);
    const candidates = await candidateSearch(type, queryVec, candidateCount);
    console.log(`Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      return [];
    }

    // Step 3: Build features for each candidate
    const featuresBatch = candidates.map((candidate) =>
      buildFeatures({ ...candidate, queryVec }, {}),
    );
    console.log(`Built features for ${featuresBatch.length} candidates`);

    // Step 4: Re-rank candidates
    const scores = await rerank(featuresBatch);
    console.log(`Re-ranked ${scores.length} candidates`);

    // Step 5: Combine and sort results
    const results = candidates.map((candidate, index) => ({
      id: candidate.id,
      score: scores[index] || 0,
    }));

    // Sort by score (descending) and return top K
    results.sort((a, b) => b.score - a.score);
    const finalResults = results.slice(0, topK);

    console.log(`Returning ${finalResults.length} results`);
    return finalResults;
  } catch (error) {
    console.error("Search pipeline failed:", error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Get search pipeline status
 * @returns {Object} - Pipeline status
 */
function getStatus() {
  return {
    vectorIndex: vectorIndex.getStatus(),
    mlRerank: process.env.ML_RERANK === "1",
    vecDims: parseInt(process.env.VEC_DIMS) || 384,
  };
}

module.exports = {
  embed,
  candidateSearch,
  buildFeatures,
  rerank,
  search,
  getStatus,
};
