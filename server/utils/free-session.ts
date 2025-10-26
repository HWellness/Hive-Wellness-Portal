/**
 * Free First Session Utilities
 * 
 * Handles logic for providing free first therapy sessions to new clients
 * while ensuring therapists still receive their full 85% payment from platform funds.
 */

import { db } from "../db";
import { users, appointments } from "@shared/schema";
import { eq, and, not } from "drizzle-orm";

export interface FreeSessionEligibility {
  isEligible: boolean;
  reason?: string;
  freeSessionUsed: boolean;
  freeSessionUsedAt?: Date;
  message: string;
}

/**
 * Check if a client is eligible for a free first session
 * 
 * @param userId - The user ID to check
 * @returns FreeSessionEligibility object with eligibility status and details
 */
export async function checkFreeSessionEligibility(
  userId: string
): Promise<FreeSessionEligibility> {
  try {
    // Get user details
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      return {
        isEligible: false,
        reason: 'User not found',
        freeSessionUsed: false,
        message: 'User account not found'
      };
    }

    const userData = user[0];

    // Only clients are eligible for free sessions
    if (userData.role !== 'client') {
      return {
        isEligible: false,
        reason: 'Not a client account',
        freeSessionUsed: false,
        message: 'Free first session is only available for clients'
      };
    }

    // Check if already used free session
    if (userData.freeSessionUsed) {
      return {
        isEligible: false,
        reason: 'Free session already used',
        freeSessionUsed: true,
        freeSessionUsedAt: userData.freeSessionUsedAt || undefined,
        message: 'You have already used your free first session'
      };
    }

    // Client is eligible!
    return {
      isEligible: true,
      freeSessionUsed: false,
      message: 'Congratulations! Your first session is free'
    };

  } catch (error) {
    console.error('Error checking free session eligibility:', error);
    return {
      isEligible: false,
      reason: 'Error checking eligibility',
      freeSessionUsed: false,
      message: 'Unable to verify free session eligibility. Please contact support.'
    };
  }
}

/**
 * Mark a client's free session as used
 * 
 * @param userId - The client's user ID
 * @param appointmentId - The appointment ID that used the free session
 * @returns Success status
 */
export async function markFreeSessionAsUsed(
  userId: string,
  appointmentId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await db
      .update(users)
      .set({
        freeSessionUsed: true,
        freeSessionUsedAt: new Date(),
        freeSessionAppointmentId: appointmentId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log(`✅ Marked free session as used for client ${userId}, appointment ${appointmentId}`);

    return {
      success: true,
      message: 'Free session marked as used successfully'
    };
  } catch (error) {
    console.error('Error marking free session as used:', error);
    return {
      success: false,
      message: 'Failed to mark free session as used'
    };
  }
}

/**
 * Calculate payment amounts for a session
 * Handles both regular and free sessions
 * 
 * @param sessionFee - The standard session fee in pounds
 * @param isFreeSession - Whether this is a free first session
 * @returns Payment breakdown
 */
export function calculateSessionPayment(
  sessionFee: number,
  isFreeSession: boolean
) {
  const therapistAmount = Math.round(sessionFee * 0.85 * 100) / 100; // 85% to therapist
  const platformAmount = Math.round(sessionFee * 0.15 * 100) / 100; // 15% to platform
  
  return {
    clientPays: isFreeSession ? 0 : sessionFee,
    therapistReceives: therapistAmount, // Therapist ALWAYS gets 85%
    platformCost: isFreeSession ? therapistAmount : 0, // Platform pays therapist for free sessions
    platformProfit: isFreeSession ? -therapistAmount : platformAmount, // Platform profit/loss
    isFreeSession,
    sessionFee
  };
}

/**
 * Get free session statistics for admin dashboard
 */
export async function getFreeSessionStats() {
  try {
    const totalFreeSessionsUsed = await db
      .select()
      .from(users)
      .where(eq(users.freeSessionUsed, true));

    const totalClients = await db
      .select()
      .from(users)
      .where(eq(users.role, 'client'));

    const usageRate = totalClients.length > 0 
      ? (totalFreeSessionsUsed.length / totalClients.length) * 100 
      : 0;

    // Calculate estimated cost (assuming £80 average session, £68 to therapist)
    const estimatedCost = totalFreeSessionsUsed.length * 68; // 85% of £80

    return {
      totalFreeSessionsUsed: totalFreeSessionsUsed.length,
      totalClients: totalClients.length,
      eligibleClients: totalClients.length - totalFreeSessionsUsed.length,
      usageRate: Math.round(usageRate * 100) / 100,
      estimatedCost,
      recentUsage: totalFreeSessionsUsed
        .filter((u: any) => u.freeSessionUsedAt)
        .sort((a: any, b: any) => {
          const dateA = a.freeSessionUsedAt?.getTime() || 0;
          const dateB = b.freeSessionUsedAt?.getTime() || 0;
          return dateB - dateA;
        })
        .slice(0, 10)
        .map((u: any) => ({
          userId: u.id,
          email: u.email,
          usedAt: u.freeSessionUsedAt,
          appointmentId: u.freeSessionAppointmentId
        }))
    };
  } catch (error) {
    console.error('Error getting free session stats:', error);
    return {
      totalFreeSessionsUsed: 0,
      totalClients: 0,
      eligibleClients: 0,
      usageRate: 0,
      estimatedCost: 0,
      recentUsage: []
    };
  }
}
