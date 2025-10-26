#!/usr/bin/env node

// Monitor A2P Campaign status and guide setup process

import twilio from 'twilio';

async function checkA2PCampaignStatus() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      console.log('Missing Twilio credentials');
      return;
    }

    console.log('📋 CHECKING A2P CAMPAIGN STATUS');
    console.log('📱 Phone Number:', phoneNumber);
    console.log('');

    const client = twilio(accountSid, authToken);

    // Check phone number capabilities
    console.log('1. Checking Phone Number Capabilities...');
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const ourNumber = phoneNumbers.find(num => 
      num.phoneNumber === phoneNumber || 
      num.phoneNumber.replace(/\s/g, '') === phoneNumber.replace(/\s/g, '')
    );

    if (ourNumber) {
      console.log('   ✅ Phone Number Found:', ourNumber.phoneNumber);
      console.log('   📞 Voice:', ourNumber.capabilities.voice ? '✅' : '❌');
      console.log('   💬 SMS:', ourNumber.capabilities.sms ? '✅' : '❌');
      console.log('   📱 MMS:', ourNumber.capabilities.mms ? '✅' : '❌');
    } else {
      console.log('   ❌ Phone number not found in account');
      return;
    }

    console.log('');

    // Check messaging services
    console.log('2. Checking Messaging Services...');
    const messagingServices = await client.messaging.v1.services.list();
    
    if (messagingServices.length === 0) {
      console.log('   ❌ No messaging services found');
    } else {
      for (const service of messagingServices) {
        console.log(`   📝 Service: ${service.friendlyName} (${service.sid})`);
        
        // Check phone numbers in service
        const servicePhoneNumbers = await client.messaging.v1.services(service.sid)
          .phoneNumbers.list();
        
        console.log(`   📱 Phone numbers in service: ${servicePhoneNumbers.length}`);
        servicePhoneNumbers.forEach(num => {
          console.log(`      📞 ${num.phoneNumber}`);
        });
      }
    }

    console.log('');

    // Check A2P Trust Products
    console.log('3. Checking A2P Trust Products...');
    try {
      const trustProducts = await client.trusthub.v1.trustProducts.list();
      
      if (trustProducts.length === 0) {
        console.log('   ❌ No Trust Products found');
        console.log('   📝 You need to create a Trust Product for A2P messaging');
      } else {
        trustProducts.forEach(tp => {
          console.log(`   📋 Trust Product: ${tp.friendlyName}`);
          console.log(`   📝 Status: ${tp.status}`);
          console.log(`   🆔 SID: ${tp.sid}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️ Could not check Trust Products:', error.message);
    }

    console.log('');

    // Check A2P Brand Registrations
    console.log('4. Checking A2P Brand Registrations...');
    try {
      const brands = await client.messaging.v1.a2p.brandRegistrations.list();
      
      if (brands.length === 0) {
        console.log('   ❌ No Brand Registrations found');
        console.log('   📝 You need to register your brand for A2P messaging');
      } else {
        brands.forEach(brand => {
          console.log(`   🏢 Brand: ${brand.brandType}`);
          console.log(`   📝 Status: ${brand.status}`);
          console.log(`   🆔 SID: ${brand.sid}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️ Could not check Brand Registrations:', error.message);
    }

    console.log('');

    // Check A2P Campaigns
    console.log('5. Checking A2P Campaigns...');
    try {
      const campaigns = await client.messaging.v1.a2p.campaigns.list();
      
      if (campaigns.length === 0) {
        console.log('   ❌ No A2P Campaigns found');
        console.log('   📝 You need to create an A2P Campaign');
      } else {
        campaigns.forEach(campaign => {
          console.log(`   📢 Campaign: ${campaign.description || 'No description'}`);
          console.log(`   📝 Status: ${campaign.status}`);
          console.log(`   🆔 SID: ${campaign.sid}`);
        });
      }
    } catch (error) {
      console.log('   ⚠️ Could not check A2P Campaigns:', error.message);
    }

    console.log('');
    console.log('🎯 A2P SETUP GUIDANCE:');
    console.log('');
    console.log('For business messaging, you need to complete:');
    console.log('1. Trust Product (business verification)');
    console.log('2. Brand Registration (company details)');
    console.log('3. A2P Campaign (messaging use case)');
    console.log('');
    console.log('📚 Follow Twilio A2P setup guide:');
    console.log('https://www.twilio.com/docs/messaging/a2p-10dlc/getting-started');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('📝 Error code:', error.code);
    }
  }
}

checkA2PCampaignStatus();