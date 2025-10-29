import Stripe from "stripe";
import { createSecureStripeInstance } from "./stripe-config";

// SECURITY: Initialize Stripe with secure environment-based configuration
const stripe = createSecureStripeInstance();

export interface PaymentSplitOptions {
  sessionFee: number; // Total session fee in pounds (e.g., 60.00)
  therapistStripeAccountId: string; // Therapist's connected account ID
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentSplitResult {
  paymentIntentId: string;
  therapistAmount: number; // 85% of session fee
  platformAmount: number; // 15% of session fee minus Stripe fees
  stripeProcessingFee: number; // Estimated Stripe fee
  clientSecret: string;
}

/**
 * Create a payment intent with guaranteed 85% therapist payout via post-payment transfer
 * - Client pays full session fee to platform account
 * - After successful payment, webhook creates exact 85% transfer to therapist
 * - Platform absorbs all Stripe fees and keeps remaining amount
 *
 * PAYMENT STRATEGY FIXED: This now supports both upfront and completion-time payments
 */
export async function createPaymentWithRevenueSplit(
  options: PaymentSplitOptions & {
    paymentTiming?: "upfront" | "completion";
    confirmationMethod?: "manual" | "automatic";
  }
): Promise<PaymentSplitResult> {
  const {
    sessionFee,
    therapistStripeAccountId,
    description,
    metadata = {},
    paymentTiming = "upfront",
    confirmationMethod = "manual",
  } = options;

  // CRITICAL: Check therapist account readiness before creating payment
  const accountStatus = await checkTherapistAccountStatus(therapistStripeAccountId);

  if (!accountStatus.chargesEnabled) {
    throw new Error(
      `Therapist account not ready for payments. Account status: ${accountStatus.status}. Charges enabled: ${accountStatus.chargesEnabled}`
    );
  }

  if (!accountStatus.payoutsEnabled) {
    throw new Error(
      `Therapist account cannot receive payouts. Account status: ${accountStatus.status}. Payouts enabled: ${accountStatus.payoutsEnabled}`
    );
  }

  console.log(`✅ Therapist account ${therapistStripeAccountId} verified ready for payments`);

  // Calculate amounts (in pence for Stripe)
  const sessionFeeInPence = Math.round(sessionFee * 100);
  const therapistAmount = Math.round(sessionFee * 0.85 * 100); // Exact 85% to therapist

  try {
    // PAYMENT STRATEGY FIX: Support different payment timing strategies
    const paymentIntentOptions: any = {
      amount: sessionFeeInPence,
      currency: "gbp",
      payment_method_types: ["card"],
      description: description || `Therapy Session - ${sessionFee} GBP`,
      metadata: {
        ...metadata,
        therapistStripeAccountId, // Store for webhook processing
        originalSessionFee: sessionFee.toString(), // Store original amount
        revenueSplit: "85/15",
        therapistPercentage: "85",
        platformPercentage: "15",
        guaranteedTherapistAmount: (therapistAmount / 100).toString(),
        paymentTiming,
        confirmationMethod,
      },
    };

    // For completion-time payments, use automatic confirmation if customer is available
    if (paymentTiming === "completion" && confirmationMethod === "automatic") {
      paymentIntentOptions.confirmation_method = "automatic";
      paymentIntentOptions.capture_method = "automatic";
    }

    // Create payment intent WITHOUT immediate transfer - transfer happens via webhook
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);

    return {
      paymentIntentId: paymentIntent.id,
      therapistAmount: therapistAmount / 100, // What therapist will receive
      platformAmount: (sessionFeeInPence - therapistAmount) / 100, // What platform keeps (after fees)
      stripeProcessingFee: 0, // Fees will be calculated post-payment
      clientSecret: paymentIntent.client_secret!,
    };
  } catch (error) {
    console.error("Error creating payment with revenue split:", error);
    throw new Error("Failed to create payment with revenue split");
  }
}

/**
 * Create or retrieve Stripe Connect Express account for therapist
 */
