import OpenAI from "openai";
import { faqData, searchFAQ } from "./faq-data";
import {
  filterPrivacyData,
  getPrivacyWarningMessage,
  containsHealthInformation,
} from "./privacy-filter";
import { PRICING_INFO } from "../../shared/constants";
import { logger } from "../lib/logger";
import { openaiTracking } from "../openai-tracking-service";
import { piiDetectionService } from "../pii-detection-service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatResponse {
  response: string;
  wasRedacted: boolean;
  source: "faq" | "ai" | "privacy_warning";
  confidence: number;
  piiDetected?: boolean;
  piiTypes?: string[];
  maskedMessage?: string; // PII-protected version for logging
}

export async function generateChatResponse(userMessage: string): Promise<ChatResponse> {
  // Step 1: Apply PII detection and masking
  const piiResult = await piiDetectionService.detectAndMask(userMessage, {
    useAIDetection: true,
    preserveContext: true,
  });

  // Log PII detection for monitoring
  if (piiResult.hasPII) {
    logger.warn("PII detected in chatbot message", {
      types: piiResult.detectedTypes,
      confidence: piiResult.confidence,
      messageLength: userMessage.length,
    });
  }

  // Step 2: Apply legacy privacy filtering
  const privacyResult = filterPrivacyData(userMessage);

  // If privacy violations detected, return warning
  if (privacyResult.wasRedacted) {
    return {
      response: getPrivacyWarningMessage(privacyResult.redactedItems),
      wasRedacted: true,
      source: "privacy_warning",
      confidence: 1.0,
      piiDetected: piiResult.hasPII,
      piiTypes: piiResult.detectedTypes,
      maskedMessage: piiResult.maskedText,
    };
  }

  // Search FAQ first (using masked text for safety)
  const faqMatches = searchFAQ(piiResult.maskedText);

  if (faqMatches.length > 0) {
    const bestMatch = faqMatches[0];
    return {
      response: bestMatch.answer,
      wasRedacted: false,
      source: "faq",
      confidence: 0.9,
      piiDetected: piiResult.hasPII,
      piiTypes: piiResult.detectedTypes,
      maskedMessage: piiResult.maskedText,
    };
  }

  // Fall back to AI response (using masked text to protect PII)
  try {
    const systemPrompt = `You are a friendly, concise website assistant for Hive Wellness, a UK online therapy service. Keep responses short, warm, and helpful.

IMPORTANT - Privacy Tokens:
The user's message may contain tokens like [EMAIL_0], [UK_PHONE_1], or [NHS_NUMBER_0]. These are privacy-protected placeholders for sensitive information. Treat them naturally in your response - you don't need to mention or explain them. Just respond to the user's intent while maintaining context.

CRITICAL GUIDELINES:
- NEVER mention accounts, dashboards, logging in, or existing bookings
- When asked about account access: "I can't help with account access. Please contact our team at support@hive-wellness.co.uk for support."
- Keep responses under 3 sentences when possible - be concise and welcoming
- Focus on helping website visitors learn about getting started with therapy
- Use a conversational, supportive tone without being overly detailed
- When users ask to contact support or have issues: Always provide our support email: support@hive-wellness.co.uk

ABOUT HIVE WELLNESS:
We connect people with qualified therapists through secure online video sessions. Our team carefully matches you with the right therapist for your needs.

KEY INFORMATION (keep brief):
**Pricing:** £65, £80, or £120 per session depending on your therapist's experience
**Matching Process:** Fill out our questionnaire sharing your preferences and needs → Our admin team carefully assigns you a therapist based on your requirements → Free 15-20 minute introduction call with your assigned therapist → Start therapy
**Booking Free Consultation:** When someone asks to book a free consultation or introduction call, direct them to book their free 15-20 minute introduction call. The booking page can be found on the website under the "Free Introduction Call" section on the homepage
**Important:** Clients don't choose their own therapist. Our admin team reviews your questionnaire and expertly matches you with the most suitable therapist for your specific needs.
**Specialisations:** Anxiety, depression, relationships, trauma, work stress, grief, and more
**Requirements:** Device with camera/microphone, internet connection, private space
**Support Contact:** For any questions or technical issues, email support@hive-wellness.co.uk

RESPONSE STYLE:
- Be conversational and friendly, not formal or clinical
- Offer 1-2 key pieces of information, don't overwhelm
- Always mention the free consultation when relevant
- When asked about booking a consultation/call, direct them to the "Book Free Call" button on the homepage or the portal
- NEVER say clients can "select", "choose", or "pick" their therapist - they are matched by our admin team
- End with a gentle invitation to take action or ask more questions
- If asked for extensive lists, keep it brief and suggest they can learn more
- When users need help or have concerns, provide the support email: support@hive-wellness.co.uk

CONTEXT FROM FAQ:
${faqData
  .slice(0, 5)
  .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
  .join("\n\n")}

Examples of good responses:
"Our sessions cost £65, £80, or £120 depending on your therapist's experience. After you complete our questionnaire, our team will match you with the right therapist, then you'll have a free 15-20 minute introduction call!"
"We help with anxiety, depression, relationships, and work stress amongst other things. Ready to get started? Fill out our questionnaire and we'll match you with a suitable therapist."
"After you complete our questionnaire, our admin team carefully reviews your needs and assigns you a therapist who's the best fit. You'll then have a free introduction call with them before starting therapy."
"To book your free 15-20 minute introduction call, look for the 'Book Free Call' button on our homepage. This is where you'll chat with our team and get matched with the right therapist for you!"
"For any questions or technical support, please email support@hive-wellness.co.uk - our team is happy to help!"`;

    // Use tracking wrapper with PII-masked message
    const completion = await openaiTracking.createChatCompletion(
      {
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: piiResult.maskedText },
        ],
        max_tokens: 150,
        temperature: 0.8,
      },
      {
        featureType: "chatbot",
        metadata: {
          messageLength: userMessage.length,
          piiDetected: piiResult.hasPII,
          piiTypes: piiResult.detectedTypes.join(","),
        },
      }
    );

    const aiResponse =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I'm having trouble processing your request right now. Please try again or email support@hive-wellness.co.uk for assistance.";

    return {
      response: aiResponse,
      wasRedacted: false,
      source: "ai",
      confidence: 0.8,
      piiDetected: piiResult.hasPII,
      piiTypes: piiResult.detectedTypes,
      maskedMessage: piiResult.maskedText,
    };
  } catch (error) {
    // PII automatically sanitized by logger
    logger.error("OpenAI API error in chatbot", error);

    // Fallback response
    return {
      response:
        "I'm sorry, I'm having trouble processing your request right now. Please try again or email support@hive-wellness.co.uk for assistance. You can also browse our FAQ section for common questions about our therapy services.",
      wasRedacted: false,
      source: "ai",
      confidence: 0.5,
      maskedMessage: piiResult.maskedText,
    };
  }
}

