import OpenAI from "openai";

// Production-Ready PII Detection Service with Regex + AI-based detection
// Protects sensitive data before sending to OpenAI APIs

interface PIIDetectionResult {
  hasPII: boolean;
  maskedText: string;
  unmaskingMap: Map<string, string>;
  detectedTypes: string[];
  confidence: "high" | "medium" | "low";
}

interface PIIPattern {
  name: string;
  regex: RegExp;
  category: "identifier" | "contact" | "financial" | "health" | "personal";
  validator?: (match: string) => boolean;
}

// Luhn algorithm for credit card validation
function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// NHS number validation (modulus 11 check)
function validateNHSNumber(nhs: string): boolean {
  const digits = nhs.replace(/\D/g, "");
  if (digits.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }

  const checkDigit = 11 - (sum % 11);
  const expectedCheck = checkDigit === 11 ? 0 : checkDigit === 10 ? null : checkDigit;

  return expectedCheck !== null && expectedCheck === parseInt(digits[9]);
}

// UK-specific PII patterns with validation
const PII_PATTERNS: PIIPattern[] = [
  // Email addresses
  {
    name: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    category: "contact",
  },
  // UK phone numbers (comprehensive patterns)
  {
    name: "uk_phone",
    regex: /\b(?:(?:\+44\s?|0)(?:\d\s?){9,10})\b/g,
    category: "contact",
  },
  // NHS numbers with validation
  {
    name: "nhs_number",
    regex: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g,
    category: "health",
    validator: validateNHSNumber,
  },
  // UK postcodes (comprehensive pattern)
  {
    name: "uk_postcode",
    regex: /\b(?:[A-Z]{1,2}\d{1,2}[A-Z]?)\s*(?:\d[A-Z]{2})\b/gi,
    category: "contact",
  },
  // Credit card numbers with Luhn validation
  {
    name: "credit_card",
    regex: /\b(?:\d{4}[\s-]?){3}\d{4}\b|\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b/g,
    category: "financial",
    validator: luhnCheck,
  },
  // UK National Insurance numbers
  {
    name: "ni_number",
    regex: /\b[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]{1}\b/gi,
    category: "identifier",
  },
  // Street addresses (comprehensive UK pattern)
  {
    name: "street_address",
    regex:
      /\b(?:(?:Flat|Apartment|Unit)\s+\d+[A-Z]?,?\s+)?\d+[A-Z]?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Drive|Dr|Close|Cl|Way|Court|Ct|Place|Pl|Terrace|Mews|Gardens|Square|Crescent)\b/gi,
    category: "contact",
  },
  // Dates of birth (various formats)
  {
    name: "date_of_birth",
    regex: /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
    category: "personal",
  },
];

// Medical/therapy-specific terms that might contain PII context
const MEDICAL_CONTEXT_KEYWORDS = [
  "diagnosed",
  "prescription",
  "medication",
  "doctor",
  "hospital",
  "clinic",
  "treatment",
  "therapy",
  "counselling",
  "psychiatrist",
  "psychologist",
  "medical history",
  "health condition",
  "symptom",
  "illness",
];

export class PIIDetectionService {
  private openai: OpenAI | null = null;
  private detectionStats: {
    totalChecks: number;
    piiDetected: number;
    byType: Map<string, number>;
    lastReset: Date;
  } = {
    totalChecks: 0,
    piiDetected: 0,
    byType: new Map(),
    lastReset: new Date(),
  };

  constructor() {
    // Initialize OpenAI for entity extraction
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Detect and mask PII in text using regex patterns + AI entity extraction
   */
  async detectAndMask(
    text: string,
    options: {
      useAIDetection?: boolean;
      preserveContext?: boolean;
    } = {}
  ): Promise<PIIDetectionResult> {
    this.detectionStats.totalChecks++;

    const unmaskingMap = new Map<string, string>();
    const detectedTypes: string[] = [];
    let maskedText = text;
    let hasPII = false;

    // Step 1: Regex-based detection with positional masking
    const replacements: Array<{ start: number; end: number; token: string; original: string }> = [];

    for (const pattern of PII_PATTERNS) {
      const regex = new RegExp(pattern.regex);
      let match;
      let index = 0;

      while ((match = regex.exec(text)) !== null) {
        // Apply validator if present
        if (pattern.validator && !pattern.validator(match[0])) {
          continue;
        }

        hasPII = true;
        if (!detectedTypes.includes(pattern.name)) {
          detectedTypes.push(pattern.name);
        }

        // Track detection stats
        this.detectionStats.byType.set(
          pattern.name,
          (this.detectionStats.byType.get(pattern.name) || 0) + 1
        );

        // Generate token based on preserveContext option
        let token: string;
        if (options.preserveContext) {
          // Length-preserving masking with partial reveal
          if (pattern.name === "credit_card") {
            // Keep last 4 digits
            const lastFour = match[0].slice(-4);
            token = `[CARD_****${lastFour}]`;
          } else if (pattern.name === "email") {
            // Keep domain
            const domain = match[0].split("@")[1];
            token = `[EMAIL_***@${domain}]`;
          } else {
            // Generic length-preserving token
            token = `[${pattern.name.toUpperCase()}_${index}]`;
          }
        } else {
          token = `[${pattern.name.toUpperCase()}_${index}]`;
        }

        unmaskingMap.set(token, match[0]);
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          token,
          original: match[0],
        });

        index++;
      }
    }

