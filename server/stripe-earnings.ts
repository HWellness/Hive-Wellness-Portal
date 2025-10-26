import Stripe from 'stripe';
import { createSecureStripeInstance } from './stripe-config';

// SECURITY: Initialize Stripe with secure environment-based configuration
const stripe = createSecureStripeInstance();

export interface TherapistEarnings {
  totalEarnings: number;
  pendingEarnings: number;
  availableForPayout: number;
  thisMonthEarnings: number;
  thisWeekEarnings: number;
  todayEarnings: number;
  sessionsThisMonth: number;
  averageSessionRate: number;
  nextPayoutDate: string;
  stripeConnectStatus: string;
  bankAccountConnected: boolean;
  payoutSchedule: string;
  minimumPayoutAmount: number;
  payoutHistory: PayoutRecord[];
  recentSessions: SessionEarning[];
}

export interface PayoutRecord {
  id: string;
  amount: number;
  status: string;
  arrivalDate: string;
  method: string;
  currency: string;
  fee: number;
}

export interface SessionEarning {
  id: string;
  clientName: string;
  date: string;
  amount: number;
  status: string;
  type: string;
}

export interface PayoutRequest {
  amount: number;
  method: 'instant' | 'standard';
  therapistStripeAccountId: string;
}

/**
 * Get comprehensive earnings data for a therapist from Stripe Connect
 */
export async function getTherapistEarnings(stripeAccountId: string): Promise<TherapistEarnings> {
  try {
    // Get account details
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    // Get balance
    const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId });
    
    // Get payout history
    const payouts = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: stripeAccountId }
    );
    
    // Get transfers (earnings from sessions)
    const transfers = await stripe.transfers.list({
      destination: stripeAccountId,
      limit: 100
    });
    
    // Calculate earnings metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let totalEarnings = 0;
    let thisMonthEarnings = 0;
    let thisWeekEarnings = 0;
    let todayEarnings = 0;
    let sessionsThisMonth = 0;
    
    const recentSessions: SessionEarning[] = [];
    
    transfers.data.forEach(transfer => {
      const transferDate = new Date(transfer.created * 1000);
      const amount = transfer.amount / 100; // Convert from pence
      
      totalEarnings += amount;
      
      if (transferDate >= startOfMonth) {
        thisMonthEarnings += amount;
        sessionsThisMonth++;
      }
      
      if (transferDate >= startOfWeek) {
        thisWeekEarnings += amount;
      }
      
      if (transferDate >= startOfDay) {
        todayEarnings += amount;
      }
      
      // Add to recent sessions (limit to last 20)
      if (recentSessions.length < 20) {
        recentSessions.push({
          id: transfer.id,
          clientName: transfer.description?.includes('Client:') 
            ? transfer.description.split('Client:')[1].trim() 
            : 'Session Payment',
          date: transferDate.toISOString(),
          amount: amount,
          status: 'completed',
          type: 'therapy_session'
        });
      }
    });
    
    const averageSessionRate = sessionsThisMonth > 0 ? thisMonthEarnings / sessionsThisMonth : 0;
    
    // Available balance
    const availableBalance = balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100;
    const pendingBalance = balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100;
    
    // Next payout date (based on payout schedule)
    const nextPayout = new Date();
    if (account.settings?.payouts?.schedule?.interval === 'weekly') {
      nextPayout.setDate(nextPayout.getDate() + (7 - nextPayout.getDay()));
    } else {
      nextPayout.setDate(nextPayout.getDate() + 1); // Daily default
    }
    
    // Format payout history
    const payoutHistory: PayoutRecord[] = payouts.data.map(payout => ({
      id: payout.id,
      amount: payout.amount / 100,
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
      method: payout.method,
      currency: payout.currency.toUpperCase(),
      fee: payout.fee / 100
    }));
    
    return {
      totalEarnings,
      pendingEarnings: pendingBalance,
      availableForPayout: availableBalance,
      thisMonthEarnings,
      thisWeekEarnings,
      todayEarnings,
      sessionsThisMonth,
      averageSessionRate,
      nextPayoutDate: nextPayout.toISOString(),
      stripeConnectStatus: account.charges_enabled ? 'active' : 'setup_required',
      bankAccountConnected: account.external_accounts ? account.external_accounts.total_count > 0 : false,
      payoutSchedule: account.settings?.payouts?.schedule?.interval || 'daily',
      minimumPayoutAmount: 10, // £10 minimum
      payoutHistory,
      recentSessions
    };
    
  } catch (error) {
    console.error('Error fetching therapist earnings:', error);
    throw new Error(`Failed to fetch earnings data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initiate a payout request for a therapist
 */
export async function initiateTherapistPayout(request: PayoutRequest): Promise<{
  payoutId: string;
  amount: number;
  fee: number;
  arrivalDate: string;
  method: string;
}> {
  try {
    const { amount, method, therapistStripeAccountId } = request;
    
    // Convert amount to pence
    const amountInPence = Math.round(amount * 100);
    
    // Create payout
    const payout = await stripe.payouts.create({
      amount: amountInPence,
      currency: 'gbp',
      method: method === 'instant' ? 'instant' : 'standard',
      description: `Manual payout requested via Hive Wellness portal`,
      metadata: {
        source: 'hive_wellness_portal',
        requestMethod: method
      }
    }, {
      stripeAccount: therapistStripeAccountId
    });
    
    return {
      payoutId: payout.id,
      amount: payout.amount / 100,
      fee: payout.fee / 100,
      arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
      method: payout.method
    };
    
  } catch (error) {
    console.error('Error initiating payout:', error);
    throw new Error(`Failed to initiate payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get available balance that can be paid out
 */
export async function getAvailableBalance(stripeAccountId: string): Promise<{
  available: number;
  pending: number;
  currency: string;
}> {
  try {
    const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId });
    
    return {
      available: balance.available.reduce((sum, bal) => sum + bal.amount, 0) / 100,
      pending: balance.pending.reduce((sum, bal) => sum + bal.amount, 0) / 100,
      currency: 'GBP'
    };
    
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw new Error(`Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate instant payout fee (1% with Stripe, but we can customise)
 */
export function calculateInstantPayoutFee(amount: number): number {
  // Stripe charges 1% for instant payouts, minimum 50p, maximum £10
  const fee = Math.max(0.5, Math.min(10, amount * 0.01));
  return Math.round(fee * 100) / 100; // Round to 2 decimal places
}