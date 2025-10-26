import Stripe from 'stripe';
import { createSecureStripeInstance } from './stripe-config';

// SECURITY: Initialize Stripe with secure environment-based configuration
const stripe = createSecureStripeInstance();

export interface SessionPaymentHold {
  paymentIntentId: string;
  sessionId: string;
  therapistStripeAccountId: string;
  sessionFee: number;
  scheduledDate: string;
  holdUntil: string;
  status: 'held' | 'released' | 'cancelled';
}

/**
 * Create payment intent with delayed transfer to therapist
 * Funds are held until 24 hours after session completion
 */
export async function createSessionPaymentWithHold(
  sessionData: {
    sessionFee: number;
    therapistStripeAccountId: string;
    sessionId: string;
    scheduledDate: string;
    clientEmail: string;
    description: string;
  }
): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  holdReleaseDate: string;
}> {
  try {
    const { sessionFee, therapistStripeAccountId, sessionId, scheduledDate, clientEmail, description } = sessionData;
    
    // Calculate when to release funds (24 hours after session)
    const sessionDateTime = new Date(scheduledDate);
    const holdReleaseDate = new Date(sessionDateTime.getTime() + 24 * 60 * 60 * 1000);
    
    // Create payment intent WITHOUT immediate transfer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(sessionFee * 100), // Convert to pence
      currency: 'gbp',
      customer: undefined, // Will be set when customer pays
      description: `${description} - Session: ${sessionId}`,
      metadata: {
        sessionId,
        therapistStripeAccountId,
        scheduledDate: sessionDateTime.toISOString(),
        holdReleaseDate: holdReleaseDate.toISOString(),
        originalSessionFee: sessionFee.toString(),
        paymentHoldStatus: 'held'
      },
      // Don't transfer immediately - funds stay in platform account
      // Transfer will happen via scheduled job after session completion
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      holdReleaseDate: holdReleaseDate.toISOString()
    };
    
  } catch (error) {
    console.error('Error creating payment with hold:', error);
    throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Release held funds to therapist after session completion + 24h
 */
export async function releaseSessionPayment(
  paymentIntentId: string
): Promise<{
  transferId: string;
  amount: number;
  therapistShare: number;
  platformFee: number;
}> {
  try {
    // Get payment intent details
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed, cannot release funds');
    }

    const therapistStripeAccountId = paymentIntent.metadata.therapistStripeAccountId;
    const originalSessionFee = parseFloat(paymentIntent.metadata.originalSessionFee || '0');
    
    if (!therapistStripeAccountId) {
      throw new Error('No therapist account ID found in payment metadata');
    }

    // Calculate 85% therapist share
    const therapistShare = originalSessionFee * 0.85;
    const platformFee = originalSessionFee * 0.15;
    
    // Create transfer to therapist
    const transfer = await stripe.transfers.create({
      amount: Math.round(therapistShare * 100), // Convert to pence
      currency: 'gbp',
      destination: therapistStripeAccountId,
      source_transaction: paymentIntent.charges?.data[0]?.id,
      description: `Session payment release - Session: ${paymentIntent.metadata.sessionId}`,
      metadata: {
        paymentIntentId,
        sessionId: paymentIntent.metadata.sessionId,
        releaseType: 'post_session_completion',
        originalAmount: originalSessionFee.toString(),
        therapistShare: therapistShare.toString(),
        platformFee: platformFee.toString()
      }
    });

    // Update payment intent metadata
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...paymentIntent.metadata,
        paymentHoldStatus: 'released',
        transferId: transfer.id,
        releaseDate: new Date().toISOString()
      }
    });

    return {
      transferId: transfer.id,
      amount: originalSessionFee,
      therapistShare,
      platformFee
    };
    
  } catch (error) {
    console.error('Error releasing session payment:', error);
    throw new Error(`Failed to release payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle session cancellation based on new 24-hour policy
 */
export async function handleSessionCancellationWithHold(
  paymentIntentId: string,
  sessionScheduledDate: string,
  cancellationReason: 'client_cancelled' | 'therapist_cancelled' | 'mutual_cancellation' | 'no_show'
): Promise<{
  refundId?: string;
  refundAmount: number;
  cancellationFee: number;
  canCancel: boolean;
  reason: string;
}> {
  try {
    const sessionDate = new Date(sessionScheduledDate);
    const now = new Date();
    const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // New policy: No refunds within 24 hours unless therapist cancels
    let canCancel = true;
    let refundAmount = 0;
    let cancellationFee = 0;
    let reason = '';
    let refundId: string | undefined;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const sessionFee = parseFloat(paymentIntent.metadata.originalSessionFee || '0');

    if (cancellationReason === 'therapist_cancelled') {
      // Full refund if therapist cancels (regardless of timing)
      refundAmount = sessionFee;
      reason = 'Full refund: Therapist cancellation';
      
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer',
        metadata: {
          cancellationReason,
          hoursUntilSession: hoursUntilSession.toString()
        }
      });
      refundId = refund.id;
      
    } else if (hoursUntilSession <= 24) {
      // No refund for client cancellations within 24 hours
      canCancel = false;
      refundAmount = 0;
      cancellationFee = sessionFee;
      reason = 'No refund: Cancellation within 24 hours of session';
      
    } else {
      // Client cancellation more than 24 hours before - full refund
      refundAmount = sessionFee;
      reason = 'Full refund: Cancellation more than 24 hours before session';
      
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer',
        metadata: {
          cancellationReason,
          hoursUntilSession: hoursUntilSession.toString()
        }
      });
      refundId = refund.id;
    }

    // Update payment intent metadata
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        ...paymentIntent.metadata,
        paymentHoldStatus: refundAmount > 0 ? 'refunded' : 'forfeited',
        cancellationReason,
        cancellationDate: now.toISOString(),
        refundAmount: refundAmount.toString(),
        cancellationFee: cancellationFee.toString()
      }
    });

    return {
      refundId,
      refundAmount,
      cancellationFee,
      canCancel,
      reason
    };
    
  } catch (error) {
    console.error('Error handling cancellation:', error);
    throw new Error(`Failed to process cancellation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all payments that are ready for release (24+ hours after session)
 */
export async function getPaymentsReadyForRelease(): Promise<SessionPaymentHold[]> {
  try {
    const now = new Date();
    
    // Search for payment intents with hold status
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: {
        gte: Math.floor((now.getTime() - 7 * 24 * 60 * 60 * 1000) / 1000) // Last 7 days
      }
    });

    const readyForRelease: SessionPaymentHold[] = [];

    for (const pi of paymentIntents.data) {
      if (pi.metadata.paymentHoldStatus === 'held' && 
          pi.metadata.holdReleaseDate && 
          pi.status === 'succeeded') {
        
        const releaseDate = new Date(pi.metadata.holdReleaseDate);
        
        if (now >= releaseDate) {
          readyForRelease.push({
            paymentIntentId: pi.id,
            sessionId: pi.metadata.sessionId || '',
            therapistStripeAccountId: pi.metadata.therapistStripeAccountId || '',
            sessionFee: parseFloat(pi.metadata.originalSessionFee || '0'),
            scheduledDate: pi.metadata.scheduledDate || '',
            holdUntil: pi.metadata.holdReleaseDate,
            status: 'held'
          });
        }
      }
    }

    return readyForRelease;
    
  } catch (error) {
    console.error('Error getting payments ready for release:', error);
    throw new Error(`Failed to get pending payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Automated job to release all eligible payments
 */
export async function processScheduledPaymentReleases(): Promise<{
  processed: number;
  failed: number;
  results: Array<{
    paymentIntentId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  try {
    const readyPayments = await getPaymentsReadyForRelease();
    
    console.log(`Processing ${readyPayments.length} payments ready for release`);
    
    let processed = 0;
    let failed = 0;
    const results = [];

    for (const payment of readyPayments) {
      try {
        await releaseSessionPayment(payment.paymentIntentId);
        processed++;
        results.push({
          paymentIntentId: payment.paymentIntentId,
          success: true
        });
        
        console.log(`✅ Released payment ${payment.paymentIntentId} for session ${payment.sessionId}`);
        
      } catch (error) {
        failed++;
        results.push({
          paymentIntentId: payment.paymentIntentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.error(`❌ Failed to release payment ${payment.paymentIntentId}:`, error);
      }
    }

    return { processed, failed, results };
    
  } catch (error) {
    console.error('Error in scheduled payment release job:', error);
    throw error;
  }
}