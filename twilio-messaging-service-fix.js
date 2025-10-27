#!/usr/bin/env node

// Fix Twilio Messaging Service Configuration - Add phone number to service

import twilio from "twilio";

async function fixMessagingService() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      console.log("❌ Missing Twilio credentials");
      return;
    }

    console.log("🔧 FIXING MESSAGING SERVICE CONFIGURATION");
    console.log("📱 Phone Number:", phoneNumber);
    console.log("");

    const client = twilio(accountSid, authToken);

    // 1. Check current messaging services
    console.log("📋 Checking Messaging Services...");
    const messagingServices = await client.messaging.services.list();

    if (messagingServices.length === 0) {
      console.log("⚠️ No messaging services found. Creating new one...");

      // Create a new messaging service
      const newService = await client.messaging.services.create({
        friendlyName: "Hive Wellness Messaging Service",
      });

      console.log("✅ Created messaging service:", newService.sid);
      console.log("📝 Service name:", newService.friendlyName);

      // Add phone number to the service
      console.log("📱 Adding phone number to messaging service...");
      const phoneNumberResource = await client.messaging
        .services(newService.sid)
        .phoneNumbers.create({ phoneNumberSid: await getPhoneNumberSid(client, phoneNumber) });

      console.log("✅ Phone number added to messaging service");
      console.log("🎯 MESSAGING SERVICE READY");
      console.log("📝 Service SID:", newService.sid);
    } else {
      console.log(`📋 Found ${messagingServices.length} messaging service(s):`);

      for (const service of messagingServices) {
        console.log(`   📝 ${service.friendlyName} (${service.sid})`);

        // Check phone numbers in this service
        const phoneNumbers = await client.messaging.services(service.sid).phoneNumbers.list();

        console.log(`   📱 Phone numbers in service: ${phoneNumbers.length}`);

        if (phoneNumbers.length === 0) {
          console.log("   ⚠️ No phone numbers in service. Adding current number...");

          try {
            const phoneNumberSid = await getPhoneNumberSid(client, phoneNumber);
            await client.messaging.services(service.sid).phoneNumbers.create({ phoneNumberSid });

            console.log("   ✅ Phone number added to service");
          } catch (error) {
            console.log("   ❌ Error adding phone number:", error.message);
          }
        } else {
          phoneNumbers.forEach((num) => {
            console.log(`   📞 ${num.phoneNumber}`);
          });

          // Check if our number is in the service
          const ourNumberInService = phoneNumbers.find(
            (num) =>
              num.phoneNumber === phoneNumber ||
              num.phoneNumber.replace(/\s/g, "") === phoneNumber.replace(/\s/g, "")
          );

          if (!ourNumberInService) {
            console.log("   ⚠️ Our number not in service. Adding it...");
            try {
              const phoneNumberSid = await getPhoneNumberSid(client, phoneNumber);
              await client.messaging.services(service.sid).phoneNumbers.create({ phoneNumberSid });

              console.log("   ✅ Our phone number added to service");
            } catch (error) {
              console.log("   ❌ Error adding our number:", error.message);
            }
          } else {
            console.log("   ✅ Our number is already in service");
          }
        }
      }
    }

    console.log("");
    console.log("🎯 MESSAGING SERVICE CONFIGURATION COMPLETE");
    console.log("💬 SMS and WhatsApp should now work properly");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code) {
      console.error("📝 Error code:", error.code);
      console.error("🔗 More info:", error.moreInfo);
    }
  }
}

async function getPhoneNumberSid(client, phoneNumber) {
  const phoneNumbers = await client.incomingPhoneNumbers.list();
  const found = phoneNumbers.find(
    (num) =>
      num.phoneNumber === phoneNumber ||
      num.phoneNumber.replace(/\s/g, "") === phoneNumber.replace(/\s/g, "")
  );

  if (!found) {
    throw new Error(`Phone number ${phoneNumber} not found in account`);
  }

  return found.sid;
}

fixMessagingService();
