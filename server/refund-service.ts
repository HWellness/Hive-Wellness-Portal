import { nanoid } from 'nanoid';
import { calculateRefund, RefundCalculationInput } from './refund-policy';
import { storage } from './storage';
import { InsertRefund, Refund, Payment, Appointment } from '@shared/schema';

export interface ProcessRefundRequest {
  appointmentId: string;
  paymentId: string;
  cancelledBy: 'client' | 'therapist' | 'admin' | 'system';
  cancellationReason?: string;
  processedBy?: string; // Admin ID if processed by admin
  notes?: string;
}

export interface RefundResult {
  success: boolean;
  refund?: Refund;
  calculation?: any;
  error?: string;
}

/**
 * Main refund processing service
 * Handles the complete refund workflow according to Holly's policy
 */
export class RefundService {
  
  /**
   * Process a session cancellation and calculate refunds
   */
  async processCancellationRefund(request: ProcessRefundRequest): Promise<RefundResult> {
    try {
      // Get appointment and payment details
      const appointment = await storage.getAppointmentById(request.appointmentId);
      if (!appointment) {
        return { success: false, error: 'Appointment not found' };
      }

      const payment = await storage.getPaymentById(request.paymentId);
      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }

      // Validate payment status
      if (payment.status !== 'succeeded') {
        return { success: false, error: 'Can only refund succeeded payments' };
      }

      // Check if already refunded
      const existingRefund = await storage.getRefundByPaymentId(request.paymentId);
      if (existingRefund) {
        return { success: false, error: 'Payment has already been refunded' };
      }

      // Calculate refund based on policy
      const calculationInput: RefundCalculationInput = {
        originalAmount: parseFloat(payment.amount.toString()),
        therapistEarnings: parseFloat(payment.therapistEarnings?.toString() || '0'),
        stripeProcessingFee: parseFloat(payment.stripeProcessingFee?.toString() || '0'),
        cancellationTime: new Date(),
        sessionTime: appointment.scheduledAt,
        cancelledBy: request.cancelledBy
      };

      const calculation = calculateRefund(calculationInput);

      // Create refund record
      const refundId = nanoid();
      const refundData: InsertRefund = {
        id: refundId,
        paymentId: request.paymentId,
        appointmentId: request.appointmentId,
        clientId: payment.clientId!,
        therapistId: payment.therapistId!,
        originalAmount: payment.amount.toString(),
        refundAmount: calculation.refundAmount.toString(),
        therapistCompensation: calculation.therapistCompensation.toString(),
        stripeProcessingFeeRetained: calculation.stripeProcessingFeeRetained.toString(),
        refundPercentage: calculation.refundPercentage,
        refundReason: calculation.refundReason as any,
        cancellationTime: calculationInput.cancellationTime,
        sessionTime: calculationInput.sessionTime,
        hoursBeforeSession: calculation.hoursBeforeSession.toString(),
        refundPolicy: calculation.refundPolicy,
        processedBy: request.processedBy,
        notes: request.notes,
        status: 'pending'
      };

      // Save refund record
      const refund = await storage.createRefund(refundData);

      // Update appointment status
      await storage.updateAppointment(request.appointmentId, {
        status: 'cancelled',
        cancellationReason: request.cancellationReason || calculation.refundPolicy
      });

      // Update payment status
      const newPaymentStatus = calculation.refundPercentage === 100 ? 'refunded' : 
                               calculation.refundPercentage === 50 ? 'partially_refunded' : 
                               'succeeded'; // No refund, payment stays succeeded

      await storage.updatePaymentStatus(request.paymentId, newPaymentStatus);

      return {
        success: true,
        refund,
        calculation
      };

    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get refund details for display
   */
  async getRefundDetails(refundId: string): Promise<Refund | null> {
    try {
      return await storage.getRefundById(refundId);
    } catch (error) {
      console.error('Error fetching refund details:', error);
      return null;
    }
  }

  /**
   * Get all refunds for a client
   */
  async getClientRefunds(clientId: string): Promise<Refund[]> {
    try {
      return await storage.getRefundsByClientId(clientId);
    } catch (error) {
      console.error('Error fetching client refunds:', error);
      return [];
    }
  }

  /**
   * Get all refunds for a therapist  
   */
  async getTherapistRefunds(therapistId: string): Promise<Refund[]> {
    try {
      return await storage.getRefundsByTherapistId(therapistId);
    } catch (error) {
      console.error('Error fetching therapist refunds:', error);
      return [];
    }
  }

  /**
   * Update refund status (for admin processing)
   */
  async updateRefundStatus(refundId: string, status: string, stripeRefundId?: string): Promise<boolean> {
    try {
      await storage.updateRefund(refundId, {
        status: status as any,
        stripeRefundId,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error updating refund status:', error);
      return false;
    }
  }

  /**
   * Get all pending refunds (for admin dashboard)
   */
  async getPendingRefunds(): Promise<Refund[]> {
    try {
      return await storage.getPendingRefunds();
    } catch (error) {
      console.error('Error fetching pending refunds:', error);
      return [];
    }
  }

  /**
   * Calculate potential refund without processing (for preview)
   */
  async calculatePotentialRefund(appointmentId: string, paymentId: string, cancelledBy: 'client' | 'therapist' | 'admin' | 'system') {
    try {
      const appointment = await storage.getAppointmentById(appointmentId);
      const payment = await storage.getPaymentById(paymentId);

      if (!appointment || !payment) {
        throw new Error('Appointment or payment not found');
      }

      const calculationInput: RefundCalculationInput = {
        originalAmount: parseFloat(payment.amount.toString()),
        therapistEarnings: parseFloat(payment.therapistEarnings?.toString() || '0'),
        stripeProcessingFee: parseFloat(payment.stripeProcessingFee?.toString() || '0'),
        cancellationTime: new Date(),
        sessionTime: appointment.scheduledAt,
        cancelledBy
      };

      return calculateRefund(calculationInput);
    } catch (error) {
      console.error('Error calculating potential refund:', error);
      throw error;
    }
  }
}

export const refundService = new RefundService();