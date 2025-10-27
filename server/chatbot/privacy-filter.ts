export interface PrivacyFilterResult {
  filteredText: string;
  wasRedacted: boolean;
  redactedItems: string[];
}

// Privacy patterns for detecting sensitive information
const PRIVACY_PATTERNS = [
  // Names (basic patterns)
  {
    pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    type: "name",
    replacement: "[NAME]",
  },
  // Phone numbers (UK and international formats)
  {
    pattern: /(\+44\s?|0)(\d{2,4}\s?\d{3,4}\s?\d{3,4}|\d{3}\s?\d{3}\s?\d{4})/g,
    type: "phone",
    replacement: "[PHONE]",
  },
  // Email addresses
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    type: "email",
    replacement: "[EMAIL]",
  },
  // NHS numbers (10 digits)
  {
    pattern: /\b\d{3}\s?\d{3}\s?\d{4}\b/g,
    type: "nhs_number",
    replacement: "[NHS_NUMBER]",
  },
  // UK postcodes
  {
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi,
    type: "postcode",
    replacement: "[POSTCODE]",
  },
  // National Insurance numbers
  {
    pattern: /\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]\b/gi,
    type: "ni_number",
    replacement: "[NI_NUMBER]",
  },
  // Bank account numbers (8 digits)
  {
    pattern: /\b\d{8}\b/g,
    type: "account_number",
    replacement: "[ACCOUNT_NUMBER]",
  },
  // Sort codes (6 digits, often formatted as XX-XX-XX)
  {
    pattern: /\b\d{2}-\d{2}-\d{2}\b/g,
    type: "sort_code",
    replacement: "[SORT_CODE]",
  },
];

// Health-related sensitive terms
const HEALTH_SENSITIVE_TERMS = [
  "medication",
  "prescription",
  "diagnosis",
  "medical record",
  "hospital",
  "GP",
  "doctor",
  "psychiatrist",
  "therapist name",
  "clinic",
  "medical history",
  "treatment plan",
  "medication name",
];

export function filterPrivacyData(text: string): PrivacyFilterResult {
  let filteredText = text;
  let wasRedacted = false;
  const redactedItems: string[] = [];

  // Apply privacy patterns
  PRIVACY_PATTERNS.forEach(({ pattern, type, replacement }) => {
    const matches = filteredText.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        redactedItems.push(`${type}: ${match}`);
      });
      filteredText = filteredText.replace(pattern, replacement);
      wasRedacted = true;
    }
  });

  // Check for health-sensitive terms
  const lowerText = text.toLowerCase();
  HEALTH_SENSITIVE_TERMS.forEach((term) => {
    if (lowerText.includes(term.toLowerCase())) {
      // Don't redact, but flag for warning
      wasRedacted = true;
      redactedItems.push(`sensitive_health_term: ${term}`);
    }
  });

  return {
    filteredText,
    wasRedacted,
    redactedItems,
  };
}

export function getPrivacyWarningMessage(redactedItems: string[]): string {
  if (redactedItems.length === 0) return "";

  return "For your safety, we've removed personal data from your message. Please rephrase without including names or sensitive details.";
}

export function containsHealthInformation(text: string): boolean {
  const lowerText = text.toLowerCase();
  return HEALTH_SENSITIVE_TERMS.some((term) => lowerText.includes(term.toLowerCase()));
}
