import { Refund, Payment, Appointment } from "@shared/schema";

// Refund policy calculation based on Holly's requirements
export interface RefundCalculation {
  refundPercentage: number; // 0, 50, or 100
  refundAmount: number; // Amount to refund to client
  therapistCompensation: number; // Amount therapist receives
  stripeProcessingFeeRetained: number; // Stripe fees retained
  refundReason: string; // Classification reason
  refundPolicy: string; // Policy description
  hoursBeforeSession: number; // Hours between cancellation and session
}

export interface RefundCalculationInput {
  originalAmount: number; // Total session fee
  therapistEarnings: number; // 85% of original amount
  stripeProcessingFee: number; // Stripe processing fees
  cancellationTime: Date; // When cancellation was requested
  sessionTime: Date; // Original session time
  cancelledBy: "client" | "therapist" | "admin" | "system";
}

/**
 * Calculate refund based on Holly's refund policy:
 * - More than 48 hours before: Full refund to client (100%), minus Stripe processing fees
 * - Between 24-48 hours before: 50% refund to client, 50% to therapist
 * - Less than 24 hours before: No refund; therapist retains full 85% share
 */
export function calculateRefund(input: RefundCalculationInput): RefundCalculation {
  const {
    originalAmount,
    therapistEarnings,
    stripeProcessingFee,
    cancellationTime,
    sessionTime,
    cancelledBy,
  } = input;

  // Calculate hours between cancellation and session
  const timeDifference = sessionTime.getTime() - cancellationTime.getTime();
  const hoursBeforeSession = timeDifference / (1000 * 60 * 60); // Convert milliseconds to hours

  // Special case: If therapist, admin, or system cancels, always full refund
  if (cancelledBy !== "client") {
    return {
      refundPercentage: 100,
      refundAmount: originalAmount, // Full refund including Stripe fees
      therapistCompensation: 0,
      stripeProcessingFeeRetained: 0,
      refundReason: `${cancelledBy}_cancelled`,
      refundPolicy: `Full refund - cancelled by ${cancelledBy}`,
      hoursBeforeSession,
    };
  }

  // Client cancellation policy based on timing
  if (hoursBeforeSession >= 48) {
    // More than 48 hours: Full refund minus Stripe fees
    const refundAmount = originalAmount - stripeProcessingFee;
    return {
      refundPercentage: 100,
      refundAmount,
      therapistCompensation: 0,
      stripeProcessingFeeRetained: stripeProcessingFee,
      refundReason: "client_cancelled_48h+",
      refundPolicy:
        "Full refund (minus Stripe processing fees) - cancelled more than 48 hours before session",
      hoursBeforeSession,
    };
  } else if (hoursBeforeSession >= 24) {
    // Between 24-48 hours: 50% refund to client, 50% to therapist
    const halfAmount = originalAmount / 2;
    const clientRefund = halfAmount - stripeProcessingFee / 2; // Split Stripe fees
    const therapistShare = halfAmount - stripeProcessingFee / 2;
    return {
      refundPercentage: 50,
      refundAmount: clientRefund,
      therapistCompensation: therapistShare,
      stripeProcessingFeeRetained: stripeProcessingFee,
      refundReason: "client_cancelled_24-48h",
      refundPolicy:
        "50% refund to client, 50% credited to therapist - cancelled between 24-48 hours before session",
      hoursBeforeSession,
    };
  } else {
    // Less than 24 hours: No refund, therapist keeps 85%
    return {
      refundPercentage: 0,
      refundAmount: 0,
      therapistCompensation: therapistEarnings, // Therapist keeps their 85%
      stripeProcessingFeeRetained: stripeProcessingFee,
      refundReason: "client_cancelled_24h-",
      refundPolicy:
        "No refund - cancelled less than 24 hours before session. Therapist retains 85% share.",
      hoursBeforeSession,
    };
  }
}

/**
 * Format refund policy information for display to users
 */
export function getRefundPolicyText(): string {
  return `
**Hive Wellness Cancellation & Refund Policy**

Our refund policy is designed to be fair to both clients and therapists:

**More than 48 hours before your session:**
• Full refund to you (minus Stripe processing fees)
• No charge to therapist

**Between 24-48 hours before your session:**
• 50% refund to you
• 50% credited to your therapist for their reserved time

**Less than 24 hours before your session:**
• No refund available
• Therapist retains their full 85% earnings share

**Important Notes:**
• If your therapist needs to cancel, you'll always receive a full refund
• Processing fees are absorbed by Hive Wellness where possible
• All refunds are processed within 5-10 business days
• Emergency cancellations may be reviewed on a case-by-case basis

This policy ensures fairness while protecting therapists' time and availability.
  `.trim();
}

/**
 * Get short policy summary for UI display
 */
export function getRefundPolicySummary(): { title: string; items: string[] } {
  return {
    title: "Cancellation Policy",
    items: [
      "48+ hours: Full refund (minus processing fees)",
      "24-48 hours: 50% refund, 50% to therapist",
      "Under 24 hours: No refund, therapist keeps 85%",
      "Therapist cancellations: Always full refund",
    ],
  };
}

/**
 * Validate refund calculation inputs
 */
export function validateRefundInputs(input: RefundCalculationInput): string[] {
  const errors: string[] = [];

  if (input.originalAmount <= 0) {
    errors.push("Original amount must be greater than 0");
  }

  if (input.therapistEarnings < 0) {
    errors.push("Therapist earnings cannot be negative");
  }

  if (input.stripeProcessingFee < 0) {
    errors.push("Stripe processing fee cannot be negative");
  }

  if (input.cancellationTime >= input.sessionTime) {
    errors.push("Cancellation time must be before session time");
  }

  if (!["client", "therapist", "admin", "system"].includes(input.cancelledBy)) {
    errors.push("Invalid cancellation source");
  }

  return errors;
}