export async function createTherapistStripeAccount(therapistData: {
  email: string;
  firstName: string;
  lastName: string;
  country?: string;
  businessType?: string;
  bankAccount?: {
    sortCode: string;
    accountNumber: string;
    accountHolderName: string;
  };
  address?: any;
  dateOfBirth?: any;
}): Promise<string> {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: therapistData.country || "GB",
      email: therapistData.email,
      metadata: {
        therapistName: `${therapistData.firstName} ${therapistData.lastName}`,
        revenueSplit: "85",
        platform: "hive-wellness",
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: "weekly",
            weekly_anchor: "friday",
          },
        },
      },
    });

    console.log("Stripe Connect account created successfully:", account.id);
    return account.id;
  } catch (error) {
    console.error("Error creating Stripe Connect account:", error);
    // Log the detailed error for debugging
    if (error instanceof Error) {
      console.error("Detailed error:", error.message);
    }
    throw new Error(
      `Failed to create therapist Stripe account: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate onboarding link for therapist to complete Stripe Express setup
 */
export async function createTherapistOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<string> {
  try {
    console.log("Creating onboarding link for account:", accountId);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    console.log("Onboarding link created successfully:", accountLink.url);
    return accountLink.url;
  } catch (error) {
    console.error("Error creating onboarding link:", error);
    // Log the detailed error for debugging
    if (error instanceof Error) {
      console.error("Detailed error:", error.message);
    }
    throw new Error(
      `Failed to create onboarding link: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if therapist's Stripe account is fully set up
 */
export async function checkTherapistAccountStatus(accountId: string): Promise<{
  isActive: boolean;
  canReceivePayments: boolean;
  requiresAction: boolean;
  detailsSubmitted: boolean;
  status: string;
  stripeAccountId: string;
  availableBalance?: string;
  pendingBalance?: string;
  nextPayoutDate?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements?: string[];
}> {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    const balance = await stripe.balance.retrieve({ stripeAccount: accountId });

    // Calculate next payout date (default 2 days)
    const nextPayout = new Date();
    nextPayout.setDate(nextPayout.getDate() + 2);

    return {
      isActive: account.details_submitted && account.charges_enabled,
      canReceivePayments: account.charges_enabled,
      requiresAction: !account.details_submitted,
      detailsSubmitted: account.details_submitted,
      status: account.charges_enabled ? "active" : "setup_required",
      stripeAccountId: accountId,
      availableBalance: `£${(balance.available[0]?.amount || 0) / 100}`,
      pendingBalance: `£${(balance.pending[0]?.amount || 0) / 100}`,
      nextPayoutDate: nextPayout.toISOString(),
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements?.currently_due || [],
    };
  } catch (error) {
    console.error("Error checking account status:", error);
    return {
      isActive: false,
      canReceivePayments: false,
      requiresAction: true,
      detailsSubmitted: false,
      status: "setup_required",
      stripeAccountId: accountId,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirements: [],
    };
  }
}

/**
 * Process standard payout to therapist (85% of session fee) using transfers
 *
 * CRITICAL FINANCIAL SAFETY: Now accepts and propagates idempotency keys
 * to prevent duplicate transfers in race conditions or retry scenarios.
 */
export async function processTherapistPayout(
  accountId: string,
  amount: number,
  description?: string,
  idempotencyKey?: string
): Promise<string> {
  try {
    // CRITICAL FINANCIAL SAFETY: Stripe transfer creation with idempotency protection
    const transferOptions: any = {
      amount: Math.round(amount * 100), // Convert to pence
      currency: "gbp",
      destination: accountId,
      description: description || "Therapy session payment",
      metadata: {
        payoutType: "standard",
        therapistPercentage: "85",
      },
    };

    // CRITICAL: Add idempotency key if provided to prevent duplicate transfers
    if (idempotencyKey) {
      transferOptions.idempotency_key = idempotencyKey;
      console.log(
        `🛡️ [FINANCIAL SAFETY] Creating Stripe transfer with idempotency key: ${idempotencyKey}`
      );
    } else {
      console.warn(
        `⚠️ [FINANCIAL SAFETY] Creating Stripe transfer without idempotency key - not recommended for production`
      );
    }

    const transfer = await stripe.transfers.create(transferOptions);

    console.log(`✅ [FINANCIAL SAFETY] Stripe transfer created successfully: ${transfer.id}`);
    return transfer.id;
  } catch (error) {
    console.error("Error processing therapist payout:", error);
    throw new Error("Failed to process therapist payout");
  }
}

export interface InstantPayoutOptions {
  accountId: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export interface InstantPayoutResult {
  success: boolean;
  payoutId?: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  message: string;
  error?: string;
}

/**
 * Calculate instant payout fee (1% of payout amount)
 */
export function calculateInstantPayoutFee(amount: number): number {
  return Math.round(amount * 0.01 * 100) / 100; // 1% fee, rounded to 2 decimal places
}

/**
 * Process instant payout to therapist using Stripe Payouts API with 1% fee
 *
 * CRITICAL FINANCIAL SAFETY: Uses Stripe Payouts API for instant transfers
 * with proper fee calculation and idempotency protection.
 */
export async function processInstantTherapistPayout(
  options: InstantPayoutOptions
): Promise<InstantPayoutResult> {
  const { accountId, amount, description, idempotencyKey } = options;

  try {
    // Step 1: Check account eligibility for instant payouts
    const accountStatus = await checkTherapistAccountStatus(accountId);

    if (!accountStatus.chargesEnabled || !accountStatus.payoutsEnabled) {
      return {
        success: false,
        amount,
        fee: 0,
        netAmount: 0,
        status: "failed",
        message: "Account not eligible for instant payouts",
        error: "Therapist account not fully set up or verified",
      };
    }

    // Step 2: Calculate fee and net amount
    const fee = calculateInstantPayoutFee(amount);
    const netAmount = amount - fee;

    if (netAmount <= 0) {
      return {
        success: false,
        amount,
        fee,
        netAmount: 0,
        status: "failed",
        message: "Amount too small for instant payout",
        error: "Payout amount after fees must be greater than 0",
      };
    }

    console.log(
      `💰 [INSTANT PAYOUT] Processing instant payout: £${amount} (fee: £${fee}, net: £${netAmount})`
    );

    // Step 3: Create instant payout using Stripe Payouts API
    const payoutOptions: any = {
      amount: Math.round(netAmount * 100), // Convert net amount to pence
      currency: "gbp",
      method: "instant",
      description: description || `Instant therapy session payout - £${amount} (fee: £${fee})`,
      metadata: {
        payoutType: "instant",
        originalAmount: amount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString(),
        therapistPercentage: "85",
      },
    };

    // Add idempotency key for financial safety
    if (idempotencyKey) {
      payoutOptions.idempotency_key = idempotencyKey;
      console.log(
        `🛡️ [FINANCIAL SAFETY] Creating instant payout with idempotency key: ${idempotencyKey}`
      );
    }

    // Create the instant payout to the connected account
    const payout = await stripe.payouts.create(payoutOptions, { stripeAccount: accountId });

    console.log(`✅ [INSTANT PAYOUT] Stripe instant payout created successfully: ${payout.id}`);
    console.log(
      `💵 [INSTANT PAYOUT] Amount: £${netAmount}, Fee: £${fee}, Status: ${payout.status}`
    );

    return {
      success: true,
      payoutId: payout.id,
      amount,
      fee,
      netAmount,
      status: payout.status,
      message: `Instant payout of £${netAmount} processed successfully (fee: £${fee})`,
    };
  } catch (error: any) {
    console.error("Error processing instant therapist payout:", error);

    // Handle specific Stripe errors
    let errorMessage = "Failed to process instant payout";
    let errorDetails = error.message;

    if (error.code === "balance_insufficient") {
      errorMessage = "Insufficient balance for instant payout";
      errorDetails = "Platform account does not have sufficient balance for instant transfer";
    } else if (error.code === "payout_creation_failed") {
      errorMessage = "Instant payout not available";
      errorDetails = "Account not eligible for instant payouts or daily limit exceeded";
    } else if (error.code === "account_invalid") {
      errorMessage = "Account setup incomplete";
      errorDetails = "Therapist account needs to complete setup before receiving instant payouts";
    }

    const fee = calculateInstantPayoutFee(amount);

    return {
      success: false,
      amount,
      fee,
      netAmount: amount - fee,
      status: "failed",
      message: errorMessage,
      error: errorDetails,
    };
  }
}

export { stripe };
