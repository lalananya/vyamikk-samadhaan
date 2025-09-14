#!/usr/bin/env node

/**
 * Test login flow script
 * Verifies the complete authentication flow works
 */

const API_BASE = 'http://192.168.29.242:4001/api/v1';

async function testLogin() {
    try {
        console.log('🧪 Testing login flow...');

        // Step 1: Request OTP
        console.log('📱 Requesting OTP for +919654604148...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '+919654604148' })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login request failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        console.log('✅ OTP requested successfully');
        console.log('🎫 OTP Token:', loginData.otpToken);

        // Step 2: Verify OTP
        console.log('🔐 Verifying OTP 654321...');
        const verifyResponse = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                otpToken: loginData.otpToken,
                code: '654321'
            })
        });

        if (!verifyResponse.ok) {
            throw new Error(`OTP verification failed: ${verifyResponse.status}`);
        }

        const verifyData = await verifyResponse.json();
        console.log('✅ OTP verified successfully');
        console.log('🎫 Token received:', verifyData.accessJwt ? 'YES' : 'NO');

        // Step 3: Test /me endpoint
        console.log('👤 Testing /me endpoint...');
        const meResponse = await fetch(`${API_BASE}/me`, {
            headers: {
                'Authorization': `Bearer ${verifyData.accessJwt}`,
                'Content-Type': 'application/json'
            }
        });

        if (!meResponse.ok) {
            throw new Error(`/me request failed: ${meResponse.status}`);
        }

        const meData = await meResponse.json();
        console.log('✅ /me endpoint working');
        console.log('📊 User data:', JSON.stringify(meData, null, 2));

        console.log('🎉 All tests passed! Login flow is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testLogin();
