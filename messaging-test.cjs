const http = require('http');

async function testMessaging() {
  console.log('🧪 HIVE WELLNESS MESSAGING SYSTEM VERIFICATION');
  console.log('=' .repeat(60));
  console.log(`Test Time: ${new Date().toISOString()}`);
  console.log(`Target: support@hive-wellness.co.uk, +44 744 616 6043`);
  
  const results = {
    email: false,
    sms: false,
    whatsapp: false
  };
  
  // Test email
  console.log('\n📧 TESTING EMAIL FUNCTIONALITY:');
  try {
    const emailResult = await testEndpoint('/api/emails/send-direct', {
      to: 'support@hive-wellness.co.uk',
      subject: '🧪 FINAL VERIFICATION - Hive Wellness Platform Messaging Test',
      body: 'This email confirms the Hive Wellness messaging system is operational and ready for August 5th launch. All communication channels verified and functional.\n\nPlatform Status: ✅ OPERATIONAL\nLaunch Ready: August 5th, 2025',
      priority: 'high'
    });
    results.email = emailResult;
    console.log(emailResult ? '✅ EMAIL: SENT SUCCESSFULLY' : '❌ EMAIL: FAILED');
  } catch (error) {
    console.log('❌ EMAIL: ERROR -', error.message);
  }
  
  // Test SMS
  console.log('\n📱 TESTING SMS FUNCTIONALITY:');
  try {
    const smsResult = await testEndpoint('/api/messaging/send-sms', {
      to: '+447446166043',
      message: '🧪 HIVE WELLNESS SMS: Platform messaging verified. All systems operational for August 5th launch.',
      priority: 'normal'
    });
    results.sms = smsResult;
    console.log(smsResult ? '✅ SMS: SENT SUCCESSFULLY' : '❌ SMS: FAILED');
  } catch (error) {
    console.log('❌ SMS: ERROR -', error.message);
  }
  
  // Test WhatsApp
  console.log('\n💬 TESTING WHATSAPP FUNCTIONALITY:');
  try {
    const whatsappResult = await testEndpoint('/api/messaging/send-whatsapp', {
      to: '+447446166043',
      message: '🧪 HIVE WELLNESS WHATSAPP: Communications verified and production-ready for August 5th launch.',
      priority: 'normal'
    });
    results.whatsapp = whatsappResult;
    console.log(whatsappResult ? '✅ WHATSAPP: SENT SUCCESSFULLY' : '❌ WHATSAPP: FAILED');
  } catch (error) {
    console.log('❌ WHATSAPP: ERROR -', error.message);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 MESSAGING VERIFICATION SUMMARY:');
  console.log(`📧 Email: ${results.email ? '✅ OPERATIONAL' : '❌ FAILED'}`);
  console.log(`📱 SMS: ${results.sms ? '✅ OPERATIONAL' : '❌ FAILED'}`);
  console.log(`💬 WhatsApp: ${results.whatsapp ? '✅ OPERATIONAL' : '❌ FAILED'}`);
  console.log('\n🚀 LAUNCH STATUS: AUGUST 5TH, 2025');
  const allWorking = results.email && results.sms && results.whatsapp;
  console.log(`🎯 OVERALL STATUS: ${allWorking ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME SYSTEMS NEED ATTENTION'}`);
  console.log('=' .repeat(60));
}

async function testEndpoint(path, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        // Consider 200 status as success
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

testMessaging().catch(console.error);
