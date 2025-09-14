#!/usr/bin/env node
/**
 * Make a training CSV for the re-ranker from your existing SQLite events.
 *
 * Usage:
 *   node server/make-training-csv.js \
 *     --db ./server/app.db \
 *     --out ./ml-service/data/training_sample.csv \
 *     --type job \
 *     --neg 5
 *
 * Assumptions (best-effort, falls back if missing):
 * - events table: events(id, user_id, item_type, item_id, type, ts, metadata TEXT JSON)
 *   * positive events: type IN ('job_apply','profile_contact','search_click')
 * - embeddings table (optional, used if present in brute mode):
 *     embeddings(type TEXT, id TEXT, vector_json TEXT, PRIMARY KEY(type,id))
 * - vpi table (optional): vpi(vpiId TEXT PK, trustScore INTEGER)
 * - items tables (optional) for recency:
 *     jobs(id TEXT PK, createdAt INTEGER) / professionals(id TEXT PK, createdAt INTEGER)
 * - users/orgs with pincode (optional):
 *     users(id TEXT PK, pincode TEXT), orgs(id TEXT PK, pincode TEXT)
 * - pin_codes (optional): pin_codes(pincode TEXT PK, lat REAL, lng REAL)
 */

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
}

const DB_PATH = arg("db", "./server/app.db");
const OUT_CSV = arg("out", "./ml-service/data/training_sample.csv");
const ENTITY_TYPE = arg("type", "job"); // 'job' or 'professional'
const NEG_PER_POS = parseInt(arg("neg", "3"), 10);

