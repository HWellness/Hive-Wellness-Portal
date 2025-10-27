import { db } from "../db";
import { appointments } from "@shared/schema";
import { and, eq, or, lt, gt, gte, lte, ne } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingAppointment?: {
    id: string;
    scheduledAt: Date;
    endTime: Date;
    clientName?: string;
    sessionType: string;
  };
  friendlyMessage?: string;
}

export interface BookingAttempt {
  therapistId: string;
  scheduledAt: Date;
  endTime: Date;
  clientId?: string;
  sessionType?: string;
  idempotencyKey?: string;
}

export class AppointmentConflictService {
  /**
   * Generate a unique idempotency key for preventing duplicate bookings
   */
  static generateIdempotencyKey(bookingData: {
    therapistId: string;
    scheduledAt: Date;
    clientId?: string;
  }): string {
    const timestamp = bookingData.scheduledAt.getTime();
    const components = [
      bookingData.therapistId,
      timestamp.toString(),
      bookingData.clientId || "guest",
    ];
    return `booking_${components.join("_")}_${nanoid(8)}`;
  }

  /**
   * Check for existing appointment with same idempotency key (prevents duplicate submissions)
   */
  static async checkDuplicateSubmission(idempotencyKey: string): Promise<{
    isDuplicate: boolean;
    existingAppointment?: any;
  }> {
    try {
      const existing = await db
        .select()
        .from(appointments)
        .where(eq(appointments.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existing.length > 0) {
        console.log(`🔄 Duplicate submission detected for key: ${idempotencyKey}`);
        return {
          isDuplicate: true,
          existingAppointment: existing[0],
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Error checking duplicate submission:", error);
      return { isDuplicate: false };
    }
  }

  /**
   * Comprehensive conflict detection for appointment booking
   */
  static async checkAppointmentConflict(
    bookingAttempt: BookingAttempt
  ): Promise<ConflictCheckResult> {
    try {
      const { therapistId, scheduledAt, endTime, sessionType = "therapy" } = bookingAttempt;

      console.log(`🔍 Checking appointment conflicts for therapist ${therapistId}:`, {
        scheduledAt: scheduledAt.toISOString(),
        endTime: endTime.toISOString(),
        sessionType,
      });

      // Check for overlapping appointments for the same therapist
      // An appointment conflicts if:
      // 1. Same therapist
      // 2. Not cancelled or archived
      // 3. Time ranges overlap
      const conflictingAppointments = await db
        .select({
          id: appointments.id,
          scheduledAt: appointments.scheduledAt,
          endTime: appointments.endTime,
          clientId: appointments.clientId,
          sessionType: appointments.sessionType,
          status: appointments.status,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.primaryTherapistId, therapistId),
            ne(appointments.status, "cancelled"),
            eq(appointments.isArchived, false),
            // Time overlap condition: (start1 < end2) AND (start2 < end1)
            or(
              // New appointment starts during existing appointment
              and(
                gte(scheduledAt, appointments.scheduledAt),
                lt(scheduledAt, appointments.endTime)
              ),
              // New appointment ends during existing appointment
              and(gt(endTime, appointments.scheduledAt), lte(endTime, appointments.endTime)),
              // New appointment completely encompasses existing appointment
              and(lte(scheduledAt, appointments.scheduledAt), gte(endTime, appointments.endTime)),
              // Existing appointment completely encompasses new appointment
              and(gte(scheduledAt, appointments.scheduledAt), lte(endTime, appointments.endTime))
            )
          )
        )
        .limit(1);

      if (conflictingAppointments.length > 0) {
        const conflict = conflictingAppointments[0];

        // Generate user-friendly error message
        const conflictTime = new Intl.DateTimeFormat("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/London",
        }).format(new Date(conflict.scheduledAt));

        const friendlyMessage = this.generateFriendlyConflictMessage(
          scheduledAt,
          conflictTime,
          sessionType
        );

        console.log(`❌ Appointment conflict detected:`, {
          conflictingAppointmentId: conflict.id,
          conflictTime: conflict.scheduledAt,
          requestedTime: scheduledAt,
        });

        return {
          hasConflict: true,
          conflictingAppointment: {
            id: conflict.id,
            scheduledAt: new Date(conflict.scheduledAt),
            endTime: new Date(conflict.endTime),
            sessionType: conflict.sessionType || "therapy",
          },
          friendlyMessage,
        };
      }

      console.log(
        `✅ No conflicts found for therapist ${therapistId} at ${scheduledAt.toISOString()}`
      );
      return { hasConflict: false };
    } catch (error) {
      console.error("Error checking appointment conflicts:", error);
      // Fail safe: assume conflict to prevent double booking
      return {
        hasConflict: true,
        friendlyMessage:
          "We're having trouble checking availability right now. Please try again in a moment or choose a different time slot.",
      };
    }
  }

  /**
   * Generate user-friendly conflict messages
   */
  private static generateFriendlyConflictMessage(
    requestedTime: Date,
    conflictTimeStr: string,
    sessionType: string
  ): string {
    const requestedTimeStr = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    }).format(requestedTime);

    const sessionTypeDisplay = sessionType === "consultation" ? "consultation" : "therapy session";

    return `This time slot is no longer available. There's already a ${sessionTypeDisplay} scheduled for ${conflictTimeStr}. Please choose a different time slot that works for you.`;
  }

  /**
   * Get suggested alternative time slots when conflicts occur
   */
  static async getSuggestedAlternatives(
    therapistId: string,
    originalTime: Date,
    sessionDuration: number = 50
  ): Promise<Date[]> {
    try {
      const suggestions: Date[] = [];
      const originalDate = new Date(originalTime);

      // Generate time slots for the same day and next 3 days
      for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
        const checkDate = new Date(originalDate);
        checkDate.setDate(checkDate.getDate() + dayOffset);

        // Check common time slots (9 AM to 7 PM)
        for (let hour = 9; hour <= 19; hour++) {
          const slotTime = new Date(checkDate);
          slotTime.setHours(hour, 0, 0, 0);

          // Skip if this is the originally requested time
          if (Math.abs(slotTime.getTime() - originalTime.getTime()) < 60000) {
            continue;
          }

          const endTime = new Date(slotTime.getTime() + sessionDuration * 60 * 1000);

          const conflictCheck = await this.checkAppointmentConflict({
            therapistId,
            scheduledAt: slotTime,
            endTime,
          });

          if (!conflictCheck.hasConflict) {
            suggestions.push(slotTime);
            if (suggestions.length >= 6) break; // Limit to 6 suggestions
          }
        }

        if (suggestions.length >= 6) break;
      }

      return suggestions.slice(0, 6); // Return maximum 6 alternatives
    } catch (error) {
      console.error("Error generating alternative time slots:", error);
      return [];
    }
  }

  /**
   * Validate appointment timing constraints
   */
  static validateAppointmentTiming(
    scheduledAt: Date,
    endTime: Date
  ): {
    isValid: boolean;
    error?: string;
  } {
    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(now.getFullYear() + 1);

    // Check if appointment is in the past
    if (scheduledAt <= now) {
      return {
        isValid: false,
        error:
          "Appointments cannot be scheduled in the past. Please choose a future date and time.",
      };
    }

    // Check if appointment is too far in the future
    if (scheduledAt > oneYearFromNow) {
      return {
        isValid: false,
        error:
          "Appointments cannot be scheduled more than one year in advance. Please choose an earlier date.",
      };
    }

    // Check if duration is reasonable (between 15 minutes and 4 hours)
    const durationMs = endTime.getTime() - scheduledAt.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes < 15) {
      return {
        isValid: false,
        error: "Appointment duration must be at least 15 minutes.",
      };
    }

    if (durationMinutes > 240) {
      return {
        isValid: false,
        error: "Appointment duration cannot exceed 4 hours.",
      };
    }

    // Check if end time is after start time
    if (endTime <= scheduledAt) {
      return {
        isValid: false,
        error: "Appointment end time must be after the start time.",
      };
    }

    return { isValid: true };
  }
}

export default AppointmentConflictService;
