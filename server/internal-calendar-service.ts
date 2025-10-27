/**
 * Internal Calendar Service
 * Handles admin calendar availability and booking management without Google Calendar dependency
 * Provides complete control over admin call scheduling and prevents double-bookings
 */

import { db } from "./db";
import { eq, and, gte, lte, between } from "drizzle-orm";
import {
  adminCalendarBlocks,
  introductionCalls,
  adminAvailabilitySettings,
} from "../shared/schema";
import { nanoid } from "nanoid";
import {
  toUtcFromUk,
  ukDayBoundsUtc,
  isValidUkLocalInstant,
  utcToUkTimeString,
} from "./utils/time";

interface TimeSlot {
  time: string; // HH:MM format
  isAvailable: boolean;
  conflictReason?: string;
}

interface AvailabilityCheck {
  ukDateStr: string; // YYYY-MM-DD format in UK timezone
  time: string; // HH:MM format
  duration: number; // in minutes
}

interface CalendarBlock {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  blockType: "meeting" | "blocked" | "holiday" | "training" | "personal" | "maintenance";
  description?: string;
}

export class InternalCalendarService {
  private readonly businessHours = {
    start: "08:00",
    end: "20:00",
  };

  private readonly defaultSessionDuration = 20; // minutes for admin calls
  private readonly bufferTime = 10; // minutes between calls

  /**
   * Get admin availability settings
   */
  private async getAdminAvailabilitySettings(): Promise<{
    workingDays: string[];
    dailyStartTime: string;
    dailyEndTime: string;
  }> {
    try {
      const [settings] = await db
        .select()
        .from(adminAvailabilitySettings)
        .where(eq(adminAvailabilitySettings.adminId, "admin"))
        .limit(1);

      if (!settings) {
        // Return default settings
        return {
          workingDays: ["1", "2", "3"], // Monday, Tuesday, Wednesday
          dailyStartTime: "09:00",
          dailyEndTime: "17:00",
        };
      }

      return {
        workingDays: settings.workingDays as string[],
        dailyStartTime: settings.dailyStartTime,
        dailyEndTime: settings.dailyEndTime,
      };
    } catch (error) {
      console.error("Error fetching admin availability settings:", error);
      // Return default settings on error
      return {
        workingDays: ["1", "2", "3"],
        dailyStartTime: "09:00",
        dailyEndTime: "17:00",
      };
    }
  }

  /**
   * Get available time slots for a specific UK date
   * @param ukDateStr UK date in YYYY-MM-DD format
   */
  async getAvailableSlots(ukDateStr: string): Promise<{
    slots: TimeSlot[];
    summary: {
      availableSlots: number;
      totalSlots: number;
      date: string;
    };
  }> {
    console.log(`📅 Checking availability for UK date: ${ukDateStr}`);

    // Get admin availability settings
    const availabilitySettings = await this.getAdminAvailabilitySettings();

    // Check if the date falls on a working day
    const date = new Date(ukDateStr + "T00:00:00");
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
    const dayOfWeekStr = dayOfWeek.toString();

    const isWorkingDay = availabilitySettings.workingDays.includes(dayOfWeekStr);

    if (!isWorkingDay) {
      console.log(
        `❌ ${ukDateStr} is not a working day (day ${dayOfWeek}), working days: ${availabilitySettings.workingDays.join(",")}`
      );
      return {
        slots: [],
        summary: {
          availableSlots: 0,
          totalSlots: 0,
          date: ukDateStr,
        },
      };
    }

    // Generate time slots based on admin working hours
    const allSlots = this.generateTimeSlots(
      availabilitySettings.dailyStartTime,
      availabilitySettings.dailyEndTime,
      this.defaultSessionDuration
    );

    // Check each slot for conflicts
    const availabilityChecks = await Promise.all(
      allSlots.map((slot) => this.checkSlotAvailability(ukDateStr, slot, availabilitySettings))
    );

    const slots: TimeSlot[] = allSlots.map((time, index) => ({
      time,
      isAvailable: availabilityChecks[index].isAvailable,
      conflictReason: availabilityChecks[index].conflictReason,
    }));

    const availableCount = slots.filter((slot) => slot.isAvailable).length;

    console.log(`✅ Found ${availableCount}/${slots.length} available slots for ${ukDateStr}`);

    return {
      slots,
      summary: {
        availableSlots: availableCount,
        totalSlots: slots.length,
        date: ukDateStr,
      },
    };
  }

