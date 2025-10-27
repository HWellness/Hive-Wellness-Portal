import { db } from "./db";
import { adminCalendarBlocks, introductionCalls } from "@shared/schema";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { calendarBookingSync } from "./calendar-booking-sync";

interface CalendarBlock {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  blockType: "meeting" | "blocked" | "holiday" | "training" | "personal" | "maintenance";
  isRecurring?: boolean;
  recurringPattern?: "weekly" | "daily" | "monthly";
  recurringUntil?: Date;
  createdBy: string;
  notes?: string;
}

interface TimeSlotCheck {
  date: Date;
  timeSlot: string;
  isAvailable: boolean;
  conflictReason?: string;
}

export class AdminCalendarManager {
  // Performance optimization: Cache time slots to reduce response times
  private timeSlotCache: Map<string, { slots: string[]; timestamp: number }> = new Map();
  private readonly cacheExpiry = 2 * 60 * 1000; // 2 minutes cache for performance

  constructor() {
    // Disabled automatic admin unavailable days creation to allow counter testing
    // this.setupAdminUnavailableDays();
  }

  // Create permanent Google Calendar blocks for Thursday and Friday
  private async setupAdminUnavailableDays() {
    try {
      const { calendarBookingSync } = await import("./calendar-booking-sync");
      const { googleCalendarService } = await import("./google-calendar-service");

      // Create all-day blocking events for the next 12 weeks
      const today = new Date();
      const weeksAhead = 12;

      console.log("🚫 Setting up admin unavailable days (Thursday & Friday) for next 12 weeks...");

      for (let week = 0; week < weeksAhead; week++) {
        // Thursday blocks
        const thursday = new Date(today);
        thursday.setDate(today.getDate() + week * 7 + ((4 - today.getDay() + 7) % 7));

        const thursdayStart = new Date(thursday);
        thursdayStart.setHours(0, 0, 0, 0);
        const thursdayEnd = new Date(thursday);
        thursdayEnd.setHours(23, 59, 59, 999);

        await googleCalendarService.createBlockingEvent({
          title: "🚫 Admin Unavailable (Thursday)",
          description: "Admin not available on Thursdays - No meetings can be booked",
          startTime: thursdayStart,
          endTime: thursdayEnd,
          useAdminCalendar: true, // Admin unavailable blocks use admin calendar
        });

        // Friday blocks
        const friday = new Date(today);
        friday.setDate(today.getDate() + week * 7 + ((5 - today.getDay() + 7) % 7));

        const fridayStart = new Date(friday);
        fridayStart.setHours(0, 0, 0, 0);
        const fridayEnd = new Date(friday);
        fridayEnd.setHours(23, 59, 59, 999);

        await googleCalendarService.createBlockingEvent({
          title: "🚫 Admin Unavailable (Friday)",
          description: "Admin not available on Fridays - No meetings can be booked",
          startTime: fridayStart,
          endTime: fridayEnd,
          useAdminCalendar: true, // Admin unavailable blocks use admin calendar
        });
      }

      console.log("✅ Admin unavailable days setup completed");
    } catch (error) {
      console.log("⚠️ Could not set up Google Calendar blocks for admin unavailable days:", error);
    }
  }

  // Create a calendar block (meeting, blocked time, etc.)
  async createCalendarBlock(block: CalendarBlock): Promise<string> {
    const blockId = nanoid();

    await db.insert(adminCalendarBlocks).values({
      id: blockId,
      title: block.title,
      description: block.description,
      startTime: block.startTime,
      endTime: block.endTime,
      blockType: block.blockType,
      isRecurring: block.isRecurring || false,
      recurringPattern: block.recurringPattern,
      recurringUntil: block.recurringUntil,
      createdBy: block.createdBy,
      notes: block.notes,
      isActive: true,
    });

    return blockId;
  }

  // Check if a time slot is available
  async checkTimeSlotAvailability(date: Date, timeSlot: string): Promise<TimeSlotCheck> {
    // CRITICAL FIX: Validate timeSlot parameter to prevent undefined split errors
    if (!timeSlot || typeof timeSlot !== "string") {
      console.error("⚠️ Invalid timeSlot parameter:", timeSlot);
      return {
        date,
        timeSlot: timeSlot || "invalid",
        isAvailable: false,
        conflictReason: "Invalid time slot format",
      };
    }

    if (!timeSlot.includes(":")) {
      console.error("⚠️ TimeSlot missing colon separator:", timeSlot);
      return {
        date,
        timeSlot,
        isAvailable: false,
        conflictReason: "Invalid time slot format - missing colon",
      };
    }

    const [hour, minute] = timeSlot.split(":").map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);

    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 20); // 20-minute session duration

    // Add 10-minute preparation buffer for admin
    const bufferEnd = new Date(slotStart);
    bufferEnd.setMinutes(bufferEnd.getMinutes() + 30); // 20min session + 10min prep = 30min total

    // CRITICAL FIX: Check Google Calendar first for blocking events
    console.log(
      `🔍 Checking Google Calendar availability for ${timeSlot} on ${date.toDateString()}`
    );
    const googleCalendarAvailable = await calendarBookingSync.isTimeSlotAvailable(
      slotStart,
      bufferEnd
    );

    if (!googleCalendarAvailable) {
      console.log(
        `🚫 Google Calendar blocks this time slot: ${timeSlot} on ${date.toDateString()}`
      );
      return {
        date,
        timeSlot,
        isAvailable: false,
        conflictReason: "Blocked in Google Calendar (Admin unavailable time)",
      };
    }

    // Check for existing introduction calls including 10-minute buffer
    const existingCalls = await db
      .select()
      .from(introductionCalls)
      .where(
        and(
          gte(introductionCalls.preferredDate, slotStart),
          lte(introductionCalls.preferredDate, bufferEnd),
          eq(introductionCalls.status, "confirmed")
        )
      );

    // Also check for calls that would conflict with our 10-minute preparation buffer
    const conflictingCalls = await db
      .select()
      .from(introductionCalls)
      .where(
        and(
          // Check if any existing call ends within our preparation window
          gte(introductionCalls.preferredDate, new Date(slotStart.getTime() - 30 * 60 * 1000)), // 30 minutes before
          lte(introductionCalls.preferredDate, slotStart),
          eq(introductionCalls.status, "confirmed")
        )
      );

    if (existingCalls.length > 0 || conflictingCalls.length > 0) {
      return {
        date,
        timeSlot,
        isAvailable: false,
        conflictReason:
          existingCalls.length > 0
            ? "Existing appointment booked"
            : "Too close to existing appointment (requires 10-minute preparation time)",
      };
    }

    // Check for blocked times
    const blockedTimes = await db
      .select()
      .from(adminCalendarBlocks)
      .where(
        and(
          lte(adminCalendarBlocks.startTime, slotStart),
          gte(adminCalendarBlocks.endTime, bufferEnd), // Include 10-minute buffer in blocked time check
          eq(adminCalendarBlocks.isActive, true)
        )
      );

    if (blockedTimes.length > 0) {
      return {
        date,
        timeSlot,
        isAvailable: false,
        conflictReason: `Blocked: ${blockedTimes[0].title}`,
      };
    }

    return {
      date,
      timeSlot,
      isAvailable: true,
    };
  }

  // Get all available time slots for a date with performance caching
  async getAvailableTimeSlotsForDate(date: Date): Promise<string[]> {
    const startTime = Date.now();

    // Admin is available Monday-Friday (1-5), not available on weekends (0=Sunday, 6=Saturday) - TEMPORARILY DISABLED FOR TESTING
    const dayOfWeek = date.getDay();
    /* 
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`🚫 Admin not available on day ${dayOfWeek} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]})`);
      return []; // No slots available on weekends only
    }
    */

    // Performance optimization: Check cache first
    const cacheKey = `slots_${date.toISOString().split("T")[0]}`;
    const cached = this.timeSlotCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      const cacheTime = Date.now() - startTime;
      console.log(`⚡ Cache hit for ${cacheKey} - returned in ${cacheTime}ms`);
      return cached.slots;
    }

    const businessHours = [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
      "18:30",
      "19:00",
      "19:30",
      "20:00",
    ];

    const availableSlots: string[] = [];

    // Batch database checks for better performance
    const slotChecks = await Promise.all(
      businessHours.map((slot) => this.checkTimeSlotAvailability(date, slot))
    );

    slotChecks.forEach((check, index) => {
      if (check.isAvailable) {
        availableSlots.push(businessHours[index]);
      }
    });

    // Cache the result for performance
    this.timeSlotCache.set(cacheKey, {
      slots: availableSlots,
      timestamp: Date.now(),
    });

    const totalTime = Date.now() - startTime;
    console.log(`🚀 Generated ${availableSlots.length} slots for ${cacheKey} in ${totalTime}ms`);

    return availableSlots;
  }

  // Block a time period
  async blockTime(
    title: string,
    startTime: Date,
    endTime: Date,
    blockType: CalendarBlock["blockType"],
    createdBy: string,
    notes?: string
  ): Promise<string> {
    return this.createCalendarBlock({
      title,
      startTime,
      endTime,
      blockType,
      createdBy,
      notes,
    });
  }

  // Get all calendar blocks for a date range
  async getCalendarBlocks(startDate: Date, endDate: Date) {
    return await db
      .select()
      .from(adminCalendarBlocks)
      .where(
        and(
          gte(adminCalendarBlocks.startTime, startDate),
          lte(adminCalendarBlocks.endTime, endDate),
          eq(adminCalendarBlocks.isActive, true)
        )
      );
  }

  // Remove a calendar block
  async removeCalendarBlock(blockId: string, removedBy: string): Promise<boolean> {
    const result = await db
      .update(adminCalendarBlocks)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(adminCalendarBlocks.id, blockId));

    return (result?.rowCount || 0) > 0;
  }

  // Create a manual booking (admin creates appointment)
  async createManualBooking(
    name: string,
    email: string,
    phone: string,
    dateTime: Date,
    notes?: string,
    createdBy?: string
  ): Promise<string> {
    const timeSlot = `${dateTime.getHours().toString().padStart(2, "0")}:${dateTime.getMinutes().toString().padStart(2, "0")}`;

    // Check availability first
    const availability = await this.checkTimeSlotAvailability(dateTime, timeSlot);
    if (!availability.isAvailable) {
      throw new Error(`Time slot not available: ${availability.conflictReason}`);
    }

    const callId = nanoid();

    await db.insert(introductionCalls).values({
      id: callId,
      name,
      email,
      phone,
      message: notes || "",
      preferredDate: dateTime,
      preferredTime: timeSlot,
      status: "confirmed",
      actualDateTime: dateTime,
      source: "admin_manual",
      adminNotes: `Manual booking created by admin${createdBy ? ` (${createdBy})` : ""}`,
      confirmationEmailSent: false, // Will be sent separately
    });

    return callId;
  }
}

export const adminCalendarManager = new AdminCalendarManager();
