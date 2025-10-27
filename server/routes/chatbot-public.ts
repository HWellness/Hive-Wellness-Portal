import { Request, Response } from "express";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validation schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
});

const FeedbackRequestSchema = z.object({
  messageId: z.string(),
  feedback: z.enum(["positive", "negative"]),
  conversationId: z.string().optional(),
});

// Rate limiting store (in-memory for demo, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// Content filtering for public chatbot
function containsInappropriateContent(message: string): boolean {
  const inappropriatePatterns = [
    /\b(suicide|kill myself|end it all|want to die)\b/i,
    /\b(crisis|emergency|urgent help)\b/i,
    /\b(drug|medication|prescription)\b/i,
    // Add more patterns as needed
  ];

  return inappropriatePatterns.some((pattern) => pattern.test(message));
}

// System prompt for public website chatbot
const SYSTEM_PROMPT = `You are a friendly website assistant for Hive Wellness, a UK-based online therapy service. You help website visitors learn about our therapy services and guide them to get started if they're interested.

CRITICAL ROLE BOUNDARIES:
- You are a WEBSITE ASSISTANT for visitors, NOT a platform guide for existing users
- NEVER mention accounts, dashboards, logging in, or platform features
- When asked about account-related topics, respond: "I can't help with account access. For support with existing bookings, please contact our team directly."
- Focus on explaining services to people who are learning about Hive Wellness for the first time

IMPORTANT GUIDELINES:
- You provide information about therapy services and how to get started
- You DO NOT provide medical advice, diagnose conditions, or replace professional therapy
- You use British English and reference UK services (NHS, £ currency, etc.)
- You maintain a warm, professional, and supportive tone
- If asked about emergencies, direct users to call 999 or contact Samaritans (116 123)

ABOUT HIVE WELLNESS:
We are a UK online therapy service that connects people with qualified therapists through secure video sessions. Our approach combines human-led matching with technology to make therapy more accessible.

**What We Offer:**
- Online therapy sessions with qualified, BACP-registered therapists
- Free 20-minute initial consultations to find the right therapist for you
- Secure video sessions from the comfort of your home
- Specialised support for anxiety, depression, relationships, trauma, work stress, and more
- Professional matching process to connect you with the most suitable therapist

**How It Works:**
1. Visit our website and fill out a brief questionnaire about your therapy needs
2. Our team carefully reviews your information and matches you with 3-5 suitable therapists
3. Book a free 20-minute consultation with your preferred therapist
4. If you're both happy to proceed, schedule your first full therapy session
5. Continue with regular online sessions at times that work for you

**PRICING (ALWAYS USE THESE EXACT FIGURES):**
- Therapy sessions cost £65, £80, or £120 per session (never quote other prices)
- £65: Counsellors and newly qualified therapists
- £80: Experienced psychotherapists  
- £120: Specialist therapists with advanced qualifications
- Your specific rate depends on which therapist you're matched with
- All sessions are 50 minutes long
- Free 20-minute initial consultation included

**What You'll Need:**
- A device with camera and microphone (computer, tablet, or smartphone)
- Stable internet connection
- A private, quiet space for your sessions
- Headphones recommended for best audio quality

**Our Therapists Specialise In:**
- Anxiety and panic disorders
- Depression and low mood
- Relationship and couples counselling
- Trauma and PTSD (including EMDR)
- Work stress and burnout
- Bereavement and grief
- Life transitions and career changes
- Various therapeutic approaches (CBT, psychodynamic, humanistic)

**Getting Started:**
- Everything begins with our online questionnaire - it takes about 10-15 minutes
- There's no commitment until after your free consultation
- All therapists are qualified and registered with professional bodies
- Sessions are completely confidential and secure

**Key Messages:**
- Emphasise the free consultation and no-pressure approach
- Mention the careful matching process (not automated)
- Reassure about privacy, security, and therapist qualifications
- Guide interested visitors to start with the questionnaire
- For any specific questions about booking or support, direct them to contact the team directly

Respond as a helpful website assistant who explains our services clearly and encourages visitors to take the first step if they're interested in therapy.`;

export async function handlePublicChatbot(req: Request, res: Response) {
  try {
    // Add CORS headers for external website embedding
    const origin = req.headers.origin;
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");

    const clientIp = req.ip || req.connection.remoteAddress || "unknown";

    // Rate limiting
    const rateLimit = getRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        remaining: rateLimit.remaining,
      });
    }

    // Validate request
    const validationResult = ChatRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request format",
        details: validationResult.error.errors,
      });
    }

    const { message, conversationId } = validationResult.data;

    // Content filtering
    if (containsInappropriateContent(message)) {
      return res.json({
        response:
          "I understand you may be going through a difficult time. For immediate support, please contact:\n\n• Emergency services: 999\n• Samaritans: 116 123 (free, 24/7)\n• Crisis Text Line: Text SHOUT to 85258\n\nFor ongoing support, I'd recommend booking a consultation with one of our qualified therapists.",
        conversationId: conversationId || `conv_${Date.now()}`,
        filtered: true,
      });
    }

    // Import FAQ system and AI response generator
    const { generateChatResponse } = await import("../chatbot/ai-response");

    // Use the same system that includes FAQ search first, then AI fallback
    const chatResponse = await generateChatResponse(message);

    const response = chatResponse.response;

    // Log the interaction with enhanced database storage
    const { logChatInteraction } = await import("../chatbot/ai-response");
    await logChatInteraction(
      null, // anonymous user
      chatResponse.maskedMessage || message, // Use PII-masked version for logging
      response,
      chatResponse.source, // Use actual source (faq/ai)
      chatResponse.confidence, // Use actual confidence
      chatResponse.wasRedacted, // Use actual redaction status
      [], // redactedItems
      conversationId || `conv_${Date.now()}`,
      clientIp,
      req.get("User-Agent"),
      "wordpress" // source
    );

    res.json({
      response,
      conversationId: conversationId || `conv_${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Public chatbot error:", error);
    res.status(500).json({
      error: "Internal server error",
      response: "I'm sorry, I'm having technical difficulties. Please try again in a moment.",
    });
  }
}

export async function handlePublicFeedback(req: Request, res: Response) {
  try {
    // Add CORS headers for external website embedding
    const origin = req.headers.origin;
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");

    const clientIp = req.ip || req.connection.remoteAddress || "unknown";

    // Rate limiting
    const rateLimit = getRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
      });
    }

    // Validate request
    const validationResult = FeedbackRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid feedback format",
        details: validationResult.error.errors,
      });
    }

    const { messageId, feedback, conversationId } = validationResult.data;

    // Log feedback (in production, store in database)
    console.log("Public chatbot feedback:", {
      ip: clientIp,
      messageId,
      feedback,
      conversationId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Feedback received. Thank you for helping us improve!",
    });
  } catch (error) {
    console.error("Public feedback error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
}
