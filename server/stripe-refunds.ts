import Stripe from "stripe";
import { createSecureStripeInstance } from "./stripe-config";

// SECURITY: Initialize Stripe with secure environment-based configuration
const stripe = createSecureStripeInstance();

export interface CancellationOptions {
  paymentIntentId: string;
  therapistStripeAccountId: string;
  sessionFee: number;
  cancellationReason:
    | "client_cancelled"
    | "therapist_cancelled"
    | "mutual_cancellation"
    | "no_show";
  cancellationTime: "before_24h" | "within_24h" | "after_start";
  refundPolicy: "full_refund" | "partial_refund" | "no_refund";
}

export interface CancellationResult {
  refundId?: string;
  transferReversalId?: string;
  clientRefundAmount: number;
  therapistDeduction: number;
  platformFee: number;
  cancellationFee: number;
}

/**
 * Handle session cancellation with smart refund/reversal logic
 */
export async function handleSessionCancellation(
  options: CancellationOptions
): Promise<CancellationResult> {
  const {
    paymentIntentId,
    therapistStripeAccountId,
    sessionFee,
    cancellationReason,
    cancellationTime,
    refundPolicy,
  } = options;

  try {
    // Get payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      throw new Error("Payment not completed, cannot process cancellation");
    }

    // Calculate refund amounts based on policy
    const amounts = calculateCancellationAmounts(
      sessionFee,
      cancellationReason,
      cancellationTime,
      refundPolicy
    );

    let refundId: string | undefined;
    let transferReversalId: string | undefined;

    // Process client refund if applicable
    if (amounts.clientRefundAmount > 0) {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amounts.clientRefundAmount * 100), // Convert to pence
        reason: mapCancellationReason(cancellationReason),
        metadata: {
          cancellationReason,
          cancellationTime,
          originalSessionFee: sessionFee.toString(),
        },
      });
      refundId = refund.id;
    }

    // Handle therapist transfer reversal if they already received payment
    if (amounts.therapistDeduction > 0) {
      // Find the original transfer to the therapist
      const transfers = await stripe.transfers.list({
        destination: therapistStripeAccountId,
        limit: 100,
      });

      // Find transfer related to this payment
      const relatedTransfer = transfers.data.find(
        (transfer) =>
          transfer.metadata?.paymentIntentId === paymentIntentId ||
          transfer.source_transaction === paymentIntent.charges?.data[0]?.id
      );

      if (relatedTransfer) {
        // Create transfer reversal for the deduction amount
        const reversal = await stripe.transfers.createReversal(relatedTransfer.id, {
          amount: Math.round(amounts.therapistDeduction * 100),
          metadata: {
            cancellationReason,
            deductionType: "cancellation_fee",
          },
        });
        transferReversalId = reversal.id;
      }
    }

    return {
      refundId,
      transferReversalId,
      clientRefundAmount: amounts.clientRefundAmount,
      therapistDeduction: amounts.therapistDeduction,
      platformFee: amounts.platformFee,
      cancellationFee: amounts.cancellationFee,
    };
  } catch (error) {
    console.error("Error handling session cancellation:", error);
    throw new Error(
      `Failed to process cancellation: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Calculate cancellation amounts based on NEW 24-hour policy
 */
function calculateCancellationAmounts(
  sessionFee: number,
  cancellationReason: string,
  cancellationTime: string,
  refundPolicy: string
) {
  let clientRefundAmount = 0;
  let therapistDeduction = 0;
  let cancellationFee = 0;
  let platformFee = 0;

  // NEW POLICY: No refunds within 24 hours unless therapist cancels
  if (cancellationReason === "therapist_cancelled") {
    // Full refund if therapist cancels (regardless of timing)
    clientRefundAmount = sessionFee;
    therapistDeduction = 0; // No deduction needed as funds aren't transferred yet
  } else if (cancellationTime === "within_24h" || cancellationTime === "after_start") {
    // No refund for client cancellations within 24 hours
    clientRefundAmount = 0;
    cancellationFee = sessionFee; // Full session fee becomes cancellation fee
    platformFee = sessionFee; // Platform keeps the fee
  } else {
    // Client cancellation more than 24 hours before - full refund
    clientRefundAmount = sessionFee;
    therapistDeduction = 0; // No deduction needed as funds aren't transferred yet
  }

  return {
    clientRefundAmount,
    therapistDeduction,
    cancellationFee,
    platformFee,
  };
}

/**
 * Map cancellation reason to Stripe refund reason
 */
function mapCancellationReason(reason: string): Stripe.RefundCreateParams.Reason {
  switch (reason) {
    case "client_cancelled":
      return "requested_by_customer";
    case "therapist_cancelled":
    case "mutual_cancellation":
      return "requested_by_customer";
    case "no_show":
      return "fraudulent";
    default:
      return "requested_by_customer";
  }
}

/**
 * Get cancellation policy based on timing and reason
 */
export function getCancellationPolicy(
  hoursUntilSession: number,
  cancellationReason: string
): { refundPolicy: string; cancellationTime: string } {
  let cancellationTime: string;
  let refundPolicy: string;

  // Determine timing
  if (hoursUntilSession > 24) {
    cancellationTime = "before_24h";
  } else if (hoursUntilSession > 0) {
    cancellationTime = "within_24h";
  } else {
    cancellationTime = "after_start";
  }

  // Determine refund policy based on reason and timing
  if (cancellationReason === "therapist_cancelled") {
    refundPolicy = "full_refund"; // Always full refund if therapist cancels
  } else if (cancellationReason === "no_show") {
    refundPolicy = "no_refund"; // No refund for no-shows
  } else {
    refundPolicy = "partial_refund"; // Standard policy for client cancellations
  }

  return { refundPolicy, cancellationTime };
}
