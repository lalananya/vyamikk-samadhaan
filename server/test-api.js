const { generateCode } = require("./totp");

const PORT = process.env.PORT || 4000;
const BASE_URL = `http://localhost:${PORT}`;

async function testAPI() {
  console.log("🧪 Testing Vyaamik Samadhaan API...\n");

  try {
    // Test 1: Health check
    console.log("1️⃣ Testing health check...");
    const healthRes = await fetch(`${BASE_URL}/`);
    const healthData = await healthRes.json();

    if (!healthData.ok) {
      throw new Error("Health check failed");
    }
    console.log("✅ Health check passed\n");

    // Test 2: Signup
    console.log("2️⃣ Testing signup...");
    const signupRes = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "9990001111",
        role: "employer",
      }),
    });

    const signupData = await signupRes.json();
    if (!signupData.ok) {
      throw new Error(`Signup failed: ${signupData.error}`);
    }

    if (!signupData.needsTotpVerify || !signupData.provisioning?.secret) {
      throw new Error("Signup response missing TOTP verification data");
    }

    console.log("✅ Signup passed");
    console.log(`   VPI ID: ${signupData.vpiId}`);
    console.log(`   TOTP Secret: ${signupData.provisioning.secret}\n`);

    // Test 3: TOTP verification
    console.log("3️⃣ Testing TOTP verification...");
    const totpCode = generateCode(signupData.provisioning.secret);
    console.log(`   Generated TOTP code: ${totpCode}`);

    const totpRes = await fetch(`${BASE_URL}/totp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "9990001111",
        code: totpCode,
      }),
    });

    const totpData = await totpRes.json();
    if (!totpData.ok) {
      throw new Error(`TOTP verification failed: ${totpData.error}`);
    }

    console.log("✅ TOTP verification passed\n");

    // Test 4: Login
    console.log("4️⃣ Testing login...");
    const loginCode = generateCode(signupData.provisioning.secret);
    console.log(`   Generated login TOTP code: ${loginCode}`);

    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "9990001111",
        totpCode: loginCode,
      }),
    });

    const loginData = await loginRes.json();
    if (!loginData.ok) {
      throw new Error(`Login failed: ${loginData.error}`);
    }

    if (!loginData.token) {
      throw new Error("Login response missing token");
    }

    console.log("✅ Login passed");
    console.log(`   Token: ${loginData.token.substring(0, 20)}...\n`);

    // Test 5: Get profile
    console.log("5️⃣ Testing get profile...");
    const profileRes = await fetch(`${BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    });

    const profileData = await profileRes.json();
    if (!profileData.ok) {
      throw new Error(`Get profile failed: ${profileData.error}`);
    }

    console.log("✅ Get profile passed");
    console.log(`   Phone: ${profileData.phone}`);
    console.log(`   VPI ID: ${profileData.vpiId}`);
    console.log(`   Role: ${profileData.role}`);
    console.log(`   Trust Score: ${profileData.trustScore}\n`);

    // Test 6: Create ledger entry
    console.log("6️⃣ Testing create ledger entry...");
    const ledgerRes = await fetch(`${BASE_URL}/ledger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        to_vpi: signupData.vpiId, // Self transaction for testing
        type: "payment",
        amount: 1000,
        note: "Test payment",
      }),
    });

    const ledgerData = await ledgerRes.json();
    if (!ledgerData.ok) {
      throw new Error(`Create ledger failed: ${ledgerData.error}`);
    }

    console.log("✅ Create ledger entry passed");
    console.log(`   Entry ID: ${ledgerData.id}\n`);

    // Test 7: Acknowledge ledger entry
    console.log("7️⃣ Testing acknowledge ledger entry...");
    const ackCode = generateCode(signupData.provisioning.secret);
    console.log(`   Generated ack TOTP code: ${ackCode}`);

    const ackRes = await fetch(`${BASE_URL}/ledger/${ledgerData.id}/ack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        totpCode: ackCode,
      }),
    });

    const ackData = await ackRes.json();
    if (!ackData.ok) {
      throw new Error(`Acknowledge ledger failed: ${ackData.error}`);
    }

    console.log("✅ Acknowledge ledger entry passed\n");

    // Test 8: Get ledger entries
    console.log("8️⃣ Testing get ledger entries...");
    const getLedgerRes = await fetch(`${BASE_URL}/ledger`, {
      headers: {
        Authorization: `Bearer ${loginData.token}`,
      },
    });

    const getLedgerData = await getLedgerRes.json();
    if (!getLedgerData.ok) {
      throw new Error(`Get ledger failed: ${getLedgerData.error}`);
    }

    console.log("✅ Get ledger entries passed");
    console.log(`   Found ${getLedgerData.entries.length} entries\n`);

    // Test 9: Create LOI
    console.log("9️⃣ Testing create LOI...");
    const loiRes = await fetch(`${BASE_URL}/loi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        partyB_vpi: signupData.vpiId, // Self LOI for testing
        terms: {
          en: {
            "Work Description": "Test work",
            Duration: "1 day",
            Payment: "1000 INR",
          },
          local: {
            "कार्य विवरण": "परीक्षण कार्य",
            अवधि: "1 दिन",
            भुगतान: "1000 रुपये",
          },
        },
        lang: "hi",
      }),
    });

    const loiData = await loiRes.json();
    if (!loiData.ok) {
      throw new Error(`Create LOI failed: ${loiData.error}`);
    }

    console.log("✅ Create LOI passed");
    console.log(`   LOI ID: ${loiData.id}\n`);

    // Test 10: Self punch attendance
    console.log("🔟 Testing self punch attendance...");
    const punchRes = await fetch(`${BASE_URL}/attendance/punch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.token}`,
      },
      body: JSON.stringify({
        type: "in",
        lat: 28.6139,
        lng: 77.209,
        ts: Date.now(),
      }),
    });

    const punchData = await punchRes.json();
    if (!punchData.ok) {
      throw new Error(`Punch attendance failed: ${punchData.error}`);
    }

    console.log("✅ Self punch attendance passed");
    console.log(`   Punch ID: ${punchData.id}`);
    console.log(`   Method: ${punchData.method}\n`);

    console.log("🎉 All tests passed! API is working correctly.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run tests
testAPI();
