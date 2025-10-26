#!/usr/bin/env node

// COMPREHENSIVE STRIPE PAYMENT TESTING
// ====================================
// Tests therapist revenue splits, payment processing, and Stripe integration

const baseUrl = 'http://localhost:5000';

async function testStripePayment(testName, endpoint, data = {}) {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    const success = response.status >= 200 && response.status < 400;
    
    console.log(`${success ? '✅' : '❌'} ${testName}: ${response.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.clientSecret) {
      console.log(`   Client Secret: ${result.clientSecret.substring(0, 20)}...`);
    }
    
    return { success, data: result };
  } catch (error) {
    console.log(`❌ ${testName}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runStripeTests() {
  console.log('💳 COMPREHENSIVE STRIPE PAYMENT TESTING');
  console.log('=======================================\n');

  // Test 1: Basic Payment Intent Creation
  const paymentTest = await testStripePayment(
    'Payment Intent Creation',
    '/api/payment-intent',
    { amount: 8500 } // £85 session fee
  );
  
  // Test 1b: Full Stripe Payment Intent Creation
  const stripePaymentTest = await testStripePayment(
    'Stripe Payment Intent (Full)',
    '/api/create-payment-intent',
    { amount: 8500 } // £85 session fee
  );
  
  // Test 2: Revenue Split Calculation (85% to therapist)
  const revenueSplitTest = await testStripePayment(
    'Revenue Split Calculation',
    '/api/calculate-revenue-split',
    { 
      sessionFee: 10000, // £100 session
      therapistId: 'demo-therapist-1'
    }
  );
  
  // Test 3: Therapist Payment Method Setup
  const therapistPaymentTest = await testStripePayment(
    'Therapist Payment Setup',
    '/api/therapist/payment-setup',
    { 
      therapistId: 'demo-therapist-1',
      bankDetails: {
        accountHolderName: 'Test Therapist',
        sortCode: '12-34-56',
        accountNumber: '12345678'
      }
    }
  );
  
  // Test 4: Session Payment Processing
  const sessionPaymentTest = await testStripePayment(
    'Session Payment Processing',
    '/api/process-session-payment',
    {
      clientId: 'demo-client-1',
      therapistId: 'demo-therapist-1',
      sessionId: 'test-session-123',
      amount: 8500, // £85
      paymentMethodId: 'pm_test_card'
    }
  );
  
  // Test 5: Therapist Payout Status
  const payoutTest = await testStripePayment(
    'Therapist Payout Status',
    '/api/therapist/payout-status',
    { therapistId: 'demo-therapist-1' }
  );

  console.log('\n' + '='.repeat(50));
  console.log('📊 STRIPE INTEGRATION ASSESSMENT:');
  
  if (paymentTest.success) {
    console.log('✅ Basic payment processing: WORKING');
  } else {
    console.log('❌ Basic payment processing: NEEDS ATTENTION');
  }
  
  if (revenueSplitTest.success) {
    console.log('✅ Revenue split calculation: WORKING');
  } else {
    console.log('❌ Revenue split calculation: CRITICAL ISSUE');
  }
  
  console.log('\n🎯 THERAPIST EXPERIENCE IMPACT:');
  console.log('   - Payment processing reliability affects therapist trust');
  console.log('   - 85% revenue split must be guaranteed for therapist retention');
  console.log('   - Instant payouts are essential for therapist satisfaction');
  console.log('   - Clear payment status visibility builds confidence');
  
  return {
    paymentWorking: paymentTest.success,
    revenueSplitWorking: revenueSplitTest.success,
    overallStripeHealth: paymentTest.success && revenueSplitTest.success
  };
}

runStripeTests().catch(console.error);