  /**
   * Check if a specific time slot is available
   * @param ukDateStr UK date in YYYY-MM-DD format
   * @param time Time in HH:MM format
   * @param availabilitySettings Admin availability settings (optional, will fetch if not provided)
   */
  async checkSlotAvailability(
    ukDateStr: string,
    time: string,
    availabilitySettings?: {
      workingDays: string[];
      dailyStartTime: string;
      dailyEndTime: string;
    }
  ): Promise<{
    isAvailable: boolean;
    conflictReason?: string;
  }> {
    // Fetch settings if not provided
    if (!availabilitySettings) {
      availabilitySettings = await this.getAdminAvailabilitySettings();
    }
    const slotStart = this.parseDateTime(ukDateStr, time);
    const slotEnd = new Date(slotStart.getTime() + this.defaultSessionDuration * 60000);

    // Validate dates are valid before using in database queries
    if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
      console.error(
        `❌ Invalid date created: slotStart=${slotStart}, slotEnd=${slotEnd} for ${ukDateStr} ${time}`
      );
      return {
        isAvailable: false,
        conflictReason: "Invalid date/time",
      };
    }

    try {
      // Check for existing introduction calls - only block if there's a real conflict
      // Get all confirmed calls for the UK day (use UK day bounds for correct timezone handling)
      const { ukDayBoundsUtc } = await import("./utils/time");
      const { startUtc: dayStart, endUtc: dayEnd } = ukDayBoundsUtc(ukDateStr);

      // Validate day bounds before database query
      if (isNaN(dayStart.getTime()) || isNaN(dayEnd.getTime())) {
        console.error(
          `❌ Invalid day bounds: dayStart=${dayStart}, dayEnd=${dayEnd} for ${ukDateStr}`
        );
        return {
          isAvailable: false,
          conflictReason: "Invalid date range",
        };
      }

      const existingCalls = await db
        .select()
        .from(introductionCalls)
        .where(
          and(
            eq(introductionCalls.status, "confirmed"),
            gte(introductionCalls.actualDateTime, dayStart),
            lte(introductionCalls.actualDateTime, dayEnd)
          )
        );

      // Check each existing call for overlap with our proposed slot
      for (const call of existingCalls) {
        const existingStart = call.actualDateTime;
        if (!existingStart || isNaN(existingStart.getTime())) {
          console.warn(`⚠️ Skipping call with invalid actualDateTime: ${call.id}`);
          continue;
        }
        const existingEnd = new Date(existingStart.getTime() + 15 * 60000); // 15 minutes

        // Overlap check: existing call overlaps if it starts before our slot ends AND ends after our slot starts
        if (existingStart < slotEnd && existingEnd > slotStart) {
          console.log(
            `⚠️ Time conflict detected: Existing call ${existingStart.toISOString()} conflicts with slot ${slotStart.toISOString()}`
          );
          return {
            isAvailable: false,
            conflictReason: "Already booked",
          };
        }
      }

      // Check for admin calendar blocks
      const blocks = await db
        .select()
        .from(adminCalendarBlocks)
        .where(
          and(
            eq(adminCalendarBlocks.isActive, true),
            // Check for time overlap: (start1 < end2 AND start2 < end1)
            and(
              lte(adminCalendarBlocks.startTime, slotEnd),
              gte(adminCalendarBlocks.endTime, slotStart)
            )
          )
        );

      // Filter calendar blocks - availability windows should NOT block, but meetings and other blocks SHOULD block
      const blockingEvents = blocks.filter((block: any) => {
        const title = block.title.toLowerCase();
        const isAvailabilityWindow =
          title.includes("available") || title.includes("open") || title.includes("free");
        // Block the slot if it's NOT an availability window (meetings, blocked periods, etc. should all block)
        return !isAvailabilityWindow;
      });

      if (blockingEvents.length > 0) {
        const block = blockingEvents[0];
        return {
          isAvailable: false,
          conflictReason: `Blocked: ${block.title}`,
        };
      }

      // Check if it's in the past (with 30-minute buffer)
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);

      if (slotStart < thirtyMinutesFromNow) {
        return {
          isAvailable: false,
          conflictReason: "Past time slot",
        };
      }

      // Check if it's a working day
      const date = new Date(ukDateStr + "T00:00:00");
      const dayOfWeek = date.getDay();
      const dayOfWeekStr = dayOfWeek.toString();

      if (!availabilitySettings.workingDays.includes(dayOfWeekStr)) {
        return {
          isAvailable: false,
          conflictReason: "Not a working day",
        };
      }

      // Check if it's outside admin working hours (use availability settings instead of hardcoded hours)
      const timeNum = parseInt(time.replace(":", ""));
      const startNum = parseInt(availabilitySettings.dailyStartTime.replace(":", ""));
      const endNum = parseInt(availabilitySettings.dailyEndTime.replace(":", ""));

      if (timeNum < startNum || timeNum >= endNum) {
        return {
          isAvailable: false,
          conflictReason: "Outside working hours",
        };
      }

      return { isAvailable: true };
    } catch (error) {
      console.error(`❌ Error checking slot availability for ${ukDateStr} ${time}:`, error);
      return {
        isAvailable: false,
        conflictReason: "System error",
      };
    }
  }

  /**
   * Reserve a time slot for a booking
   * @param bookingData.ukDateStr UK date in YYYY-MM-DD format
   * @param bookingData.time Time in HH:MM format
   */
  async reserveTimeSlot(bookingData: {
    ukDateStr: string;
    time: string;
    duration: number;
    participantName: string;
    participantEmail: string;
    callType: "introduction" | "consultation";
  }): Promise<{ success: boolean; conflictReason?: string }> {
    const slotStart = this.parseDateTime(bookingData.ukDateStr, bookingData.time);

    // Get admin availability settings for validation
    const availabilitySettings = await this.getAdminAvailabilitySettings();

    // Double-check availability just before booking
    const availability = await this.checkSlotAvailability(
      bookingData.ukDateStr,
      bookingData.time,
      availabilitySettings
    );

    if (!availability.isAvailable) {
      return {
        success: false,
        conflictReason: availability.conflictReason,
      };
    }

    console.log(
      `📅 Reserving time slot: ${slotStart.toISOString()} for ${bookingData.participantName}`
    );
    return { success: true };
  }

  /**
   * Create a calendar block (for maintenance, holidays, etc.)
   */
  async createCalendarBlock(blockData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    blockType: "meeting" | "blocked" | "holiday" | "training" | "personal" | "maintenance";
    createdBy: string;
  }): Promise<string> {
    const blockId = nanoid();

    await db.insert(adminCalendarBlocks).values({
      id: blockId,
      title: blockData.title,
      description: blockData.description,
      startTime: blockData.startTime,
      endTime: blockData.endTime,
      blockType: blockData.blockType,
      createdBy: blockData.createdBy,
      isActive: true,
    });

    console.log(
      `📅 Created calendar block: ${blockData.title} (${blockData.startTime} - ${blockData.endTime})`
    );
    return blockId;
  }

  /**
   * Get all calendar blocks for a date range
   */
  async getCalendarBlocks(startDate: Date, endDate: Date): Promise<CalendarBlock[]> {
    const blocks = await db
      .select({
        id: adminCalendarBlocks.id,
        title: adminCalendarBlocks.title,
        description: adminCalendarBlocks.description,
        startTime: adminCalendarBlocks.startTime,
        endTime: adminCalendarBlocks.endTime,
        blockType: adminCalendarBlocks.blockType,
      })
      .from(adminCalendarBlocks)
      .where(
        and(
          eq(adminCalendarBlocks.isActive, true),
          and(
            gte(adminCalendarBlocks.startTime, startDate),
            lte(adminCalendarBlocks.endTime, endDate)
          )
        )
      );

    return blocks.map((block: any) => ({
      id: block.id,
      title: block.title,
      description: block.description || undefined,
      startTime: block.startTime,
      endTime: block.endTime,
      blockType: block.blockType as CalendarBlock["blockType"],
    }));
  }

  /**
   * Generate time slots for a given time range
   */
  private generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
    const slots: string[] = [];
    let current = this.parseTime(startTime);
    const end = this.parseTime(endTime);

    while (current < end) {
      const hours = Math.floor(current / 60);
      const minutes = current % 60;
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      slots.push(timeString);
      current += intervalMinutes;
    }

    return slots;
  }

  /**
   * Parse time string to minutes since midnight
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Combine UK date and time into a UTC Date object
   * Properly handles BST/GMT transitions
   * @param ukDateStr UK date in YYYY-MM-DD format
   * @param time Time in HH:MM format
   */
  private parseDateTime(ukDateStr: string, time: string): Date {
    // Use UK timezone utility to create proper UTC date from UK local time
    const utcDate = toUtcFromUk(ukDateStr, time);
    return utcDate;
  }

  /**
   * Update business hours
   */
  updateBusinessHours(start: string, end: string): void {
    this.businessHours.start = start;
    this.businessHours.end = end;
    console.log(`📅 Updated business hours: ${start} - ${end}`);
  }
}

// Singleton instance
export const internalCalendarService = new InternalCalendarService();
