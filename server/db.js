const Database = require("better-sqlite3");
const path = require("path");
const vectorIndex = require("./vectorIndex");

const db = new Database(path.join(__dirname, "database.sqlite"));

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    phone_canonical TEXT UNIQUE NOT NULL,
    phone_hash TEXT NOT NULL,
    phone_last4 TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('organisation', 'professional')),
    orgId TEXT,
    onboardingCompleted INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vpi (
    vpiId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    trustScore INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS totp_secrets (
    userId TEXT PRIMARY KEY,
    secret_enc BLOB NOT NULL,
    iv BLOB NOT NULL,
    tag BLOB NOT NULL,
    active INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orgs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    ownerUserId TEXT NOT NULL,
    FOREIGN KEY (ownerUserId) REFERENCES users (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    from_vpi TEXT NOT NULL,
    to_vpi TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'rejected')),
    ackBy_vpi TEXT,
    ackAt INTEGER,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (from_vpi) REFERENCES vpi (vpiId),
    FOREIGN KEY (to_vpi) REFERENCES vpi (vpiId)
  );

  CREATE TABLE IF NOT EXISTS loi (
    id TEXT PRIMARY KEY,
    partyA_vpi TEXT NOT NULL,
    partyB_vpi TEXT NOT NULL,
    terms_json TEXT NOT NULL,
    lang TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'signedA', 'active', 'expired')),
    hash TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (partyA_vpi) REFERENCES vpi (vpiId),
    FOREIGN KEY (partyB_vpi) REFERENCES vpi (vpiId)
  );

  CREATE TABLE IF NOT EXISTS loi_signatures (
    id TEXT PRIMARY KEY,
    loiId TEXT NOT NULL,
    signer_vpi TEXT NOT NULL,
    signedAt INTEGER NOT NULL,
    signature_hash TEXT NOT NULL,
    FOREIGN KEY (loiId) REFERENCES loi (id) ON DELETE CASCADE,
    FOREIGN KEY (signer_vpi) REFERENCES vpi (vpiId)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    worker_vpi TEXT NOT NULL,
    orgId TEXT NOT NULL,
    supervisor_vpi TEXT,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    lat REAL,
    lng REAL,
    ts INTEGER NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('geo', 'manual')),
    FOREIGN KEY (worker_vpi) REFERENCES vpi (vpiId),
    FOREIGN KEY (supervisor_vpi) REFERENCES vpi (vpiId)
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    refId TEXT NOT NULL,
    initiator_vpi TEXT NOT NULL,
    approver_vpi TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    createdAt INTEGER NOT NULL,
    decidedAt INTEGER,
    FOREIGN KEY (initiator_vpi) REFERENCES vpi (vpiId),
    FOREIGN KEY (approver_vpi) REFERENCES vpi (vpiId)
  );

  CREATE TABLE IF NOT EXISTS trust_events (
    id TEXT PRIMARY KEY,
    vpiId TEXT NOT NULL,
    kind TEXT NOT NULL,
    weight INTEGER NOT NULL,
    ts INTEGER NOT NULL,
    FOREIGN KEY (vpiId) REFERENCES vpi (vpiId)
  );

  CREATE TABLE IF NOT EXISTS pin_codes (
    pincode TEXT NOT NULL,
    office_name TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    circle TEXT NOT NULL,
    lat REAL,
    lng REAL,
    PRIMARY KEY (pincode, office_name)
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    vector_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
  );
`);

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  CREATE INDEX IF NOT EXISTS idx_users_phone_canonical ON users(phone_canonical);
  CREATE INDEX IF NOT EXISTS idx_vpi_userId ON vpi(userId);
  CREATE INDEX IF NOT EXISTS idx_ledger_from_vpi ON ledger_entries(from_vpi);
  CREATE INDEX IF NOT EXISTS idx_ledger_to_vpi ON ledger_entries(to_vpi);
  CREATE INDEX IF NOT EXISTS idx_loi_partyA ON loi(partyA_vpi);
  CREATE INDEX IF NOT EXISTS idx_loi_partyB ON loi(partyB_vpi);
  CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance(worker_vpi);
  CREATE INDEX IF NOT EXISTS idx_trust_vpiId ON trust_events(vpiId);
  CREATE INDEX IF NOT EXISTS idx_pin_codes_pincode ON pin_codes(pincode);
  CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(entity_type);
`);

// Initialize vector index
const vectorIndexStatus = vectorIndex.init(db);
console.log(
  `Vector index initialized: ${vectorIndexStatus.mode} mode, ${vectorIndexStatus.dims} dimensions`,
);

// Schema upgrade utilities
function ensureColumn(table, column, type, defaultValue = null) {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
    const columnExists = tableInfo.some((col) => col.name === column);

    if (!columnExists) {
      let sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`;
      if (defaultValue !== null) {
        sql += ` DEFAULT ${typeof defaultValue === "string" ? `'${defaultValue}'` : defaultValue}`;
      }
      db.exec(sql);
      console.log(`Added column ${column} to table ${table}`);
    }
  } catch (error) {
    console.error(
      `Failed to add column ${column} to table ${table}:`,
      error.message,
    );
  }
}

// Conditional schema upgrades
console.log("Performing conditional schema upgrades...");

// Ensure users table has role columns
ensureColumn(
  "users",
  "role",
  "TEXT CHECK (role IN ('organisation','professional'))",
);
ensureColumn("users", "role_locked", "INTEGER DEFAULT 1");

// Create role_change_requests table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS role_change_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    from_role TEXT CHECK(from_role IN('organisation','professional')),
    to_role TEXT CHECK(to_role IN('organisation','professional')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    decided_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )
`);

// Create indexes for role_change_requests
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_role_change_requests_status_created ON role_change_requests(status, created_at DESC)
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_role_change_requests_user_created ON role_change_requests(user_id, created_at DESC)
`);

console.log("Schema upgrades completed");

// Helper functions
function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

function tx(fn) {
  const transaction = db.transaction(fn);
  return transaction;
}

// Add helper functions to db object for convenience
db.run = run;
db.get = get;
db.all = all;
db.tx = tx;

module.exports = {
  db,
  run,
  get,
  all,
  tx,
  vectorIndex,
};