    // Apply all replacements in reverse order to maintain indices
    replacements.sort((a, b) => b.start - a.start);
    for (const replacement of replacements) {
      maskedText =
        maskedText.substring(0, replacement.start) +
        replacement.token +
        maskedText.substring(replacement.end);
    }

    // Step 2: AI-based entity extraction for contextual PII
    let aiConfidence: "high" | "medium" | "low" = "medium";

    if (options.useAIDetection && this.openai && maskedText.length > 20) {
      try {
        const aiResult = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a PII detection system. Identify personal identifiable information in the text.
              
Extract any:
- Person names
- Specific medical conditions or diagnoses
- Specific locations (addresses, specific places)
- Any other personal identifiers

Respond ONLY with JSON:
{
  "hasPII": boolean,
  "entities": ["entity1", "entity2", ...],
  "confidence": "high" | "medium" | "low"
}`,
            },
            {
              role: "user",
              content: maskedText,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 300,
        });

        const aiResponse = JSON.parse(aiResult.choices[0].message.content || "{}");

        if (aiResponse.hasPII && aiResponse.entities && aiResponse.entities.length > 0) {
          hasPII = true;
          aiConfidence = aiResponse.confidence || "medium";

          // Mask AI-detected entities
          for (let i = 0; i < aiResponse.entities.length; i++) {
            const entity = aiResponse.entities[i];
            const token = `[AI_PII_${i}]`;
            unmaskingMap.set(token, entity);
            maskedText = maskedText.replace(entity, token);
          }

          if (!detectedTypes.includes("ai_detected_pii")) {
            detectedTypes.push("ai_detected_pii");
          }

          this.detectionStats.byType.set(
            "ai_detected_pii",
            (this.detectionStats.byType.get("ai_detected_pii") || 0) + aiResponse.entities.length
          );
        }
      } catch (error) {
        console.error("AI-based PII detection failed:", error);
        // Fallback to regex-only detection
      }
    }

    // Check medical context
    const hasMedicalContext = MEDICAL_CONTEXT_KEYWORDS.some((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasMedicalContext) {
      aiConfidence = "high";
      if (!detectedTypes.includes("medical_context")) {
        detectedTypes.push("medical_context");
      }
    }

    if (hasPII) {
      this.detectionStats.piiDetected++;
    }

    // Determine overall confidence
    const confidence = hasPII ? (detectedTypes.length > 2 ? "high" : aiConfidence) : "low";

    return {
      hasPII,
      maskedText,
      unmaskingMap,
      detectedTypes,
      confidence,
    };
  }

  /**
   * Unmask previously masked text
   */
  unmask(maskedText: string, unmaskingMap: Map<string, string>): string {
    let unmaskedText = maskedText;
    unmaskingMap.forEach((original, token) => {
      unmaskedText = unmaskedText.replaceAll(token, original);
    });
    return unmaskedText;
  }

  /**
   * Check if text contains PII without masking
   */
  async containsPII(text: string): Promise<boolean> {
    const result = await this.detectAndMask(text, { useAIDetection: false });
    return result.hasPII;
  }

  /**
   * Get detection statistics
   */
  getStats() {
    return {
      totalChecks: this.detectionStats.totalChecks,
      piiDetected: this.detectionStats.piiDetected,
      detectionRate:
        this.detectionStats.totalChecks > 0
          ? ((this.detectionStats.piiDetected / this.detectionStats.totalChecks) * 100).toFixed(2) +
            "%"
          : "0%",
      byType: Object.fromEntries(this.detectionStats.byType),
      lastReset: this.detectionStats.lastReset.toISOString(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.detectionStats = {
      totalChecks: 0,
      piiDetected: 0,
      byType: new Map(),
      lastReset: new Date(),
    };
  }

  /**
   * Sanitize text for logging - always mask PII in logs
   */
  async sanitizeForLogging(text: string): Promise<string> {
    const result = await this.detectAndMask(text, { useAIDetection: false });
    return result.maskedText;
  }
}

// Singleton instance
export const piiDetectionService = new PIIDetectionService();

// Export for testing and admin dashboard
export { PIIDetectionResult, PIIPattern };
