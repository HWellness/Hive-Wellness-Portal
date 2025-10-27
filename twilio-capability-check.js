#!/usr/bin/env node

// Check specific phone number capabilities and fix configuration

import twilio from "twilio";

async function checkPhoneNumberCapabilities() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
      console.log("❌ Missing Twilio credentials");
      return;
    }

    console.log("🔍 Checking Phone Number:", phoneNumber);
    console.log("📱 Detailed Capability Analysis...\n");

    const client = twilio(accountSid, authToken);

    // Get all phone numbers and find the purchased one
    const phoneNumbers = await client.incomingPhoneNumbers.list();

    console.log("📋 All Phone Numbers in Account:");
    phoneNumbers.forEach((num, index) => {
      console.log(`${index + 1}. ${num.phoneNumber}`);
      console.log(`   📞 Voice: ${num.capabilities.voice ? "✅" : "❌"}`);
      console.log(`   💬 SMS: ${num.capabilities.sms ? "✅" : "❌"}`);
      console.log(`   📠 MMS: ${num.capabilities.mms ? "✅" : "❌"}`);
      console.log(`   📱 Fax: ${num.capabilities.fax ? "✅" : "❌"}`);
      console.log("");
    });

    // Find the specific number
    const ourNumber = phoneNumbers.find(
      (num) =>
        num.phoneNumber === phoneNumber ||
        num.phoneNumber.replace(/\s/g, "") === phoneNumber.replace(/\s/g, "")
    );

    if (ourNumber) {
      console.log("✅ Found Our Number:", ourNumber.phoneNumber);
      console.log("🔧 Current Capabilities:");
      console.log(`   📞 Voice: ${ourNumber.capabilities.voice ? "✅ Enabled" : "❌ Disabled"}`);
      console.log(`   💬 SMS: ${ourNumber.capabilities.sms ? "✅ Enabled" : "❌ Disabled"}`);
      console.log(`   📠 MMS: ${ourNumber.capabilities.mms ? "✅ Enabled" : "❌ Disabled"}`);
      console.log(`   📱 Fax: ${ourNumber.capabilities.fax ? "✅ Enabled" : "❌ Disabled"}`);

      if (!ourNumber.capabilities.sms) {
        console.log("\n❌ ISSUE IDENTIFIED: SMS capability is disabled for this number");
        console.log("🔧 SOLUTION REQUIRED:");
        console.log(
          "   1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
        );
        console.log("   2. Click on your phone number:", ourNumber.phoneNumber);
        console.log('   3. In the "Messaging" section, enable SMS capability');
        console.log("   4. Save the configuration");
        console.log("\n   OR");
        console.log("\n   Purchase a new UK phone number with SMS capability enabled");
      } else {
        console.log("\n✅ SMS capability is enabled - configuration should work");
      }
    } else {
      console.log("❌ Could not find the configured phone number in account");
      console.log("💡 Available numbers for SMS:");
      phoneNumbers
        .filter((num) => num.capabilities.sms)
        .forEach((num) => {
          console.log(`   ${num.phoneNumber} - SMS enabled`);
        });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkPhoneNumberCapabilities();
