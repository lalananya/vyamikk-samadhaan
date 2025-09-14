/**
 * OPTIMIZED Database Module
 *
 * Performance improvements:
 * - Connection pooling with better-sqlite3
 * - Prepared statement caching
 * - Query optimization with proper indexes
 * - Batch operations for bulk inserts
 * - Memory-mapped I/O for large datasets
 * - Connection health monitoring
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

class DatabasePool {
  constructor(options = {}) {
    this.poolSize = options.poolSize || 10;
    this.connections = [];
    this.available = [];
    this.busy = new Set();
    this.preparedStatements = new Map();
    this.healthCheckInterval = null;
    this.initialized = false;
  }

  async init(dbPath = "./database.sqlite") {
    if (this.initialized) return;

    // Create database directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize connection pool
    for (let i = 0; i < this.poolSize; i++) {
      const db = new Database(dbPath, {
        verbose: process.env.DB_VERBOSE ? console.log : null,
        page_size: 4096, // Optimize for modern SSDs
        cache_size: -64000, // 64MB cache
        synchronous: "NORMAL", // Balance between safety and speed
        journal_mode: "WAL", // Write-Ahead Logging for better concurrency
        temp_store: "MEMORY", // Store temp tables in memory
        mmap_size: 134217728, // 128MB memory-mapped I/O
        optimize: true,
      });

      // Configure connection
      db.pragma("foreign_keys = ON");
      db.pragma("journal_mode = WAL");
      db.pragma("synchronous = NORMAL");
      db.pragma("cache_size = -64000");
      db.pragma("temp_store = MEMORY");
      db.pragma("mmap_size = 134217728");

      this.connections.push(db);
      this.available.push(db);
    }

    // Start health monitoring
    this.startHealthMonitoring();
    this.initialized = true;
  }

  getConnection() {
    if (!this.initialized) {
      throw new Error("Database pool not initialized");
    }

    if (this.available.length === 0) {
      // Pool exhausted, wait or create new connection
      console.warn("Database pool exhausted, creating temporary connection");
      return this.createTemporaryConnection();
    }

    const connection = this.available.pop();
    this.busy.add(connection);
    return connection;
  }

  releaseConnection(connection) {
    if (this.busy.has(connection)) {
      this.busy.delete(connection);
      this.available.push(connection);
    }
  }

  createTemporaryConnection() {
    const dbPath = "./database.sqlite";
    return new Database(dbPath, {
      verbose: process.env.DB_VERBOSE ? console.log : null,
      page_size: 4096,
      cache_size: -16000, // Smaller cache for temp connections
      synchronous: "NORMAL",
      journal_mode: "WAL",
    });
  }

  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, 30000); // Check every 30 seconds
  }

  healthCheck() {
    const deadConnections = [];

    for (const connection of this.connections) {
      try {
        connection.prepare("SELECT 1").get();
      } catch (error) {
        console.error("Dead connection detected:", error.message);
        deadConnections.push(connection);
      }
    }

    // Remove dead connections
    deadConnections.forEach((conn) => {
      const index = this.connections.indexOf(conn);
      if (index > -1) {
        this.connections.splice(index, 1);
      }

      const availIndex = this.available.indexOf(conn);
      if (availIndex > -1) {
        this.available.splice(availIndex, 1);
      }

      this.busy.delete(conn);
      conn.close();
    });

    // Replenish pool if needed
    while (this.connections.length < this.poolSize) {
      const newConn = this.createTemporaryConnection();
      this.connections.push(newConn);
      this.available.push(newConn);
    }
  }

  async close() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const connection of this.connections) {
      try {
        connection.close();
      } catch (error) {
        console.error("Error closing connection:", error.message);
      }
    }

    this.connections = [];
    this.available = [];
    this.busy.clear();
    this.initialized = false;
  }
}

// Optimized Database Manager
class OptimizedDatabase {
  constructor() {
    this.pool = new DatabasePool();
    this.preparedStatements = new Map();
    this.batchSize = 1000;
    this.initialized = false;
  }

  async init(dbPath = "./database.sqlite") {
    if (this.initialized) return;

    await this.pool.init(dbPath);
    await this.createOptimizedSchema();
    await this.createOptimizedIndexes();
    await this.prepareCommonStatements();

    this.initialized = true;
  }

  async createOptimizedSchema() {
    const connection = this.pool.getConnection();

    try {
      // Create tables with optimized structure
      connection.exec(`
                -- Users table with optimized indexes
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    phone TEXT UNIQUE NOT NULL,
                    phone_canonical TEXT UNIQUE NOT NULL,
                    phone_hash TEXT NOT NULL,
                    phone_last4 TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('organisation', 'professional')),
                    orgId TEXT,
                    onboardingCompleted INTEGER DEFAULT 0,
                    role_locked INTEGER DEFAULT 0,
                    createdAt INTEGER NOT NULL,
                    updatedAt INTEGER DEFAULT 0,
                    lastLoginAt INTEGER DEFAULT 0,
                    isActive INTEGER DEFAULT 1
                );

                -- VPI table with trust scoring
                CREATE TABLE IF NOT EXISTS vpi (
                    vpiId TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    trustScore INTEGER DEFAULT 0,
                    level INTEGER DEFAULT 1,
                    createdAt INTEGER NOT NULL,
                    lastActivityAt INTEGER DEFAULT 0,
                    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
                );

                -- TOTP secrets with enhanced security
                CREATE TABLE IF NOT EXISTS totp_secrets (
                    userId TEXT PRIMARY KEY,
                    secret_enc BLOB NOT NULL,
                    iv BLOB NOT NULL,
                    tag BLOB NOT NULL,
                    salt BLOB NOT NULL,
                    active INTEGER DEFAULT 0,
                    createdAt INTEGER NOT NULL,
                    lastUsedAt INTEGER DEFAULT 0,
                    attemptCount INTEGER DEFAULT 0,
                    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
                );

                -- Organizations with enhanced metadata
                CREATE TABLE IF NOT EXISTS orgs (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    ownerUserId TEXT NOT NULL,
                    createdAt INTEGER NOT NULL,
                    isActive INTEGER DEFAULT 1,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (ownerUserId) REFERENCES users (id) ON DELETE CASCADE
                );

                -- Ledger entries with optimized structure
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
                    updatedAt INTEGER DEFAULT 0,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (from_vpi) REFERENCES vpi (vpiId),
                    FOREIGN KEY (to_vpi) REFERENCES vpi (vpiId)
                );

                -- LOI with enhanced tracking
                CREATE TABLE IF NOT EXISTS loi (
                    id TEXT PRIMARY KEY,
                    partyA_vpi TEXT NOT NULL,
                    partyB_vpi TEXT NOT NULL,
                    terms_json TEXT NOT NULL,
                    lang TEXT NOT NULL,
                    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'signedA', 'active', 'expired')),
                    hash TEXT NOT NULL,
                    createdAt INTEGER NOT NULL,
                    expiresAt INTEGER,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (partyA_vpi) REFERENCES vpi (vpiId),
                    FOREIGN KEY (partyB_vpi) REFERENCES vpi (vpiId)
                );

                -- LOI signatures with audit trail
                CREATE TABLE IF NOT EXISTS loi_signatures (
                    id TEXT PRIMARY KEY,
                    loiId TEXT NOT NULL,
                    signer_vpi TEXT NOT NULL,
                    signedAt INTEGER NOT NULL,
                    signature_hash TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    FOREIGN KEY (loiId) REFERENCES loi (id) ON DELETE CASCADE,
                    FOREIGN KEY (signer_vpi) REFERENCES vpi (vpiId)
                );

                -- Attendance with geolocation optimization
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
                    accuracy REAL,
                    address TEXT,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (worker_vpi) REFERENCES vpi (vpiId),
                    FOREIGN KEY (supervisor_vpi) REFERENCES vpi (vpiId)
                );

                -- Approvals with enhanced workflow
                CREATE TABLE IF NOT EXISTS approvals (
                    id TEXT PRIMARY KEY,
                    kind TEXT NOT NULL,
                    refId TEXT NOT NULL,
                    initiator_vpi TEXT NOT NULL,
                    approver_vpi TEXT NOT NULL,
                    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    createdAt INTEGER NOT NULL,
                    decidedAt INTEGER,
                    reason TEXT,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (initiator_vpi) REFERENCES vpi (vpiId),
                    FOREIGN KEY (approver_vpi) REFERENCES vpi (vpiId)
                );

                -- Trust events with scoring
                CREATE TABLE IF NOT EXISTS trust_events (
                    id TEXT PRIMARY KEY,
                    vpiId TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    weight INTEGER NOT NULL,
                    ts INTEGER NOT NULL,
                    metadata TEXT DEFAULT '{}',
                    FOREIGN KEY (vpiId) REFERENCES vpi (vpiId)
                );

                -- Pin codes with spatial indexing
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

                -- Embeddings with optimized storage
                CREATE TABLE IF NOT EXISTS embeddings (
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    vector_json TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER DEFAULT 0,
                    metadata TEXT DEFAULT '{}',
                    PRIMARY KEY (entity_type, entity_id)
                );

                -- Role change requests
                CREATE TABLE IF NOT EXISTS role_change_requests (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    currentRole TEXT NOT NULL,
                    requestedRole TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                    createdAt INTEGER NOT NULL,
                    reviewedAt INTEGER,
                    reviewedBy TEXT,
                    reviewNotes TEXT,
                    FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
                );
            `);
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  async createOptimizedIndexes() {
    const connection = this.pool.getConnection();

    try {
      // Add missing columns if they don't exist (safe approach)
      const addColumnIfNotExists = (table, column, definition) => {
        try {
          connection.exec(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
          );
        } catch (error) {
          if (!error.message.includes("duplicate column name")) {
            console.warn(
              `Could not add column ${column} to ${table}:`,
              error.message,
            );
          }
        }
      };

      // Add missing columns to existing tables
      addColumnIfNotExists("users", "updatedAt", "INTEGER DEFAULT 0");
      addColumnIfNotExists("users", "lastLoginAt", "INTEGER DEFAULT 0");
      addColumnIfNotExists("users", "isActive", "INTEGER DEFAULT 1");

      addColumnIfNotExists("vpi", "createdAt", "INTEGER DEFAULT 0");
      addColumnIfNotExists("vpi", "lastActivityAt", "INTEGER DEFAULT 0");

      addColumnIfNotExists("totp_secrets", "salt", "BLOB DEFAULT NULL");
      addColumnIfNotExists("totp_secrets", "lastUsedAt", "INTEGER DEFAULT 0");
      addColumnIfNotExists("totp_secrets", "attemptCount", "INTEGER DEFAULT 0");

      addColumnIfNotExists("orgs", "createdAt", "INTEGER DEFAULT 0");
      addColumnIfNotExists("orgs", "isActive", "INTEGER DEFAULT 1");
      addColumnIfNotExists("orgs", "metadata", 'TEXT DEFAULT "{}"');

      addColumnIfNotExists("ledger_entries", "updatedAt", "INTEGER DEFAULT 0");
      addColumnIfNotExists("ledger_entries", "metadata", 'TEXT DEFAULT "{}"');

      addColumnIfNotExists("loi", "expiresAt", "INTEGER DEFAULT NULL");
      addColumnIfNotExists("loi", "metadata", 'TEXT DEFAULT "{}"');

      addColumnIfNotExists("loi_signatures", "ip_address", "TEXT DEFAULT NULL");
      addColumnIfNotExists("loi_signatures", "user_agent", "TEXT DEFAULT NULL");

      addColumnIfNotExists("attendance", "accuracy", "REAL DEFAULT NULL");
      addColumnIfNotExists("attendance", "address", "TEXT DEFAULT NULL");
      addColumnIfNotExists("attendance", "metadata", 'TEXT DEFAULT "{}"');

      addColumnIfNotExists("approvals", "reason", "TEXT DEFAULT NULL");
      addColumnIfNotExists("approvals", "metadata", 'TEXT DEFAULT "{}"');

      addColumnIfNotExists("trust_events", "metadata", 'TEXT DEFAULT "{}"');

      addColumnIfNotExists("embeddings", "updated_at", "INTEGER DEFAULT 0");
      addColumnIfNotExists("embeddings", "metadata", 'TEXT DEFAULT "{}"');

      connection.exec(`
                -- Optimized indexes for common queries
                CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
                CREATE INDEX IF NOT EXISTS idx_users_phone_canonical ON users(phone_canonical);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
                CREATE INDEX IF NOT EXISTS idx_users_active ON users(isActive);
                CREATE INDEX IF NOT EXISTS idx_users_created ON users(createdAt);
                
                CREATE INDEX IF NOT EXISTS idx_vpi_userId ON vpi(userId);
                CREATE INDEX IF NOT EXISTS idx_vpi_trust ON vpi(trustScore);
                CREATE INDEX IF NOT EXISTS idx_vpi_active ON vpi(lastActivityAt);
                
                CREATE INDEX IF NOT EXISTS idx_totp_active ON totp_secrets(active);
                CREATE INDEX IF NOT EXISTS idx_totp_attempts ON totp_secrets(attemptCount);
                
                CREATE INDEX IF NOT EXISTS idx_ledger_from_vpi ON ledger_entries(from_vpi);
                CREATE INDEX IF NOT EXISTS idx_ledger_to_vpi ON ledger_entries(to_vpi);
                CREATE INDEX IF NOT EXISTS idx_ledger_status ON ledger_entries(status);
                CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_entries(createdAt);
                CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(type);
                
                CREATE INDEX IF NOT EXISTS idx_loi_partyA ON loi(partyA_vpi);
                CREATE INDEX IF NOT EXISTS idx_loi_partyB ON loi(partyB_vpi);
                CREATE INDEX IF NOT EXISTS idx_loi_status ON loi(status);
                CREATE INDEX IF NOT EXISTS idx_loi_created ON loi(createdAt);
                CREATE INDEX IF NOT EXISTS idx_loi_expires ON loi(expiresAt);
                
                CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance(worker_vpi);
                CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance(orgId);
                CREATE INDEX IF NOT EXISTS idx_attendance_ts ON attendance(ts);
                CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(type);
                CREATE INDEX IF NOT EXISTS idx_attendance_geo ON attendance(lat, lng);
                
                CREATE INDEX IF NOT EXISTS idx_trust_vpiId ON trust_events(vpiId);
                CREATE INDEX IF NOT EXISTS idx_trust_kind ON trust_events(kind);
                CREATE INDEX IF NOT EXISTS idx_trust_ts ON trust_events(ts);
                
                CREATE INDEX IF NOT EXISTS idx_pin_codes_pincode ON pin_codes(pincode);
                CREATE INDEX IF NOT EXISTS idx_pin_codes_geo ON pin_codes(lat, lng);
                CREATE INDEX IF NOT EXISTS idx_pin_codes_state ON pin_codes(state);
                
                CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(entity_type);
                CREATE INDEX IF NOT EXISTS idx_embeddings_created ON embeddings(created_at);
                
                CREATE INDEX IF NOT EXISTS idx_role_change_user ON role_change_requests(userId);
                CREATE INDEX IF NOT EXISTS idx_role_change_status ON role_change_requests(status);
                CREATE INDEX IF NOT EXISTS idx_role_change_created ON role_change_requests(createdAt);
            `);
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  async prepareCommonStatements() {
    const connection = this.pool.getConnection();

    try {
      // Prepare frequently used statements
      const statements = {
        getUserByPhone: "SELECT * FROM users WHERE phone_canonical = ?",
        getUserById: "SELECT * FROM users WHERE id = ?",
        getVpiByUserId: "SELECT * FROM vpi WHERE userId = ?",
        getTotpSecret:
          "SELECT * FROM totp_secrets WHERE userId = ? AND active = 1",
        updateUserLastLogin: "UPDATE users SET lastLoginAt = ? WHERE id = ?",
        getLedgerEntries:
          "SELECT * FROM ledger_entries WHERE from_vpi = ? OR to_vpi = ? ORDER BY createdAt DESC LIMIT ?",
        getAttendanceByWorker:
          "SELECT * FROM attendance WHERE worker_vpi = ? ORDER BY ts DESC LIMIT ?",
        getTrustEvents:
          "SELECT * FROM trust_events WHERE vpiId = ? ORDER BY ts DESC LIMIT ?",
        getRoleChangeRequests:
          "SELECT * FROM role_change_requests WHERE status = ? ORDER BY createdAt DESC LIMIT ?",
      };

      for (const [name, sql] of Object.entries(statements)) {
        this.preparedStatements.set(name, connection.prepare(sql));
      }
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  // Optimized query methods
  async query(sql, params = []) {
    const connection = this.pool.getConnection();
    try {
      return connection.prepare(sql).all(params);
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  async get(sql, params = []) {
    const connection = this.pool.getConnection();
    try {
      return connection.prepare(sql).get(params);
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  async run(sql, params = []) {
    const connection = this.pool.getConnection();
    try {
      return connection.prepare(sql).run(params);
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  // Batch operations for better performance
  async batchInsert(table, records) {
    if (records.length === 0) return;

    const connection = this.pool.getConnection();
    try {
      const transaction = connection.transaction((records) => {
        const stmt = connection.prepare(
          `INSERT INTO ${table} VALUES (${"?,".repeat(Object.keys(records[0]).length - 1)}?)`,
        );
        for (const record of records) {
          stmt.run(Object.values(record));
        }
      });

      transaction(records);
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  // Transaction wrapper
  async transaction(callback) {
    const connection = this.pool.getConnection();
    try {
      const transaction = connection.transaction(callback);
      return transaction();
    } finally {
      this.pool.releaseConnection(connection);
    }
  }

  async close() {
    await this.pool.close();
  }
}

// Export singleton instance
const db = new OptimizedDatabase();

// Backward compatibility methods
db.run = (sql, params) => db.run(sql, params);
db.get = (sql, params) => db.get(sql, params);
db.all = (sql, params) => db.query(sql, params);
db.tx = (callback) => db.transaction(callback);

module.exports = { db, OptimizedDatabase, DatabasePool };
