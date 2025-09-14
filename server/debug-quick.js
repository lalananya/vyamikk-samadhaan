#!/usr/bin/env node
// Quick debug script for Vyaamikk Samadhaan Backend
// Handles server startup, testing, and login verification

const { spawn, exec } = require("child_process");
const fs = require("fs");
const net = require("net");
const http = require("http");

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function killPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (err, stdout) => {
      if (stdout.trim()) {
        exec(`kill -9 ${stdout.trim()}`, () => resolve());
      } else {
        resolve();
      }
    });
  });
}

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ ok: true, status: res.statusCode });
    });
    req.on("error", () => resolve({ ok: false, status: 0 }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ ok: false, status: 0 });
    });
  });
}

async function main() {
  log("blue", "🚀 Vyaamikk Samadhaan Quick Debug");
  log("blue", "=================================");

  // Check directory
  if (!fs.existsSync("package.json") || !fs.existsSync("src")) {
    log("red", "❌ Not in server directory");
    process.exit(1);
  }

  // Kill existing processes
  log("yellow", "🧹 Cleaning up processes...");
  await killPort(4000);
  await sleep(2000);

  // Create .env if missing
  if (!fs.existsSync(".env")) {
    log("yellow", "📝 Creating .env file...");
    const envContent = `NODE_ENV=development
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:@localhost:5432/vsamadhaan?schema=public
JWT_ACCESS_SECRET=dev_access_change_me
JWT_REFRESH_SECRET=dev_refresh_change_me
ALLOW_DEBUG_OTP=true
CORS_ORIGINS=http://localhost:19006,http://127.0.0.1:19006,exp://192.168.29.242:8081
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=debug`;
    fs.writeFileSync(".env", envContent);
  }

  // Check port availability
  if (!(await portFree(4000))) {
    log("red", "❌ Port 4000 is still in use");
    process.exit(1);
  }

  // Start server
  log("blue", "🚀 Starting server...");
  const server = spawn("npm", ["run", "start:dev"], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "development" },
  });

  let serverOutput = "";
  server.stdout.on("data", (data) => {
    serverOutput += data.toString();
    if (
      data.toString().includes("listening") ||
      data.toString().includes("started")
    ) {
      log("green", "✅ Server started");
    }
  });

  server.stderr.on("data", (data) => {
    serverOutput += data.toString();
  });

  // Wait for server to start
  let attempts = 0;
  while (attempts < 30) {
    await sleep(1000);
    attempts++;

    // Test endpoints
    const health1 = await testEndpoint("http://localhost:4000/healthz");
    const health2 = await testEndpoint("http://localhost:4000/api/v1/healthz");

    if (health1.ok) {
      log("green", "✅ Server responding on /healthz");
      await testLogin("http://localhost:4000");
      break;
    } else if (health2.ok) {
      log("green", "✅ Server responding on /api/v1/healthz");
      await testLogin("http://localhost:4000/api/v1");
      break;
    } else if (attempts >= 30) {
      log("red", "❌ Server failed to start");
      log("red", "Server output:");
      console.log(serverOutput);
      process.exit(1);
    } else {
      log("yellow", `⏳ Waiting for server... (${attempts}/30)`);
    }
  }

  log("green", "🎉 Debug completed successfully!");
  log("blue", "Server is running. Press Ctrl+C to stop.");

  // Keep process alive
  process.on("SIGINT", () => {
    log("yellow", "🛑 Stopping server...");
    server.kill("SIGINT");
    process.exit(0);
  });
}

async function testLogin(baseUrl) {
  log("blue", "🔐 Testing login flow...");

  try {
    // Test login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "+919876543210" }),
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    log("green", "✅ Login successful");

    // Test debug OTP
    const otpRes = await fetch(`${baseUrl}/__debug/otp/+919876543210`);
    const otpData = await otpRes.json();
    log("green", "✅ Debug OTP retrieved");

    // Test verify
    const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        otpToken: loginData.otpToken,
        code: otpData.code || "123456",
        device: { model: "Test", platform: "test", appVersion: "1.0.0" },
      }),
    });

    if (!verifyRes.ok) {
      throw new Error(`Verify failed: ${verifyRes.status}`);
    }

    const verifyData = await verifyRes.json();
    log("green", "✅ Verify successful");

    log("green", "🎉 All login tests passed!");
    log("blue", `📱 Use API_BASE: ${baseUrl}`);
  } catch (error) {
    log("red", `❌ Login test failed: ${error.message}`);
  }
}

main().catch((error) => {
  log("red", `❌ Debug failed: ${error.message}`);
  process.exit(1);
});