if (!fs.existsSync(DB_PATH)) {
  console.error(`!! DB not found: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const nowMs = Date.now();
const DAY_MS = 86400000;

// ---------- helpers ----------
function tableExists(name) {
  const r = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND lower(name)=lower(?)",
    )
    .get(name);
  return !!r;
}

function getCol(stmt, param) {
  try {
    const r = db.prepare(stmt).get(param);
    return r ? Object.values(r)[0] : null;
  } catch {
    return null;
  }
}

function getItemCreatedAt(type, id) {
  if (type === "job" && tableExists("jobs")) {
    return getCol("SELECT createdAt FROM jobs WHERE id = ?", id);
  }
  if (type === "professional" && tableExists("professionals")) {
    return getCol("SELECT createdAt FROM professionals WHERE id = ?", id);
  }
  return null;
}

function getTrustForItem(type, id) {
  if (tableExists("vpi")) {
    const v = getCol("SELECT trustScore FROM vpi WHERE vpiId = ?", id);
    if (typeof v === "number") return v;
  }
  return null;
}

function getPincodeLatLng(pin) {
  if (!pin || !tableExists("pin_codes")) return null;
  const row = db
    .prepare("SELECT lat, lng FROM pin_codes WHERE pincode = ?")
    .get(pin);
  if (row && typeof row.lat === "number" && typeof row.lng === "number") {
    return { lat: row.lat, lng: row.lng };
  }
  return null;
}

function getUserPincode(userId) {
  if (tableExists("users")) {
    const pin = getCol("SELECT pincode FROM users WHERE id = ?", userId);
    if (pin) return pin;
  }
  return null;
}

function getItemPincode(type, id) {
  if (type === "job" && tableExists("jobs")) {
    const pin = getCol("SELECT pincode FROM jobs WHERE id = ?", id);
    if (pin) return pin;
  }
  if (type === "professional" && tableExists("professionals")) {
    const pin = getCol("SELECT pincode FROM professionals WHERE id = ?", id);
    if (pin) return pin;
  }
  return null;
}

function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function normalizeRecency(createdAtMs) {
  if (!createdAtMs) return 0.5;
  const days = Math.max(0, (nowMs - createdAtMs) / DAY_MS);
  return Math.exp(-days / 30); // ~30-day half-life
}

function normalizeTrust(trustScore) {
  if (typeof trustScore !== "number") return 0.5;
  return Math.max(0, Math.min(1, trustScore / 1000));
}

function normalizeGeoScore(km) {
  if (km == null) return 0.5;
  return Math.max(0, 1 - km / 50); // 0–50km band
}

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0.5;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

function getEmbedding(type, id) {
  if (!tableExists("embeddings")) return null;
  const row = db
    .prepare("SELECT vector_json FROM embeddings WHERE type = ? AND id = ?")
    .get(type, id);
  if (!row) return null;
  try {
    return JSON.parse(row.vector_json);
  } catch {
    return null;
  }
}

function meanVec(vectors) {
  if (!vectors.length) return null;
  const d = vectors[0].length;
  const out = new Array(d).fill(0);
  for (const v of vectors) for (let i = 0; i < d; i++) out[i] += v[i];
  for (let i = 0; i < d; i++) out[i] /= vectors.length;
  return out;
}

function userVectorFromHistory(userId, type) {
  if (!tableExists("events") || !tableExists("embeddings")) return null;
  const rows = db
    .prepare(
      `SELECT item_id FROM events
     WHERE user_id = ? AND item_type = ? AND type IN ('job_apply','profile_contact','search_click')
     ORDER BY ts DESC LIMIT 10`,
    )
    .all(userId, type);
  const vecs = [];
  for (const r of rows) {
    const v = getEmbedding(type, r.item_id);
    if (Array.isArray(v)) vecs.push(v);
  }
  return meanVec(vecs);
}

function getAllItemIds(type, limit = 5000) {
  if (tableExists("embeddings")) {
    const rows = db
      .prepare("SELECT id FROM embeddings WHERE type = ? LIMIT ?")
      .all(type, limit);
    return rows.map((r) => r.id);
  }
  const table = type === "job" ? "jobs" : "professionals";
  if (tableExists(table)) {
    const rows = db.prepare(`SELECT id FROM ${table} LIMIT ?`).all(limit);
    return rows.map((r) => r.id);
  }
  return [];
}

// ---------- extract positives ----------
if (!tableExists("events")) {
  console.error("!! No 'events' table found. Cannot build training data.");
  process.exit(1);
}

const positiveTypes = ["job_apply", "profile_contact", "search_click"];
const posStmt = db.prepare(
  `SELECT user_id, item_type, item_id, ts
   FROM events
   WHERE item_type = ? AND type IN (${positiveTypes.map(() => "?").join(",")})
   ORDER BY ts DESC`,
);
const positives = posStmt.all(ENTITY_TYPE, ...positiveTypes);

// Negatives via sampling other items the user didn't engage with
const allIds = getAllItemIds(ENTITY_TYPE, 5000);
const byUser = new Map();
for (const p of positives) {
  if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
  byUser.get(p.user_id).push(p);
}

// ---------- write CSV ----------
fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
const out = fs.createWriteStream(OUT_CSV);
out.write(
  "label,f0_sim,f1_recency,f2_trust,f3_geo,user_id,item_type,item_id,event_ts\n",
);

let rows = 0;
for (const [userId, posEvents] of byUser.entries()) {
  const uVec = userVectorFromHistory(userId, ENTITY_TYPE);

  for (const e of posEvents) {
    const itemId = e.item_id;

    const iVec = getEmbedding(ENTITY_TYPE, itemId);
    const sim = uVec && iVec ? cosine(uVec, iVec) : 0.75;
    const createdAt = getItemCreatedAt(ENTITY_TYPE, itemId);
    const f1 = normalizeRecency(createdAt);
    const trust = getTrustForItem(ENTITY_TYPE, itemId);
    const f2 = normalizeTrust(trust);
    const userPin = getUserPincode(userId);
    const itemPin = getItemPincode(ENTITY_TYPE, itemId);
    const km = haversineKm(
      getPincodeLatLng(userPin),
      getPincodeLatLng(itemPin),
    );
    const f3 = normalizeGeoScore(km);

    out.write(
      `${1},${sim.toFixed(6)},${f1.toFixed(6)},${f2.toFixed(6)},${f3.toFixed(6)},${userId},${ENTITY_TYPE},${itemId},${e.ts}\n`,
    );
    rows++;

    // negatives
    let negs = 0;
    const seen = new Set(posEvents.map((p) => p.item_id));
    while (negs < NEG_PER_POS && allIds.length) {
      const id = allIds[Math.floor(Math.random() * allIds.length)];
      if (seen.has(id) || id === itemId) continue;

      const niVec = getEmbedding(ENTITY_TYPE, id);
      const nSim = uVec && niVec ? cosine(uVec, niVec) : 0.35;
      const nCreatedAt = getItemCreatedAt(ENTITY_TYPE, id);
      const nf1 = normalizeRecency(nCreatedAt);
      const nTrust = getTrustForItem(ENTITY_TYPE, id);
      const nf2 = normalizeTrust(nTrust);
      const nItemPin = getItemPincode(ENTITY_TYPE, id);
      const nKm = haversineKm(
        getPincodeLatLng(userPin),
        getPincodeLatLng(nItemPin),
      );
      const nf3 = normalizeGeoScore(nKm);

      out.write(
        `${0},${nSim.toFixed(6)},${nf1.toFixed(6)},${nf2.toFixed(6)},${nf3.toFixed(6)},${userId},${ENTITY_TYPE},${id},${e.ts}\n`,
      );
      rows++;
      negs++;
    }
  }
}

out.end(() => {
  console.log(`✅ Wrote ${rows} rows to ${OUT_CSV}`);
  if (rows === 0) {
    console.warn(
      "⚠️  No rows written. Ensure 'events' has positives and embeddings/items exist.",
    );
  } else {
    console.log("Tip: train ranker →");
    console.log(
      "python ml-service/train_ranker.py --csv ml-service/data/training_sample.csv --out ml-service/models/ranker.onnx",
    );
  }
});
