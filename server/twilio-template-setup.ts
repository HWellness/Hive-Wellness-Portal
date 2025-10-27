import { db } from "./db.js";
import { notificationTemplates } from "../shared/schema.js";
import { nanoid } from "nanoid";

/**
 * GDPR-Compliant Notification Templates for Hive Wellness
 * UK Law Compliant SMS and WhatsApp Templates
 */

interface TemplateConfig {
  name: string;
  channel: "sms" | "whatsapp";
  type:
    | "appointment_confirmation"
    | "appointment_reminder"
    | "session_followup"
    | "welcome"
    | "therapist_connection"
    | "payment_confirmation"
    | "custom";
  subject?: string;
  body: string;
  placeholders: string[];
}

const templates: TemplateConfig[] = [
  // SMS TEMPLATES - Booking Confirmations
  {
    name: "SMS Booking Confirmation",
    channel: "sms",
    type: "appointment_confirmation",
    body: "Hive Wellness: Your appointment with {therapist_name} is confirmed for {appointment_date} at {appointment_time}. Join here: {meeting_link}\n\nReply STOP to opt out.",
    placeholders: ["therapist_name", "appointment_date", "appointment_time", "meeting_link"],
  },
  {
    name: "SMS Appointment Reminder - 24h",
    channel: "sms",
    type: "appointment_reminder",
    body: "Hive Wellness: Reminder - Your therapy session with {therapist_name} is tomorrow at {appointment_time}. Meeting link: {meeting_link}\n\nReply STOP to opt out.",
    placeholders: ["therapist_name", "appointment_time", "meeting_link"],
  },
  {
    name: "SMS Appointment Reminder - 2h",
    channel: "sms",
    type: "appointment_reminder",
    body: "Hive Wellness: Your session with {therapist_name} starts in 2 hours. Join now: {meeting_link}\n\nReply STOP to opt out.",
    placeholders: ["therapist_name", "meeting_link"],
  },
  {
    name: "SMS Payment Confirmation",
    channel: "sms",
    type: "payment_confirmation",
    body: "Hive Wellness: Payment of £{amount} confirmed for your session with {therapist_name} on {appointment_date}. Receipt: {receipt_url}\n\nReply STOP to opt out.",
    placeholders: ["amount", "therapist_name", "appointment_date", "receipt_url"],
  },
  {
    name: "SMS Therapist Welcome",
    channel: "sms",
    type: "welcome",
    body: "Welcome to Hive Wellness, {therapist_name}! Your onboarding is complete. Access your therapist portal: {portal_link}\n\nReply STOP to opt out.",
    placeholders: ["therapist_name", "portal_link"],
  },

  // WhatsApp TEMPLATES - Booking Confirmations
  {
    name: "WhatsApp Booking Confirmation",
    channel: "whatsapp",
    type: "appointment_confirmation",
    body: "🌟 *Hive Wellness Booking Confirmed*\n\nHello {client_name},\n\nYour appointment with *{therapist_name}* is confirmed:\n📅 {appointment_date}\n🕐 {appointment_time}\n\n🔗 Join your session: {meeting_link}\n\nIf you need to reschedule, please contact us at least 48 hours in advance.\n\n_Reply STOP to unsubscribe_",
    placeholders: [
      "client_name",
      "therapist_name",
      "appointment_date",
      "appointment_time",
      "meeting_link",
    ],
  },
  {
    name: "WhatsApp Appointment Reminder - 24h",
    channel: "whatsapp",
    type: "appointment_reminder",
    body: "⏰ *Tomorrow's Therapy Session*\n\nHi {client_name},\n\nJust a reminder about your appointment with *{therapist_name}* tomorrow at {appointment_time}.\n\n🔗 Meeting link: {meeting_link}\n\nWe're here to support your wellbeing journey! 💚\n\n_Reply STOP to unsubscribe_",
    placeholders: ["client_name", "therapist_name", "appointment_time", "meeting_link"],
  },
  {
    name: "WhatsApp Appointment Reminder - 2h",
    channel: "whatsapp",
    type: "appointment_reminder",
    body: "🔔 *Session Starting Soon*\n\nHi {client_name},\n\nYour therapy session with *{therapist_name}* starts in 2 hours.\n\n🔗 Join here: {meeting_link}\n\nTake a moment to prepare and we'll see you soon! 🌟\n\n_Reply STOP to unsubscribe_",
    placeholders: ["client_name", "therapist_name", "meeting_link"],
  },
  {
    name: "WhatsApp Payment Confirmation",
    channel: "whatsapp",
    type: "payment_confirmation",
    body: "✅ *Payment Confirmed*\n\nHi {client_name},\n\nYour payment of *£{amount}* for the session with {therapist_name} on {appointment_date} has been confirmed.\n\n📄 Receipt: {receipt_url}\n\nThank you for choosing Hive Wellness! 🌟\n\n_Reply STOP to unsubscribe_",
    placeholders: ["client_name", "amount", "therapist_name", "appointment_date", "receipt_url"],
  },
  {
    name: "WhatsApp Therapist Welcome",
    channel: "whatsapp",
    type: "welcome",
    body: "🎉 *Welcome to Hive Wellness!*\n\nHi {therapist_name},\n\nCongratulations! Your therapist onboarding is now complete.\n\n🌟 You're ready to start helping clients on their wellness journey.\n\n🔗 Access your therapist portal: {portal_link}\n\nWelcome to the Hive family! 🏡💚\n\n_Reply STOP to unsubscribe_",
    placeholders: ["therapist_name", "portal_link"],
  },
  {
    name: "WhatsApp Therapist Assignment Notification",
    channel: "whatsapp",
    type: "therapist_connection",
    body: "👋 *New Client Assignment*\n\nHi {therapist_name},\n\nYou've been matched with a new client: *{client_name}*\n\n📋 Please review their profile in your dashboard and reach out to schedule the first session.\n\n🔗 Therapist Portal: {portal_link}\n\n_Reply STOP to unsubscribe_",
    placeholders: ["therapist_name", "client_name", "portal_link"],
  },
  {
    name: "WhatsApp Session Follow-up",
    channel: "whatsapp",
    type: "session_followup",
    body: "💭 *Session Follow-up*\n\nHi {client_name},\n\nHow did your session with {therapist_name} go today?\n\nYour wellbeing journey matters to us. If you have any feedback or need support, we're here for you.\n\n🔗 Portal: {portal_link}\n\n_Reply STOP to unsubscribe_",
    placeholders: ["client_name", "therapist_name", "portal_link"],
  },

  // SMS TEMPLATES - Additional
  {
    name: "SMS Therapist Assignment",
    channel: "sms",
    type: "therapist_connection",
    body: "Hive Wellness: New client {client_name} assigned. Check your dashboard: {portal_link}\n\nReply STOP to opt out.",
    placeholders: ["client_name", "portal_link"],
  },
  {
    name: "SMS Session Follow-up",
    channel: "sms",
    type: "session_followup",
    body: "Hive Wellness: How was your session with {therapist_name}? We value your feedback: {feedback_link}\n\nReply STOP to opt out.",
    placeholders: ["therapist_name", "feedback_link"],
  },

  // GDPR Compliance Templates
  {
    name: "SMS Opt-out Confirmation",
    channel: "sms",
    type: "custom",
    body: "Hive Wellness: You've successfully opted out of SMS notifications. You can re-enable them in your account settings: {settings_link}",
    placeholders: ["settings_link"],
  },
  {
    name: "WhatsApp Opt-out Confirmation",
    channel: "whatsapp",
    type: "custom",
    body: "✅ *Unsubscribed Successfully*\n\nYou've opted out of WhatsApp notifications from Hive Wellness.\n\n🔧 You can re-enable them anytime in your account settings: {settings_link}\n\nThank you for using Hive Wellness! 🌟",
    placeholders: ["settings_link"],
  },
];

