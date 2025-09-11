/**
 * Vector Index Module
 *
 * Provides vector storage and similarity search using either:
 * - sqlite-vss extension (ANN) when available
 * - Brute-force fallback using cosine similarity
 */

const VEC_DIMS = parseInt(process.env.VEC_DIMS) || 384;

let mode = "brute";
let dims = VEC_DIMS;
let db = null;
let vssLoaded = false;

/**
 * Initialize the vector index
 * @param {Database} database - SQLite database instance
 * @returns {Object} - { mode, dims }
 */
function init(database) {
  db = database;
  dims = VEC_DIMS;

  try {
    // Try to load sqlite-vss extension
    const vssPath = process.env.SQLITE_VSS_EXT;
    if (vssPath) {
      console.log(`Loading sqlite-vss from: ${vssPath}`);
      db.loadExtension(vssPath);
      vssLoaded = true;
      mode = "vss";
      console.log("✅ sqlite-vss loaded successfully");
    } else {
      console.log("⚠️  SQLITE_VSS_EXT not set, using brute-force mode");
    }
  } catch (error) {
    console.log(
      "⚠️  Failed to load sqlite-vss, falling back to brute-force mode:",
      error.message,
    );
    vssLoaded = false;
    mode = "brute";
  }

  if (mode === "brute") {
    // Create generic embeddings table for brute-force mode
    db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        type TEXT NOT NULL,
        id TEXT NOT NULL,
        vec_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (type, id)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(type)
    `);
  }

  return { mode, dims };
}

/**
 * Convert array to Float32Array and validate dimensions
 * @param {number[]} vec - Input vector
 * @returns {Float32Array} - Validated Float32Array
 */
function toF32(vec) {
  if (!Array.isArray(vec)) {
    throw new Error("Vector must be an array");
  }

  if (vec.length !== dims) {
    throw new Error(
      `Vector dimension mismatch: expected ${dims}, got ${vec.length}`,
    );
  }

  return new Float32Array(vec);
}

/**
 * Convert Float32Array to Buffer for sqlite-vss
 * @param {Float32Array} vec - Input vector
 * @returns {Buffer} - Little-endian buffer
 */
function toBufferF32(vec) {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} - Cosine similarity (0-1)
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
 * Upsert a vector for an entity
 * @param {string} type - Entity type
 * @param {string} id - Entity ID
 * @param {number[]} vec - Vector as number array
 */
function upsertVector(type, id, vec) {
  const vecF32 = toF32(vec);

  if (mode === "vss") {
    // VSS mode: use virtual table + mapping table
    const vssTable = `vss_${type}`;
    const mapTable = `map_${type}`;

    // Ensure VSS virtual table exists
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${vssTable} USING vss0(v BLOB)
    `);

    // Ensure mapping table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${mapTable} (
        id TEXT PRIMARY KEY,
        rowid INTEGER UNIQUE
      )
    `);

    // Get or insert mapping
    let rowid;
    const existing = db
      .prepare(`SELECT rowid FROM ${mapTable} WHERE id = ?`)
      .get(id);

    if (existing) {
      rowid = existing.rowid;
    } else {
      // Insert new mapping
      const result = db
        .prepare(`INSERT INTO ${mapTable} (id) VALUES (?)`)
        .run(id);
      rowid = result.lastInsertRowid;
    }

    // Upsert vector in VSS table
    const vectorBuffer = toBufferF32(vecF32);
    db.prepare(
      `
      INSERT OR REPLACE INTO ${vssTable} (rowid, v) VALUES (?, ?)
    `,
    ).run(rowid, vectorBuffer);
  } else {
    // Brute-force mode: store as JSON
    const vecJson = JSON.stringify(Array.from(vecF32));
    const createdAt = Date.now();

    db.prepare(
      `
      INSERT OR REPLACE INTO embeddings (type, id, vec_json, created_at) 
      VALUES (?, ?, ?, ?)
    `,
    ).run(type, id, vecJson, createdAt);
  }
}

/**
 * Delete a vector for an entity
 * @param {string} type - Entity type
 * @param {string} id - Entity ID
 */
function deleteVector(type, id) {
  if (mode === "vss") {
    const vssTable = `vss_${type}`;
    const mapTable = `map_${type}`;

    // Get rowid from mapping
    const mapping = db
      .prepare(`SELECT rowid FROM ${mapTable} WHERE id = ?`)
      .get(id);
    if (mapping) {
      // Delete from VSS table
      db.prepare(`DELETE FROM ${vssTable} WHERE rowid = ?`).run(mapping.rowid);
      // Delete from mapping table
      db.prepare(`DELETE FROM ${mapTable} WHERE id = ?`).run(id);
    }
  } else {
    // Brute-force mode
    db.prepare(`DELETE FROM embeddings WHERE type = ? AND id = ?`).run(
      type,
      id,
    );
  }
}

/**
 * Perform approximate nearest neighbor search
 * @param {string} type - Entity type
 * @param {number[]} queryVec - Query vector
 * @param {number} topK - Number of results to return
 * @returns {Array<{id: string, distance: number}>} - Search results
 */
function annSearch(type, queryVec, topK = 20) {
  const queryF32 = toF32(queryVec);

  if (mode === "vss") {
    // VSS mode: use MATCH query
    const vssTable = `vss_${type}`;
    const mapTable = `map_${type}`;

    try {
      const queryBuffer = toBufferF32(queryF32);

      // Search using VSS MATCH
      const results = db
        .prepare(
          `
        SELECT m.id, v.distance 
        FROM ${vssTable} v
        JOIN ${mapTable} m ON v.rowid = m.rowid
        WHERE v MATCH ?
        ORDER BY v.distance
        LIMIT ?
      `,
        )
        .all(queryBuffer, topK);

      return results.map((r) => ({
        id: r.id,
        distance: r.distance,
      }));
    } catch (error) {
      console.error(
        "VSS search failed, falling back to brute-force:",
        error.message,
      );
      // Fallback to brute-force for this query
      return bruteForceSearch(type, queryF32, topK);
    }
  } else {
    // Brute-force mode
    return bruteForceSearch(type, queryF32, topK);
  }
}

/**
 * Brute-force search using cosine similarity
 * @param {string} type - Entity type
 * @param {Float32Array} queryVec - Query vector
 * @param {number} topK - Number of results to return
 * @returns {Array<{id: string, distance: number}>} - Search results
 */
function bruteForceSearch(type, queryVec, topK) {
  const queryArray = Array.from(queryVec);

  // Get all vectors for this type
  const rows = db
    .prepare(
      `
    SELECT id, vec_json FROM embeddings WHERE type = ?
  `,
    )
    .all(type);

  if (rows.length === 0) {
    return [];
  }

  // Compute similarities
  const results = rows.map((row) => {
    const vec = JSON.parse(row.vec_json);
    const similarity = cosine(queryArray, vec);
    const distance = 1 - similarity; // Convert to distance (lower is better)

    return {
      id: row.id,
      distance,
    };
  });

  // Sort by distance (ascending) and return top K
  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, topK);
}

/**
 * Get detected VSS tables
 * @returns {string[]} - List of VSS table names
 */
function getVssTables() {
  if (mode !== "vss") {
    return [];
  }

  try {
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type = 'table' AND name LIKE 'vss_%'
    `,
      )
      .all();

    return tables.map((t) => t.name);
  } catch (error) {
    return [];
  }
}

/**
 * Get status information
 * @returns {Object} - Status object
 */
function getStatus() {
  return {
    mode,
    dims,
    hasExt: vssLoaded,
    types: getVssTables(),
  };
}

module.exports = {
  init,
  upsertVector,
  deleteVector,
  annSearch,
  getStatus,
  // Utilities
  toF32,
  toBufferF32,
  cosine,
};
