import { db } from "./db";
import { eq, and, sql } from 'drizzle-orm';
import { appointments, users, therapistProfiles, payments } from '../shared/schema';
import { VideoSessionService, VideoSessionData } from './video-session-service';
import { createPaymentWithRevenueSplit, checkTherapistAccountStatus } from './stripe-revenue-split';
import { createSessionPaymentWithHold, releaseSessionPayment } from './stripe-payment-holds';
import { storage } from './storage';
import { nanoid } from 'nanoid';
// ELEMENT #5: Import TherapistPayoutService for automated payout triggering
import { triggerTherapistPayoutOnSessionCompletion } from './therapist-payout-service';

export interface SessionPaymentResult {
  success: boolean;
  paymentId?: string;
  sessionId: string;
  amount: number;
  therapistAmount: number;
  platformAmount: number;
  paymentStatus: 'completed' | 'pending' | 'failed' | 'requires_confirmation';
  message: string;
  clientSecret?: string; // For client-side payment confirmation
  error?: string;
  requiresManualCompletion?: boolean;
}

export interface SessionCompletionData {
  sessionId: string;
  userId: string; // User who initiated completion
  userRole: 'client' | 'therapist' | 'admin';
  actualDuration?: number; // Minutes
  completedBy: 'participant' | 'system' | 'admin';
  reason?: string;
  sessionStartTime?: Date;
  sessionEndTime?: Date;
}

/**
 * PRODUCTION-READY Session Payment Service
 * 
 * This service provides comprehensive integration between video session completion
 * and Stripe payment processing, ensuring 100% reliability for production use.
 * 
 * Key Features:
 * - Automatic payment processing on session completion
 * - 85/15 revenue split with therapists
 * - Comprehensive error handling and retry logic
 * - Integration with existing Stripe Connect infrastructure
 * - Complete audit trail and logging
 * - Support for both immediate and deferred payment confirmation
 */
export class SessionPaymentService {
  
