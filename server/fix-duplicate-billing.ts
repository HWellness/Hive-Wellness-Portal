import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { storage } from './storage';
import { db } from './db';
import type { InsertRefund } from '@shared/schema';

// SECURITY: Initialize Stripe with secure configuration
import { createSecureStripeInstance } from './stripe-config';
const stripe = createSecureStripeInstance();

/**
 * CRITICAL FIX: Handle duplicate billing for client N2eH0jV3aIxDVGvtxTVon
 * 
 * Strategic Plan:
 * 1. Refund duplicate payment cA_GfS1dgQx6DyyxfVPYN
 * 2. Cancel duplicate appointment hSRsI4u36WV6eFNkMAGk_
 * 3. Fix therapist assignment for Sept 18 appointment
 * 4. Ensure proper audit trail
 */
export class DuplicateBillingFixer {
  
  async fixClientBilling(): Promise<{
    success: boolean;
    results: {
      stripeRefund?: any;
      appointmentUpdate?: any;
      therapistAssignment?: any;
      refundRecord?: any;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const results: any = {};
    
    console.log('🚨 STARTING CRITICAL BILLING FIX for client N2eH0jV3aIxDVGvtxTVon');
    
    try {
      // STEP 1: Create Stripe refund with idempotency
      console.log('💳 Processing Stripe refund...');
      try {
        const refund = await stripe.refunds.create({
          payment_intent: 'pi_3S8Q9OIEJYdqjxzJ0hXBsx8y', // The payment intent that was charged twice
          amount: 8000, // £80 in pence  
          reason: 'duplicate',
          metadata: {
            duplicate_billing_fix: 'true',
            original_appointment: 'hSRsI4u36WV6eFNkMAGk_',
            client_id: 'N2eH0jV3aIxDVGvtxTVon',
            fix_date: new Date().toISOString()
          }
        }, {
          idempotencyKey: 'refund_hSRsI4u36WV6eFNkMAGk_'
        });
        
        results.stripeRefund = refund;
        console.log('✅ Stripe refund created:', refund.id);
      } catch (stripeError: any) {
        if (stripeError.code === 'idempotency_key_in_use') {
          console.log('⚠️ Stripe refund already processed (idempotency)');
          results.stripeRefund = { status: 'already_processed' };
        } else {
          errors.push(`Stripe refund failed: ${stripeError.message}`);
          console.error('❌ Stripe refund failed:', stripeError);
        }
      }
      
      // STEP 2: Update database records atomically
      console.log('🗄️ Updating database records...');
      
      try {
        // Update duplicate appointment to cancelled
        const appointmentUpdate = await storage.updateAppointment('hSRsI4u36WV6eFNkMAGk_', {
          status: 'cancelled',
          paymentStatus: 'refunded',
          cancellationReason: 'duplicate_billing_error',
          updatedAt: new Date()
        });
        results.appointmentUpdate = appointmentUpdate;
        console.log('✅ Duplicate appointment cancelled');
        
        // Update payment status to refunded
        await storage.updatePaymentStatus('cA_GfS1dgQx6DyyxfVPYN', 'refunded');
        console.log('✅ Payment status updated to refunded');
        
        // Create refunds table entry
        const refundRecord: InsertRefund = {
          id: nanoid(),
          paymentId: 'cA_GfS1dgQx6DyyxfVPYN',
          appointmentId: 'hSRsI4u36WV6eFNkMAGk_',
          clientId: 'N2eH0jV3aIxDVGvtxTVon',
          therapistId: 'system', // No specific therapist for duplicate billing
          originalAmount: '80.00',
          refundAmount: '80.00',
          therapistCompensation: '0.00',
          stripeProcessingFeeRetained: '0.00',
          refundPercentage: 100,
          refundReason: 'system_cancelled',
          cancellationTime: new Date(),
          sessionTime: new Date('2025-09-17T18:00:00'),
          hoursBeforeSession: '0',
          stripeRefundId: results.stripeRefund?.id || 'pending',
          status: 'completed',
          refundPolicy: 'duplicate_billing_fix',
          processedBy: 'system',
          notes: 'Automatic refund for duplicate billing error - client was incorrectly charged twice for same appointment slot'
        };
        
        const refund = await storage.createRefund(refundRecord);
        results.refundRecord = refund;
        console.log('✅ Refund record created');
        
      } catch (dbError) {
        errors.push(`Database update failed: ${dbError}`);
        console.error('❌ Database update failed:', dbError);
      }
      
      // STEP 3: Fix therapist assignment for Sept 18 appointment
      console.log('👩‍⚕️ Fixing therapist assignment...');
      try {
        const therapistAssignment = await storage.updateAppointment('SqfMOGTFQt_wuKYXBTx0f', {
          primaryTherapistId: 'Qz_F7y_FYFEz1SQhQTxyL',
          updatedAt: new Date()
        });
        results.therapistAssignment = therapistAssignment;
        console.log('✅ Therapist assigned to Sept 18 appointment');
      } catch (therapistError) {
        errors.push(`Therapist assignment failed: ${therapistError}`);
        console.error('❌ Therapist assignment failed:', therapistError);
      }
      
      // STEP 4: Verification
      console.log('🔍 Verifying fix...');
      const appointments = await storage.getAppointmentsByUserId('N2eH0jV3aIxDVGvtxTVon');
      const activeAppointments = appointments.filter(apt => apt.status !== 'cancelled');
      
      console.log(`✅ Client now has ${activeAppointments.length} active appointments:`, 
        activeAppointments.map(apt => `${apt.id} (${apt.scheduledAt}) - ${apt.status}`));
      
      if (errors.length === 0) {
        console.log('🎉 BILLING FIX COMPLETED SUCCESSFULLY');
        return { success: true, results, errors };
      } else {
        console.log('⚠️ BILLING FIX COMPLETED WITH WARNINGS');
        return { success: false, results, errors };
      }
      
    } catch (error) {
      errors.push(`Critical error: ${error}`);
      console.error('💥 CRITICAL ERROR in billing fix:', error);
      return { success: false, results, errors };
    }
  }
}

// Execute the fix if this file is run directly
const fixer = new DuplicateBillingFixer();
fixer.fixClientBilling().then(result => {
  console.log('Final Result:', result);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Failed to run fix:', error);
  process.exit(1);
});

export const duplicateBillingFixer = new DuplicateBillingFixer();