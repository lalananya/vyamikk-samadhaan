/**
 * ML Service Client
 *
 * Client for communicating with the Python ML microservice
 */

const ML_URL = process.env.ML_URL || "http://127.0.0.1:8000";

/**
 * Generate embeddings for texts
 * @param {string[]} texts - Array of texts to embed
 * @param {boolean} normalize - Whether to normalize embeddings (default: true)
 * @returns {Promise<Object>} - Response with vectors, dims, model, took_ms
 */
async function embed(texts, normalize = true) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error("texts must be a non-empty array");
  }

  if (texts.length > 512) {
    throw new Error("Maximum 512 texts allowed per request");
  }

  const response = await fetch(`${ML_URL}/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts,
      normalize,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML service error: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Score similarity between pairs of vectors
 * @param {Array<{user_vec: number[], item_vec: number[]}>} pairs - Array of vector pairs
 * @param {string} method - Scoring method: 'cosine' or 'dot' (default: 'cosine')
 * @returns {Promise<Object>} - Response with scores array and took_ms
 */
async function score(pairs, method = "cosine") {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new Error("pairs must be a non-empty array");
  }

  if (pairs.length > 512) {
    throw new Error("Maximum 512 pairs allowed per request");
  }

  if (!["cosine", "dot"].includes(method)) {
    throw new Error('method must be "cosine" or "dot"');
  }

  const response = await fetch(`${ML_URL}/score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pairs,
      method,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML service error: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Check ML service health
 * @returns {Promise<Object>} - Health status
 */
async function health() {
  const response = await fetch(`${ML_URL}/health`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `ML service health check failed: ${response.status} ${error}`,
    );
  }

  return await response.json();
}

/**
 * Re-rank candidates using ML model
 * @param {number[][]} featuresBatch - Array of feature vectors
 * @returns {Promise<Object>} - Response with scores array and metadata
 */
async function rank(featuresBatch) {
  if (!Array.isArray(featuresBatch) || featuresBatch.length === 0) {
    throw new Error("featuresBatch must be a non-empty array");
  }

  const response = await fetch(`${ML_URL}/rank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      features: featuresBatch,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ML service ranking failed: ${response.status} ${error}`);
  }

  return await response.json();
}

module.exports = {
  embed,
  score,
  health,
  rank,
};