  /**
   * MAIN ENTRY POINT: Complete a video session and process payment
   * 
   * This method handles the complete flow from session completion to payment processing,
   * ensuring reliability and comprehensive error handling.
   */
  static async completeSessionWithPayment(
    sessionData: SessionCompletionData,
    options?: {
      idempotencyKey?: string;
      paymentTiming?: 'immediate' | 'deferred';
      skipValidation?: boolean;
    }
  ): Promise<SessionPaymentResult> {
    const { sessionId, userId, userRole } = sessionData;
    const { idempotencyKey, paymentTiming = 'immediate', skipValidation = false } = options || {};
    
    console.log(`🏁 SessionPaymentService: Starting session completion for ${sessionId} by ${userId} (${userRole})`);
    
    try {
      // STEP 1: Validate session data and authorization
      const validationResult = await this.validateSessionCompletion(sessionData);
      if (!validationResult.valid) {
        console.error(`❌ Session validation failed: ${validationResult.error}`);
        return {
          success: false,
          sessionId,
          amount: 0,
          therapistAmount: 0,
          platformAmount: 0,
          paymentStatus: 'failed',
          message: `Session validation failed: ${validationResult.error}`,
          error: validationResult.error
        };
      }
      
      const { sessionDetails, appointment, therapistProfile, client } = validationResult;
      
      // STEP 2: Check for existing payment (idempotency protection)
      const existingPayment = await storage.getPaymentByAppointmentId(sessionId);
      if (existingPayment) {
        console.log(`⚠️ Payment already exists for session ${sessionId}: ${existingPayment.status}`);
        
        if (existingPayment.status === 'succeeded' || existingPayment.status === 'completed') {
          // Mark session as completed if not already
          await this.markSessionCompleted(sessionId, existingPayment.id);
          
          return {
            success: true,
            paymentId: existingPayment.id,
            sessionId,
            amount: parseFloat(existingPayment.amount),
            therapistAmount: parseFloat(existingPayment.therapistEarnings || '0'),
            platformAmount: parseFloat(existingPayment.platformFee || '0'),
            paymentStatus: 'completed',
            message: 'Session already completed with successful payment'
          };
        } else if (existingPayment.status === 'processing' || existingPayment.status === 'pending') {
          return {
            success: false,
            paymentId: existingPayment.id,
            sessionId,
            amount: parseFloat(existingPayment.amount),
            therapistAmount: 0,
            platformAmount: 0,
            paymentStatus: 'pending',
            message: 'Payment is already in progress for this session',
            error: 'PAYMENT_IN_PROGRESS'
          };
        }
      }
      
      // STEP 3: Determine if payment is required
      if (!this.sessionRequiresPayment(sessionDetails)) {
        console.log(`ℹ️ Session ${sessionId} does not require payment - completing without charge`);
        await this.markSessionCompleted(sessionId);
        
        return {
          success: true,
          sessionId,
          amount: 0,
          therapistAmount: 0,
          platformAmount: 0,
          paymentStatus: 'completed',
          message: 'Session completed successfully (no payment required)'
        };
      }
      
      // STEP 4: Process payment for paid sessions
      console.log(`💰 Processing payment for session ${sessionId}`);
      const paymentResult = await this.processSessionPayment({
        sessionId,
        appointment,
        therapistProfile,
        client,
        sessionDetails,
        completionData: sessionData,
        idempotencyKey: idempotencyKey || `session-${sessionId}-${Date.now()}`,
        paymentTiming
      });
      
      if (paymentResult.success) {
        console.log(`✅ Payment processed successfully for session ${sessionId}: ${paymentResult.paymentId}`);
        
        // Only mark session as completed for immediate payments or successful deferred payments
        if (paymentTiming === 'immediate' || paymentResult.paymentStatus === 'completed') {
          await this.markSessionCompleted(sessionId, paymentResult.paymentId);
        }
      } else {
        console.error(`❌ Payment processing failed for session ${sessionId}: ${paymentResult.error}`);
      }
      
      return paymentResult;
      
    } catch (error) {
      console.error(`❌ SessionPaymentService: Unexpected error completing session ${sessionId}:`, error);
      
      return {
        success: false,
        sessionId,
        amount: 0,
        therapistAmount: 0,
        platformAmount: 0,
        paymentStatus: 'failed',
        message: 'Unexpected error during session completion',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * VALIDATION: Comprehensive session completion validation
   */
  private static async validateSessionCompletion(sessionData: SessionCompletionData): Promise<{
    valid: boolean;
    error?: string;
    sessionDetails?: VideoSessionData;
    appointment?: any;
    therapistProfile?: any;
    client?: any;
  }> {
    const { sessionId, userId, userRole } = sessionData;
    
    try {
      // Get session details
      const sessionDetails = await VideoSessionService.getVideoSession(sessionId);
      if (!sessionDetails) {
        return { valid: false, error: 'Session not found' };
      }
      
      // Validate user authorization
      const isAuthorized = 
        userId === sessionDetails.clientId ||
        userId === sessionDetails.therapistId ||
        userRole === 'admin';
        
      if (!isAuthorized) {
        return { valid: false, error: 'User not authorized to complete this session' };
      }
      
      // Get appointment and related data for payment sessions
      if (sessionDetails.sessionType === 'therapy') {
        const appointmentResult = await db.select({
          appointment: appointments,
          therapist: therapistProfiles
        })
        .from(appointments)
        .leftJoin(therapistProfiles, eq(appointments.primaryTherapistId, therapistProfiles.userId))
        .where(eq(appointments.id, sessionId));
        
        if (!appointmentResult || appointmentResult.length === 0) {
          return { valid: false, error: 'Appointment data not found' };
        }
        
        const appointment = appointmentResult[0].appointment;
        const therapistProfile = appointmentResult[0].therapist;
        
        // Get client data
        const clientResult = appointment.clientId ? 
          await db.select().from(users).where(eq(users.id, appointment.clientId)) : [];
        const client = clientResult[0];
        
        return { 
          valid: true, 
          sessionDetails, 
          appointment, 
          therapistProfile, 
          client 
        };
      }
      
      return { valid: true, sessionDetails };
      
    } catch (error) {
      console.error(`❌ Validation error for session ${sessionId}:`, error);
      return { 
        valid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  /**
   * PAYMENT PROCESSING: Core payment processing logic
   */
  private static async processSessionPayment(params: {
    sessionId: string;
    appointment: any;
    therapistProfile: any;
    client: any;
    sessionDetails: VideoSessionData;
    completionData: SessionCompletionData;
    idempotencyKey: string;
    paymentTiming: 'immediate' | 'deferred';
  }): Promise<SessionPaymentResult> {
    const { 
      sessionId, 
      appointment, 
      therapistProfile, 
      client, 
      sessionDetails, 
      completionData,
      idempotencyKey,
      paymentTiming 
    } = params;
    
    try {
      // FREE FIRST SESSION: Check if this is a free session
      const { checkFreeSessionEligibility } = await import('./utils/free-session.js');
      const sessionPrice = parseFloat(appointment.price?.toString() || '0');
      
      // Detect free session: price is 0 and client had free session eligibility
      const isFreeSession = sessionPrice === 0 && client.freeSessionUsed && client.freeSessionAppointmentId === sessionId;
      
      // Validate payment prerequisites (allow free sessions to proceed)
      if (!isFreeSession && (!appointment.price || sessionPrice <= 0)) {
        return {
          success: false,
          sessionId,
          amount: 0,
          therapistAmount: 0,
          platformAmount: 0,
          paymentStatus: 'failed',
          message: 'No valid price set for this session',
          error: 'NO_PRICE_CONFIGURED'
        };
      }
      
      if (!therapistProfile?.stripeConnectAccountId) {
        return {
          success: false,
          sessionId,
          amount: 0,
          therapistAmount: 0,
          platformAmount: 0,
          paymentStatus: 'failed',
          message: 'Therapist Stripe account not configured',
          error: 'THERAPIST_STRIPE_NOT_CONFIGURED'
        };
      }
      
      const sessionFee = isFreeSession ? 0 : parseFloat(appointment.price.toString());
      
      // Verify therapist Stripe account status
      const accountStatus = await checkTherapistAccountStatus(therapistProfile.stripeConnectAccountId);
      if (!accountStatus.chargesEnabled || !accountStatus.payoutsEnabled) {
        return {
          success: false,
          sessionId,
          amount: sessionFee,
          therapistAmount: 0,
          platformAmount: 0,
          paymentStatus: 'failed',
          message: 'Therapist Stripe account not ready for payments',
          error: 'THERAPIST_ACCOUNT_NOT_READY'
        };
      }
      
      // FREE FIRST SESSION: Handle free sessions differently
      if (isFreeSession) {
        console.log(`🎁 Processing FREE first session for ${client.email} - paying therapist from platform funds`);
        
        // For free sessions, calculate standard fee (£80) and pay therapist 85%
        const standardSessionFee = 80; // Standard session price
        const therapistAmount = standardSessionFee * 0.85; // £68
        
        // Pay therapist directly from platform funds
        const { processTherapistPayout } = await import('./stripe-revenue-split.js');
        const transferId = await processTherapistPayout(
          therapistProfile.stripeConnectAccountId,
          therapistAmount,
          `Free First Session Payment - ${client.firstName} ${client.lastName}`,
          idempotencyKey
        );
        
        console.log(`✅ Free session: Therapist paid £${therapistAmount} from platform funds (transfer: ${transferId})`);
        
        // Create payment record for tracking
        const paymentRecord = await storage.createPaymentWithIdempotency({
          id: nanoid(),
          appointmentId: appointment.id,
          userId: appointment.clientId,
          clientId: appointment.clientId,
          therapistId: appointment.primaryTherapistId,
          amount: '0', // Client paid nothing
          therapistEarnings: therapistAmount.toString(),
          platformFee: (-therapistAmount).toString(), // Platform absorbed the cost
          stripePaymentIntentId: `free_session_${transferId}`,
          paymentMethod: 'platform_promotional',
          status: 'succeeded',
          currency: 'gbp',
          createdAt: new Date(),
          updatedAt: new Date()
        }, idempotencyKey);
        
        await storage.updateAppointmentWithPaymentStatus(sessionId, 'completed', 'paid');
        
        return {
          success: true,
          paymentId: paymentRecord.id,
          sessionId,
          amount: 0,
          therapistAmount,
          platformAmount: -therapistAmount,
          paymentStatus: 'completed',
          message: 'Free first session completed - therapist paid from platform funds'
        };
      }
      
      console.log(`💳 Creating payment for session ${sessionId}: £${sessionFee} (${paymentTiming})`);
      
      // Create payment with revenue split (regular paid sessions)
      const paymentResult = await createPaymentWithRevenueSplit({
        sessionFee,
        therapistStripeAccountId: therapistProfile.stripeConnectAccountId,
        description: `Therapy Session - ${client?.firstName || 'Client'} with ${sessionDetails.therapistName}`,
        metadata: {
          appointmentId: appointment.id,
          sessionType: 'therapy',
          clientId: appointment.clientId,
          therapistId: appointment.primaryTherapistId,
          sessionDuration: appointment.duration?.toString() || '50',
          completedAt: new Date().toISOString(),
          completedBy: completionData.completedBy,
          idempotencyKey
        },
        paymentTiming: paymentTiming === 'immediate' ? 'upfront' : 'completion',
        confirmationMethod: paymentTiming === 'immediate' ? 'automatic' : 'manual'
      });
      
      console.log(`✅ Stripe payment intent created: ${paymentResult.paymentIntentId}`);
      
      // Create payment record in database
      const paymentRecord = await storage.createPaymentWithIdempotency({
        id: nanoid(),
        appointmentId: appointment.id,
        userId: appointment.clientId,
        clientId: appointment.clientId,
        therapistId: appointment.primaryTherapistId,
        amount: sessionFee.toString(),
        therapistEarnings: paymentResult.therapistAmount.toString(),
        platformFee: paymentResult.platformAmount.toString(),
        stripePaymentIntentId: paymentResult.paymentIntentId,
        paymentMethod: 'stripe',
        status: paymentTiming === 'immediate' ? 'processing' : 'pending',
        currency: 'gbp',
        createdAt: new Date(),
        updatedAt: new Date()
      }, idempotencyKey);
      
      console.log(`💾 Payment record created: ${paymentRecord.id}`);
      
      // Update appointment status based on payment timing
      const appointmentStatus = paymentTiming === 'immediate' ? 'completed' : 'pending_payment';
      const paymentStatus = paymentTiming === 'immediate' ? 'processing' : 'pending';
      
      await storage.updateAppointmentWithPaymentStatus(sessionId, appointmentStatus, paymentStatus);
      
      return {
        success: true,
        paymentId: paymentRecord.id,
        sessionId,
        amount: sessionFee,
        therapistAmount: paymentResult.therapistAmount,
        platformAmount: paymentResult.platformAmount,
        paymentStatus: paymentTiming === 'immediate' ? 'pending' : 'requires_confirmation',
        message: paymentTiming === 'immediate' ? 
          'Payment processed successfully' : 
          'Session completed - payment confirmation required',
        clientSecret: paymentTiming === 'deferred' ? paymentResult.clientSecret : undefined,
        requiresManualCompletion: paymentTiming === 'deferred'
      };
      
    } catch (error) {
      console.error(`❌ Payment processing error for session ${sessionId}:`, error);
      
      // Update appointment status to indicate payment failure
      try {
        await storage.updateAppointmentWithPaymentStatus(sessionId, 'payment_failed', 'failed');
      } catch (statusError) {
        console.error(`❌ Failed to update payment failure status:`, statusError);
      }
      
      return {
        success: false,
        sessionId,
        amount: 0,
        therapistAmount: 0,
        platformAmount: 0,
        paymentStatus: 'failed',
        message: 'Payment processing failed',
        error: error instanceof Error ? error.message : 'Unknown payment error'
      };
    }
  }
  
  /**
   * PAYMENT CONFIRMATION: Handle deferred payment confirmation
   */
  static async confirmSessionPayment(
    sessionId: string,
    paymentIntentId: string,
    userId: string
  ): Promise<SessionPaymentResult> {
    console.log(`💳 ENHANCED CONFIRMATION: Confirming payment ${paymentIntentId} for session ${sessionId} by user ${userId}`);
    
    try {
      // Use the comprehensive PaymentConfirmationService with retry logic and error handling
      const { PaymentConfirmationService } = await import('./payment-confirmation-service');
      
      const confirmationResult = await PaymentConfirmationService.confirmPayment(
        sessionId, 
        paymentIntentId, 
        userId,
        {
          maxRetries: 3,
          retryDelayMs: 2000,
          backoffMultiplier: 2,
          maxDelayMs: 30000
        }
      );
      
      // Transform PaymentConfirmationService result to SessionPaymentResult format
      const result: SessionPaymentResult = {
        success: confirmationResult.success,
        sessionId: confirmationResult.sessionId,
        paymentId: confirmationResult.paymentId,
        paymentStatus: this.mapPaymentStatus(confirmationResult.paymentStatus),
        amount: parseFloat(confirmationResult.amount || '0'),
        therapistAmount: parseFloat(confirmationResult.therapistAmount || '0'),
        platformAmount: parseFloat(confirmationResult.platformAmount || '0'),
        message: confirmationResult.message,
        error: confirmationResult.lastError,
        metadata: {
          confirmationAttempts: confirmationResult.attempts,
          retryLogic: 'enabled',
          paymentConfirmationService: 'v1.0',
          nextRetry: confirmationResult.nextRetry?.toISOString(),
          requiresAction: confirmationResult.requiresAction
        }
      };
      
      // Enhanced audit logging
      if (confirmationResult.success) {
        console.log(`🎉 ENHANCED CONFIRMATION SUCCESS: Session ${sessionId} payment confirmed after ${confirmationResult.attempts} attempts`);
      } else {
        console.log(`❌ ENHANCED CONFIRMATION FAILED: Session ${sessionId} payment failed after ${confirmationResult.attempts} attempts: ${confirmationResult.lastError}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Enhanced payment confirmation service failed:`, error);
      
      return {
        success: false,
        sessionId,
        amount: 0,
        therapistAmount: 0,
        platformAmount: 0,
        paymentStatus: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: 'ENHANCED_CONFIRMATION_SERVICE_ERROR',
        metadata: {
          confirmationAttempts: 0,
          retryLogic: 'failed_to_initialize',
          fallbackUsed: false
        }
      };
    }
  }
  
  /**
   * UTILITY: Map payment confirmation service status to session payment status
   */
  private static mapPaymentStatus(status: 'succeeded' | 'failed' | 'pending' | 'requires_action' | 'cancelled'): 'completed' | 'failed' | 'pending' | 'processing' {
    switch (status) {
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      case 'requires_action':
        return 'pending';
      case 'pending':
      default:
        return 'processing';
    }
  }
  
  /**
   * SESSION MANAGEMENT: Mark session as completed
   * 
   * ELEMENT #5: This method now triggers automated therapist payouts
   * when sessions are completed with successful payments.
   */
  private static async markSessionCompleted(sessionId: string, paymentId?: string): Promise<void> {
    try {
      await storage.updateAppointmentStatus(sessionId, 'completed');
      
      if (paymentId) {
        console.log(`✅ Session ${sessionId} marked as completed with payment ${paymentId}`);
        
        // 🛡️ CRITICAL FINANCIAL SAFETY: Check if payout already completed before triggering
        const paymentRecord = await storage.getPaymentById(paymentId);
        if (paymentRecord && paymentRecord.payoutCompleted) {
          console.log(`🛡️ [RACE PROTECTION] Payout already completed for payment ${paymentId} - skipping duplicate trigger`);
        } else {
          // ELEMENT #5: Trigger automated therapist payout for completed session
          console.log(`💰 ELEMENT #5: Triggering therapist payout for session ${sessionId} with payment ${paymentId}`);
          
          try {
            const payoutResult = await triggerTherapistPayoutOnSessionCompletion(
              sessionId,
              paymentId,
              'session_completion'
            );
            
            if (payoutResult.success) {
              console.log(`✅ ELEMENT #5: Therapist payout ${payoutResult.payoutId} triggered successfully for session ${sessionId}`);
            } else {
              console.error(`❌ ELEMENT #5: Therapist payout failed for session ${sessionId}: ${payoutResult.message}`);
              // Note: We don't throw here as session completion should succeed even if payout fails
              // Payout failures will be handled by retry logic in TherapistPayoutService
            }
          } catch (payoutError) {
            console.error(`❌ ELEMENT #5: Unexpected error triggering therapist payout for session ${sessionId}:`, payoutError);
            // Log but don't fail session completion - payout can be retried
          }
        }
      } else {
        console.log(`✅ Session ${sessionId} marked as completed (no payment required)`);
      }
    } catch (error) {
      console.error(`❌ Failed to mark session ${sessionId} as completed:`, error);
      throw error;
    }
  }
  
  /**
   * BUSINESS LOGIC: Determine if session requires payment
   */
  private static sessionRequiresPayment(sessionDetails: VideoSessionData): boolean {
    // Only therapy sessions require payment
    // Introduction calls and other session types are typically free
    return sessionDetails.sessionType === 'therapy';
  }
  
  /**
   * RETRY MECHANISM: Retry failed payment processing
   */
  static async retryFailedSessionPayment(sessionId: string, adminUserId: string): Promise<SessionPaymentResult> {
    console.log(`🔄 Retrying failed payment for session ${sessionId} by admin ${adminUserId}`);
    
    try {
      // Get existing payment record
      const existingPayment = await storage.getPaymentByAppointmentId(sessionId);
      if (existingPayment && (existingPayment.status === 'succeeded' || existingPayment.status === 'completed')) {
        return {
          success: true,
          paymentId: existingPayment.id,
          sessionId,
          amount: parseFloat(existingPayment.amount),
          therapistAmount: parseFloat(existingPayment.therapistEarnings || '0'),
          platformAmount: parseFloat(existingPayment.platformFee || '0'),
          paymentStatus: 'completed',
          message: 'Payment already successful - no retry needed'
        };
      }
      
      // Create new completion attempt with admin privileges
      return await this.completeSessionWithPayment({
        sessionId,
        userId: adminUserId,
        userRole: 'admin',
        completedBy: 'admin',
        reason: 'payment_retry'
      }, {
        idempotencyKey: `retry-${sessionId}-${Date.now()}`,
        paymentTiming: 'immediate'
      });
      
    } catch (error) {
      console.error(`❌ Payment retry failed for session ${sessionId}:`, error);
      
      return {
        success: false,
        sessionId,
        amount: 0,
        therapistAmount: 0,
        platformAmount: 0,
        paymentStatus: 'failed',
        message: 'Payment retry failed',
        error: error instanceof Error ? error.message : 'Unknown retry error'
      };
    }
  }
  
  /**
   * MONITORING: Get payment status for session
   */
  static async getSessionPaymentStatus(sessionId: string): Promise<{
    hasPayment: boolean;
    paymentStatus?: string;
    amount?: number;
    paymentId?: string;
    error?: string;
  }> {
    try {
      const payment = await storage.getPaymentByAppointmentId(sessionId);
      
      if (!payment) {
        return { hasPayment: false };
      }
      
      return {
        hasPayment: true,
        paymentStatus: payment.status,
        amount: parseFloat(payment.amount),
        paymentId: payment.id
      };
      
    } catch (error) {
      console.error(`❌ Error getting payment status for session ${sessionId}:`, error);
      return {
        hasPayment: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}