import Stripe from "stripe";
import { storage } from "../storage";
import { createSecureStripeInstance } from "../stripe-config";

// SECURITY: Initialize Stripe with secure environment-based configuration
const stripe = createSecureStripeInstance();

export interface StripeConnectAccountData {
  email: string;
  firstName: string;
  lastName: string;
  businessType: 'individual' | 'company';
  country: string;
  phone?: string;
  dateOfBirth?: {
    day: number;
    month: number;
    year: number;
  };
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  bankAccount?: {
    account_number: string;
    routing_number: string;
    account_holder_type: 'individual' | 'company';
  };
  businessProfile?: {
    name: string;
    product_description: string;
    support_phone: string;
    support_email: string;
    url?: string;
  };
}

export class StripeConnectManager {
  private static instance: StripeConnectManager;

  public static getInstance(): StripeConnectManager {
    if (!StripeConnectManager.instance) {
      StripeConnectManager.instance = new StripeConnectManager();
    }
    return StripeConnectManager.instance;
  }

  /**
   * Create a Stripe Connect Express account for a therapist
   */
  async createExpressAccount(accountData: StripeConnectAccountData): Promise<string> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: accountData.country,
        email: accountData.email,
        business_type: accountData.businessType,
        individual: accountData.businessType === 'individual' ? {
          email: accountData.email,
          first_name: accountData.firstName,
          last_name: accountData.lastName,
          phone: accountData.phone,
          dob: accountData.dateOfBirth,
          address: accountData.address,
        } : undefined,
        company: accountData.businessType === 'company' ? {
          name: accountData.businessProfile?.name,
          phone: accountData.phone,
          address: accountData.address,
        } : undefined,
        business_profile: accountData.businessProfile ? {
          name: accountData.businessProfile.name,
          product_description: accountData.businessProfile.product_description,
          support_phone: accountData.businessProfile.support_phone,
          support_email: accountData.businessProfile.support_email,
          url: accountData.businessProfile.url,
          mcc: '8999', // Social Services - Mental Health Services
        } : undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'weekly',
              weekly_anchor: 'friday'
            }
          }
        }
      });

      return account.id;
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      throw new Error('Failed to create Stripe Connect account');
    }
  }

  /**
   * Create an onboarding link for Express account setup
   */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      console.error('Error creating account link:', error);
      throw new Error('Failed to create account onboarding link');
    }
  }

  /**
   * Get account status and details
   */
  async getAccountStatus(accountId: string): Promise<any> {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      
      return {
        id: account.id,
        type: account.type,
        email: account.email,
        country: account.country,
        default_currency: account.default_currency,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          pending_verification: account.requirements?.pending_verification || [],
          disabled_reason: account.requirements?.disabled_reason,
        },
        capabilities: account.capabilities,
        business_profile: account.business_profile,
        individual: account.individual ? {
          first_name: account.individual.first_name,
          last_name: account.individual.last_name,
          email: account.individual.email,
        } : null,
        company: account.company ? {
          name: account.company.name,
        } : null,
      };
    } catch (error) {
      console.error('Error retrieving account status:', error);
      throw new Error('Failed to retrieve account status');
    }
  }

  /**
   * Create a transfer to a connected account (therapist payout)
   */
  async createTransfer(
    accountId: string, 
    amount: number, 
    currency: string = 'gbp',
    transferGroup?: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to pence
        currency,
        destination: accountId,
        transfer_group: transferGroup,
        metadata,
      });

      return transfer.id;
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw new Error('Failed to create transfer');
    }
  }

  /**
   * Process a therapy session payment with automatic therapist payout
   */
  async processSessionPayment(
    sessionPaymentData: {
      clientId: string;
      therapistId: string;
      appointmentId: string;
      totalAmount: number;
      platformFeePercentage: number;
      currency?: string;
      paymentMethodId: string;
    }
  ): Promise<{
    paymentIntentId: string;
    transferId?: string;
    platformFee: number;
    therapistPayout: number;
  }> {
    try {
      const { 
        totalAmount, 
        platformFeePercentage, 
        currency = 'gbp',
        paymentMethodId,
        therapistId,
        appointmentId 
      } = sessionPaymentData;

      // Calculate fees
      const platformFee = Math.round(totalAmount * (platformFeePercentage / 100) * 100) / 100;
      const therapistPayout = totalAmount - platformFee;

      // Get therapist's Stripe account
      const therapistProfile = await storage.getTherapistProfile(therapistId);
      if (!therapistProfile?.stripeConnectAccountId) {
        throw new Error('Therapist has not completed Stripe Connect onboarding');
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to pence
        currency,
        payment_method: paymentMethodId,
        confirm: true,
        application_fee_amount: Math.round(platformFee * 100),
        transfer_data: {
          destination: therapistProfile.stripeConnectAccountId,
        },
        metadata: {
          appointmentId,
          therapistId,
          platformFee: platformFee.toString(),
          therapistPayout: therapistPayout.toString(),
        },
      });

      // Record payment in database
      await storage.createPayment({
        id: `payment_${Date.now()}`,
        userId: sessionPaymentData.clientId,
        appointmentId,
        amount: totalAmount.toString(),
        currency,
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
        stripePaymentIntentId: paymentIntent.id,
        platformFee: platformFee.toString(),
        therapistPayout: therapistPayout.toString(),
      });

      return {
        paymentIntentId: paymentIntent.id,
        platformFee,
        therapistPayout,
      };
    } catch (error) {
      console.error('Error processing session payment:', error);
      throw new Error('Failed to process session payment');
    }
  }

  /**
   * Get transfer history for a therapist
   */
  async getTherapistTransfers(accountId: string, limit: number = 20): Promise<any[]> {
    try {
      const transfers = await stripe.transfers.list({
        destination: accountId,
        limit,
      });

      return transfers.data.map(transfer => ({
        id: transfer.id,
        amount: transfer.amount / 100, // Convert from pence
        currency: transfer.currency,
        created: new Date(transfer.created * 1000),
        description: transfer.description,
        metadata: transfer.metadata,
        status: transfer.status || 'completed',
      }));
    } catch (error) {
      console.error('Error retrieving transfers:', error);
      throw new Error('Failed to retrieve transfer history');
    }
  }

  /**
   * Get earnings summary for a therapist
   */
  async getTherapistEarnings(
    accountId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    totalEarnings: number;
    totalTransfers: number;
    pendingEarnings: number;
    transferCount: number;
  }> {
    try {
      const transfers = await stripe.transfers.list({
        destination: accountId,
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        limit: 100,
      });

      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId,
      });

      const totalEarnings = transfers.data.reduce((sum, transfer) => sum + transfer.amount, 0) / 100;
      const pendingEarnings = balance.pending.reduce((sum, pending) => sum + pending.amount, 0) / 100;

      return {
        totalEarnings,
        totalTransfers: totalEarnings,
        pendingEarnings,
        transferCount: transfers.data.length,
      };
    } catch (error) {
      console.error('Error retrieving earnings:', error);
      throw new Error('Failed to retrieve earnings summary');
    }
  }

  /**
   * Update bank account information
   */
  async updateBankAccount(
    accountId: string,
    bankAccountData: {
      account_number: string;
      routing_number: string;
      account_holder_type: 'individual' | 'company';
    }
  ): Promise<void> {
    try {
      await stripe.accounts.createExternalAccount(accountId, {
        external_account: {
          object: 'bank_account',
          country: 'GB',
          currency: 'gbp',
          account_number: bankAccountData.account_number,
          routing_number: bankAccountData.routing_number,
          account_holder_type: bankAccountData.account_holder_type,
        },
      });
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw new Error('Failed to update bank account');
    }
  }

  /**
   * Generate OAuth link for Express Dashboard access
   */
  async createDashboardLink(accountId: string): Promise<string> {
    try {
      const link = await stripe.accounts.createLoginLink(accountId);
      return link.url;
    } catch (error) {
      console.error('Error creating dashboard link:', error);
      throw new Error('Failed to create dashboard access link');
    }
  }

  /**
   * Validate webhook signature for Connect events
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      console.error('Webhook signature validation failed:', error);
      return false;
    }
  }

  /**
   * Handle Connect webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'account.updated':
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;
        case 'account.application.deauthorized':
          await this.handleAccountDeauthorized(event.data.object as any);
          break;
        case 'transfer.created':
          await this.handleTransferCreated(event.data.object as Stripe.Transfer);
          break;
        case 'transfer.paid':
          await this.handleTransferPaid(event.data.object as Stripe.Transfer);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    // Update therapist profile with account status changes
    console.log(`Account updated: ${account.id}, charges_enabled: ${account.charges_enabled}`);
  }

  private async handleAccountDeauthorized(data: any): Promise<void> {
    // Handle when a therapist disconnects their account
    console.log(`Account deauthorized: ${data.account}`);
  }

  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    // Log transfer creation
    console.log(`Transfer created: ${transfer.id} for ${transfer.amount / 100} ${transfer.currency}`);
  }

  private async handleTransferPaid(transfer: Stripe.Transfer): Promise<void> {
    // Update payment status when transfer is completed
    console.log(`Transfer paid: ${transfer.id}`);
  }
}

export const stripeConnect = StripeConnectManager.getInstance();