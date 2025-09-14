// smoke.mjs
// End-to-end smoke test for Vyaamikk Samadhaan backend (no external deps).
// Usage:
//   node smoke.mjs http://localhost:4000/api/v1 +919876543210
// If no args given, defaults to http://localhost:4000/api/v1 and +919876543210

const baseUrl = process.argv[2] || "http://localhost:4000/api/v1";
const phone = process.argv[3] || "+919876543210";

// Node 18+ has fetch globally
const pretty = (obj) => JSON.stringify(obj, null, 2);

function assert(cond, msg) {
  if (!cond) {
    console.error("\n❌ " + msg);
    process.exit(1);
  }
}

async function main() {
  console.log("🏁 Smoke start =>", { baseUrl, phone });

  // 1) LOGIN → otpToken
  let res = await fetch(baseUrl + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  let body = await res.json().catch(() => ({}));
  console.log("\n➡️  POST /auth/login", res.status, pretty(body));
  assert(res.ok && body.otpToken, "login failed or otpToken missing");
  const otpToken = body.otpToken;

  // 2) DEV ONLY: read OTP from debug endpoint
  //    If ALLOW_DEBUG_OTP is false, this will 404/403. In that case,
  //    check your server logs or real SMS provider.
  res = await fetch(baseUrl + "/__debug/otp/" + encodeURIComponent(phone));
  let otpData = null;
  try {
    otpData = await res.json();
  } catch {}
  console.log("\nℹ️  GET /__debug/otp/:phone", res.status, pretty(otpData));
  const code = otpData?.code || process.env.TEST_OTP_CODE || null;
  assert(
    code,
    "Could not read OTP from debug endpoint. Enable ALLOW_DEBUG_OTP=true or set TEST_OTP_CODE env",
  );

  // 3) VERIFY → tokens
  res = await fetch(baseUrl + "/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      otpToken,
      code: String(code),
      device: {
        model: "OnePlus 12R",
        platform: "android",
        appVersion: "1.0.0",
      },
    }),
  });
  body = await res.json().catch(() => ({}));
  console.log("\n✅ POST /auth/verify", res.status, pretty(body));
  assert(
    res.ok && body.accessJwt && body.refreshJwt,
    "verify failed or tokens missing",
  );
  let access = body.accessJwt;
  let refresh = body.refreshJwt;

  // 4) ME
  res = await fetch(baseUrl + "/auth/me", {
    headers: { Authorization: "Bearer " + access },
  });
  body = await res.json().catch(() => ({}));
  console.log("\n👤 GET /auth/me", res.status, pretty(body));
  assert(res.ok && body.id, "/me failed");

  // 5) REFRESH
  res = await fetch(baseUrl + "/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshJwt: refresh }),
  });
  const refreshBody = await res.json().catch(() => ({}));
  console.log("\n🔄 POST /auth/refresh", res.status, pretty(refreshBody));
  assert(
    res.ok && refreshBody.accessJwt && refreshBody.refreshJwt,
    "refresh failed",
  );
  const oldRefresh = refresh;
  access = refreshBody.accessJwt;
  refresh = refreshBody.refreshJwt;

  // 6) LOGOUT (revoke current refresh)
  res = await fetch(baseUrl + "/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + access,
    },
    body: JSON.stringify({ refreshJwt: refresh }),
  });
  console.log("\n🚪 POST /auth/logout", res.status);
  assert(res.status === 204, "logout failed");

  // 7) Attempt reuse of revoked refresh (should 401/403)
  res = await fetch(baseUrl + "/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshJwt: refresh }),
  });
  console.log("\n🚫 POST /auth/refresh (reused revoked token)", res.status);
  assert(res.status >= 401 && res.status < 500, "refresh reuse should fail");

  console.log("\n🎉 Smoke test completed successfully.");
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
