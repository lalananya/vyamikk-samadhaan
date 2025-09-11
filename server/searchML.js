/**
 * Semantic Search ML Module
 *
 * Provides semantic search functionality using text embeddings
 */

const { db } = require("./db");
const mlClient = require("./mlClient");

/**
 * Upsert an embedding for an entity
 * @param {string} entityType - Type of entity (e.g., 'job', 'profile')
 * @param {string} entityId - Unique identifier for the entity
 * @param {number[]} vector - Embedding vector
 */
function upsertEmbedding(entityType, entityId, vector) {
  const vectorJson = JSON.stringify(vector);
  const createdAt = Date.now();

  db.run(
    "INSERT OR REPLACE INTO embeddings (entity_type, entity_id, vector_json, created_at) VALUES (?, ?, ?, ?)",
    [entityType, entityId, vectorJson, createdAt],
  );
}

/**
 * Get all embeddings for a specific entity type
 * @param {string} entityType - Type of entity
 * @returns {Array<{entity_id: string, vector: number[]}>} - Array of entities with their vectors
 */
function getEmbeddingsByType(entityType) {
  const rows = db.all(
    "SELECT entity_id, vector_json FROM embeddings WHERE entity_type = ?",
    [entityType],
  );

  return rows.map((row) => ({
    entity_id: row.entity_id,
    vector: JSON.parse(row.vector_json),
  }));
}

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} - Cosine similarity score
 */
function cosine(a, b) {
  if (a.length !== b.length) {
    throw new Error("Vector dimensions must match");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Search entities by text query using semantic similarity
 * @param {string} entityType - Type of entity to search
 * @param {string} query - Text query
 * @param {number} topK - Number of top results to return (default: 20)
 * @returns {Promise<Array<{entity_id: string, score: number}>>} - Search results with scores
 */
async function searchByText(entityType, query, topK = 20) {
  try {
    // Generate embedding for the query
    const embedResult = await mlClient.embed([query], true);
    const queryVector = embedResult.vectors[0];

    // Get all embeddings for the entity type
    const entities = getEmbeddingsByType(entityType);

    if (entities.length === 0) {
      return [];
    }

    // Compute similarity scores
    const results = entities.map((entity) => ({
      entity_id: entity.entity_id,
      score: cosine(queryVector, entity.vector),
    }));

    // Sort by score (descending) and return top K
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  } catch (error) {
    console.error("Search error:", error);
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

/**
 * Generate and store embeddings for text data
 * @param {string} entityType - Type of entity
 * @param {string} entityId - Unique identifier
 * @param {string} text - Text to embed
 * @returns {Promise<void>}
 */
async function generateAndStoreEmbedding(entityType, entityId, text) {
  try {
    const embedResult = await mlClient.embed([text], true);
    const vector = embedResult.vectors[0];

    upsertEmbedding(entityType, entityId, vector);

    console.log(`Generated embedding for ${entityType}:${entityId}`);
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw error;
  }
}

/**
 * Batch generate and store embeddings
 * @param {Array<{entityType: string, entityId: string, text: string}>} items - Items to embed
 * @returns {Promise<void>}
 */
async function batchGenerateEmbeddings(items) {
  try {
    const texts = items.map((item) => item.text);
    const embedResult = await mlClient.embed(texts, true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const vector = embedResult.vectors[i];

      upsertEmbedding(item.entityType, item.entityId, vector);
    }

    console.log(`Generated ${items.length} embeddings`);
  } catch (error) {
    console.error("Failed to generate batch embeddings:", error);
    throw error;
  }
}

module.exports = {
  upsertEmbedding,
  getEmbeddingsByType,
  cosine,
  searchByText,
  generateAndStoreEmbedding,
  batchGenerateEmbeddings,
};
