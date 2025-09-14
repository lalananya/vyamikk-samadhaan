-- Migration: Add UEID system
-- Adds ecosystem_id column and related indexes

-- Add ecosystem_id column to users table (without UNIQUE constraint first)
ALTER TABLE users ADD COLUMN ecosystem_id TEXT;

-- Add can_receive_payments column
ALTER TABLE users ADD COLUMN can_receive_payments BOOLEAN DEFAULT 0;

-- Create index on ecosystem_id for fast lookups
CREATE INDEX idx_users_ecosystem_id ON users(ecosystem_id);

-- Add UNIQUE constraint after backfill (will be done in migration 002)

-- Create connections table for DM relationships
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, peer_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (peer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on connections for fast lookups
CREATE INDEX idx_connections_user_peer ON connections(user_id, peer_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_created_at ON connections(created_at);

-- Create messages table for DM storage
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read_at TEXT,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes on messages for fast queries
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_read_at ON messages(read_at);
CREATE INDEX idx_messages_receiver_unread ON messages(receiver_id, read_at) WHERE read_at IS NULL;
