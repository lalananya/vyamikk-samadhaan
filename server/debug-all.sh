#!/bin/bash
# Comprehensive Vyaamikk Samadhaan Backend Debug Script
# Handles server startup, DB setup, connectivity, and login testing

set -e  # Exit on any error

echo "🚀 Vyaamikk Samadhaan Backend Debug Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Environment Setup
print_status "Setting up environment..."

# Ensure we're in the server directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "Not in server directory. Please run from /path/to/vyamikk-samadhaan/server"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
if [ "$NODE_VERSION" = "not found" ]; then
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi
print_success "Node.js version: $NODE_VERSION"

# Step 2: Kill existing processes
print_status "Cleaning up existing processes..."

# Kill processes on port 4000
if lsof -ti:4000 >/dev/null 2>&1; then
    print_warning "Killing processes on port 4000..."
    lsof -ti:4000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Kill any remaining Node/Nest processes
pkill -f "nest start" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true
pkill -f "node.*watch" 2>/dev/null || true
sleep 1

print_success "Process cleanup completed"

# Step 3: Create minimal .env file
print_status "Setting up environment file..."

cat > .env << 'EOF'
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:@localhost:5432/vsamadhaan?schema=public
JWT_ACCESS_SECRET=dev_access_change_me_in_production
JWT_REFRESH_SECRET=dev_refresh_change_me_in_production
ALLOW_DEBUG_OTP=true
CORS_ORIGINS=http://localhost:19006,http://127.0.0.1:19006,exp://192.168.29.242:8081
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=debug
EOF

print_success "Environment file created"

# Step 4: Database setup (optional, skip if fails)
print_status "Setting up database..."

# Try to start PostgreSQL (Homebrew)
if command -v brew >/dev/null 2>&1; then
    print_status "Attempting to start PostgreSQL via Homebrew..."
    brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || true
    sleep 3
fi

# Try to create database (skip if fails)
if command -v createdb >/dev/null 2>&1; then
    print_status "Creating database..."
    createdb vsamadhaan 2>/dev/null || print_warning "Database creation failed (may already exist)"
else
    print_warning "PostgreSQL tools not found. Skipping database setup."
fi

# Step 5: Install dependencies and build
print_status "Installing dependencies..."

if [ ! -d "node_modules" ]; then
    npm ci
else
    print_status "Dependencies already installed"
fi

# Build the project
print_status "Building project..."
npm run build || {
    print_error "Build failed. Trying to continue..."
}

# Step 6: Prisma setup (skip if fails)
print_status "Setting up Prisma..."

if command -v npx >/dev/null 2>&1; then
    npx prisma generate 2>/dev/null || print_warning "Prisma generate failed"
    npx prisma migrate dev --name init 2>/dev/null || print_warning "Prisma migrate failed (DB may not be available)"
else
    print_warning "npx not found. Skipping Prisma setup."
fi

# Step 7: Start server in background
print_status "Starting NestJS server..."

# Start server with timeout
timeout 30s npm run start:dev > server.log 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    print_success "Server started with PID: $SERVER_PID"
else
    print_error "Server failed to start. Check server.log for details:"
    cat server.log 2>/dev/null || echo "No log file found"
    exit 1
fi

# Step 8: Test connectivity
print_status "Testing server connectivity..."

# Wait for server to be ready
for i in {1..10}; do
    if curl -s http://localhost:4000/healthz >/dev/null 2>&1; then
        print_success "Server is responding on /healthz"
        break
    elif curl -s http://localhost:4000/api/v1/healthz >/dev/null 2>&1; then
        print_success "Server is responding on /api/v1/healthz"
        break
    else
        print_status "Waiting for server... ($i/10)"
        sleep 2
    fi
done

# Test both endpoints
print_status "Testing endpoints..."

if curl -s http://localhost:4000/healthz >/dev/null 2>&1; then
    print_success "✅ /healthz endpoint working"
    API_BASE="http://localhost:4000"
elif curl -s http://localhost:4000/api/v1/healthz >/dev/null 2>&1; then
    print_success "✅ /api/v1/healthz endpoint working"
    API_BASE="http://localhost:4000/api/v1"
else
    print_error "❌ No health endpoints responding"
    print_status "Server log:"
    tail -20 server.log 2>/dev/null || echo "No log available"
    exit 1
fi

# Step 9: Test login flow
print_status "Testing login flow..."

# Create test script
cat > test-login.mjs << 'EOF'
const baseUrl = process.argv[1] || 'http://localhost:4000/api/v1';

async function testLogin() {
    try {
        console.log('🔐 Testing login flow...');
        
        // Test login
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '+919876543210' })
        });
        
        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status}`);
        }
        
        const loginData = await loginRes.json();
        console.log('✅ Login successful:', loginData);
        
        // Test debug OTP
        const otpRes = await fetch(`${baseUrl}/__debug/otp/+919876543210`);
        const otpData = await otpRes.json();
        console.log('✅ Debug OTP:', otpData);
        
        // Test verify
        const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                otpToken: loginData.otpToken,
                code: otpData.code || '123456',
                device: { model: 'Test', platform: 'test', appVersion: '1.0.0' }
            })
        });
        
        if (!verifyRes.ok) {
            throw new Error(`Verify failed: ${verifyRes.status}`);
        }
        
        const verifyData = await verifyRes.json();
        console.log('✅ Verify successful:', verifyData);
        
        console.log('🎉 All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testLogin();
EOF

# Run the test
node test-login.mjs "$API_BASE" || {
    print_error "Login test failed"
    print_status "Server log:"
    tail -10 server.log 2>/dev/null || echo "No log available"
}

# Step 10: Final status
print_status "Final status check..."

echo ""
echo "🎯 BACKEND STATUS:"
echo "=================="
echo "✅ Server running on: $API_BASE"
echo "✅ Process ID: $SERVER_PID"
echo "✅ Log file: server.log"
echo ""
echo "🔧 FRONTEND CONFIG:"
echo "==================="
echo "Set your API_BASE to: $API_BASE"
echo ""
echo "📱 TESTING:"
echo "==========="
echo "curl $API_BASE/healthz"
echo "curl $API_BASE/__debug/otp/+919876543210"
echo ""
echo "🛑 TO STOP SERVER:"
echo "=================="
echo "kill $SERVER_PID"
echo ""

print_success "Debug script completed successfully!"