export async function setupDefaultNotificationTemplates(): Promise<void> {
  console.log("🔧 Setting up default notification templates...");

  try {
    // Check if templates already exist to avoid duplicates
    const existingTemplates = await db.select().from(notificationTemplates);
    console.log(`📋 Found ${existingTemplates.length} existing templates`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const template of templates) {
      // Check if template with same name and channel already exists
      const exists = existingTemplates.some(
        (t) => t.name === template.name && t.channel === template.channel
      );

      if (exists) {
        console.log(
          `⏭️  Template "${template.name}" (${template.channel}) already exists, skipping...`
        );
        skippedCount++;
        continue;
      }

      // Create new template
      await db.insert(notificationTemplates).values({
        id: nanoid(),
        name: template.name,
        channel: template.channel,
        type: template.type,
        subject: template.subject,
        body: template.body,
        placeholders: template.placeholders,
        isActive: true,
        lastUpdatedBy: "system-setup",
        usage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Created template: ${template.name} (${template.channel})`);
      createdCount++;
    }

    console.log(`\n🎉 Template setup completed!`);
    console.log(`✅ Created: ${createdCount} templates`);
    console.log(`⏭️  Skipped: ${skippedCount} existing templates`);
    console.log(`📊 Total templates in system: ${existingTemplates.length + createdCount}`);
  } catch (error) {
    console.error("❌ Error setting up notification templates:", error);
    throw error;
  }
}

// Export templates for reference
export { templates };
