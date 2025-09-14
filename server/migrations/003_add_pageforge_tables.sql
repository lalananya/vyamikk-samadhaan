-- Migration: Add PageForge generated tables
-- Creates tables for all PageForge generated pages

-- Attendance table
CREATE TABLE IF NOT EXISTS punches (
    id TEXT PRIMARY KEY,
    ts TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_punches_ts ON punches(ts);
CREATE INDEX idx_punches_type ON punches(type);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    workers TEXT NOT NULL, -- JSON array of UEIDs
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_shifts_name ON shifts(name);

-- Payroll rows table
CREATE TABLE IF NOT EXISTS payroll_rows (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    hours REAL NOT NULL,
    ot_hours REAL NOT NULL,
    rate REAL NOT NULL,
    deductions REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_payroll_rows_user_id ON payroll_rows(user_id);

-- Outages table
CREATE TABLE IF NOT EXISTS outages (
    id TEXT PRIMARY KEY,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_outages_start ON outages(start);
CREATE INDEX idx_outages_end ON outages(end);
