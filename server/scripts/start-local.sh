#!/usr/bin/env bash
set -euo pipefail
ROOT="${VSAM_ROOT:-$HOME/vyamikk-samadhaan}"
SRV="$ROOT/server"
LOGF="/tmp/vsam-api.log"

echo "→ Kill strays on :4000"
(lsof -ti tcp:4000 | xargs -r kill -9) || true
pkill -f "node .*debug-startup\.js" 2>/dev/null || true
pkill -f "node .*test-server\.js"   2>/dev/null || true
pkill -f "ts-node|nest|node.*watch" 2>/dev/null || true

cd "$SRV"

echo "→ Ensure .env (DEV)"
if [ ! -f .env ]; then
  cat > .env <<'EONV'
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:@localhost:5432/vsamadhaan?schema=public
JWT_ACCESS_SECRET=dev_access_change_me
JWT_REFRESH_SECRET=dev_refresh_change_me
ALLOW_DEBUG_OTP=true
CORS_ORIGINS=http://localhost:19006,http://127.0.0.1:19006,exp://
EONV
fi

echo "→ Ensure DB & migrations"
createdb vsamadhaan 2>/dev/null || true
rm -rf node_modules dist >/dev/null 2>&1 || true
npm ci
npx prisma generate
npx prisma migrate dev

echo "→ Build"
npm run build

echo "→ Start compiled → $LOGF"
( node dist/main.js >"$LOGF" 2>&1 & echo $! > /tmp/vsam-api.pid )
sleep 1

echo "→ Probe health (20s timeout)"
PREFIX=""
for i in $(seq 1 20); do
  curl -fsS "http://localhost:4000/healthz" >/dev/null && { PREFIX=""; break; }
  curl -fsS "http://localhost:4000/api/v1/healthz" >/dev/null && { PREFIX="/api/v1"; break; }
  sleep 1
done

if [ -z "$PREFIX" ]; then
  echo "✗ API not up. Last logs:"; tail -n 120 "$LOGF"; exit 1
fi

# Detect LAN IP (macOS common ifaces)
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ipconfig getifaddr en2 2>/dev/null || echo localhost)"
API_BASE="http://$IP:4000$PREFIX"
echo "✓ API UP. Use this in the app:"
echo "API_BASE=$API_BASE"

echo "→ Tail last 40 lines of API logs:"
tail -n 40 "$LOGF" || true