export async function logChatInteraction(
  userId: string | null,
  message: string,
  response: string,
  source: string,
  confidence?: number,
  wasRedacted?: boolean,
  redactedItems?: string[],
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string,
  chatSource?: string
) {
  // Log sanitized chat interaction using PII detection service
  const sanitizedMessage = await piiDetectionService.sanitizeForLogging(message);

  // Sanitized log for debugging (message already protected by PII detection)
  logger.info("Chat interaction logged", {
    userId: userId || "anonymous",
    message: sanitizedMessage,
    responseSource: source,
    messageLength: message.length,
    responseLength: response.length,
  });

  // Save to database for admin monitoring
  try {
    const { storage } = await import("../storage");
    const { nanoid } = await import("nanoid");

    await storage.createChatbotConversation({
      id: nanoid(),
      userId: userId,
      sessionId: sessionId || `session_${Date.now()}`,
      userMessage: sanitizedMessage,
      botResponse: response,
      responseSource: source as "faq" | "ai" | "privacy_warning" | "error",
      confidence: confidence?.toString() || "0.8",
      wasRedacted: wasRedacted || false,
      redactedItems: redactedItems ? JSON.stringify(redactedItems) : null,
      messageLength: message.length,
      responseLength: response.length,
      ipAddress: ipAddress,
      userAgent: userAgent,
      source:
        (chatSource as "landing-page" | "portal" | "wordpress" | "external") || "landing-page",
    });
  } catch (error) {
    logger.error("Error saving chatbot conversation to database", error);
    // Don't fail the chatbot response if database save fails
  }
}
