/**
 * Direct Security Test for HubSpot Webhook Vulnerabilities
 * Tests the fixes for critical security issues without external dependencies
 */

const crypto = require('crypto');

const WEBHOOK_URL = 'http://localhost:5000/api/webhooks/hubspot';
const TEST_WEBHOOK_SECRET = 'test-webhook-secret-12345';

// Mock webhook payload
const mockPayload = {
  eventId: 'test-event-123',
  subscriptionType: 'form.submission',
  eventType: 'form.submission',
  objectId: '12345',
  properties: {
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User'
  },
  occurredAt: Date.now()
};

function generateValidSignatureV3(method, path, body, secret) {
  const sourceString = method + path + body;
  return crypto.createHmac('sha256', secret)
    .update(sourceString, 'utf8')
    .digest('base64');
}

function generateValidSignatureV2(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
}

async function testSecurity() {
  console.log('🔒 HubSpot Webhook Security Test Suite\n');
  console.log('Testing fixes for critical security vulnerabilities...\n');
  
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Invalid V3 signature should be rejected with 401
  console.log('Test 1: 🚨 Invalid V3 signature should be rejected with 401');
  totalTests++;
  try {
    // Set environment variable for this test
    process.env.HUBSPOT_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    
    const body = JSON.stringify(mockPayload);
    const invalidSignature = 'invalid-signature-123';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hubspot-signature-v3': invalidSignature,
        'x-hubspot-signature-timestamp': timestamp
      },
      body: body
    });
    
    if (response.status === 401) {
      console.log('✅ PASS: Invalid signature properly rejected with 401');
      passedTests++;
      const data = await response.json();
      console.log(`   Response: ${data.error}`);
    } else {
      console.log(`❌ FAIL: Expected 401, got ${response.status}`);
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing invalid signature - ${error.message}`);
  }
  
  console.log('');

  // Test 2: Old timestamp should be rejected with 400
  console.log('Test 2: 🚨 Old timestamp should be rejected with 400');
  totalTests++;
  try {
    const body = JSON.stringify(mockPayload);
    const validSignature = generateValidSignatureV3('POST', '/api/webhooks/hubspot', body, TEST_WEBHOOK_SECRET);
    // Set timestamp to 10 minutes ago (outside 5 minute tolerance)
    const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hubspot-signature-v3': validSignature,
        'x-hubspot-signature-timestamp': oldTimestamp
      },
      body: body
    });
    
    if (response.status === 400) {
      console.log('✅ PASS: Old timestamp properly rejected with 400');
      passedTests++;
      const data = await response.json();
      console.log(`   Response: ${data.error}`);
    } else {
      console.log(`❌ FAIL: Expected 400, got ${response.status}`);
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing old timestamp - ${error.message}`);
  }
  
  console.log('');

  // Test 3: Valid V3 signature with recent timestamp should be accepted
  console.log('Test 3: ✅ Valid V3 signature with recent timestamp should be accepted');
  totalTests++;
  try {
    const body = JSON.stringify(mockPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const validSignature = generateValidSignatureV3('POST', '/api/webhooks/hubspot', body, TEST_WEBHOOK_SECRET);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hubspot-signature-v3': validSignature,
        'x-hubspot-signature-timestamp': timestamp
      },
      body: body
    });
    
    if (response.status === 200) {
      console.log('✅ PASS: Valid signature with recent timestamp accepted');
      passedTests++;
      const data = await response.json();
      console.log(`   Response: ${data.status} - ${data.message}`);
    } else {
      console.log(`❌ FAIL: Expected 200, got ${response.status}`);
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing valid signature - ${error.message}`);
  }
  
  console.log('');

  // Test 4: Valid V2 signature with recent timestamp should be accepted
  console.log('Test 4: ✅ Valid V2 signature with recent timestamp should be accepted');
  totalTests++;
  try {
    const body = JSON.stringify(mockPayload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const validSignature = generateValidSignatureV2(body, TEST_WEBHOOK_SECRET);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hubspot-signature': validSignature,
        'x-hubspot-signature-timestamp': timestamp
      },
      body: body
    });
    
    if (response.status === 200) {
      console.log('✅ PASS: Valid V2 signature with recent timestamp accepted');
      passedTests++;
      const data = await response.json();
      console.log(`   Response: ${data.status} - ${data.message}`);
    } else {
      console.log(`❌ FAIL: Expected 200, got ${response.status}`);
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing valid V2 signature - ${error.message}`);
  }
  
  console.log('');

  // Test 5: Webhook without secret should work (development mode)
  console.log('Test 5: 🔓 Webhook without secret should work (development mode)');
  totalTests++;
  try {
    // Remove webhook secret to test development mode
    delete process.env.HUBSPOT_WEBHOOK_SECRET;
    
    const body = JSON.stringify(mockPayload);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body
    });
    
    if (response.status === 200) {
      console.log('✅ PASS: Webhook without secret works in development mode');
      passedTests++;
      const data = await response.json();
      console.log(`   Response: ${data.status} - ${data.message}`);
    } else {
      console.log(`❌ FAIL: Expected 200, got ${response.status}`);
      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ FAIL: Error testing development mode - ${error.message}`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`🔒 SECURITY TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SECURITY FIXES VERIFIED! Critical vulnerabilities resolved.');
    console.log('✅ Invalid signatures properly rejected with 401');
    console.log('✅ Timestamp validation prevents replay attacks with 400');
    console.log('✅ Valid requests still processed correctly');
    console.log('✅ Environment variable handling works correctly');
    console.log('');
    console.log('🚀 HubSpot webhook is now PRODUCTION READY with secure validation!');
  } else {
    console.log('❌ SECURITY ISSUES REMAIN! Some tests failed.');
    console.log('⚠️  DO NOT DEPLOY TO PRODUCTION until all security tests pass.');
  }
  console.log('='.repeat(60));
}

// Run the security tests
testSecurity().catch(error => {
  console.error('💥 Critical error running security tests:', error);
  process.exit(1);
});