# UEID System, Directory API, and Chat Implementation

## Overview
Implemented three major features:
1. **UEID System** - VS-XXXX-XXXX-XXXX format with Crockford Base32
2. **Directory API** - Profile lookup for payments and mentions  
3. **Chat System** - Real-time DM with @mentions

## Key Files Added
- `src/lib/ueid.ts` - TypeScript UEID library
- `server/lib/ueid.js` - JavaScript UEID library
- `server/routes/directory.js` - Directory API endpoints
- `server/routes/chat.js` - Chat API endpoints
- `server/realtime/socket.js` - Socket.IO integration
- `app/chat.tsx` - React Native chat interface

## Database Changes
- Added `ecosystem_id` column to users table
- Created `connections` table for DM relationships
- Created `messages` table for chat storage
- Added proper indexes and constraints

## API Endpoints

### Directory
- `GET /api/v1/directory/resolve?ueid=VS-XXXX-XXXX-XXXX` - Resolve UEID
- `GET /api/v1/directory/connections` - List connections for mentions

### Chat  
- `POST /api/v1/chat/dm` - Send direct message
- `GET /api/v1/chat/history?peer=VS-XXXX-XXXX-XXXX` - Get chat history
- `GET /api/v1/chat/unread` - Get unread count

## Run Instructions

### 1. Install Dependencies
```bash
cd server && npm install socket.io
```

### 2. Run Migrations
```bash
cd server
node -e "const { db } = require('./db'); const fs = require('fs'); const sql = fs.readFileSync('./migrations/001_add_ueid_system.sql', 'utf8'); db.exec(sql);"
node migrations/002_backfill_ueid_simple.js
node -e "const { db } = require('./db'); db.exec('CREATE UNIQUE INDEX idx_users_ecosystem_id_unique ON users(ecosystem_id);');"
```

### 3. Start Server
```bash
cd server && node index.js
```

## cURL Tests

### Get Token
```bash
curl -X POST "http://localhost:4001/api/v1/auth/simple-login" \
  -H "Content-Type: application/json" \
  -d '{"phone": "9654604148", "otp": "123456"}'
```

### Test Directory Resolve
```bash
curl -X GET "http://localhost:4001/api/v1/directory/resolve?ueid=VS-XBSF-6JVC-1MA2" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Chat DM
```bash
curl -X POST "http://localhost:4001/api/v1/chat/dm" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "VS-XBSF-6JVC-1MA2", "text": "Hello!"}'
```

## Features Implemented
- ✅ UEID generation with Luhn checksum validation
- ✅ Directory resolution with minimal profile data
- ✅ Connection-based DM access control
- ✅ Real-time Socket.IO messaging
- ✅ Rate limiting and input sanitization
- ✅ Database migrations and backfill
- ✅ React Native chat interface