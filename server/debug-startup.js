#!/usr/bin/env node
// Debug script for NestJS startup issues

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 NestJS Startup Debugger");
console.log("==========================");

// Check if we're in the right directory
console.log("\n1. Directory Check:");
console.log(`   Current: ${process.cwd()}`);
console.log(`   package.json exists: ${fs.existsSync("package.json")}`);
console.log(`   src/ exists: ${fs.existsSync("src")}`);

// Check package.json scripts
console.log("\n2. Package Scripts:");
try {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  console.log(`   start:dev: ${pkg.scripts?.["start:dev"] || "NOT FOUND"}`);
  console.log(`   start:debug: ${pkg.scripts?.["start:debug"] || "NOT FOUND"}`);
} catch (e) {
  console.log(`   Error reading package.json: ${e.message}`);
}

// Check environment
console.log("\n3. Environment:");
console.log(`   NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);
console.log(`   PORT: ${process.env.PORT || "undefined"}`);

// Check .env file
console.log("\n4. Environment File:");
console.log(`   .env exists: ${fs.existsSync(".env")}`);
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  const hasDbUrl = envContent.includes("DATABASE_URL");
  console.log(`   Has DATABASE_URL: ${hasDbUrl}`);
}

// Check port availability
console.log("\n5. Port Check:");
const net = require("net");
const server = net.createServer();
server.listen(4000, () => {
  console.log("   Port 4000: AVAILABLE");
  server.close();
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log("   Port 4000: IN USE");
  } else {
    console.log(`   Port 4000: ERROR - ${err.message}`);
  }
});

// Check dependencies
console.log("\n6. Dependencies:");
const checkDep = (dep) => {
  try {
    require.resolve(dep);
    return "✓";
  } catch {
    return "✗";
  }
};

console.log(`   @nestjs/cli: ${checkDep("@nestjs/cli")}`);
console.log(`   @nestjs/core: ${checkDep("@nestjs/core")}`);
console.log(`   typescript: ${checkDep("typescript")}`);
console.log(`   ts-node: ${checkDep("ts-node")}`);

// Try to start with debug info
console.log("\n7. Starting NestJS with debug info...");
console.log("   Command: npm run start:dev");
console.log("   Press Ctrl+C to stop\n");

const child = spawn("npm", ["run", "start:dev"], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development", DEBUG: "*" },
});

child.on("error", (err) => {
  console.error(`\n❌ Failed to start: ${err.message}`);
});

child.on("exit", (code) => {
  console.log(`\n📊 Process exited with code: ${code}`);
});
