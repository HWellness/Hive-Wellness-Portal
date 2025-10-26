// Therapist tier pricing and revenue split constants
export const TIER_PRICING = {
  counsellor: 65,
  psychotherapist: 80,
  psychologist: 90,
  specialist: 120,
} as const;

// Pricing constants for chatbot and public messaging
export const PRICING_INFO = {
  MIN_SESSION_PRICE_GBP: 65,
  SESSION_DURATION_MINUTES: 50,
  CONSULTATION_PRICE_GBP: 0, // Free consultation
  PRICING_MESSAGE: 'Therapy sessions are priced at £65, £80, £90, or £120 depending on the therapist\'s experience and specialisation. All therapists provide exceptional care.',
} as const;

export const REVENUE_SPLIT = {
  therapist: 0.85,
  platform: 0.15,
} as const;

export type TherapistTier = keyof typeof TIER_PRICING;

// Helper function to calculate platform fee
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * REVENUE_SPLIT.platform * 100) / 100;
}

// Helper function to calculate therapist earnings
export function calculateTherapistEarnings(amount: number): number {
  return Math.round(amount * REVENUE_SPLIT.therapist * 100) / 100;
}