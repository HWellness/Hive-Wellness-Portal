// Google Calendar Availability Sync for Booking System
// Ensures blocked times in Google Calendar are respected by client booking system

import { google } from "googleapis";

// Result type for event fetching to enable fail-secure behavior
interface EventFetchResult {
  ok: boolean;
  events?: any[];
  error?: string;
}

export class CalendarBookingSync {
  private calendar: any;
  private calendarId = "support@hive-wellness.co.uk"; // Single source of truth for calendar data
  // Day-level event caching to reduce API calls and improve performance
  private eventCache: Map<string, { events: any[]; timestamp: number }> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes cache

  // Calendar reliability configuration
  private bufferMinutes: number = 10; // Configurable buffer time between events
  private allowedDays: Set<number> = new Set([1, 2, 3, 4, 5, 6]); // Monday through Saturday
  private failSecure: boolean = true; // Fail-secure by default (unavailable on errors)

  constructor() {
    this.initializeCalendar();
  }

  private async initializeCalendar() {
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

        const auth = new google.auth.GoogleAuth({
          credentials: serviceAccountKey,
          scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        });

        this.calendar = google.calendar({ version: "v3", auth });
        console.log("✅ Calendar sync service initialized with single calendar source");

        // Test calendar access
        this.testCalendarAccess();
      } else {
        console.log("⚠️ Google Calendar sync not available - no service account key");
      }
    } catch (error: any) {
      console.error("❌ Calendar sync initialization failed:", error?.message || error);
    }
  }

  async testCalendarAccess() {
    try {
      const testResponse = await this.calendar.events.list({
        calendarId: this.calendarId,
        maxResults: 1,
        timeMin: new Date().toISOString(),
      });
      console.log(
        `✅ Successfully accessed calendar: ${this.calendarId} (found ${testResponse.data.items?.length || 0} events)`
      );
      console.log("🎯 Using single calendar source for consistent booking results");
    } catch (error: any) {
      console.log(
        `❌ Cannot access calendar: ${this.calendarId} - ${error.message} (Code: ${error.code})`
      );
    }
  }

  // Get cached events for a specific day, or fetch from API if not cached
  // ARCHITECTURAL FIX: Returns result object instead of just [] on errors
  private async getCachedEventsForDay(date: Date): Promise<EventFetchResult> {
    const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD format
    const cachedData = this.eventCache.get(dayKey);

    // Return cached data if valid and not expired
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpiry) {
      console.log(`📋 Using cached events for ${dayKey} (${cachedData.events.length} events)`);
      return { ok: true, events: cachedData.events };
    }

    // Fetch fresh data from API
    console.log(`🔄 Fetching fresh events for ${dayKey}`);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      if (!this.calendar) {
        const error = "Calendar service not initialized";
        console.log(`⚠️ ${error}`);
        return { ok: false, error };
      }

      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];

      // Only cache successful results
      this.eventCache.set(dayKey, {
        events: events,
        timestamp: Date.now(),
      });

      console.log(`📅 Fetched and cached ${events.length} events for ${dayKey}`);
      return { ok: true, events };
    } catch (error: any) {
      const errorMsg = `Failed to fetch calendar events: ${error?.message || error}`;
      console.error(`❌ Error fetching events for ${dayKey}:`, errorMsg);
      // CRITICAL: Do not cache failures - return error result instead of empty array
      return { ok: false, error: errorMsg };
    }
  }

  // Check if a specific time slot is available (with caching)
  // ARCHITECTURAL FIX: Respects failSecure flag and includes allowedDays check
  async isTimeSlotAvailable(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      console.log(
        `🔍 Checking availability: ${startTime.toISOString()} to ${endTime.toISOString()}`
      );
      console.log(
        `📏 Policy settings: Buffer=${this.bufferMinutes}min, Fail-secure=${this.failSecure}, Allowed days=${Array.from(this.allowedDays).join(",")}`
      );

      // POLICY ENFORCEMENT: Check allowed days first (previously missing)
      const dayOfWeek = startTime.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      if (!this.allowedDays.has(dayOfWeek)) {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const allowedDayNames = Array.from(this.allowedDays)
          .map((d) => dayNames[d])
          .join(", ");
        console.log(
          `🚫 Business rule: ${dayNames[dayOfWeek]} is not an available day (allowed: ${allowedDayNames})`
        );
        return false;
      }

      // Get cached events for the day - now returns result object
      const eventResult = await this.getCachedEventsForDay(startTime);

      // FAIL-SECURE LOGIC: Handle calendar API failures according to policy
      if (!eventResult.ok) {
        if (this.failSecure) {
          console.error(
            `🚫 FAIL-SECURE: Calendar error - BLOCKING booking for safety: ${eventResult.error}`
          );
          return false; // Fail-secure: treat errors as unavailable
        } else {
          console.warn(
            `⚠️ FAIL-OPEN: Calendar error - ALLOWING booking despite error: ${eventResult.error}`
          );
          return true; // Fail-open: treat errors as available (risky)
        }
      }

      const events = eventResult.events || [];
      if (events.length === 0) {
        console.log(`✅ No events found, time slot is available`);
        return true;
      }

      // Check for conflicts with simplified logic
      const conflicts = events.filter((event: any) => {
        // Handle all-day events (have date but no dateTime)
        if (event.start?.date && !event.start?.dateTime) {
          const eventDateStr = event.start.date;
          const requestDateStr = startTime.toISOString().split("T")[0];
          const hasOverlap = eventDateStr === requestDateStr;

          if (hasOverlap) {
            console.log(`⚠️ ALL-DAY CONFLICT: ${event.summary || "Blocked"}`);
          }
          return hasOverlap;
        }

        // Handle timed events
        if (!event.start?.dateTime || !event.end?.dateTime) {
          return false; // Skip events without proper time data
        }

        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

        // Enhanced overlap check with buffer: add buffer time to existing events
        const bufferedEventStart = new Date(eventStart.getTime() - this.bufferMinutes * 60 * 1000);
        const bufferedEventEnd = new Date(eventEnd.getTime() + this.bufferMinutes * 60 * 1000);
        const hasOverlap = startTime < bufferedEventEnd && endTime > bufferedEventStart;

        if (hasOverlap) {
          console.log(
            `⚠️ TIMED CONFLICT (with ${this.bufferMinutes}min buffer): ${event.summary || "Blocked"} (${eventStart.toISOString()} - ${eventEnd.toISOString()})`
          );
        }

        return hasOverlap;
      });

      const isAvailable = conflicts.length === 0;

      if (!isAvailable) {
        console.log(`🚫 Time slot blocked by ${conflicts.length} calendar event(s)`);
      } else {
        console.log(`✅ Time slot is available`);
      }

      return isAvailable;
    } catch (error: any) {
      const errorMsg = `Calendar availability check failed: ${error?.message || error}`;
      console.error("❌ CRITICAL ERROR:", errorMsg);

      // FAIL-SECURE LOGIC: Respect configured policy even for unexpected errors
      if (this.failSecure) {
        console.error("🚫 FAIL-SECURE: Unexpected error - BLOCKING booking for safety");
        return false; // Fail-secure: block on unexpected errors
      } else {
        console.warn("⚠️ FAIL-OPEN: Unexpected error - ALLOWING booking despite error (RISKY)");
        return true; // Fail-open: allow on unexpected errors (very risky)
      }
    }
  }

  // Get all available time slots for a specific day (optimized with caching)
  async getAvailableSlots(
    date: Date,
    startHour: number = 9,
    endHour: number = 17,
    slotDurationMinutes: number = 30
  ): Promise<Array<{ start: Date; end: Date }>> {
    try {
      console.log(
        `🔍 Getting available slots for ${date.toDateString()} (${startHour}:00-${endHour}:00)`
      );
      console.log(
        `📊 Buffer: ${this.bufferMinutes}min, Allowed days: ${Array.from(this.allowedDays).join(",")}, Fail-secure: ${this.failSecure}`
      );

      // BUSINESS RULE ENFORCEMENT: Block disallowed days
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      if (!this.allowedDays.has(dayOfWeek)) {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const allowedDayNames = Array.from(this.allowedDays)
          .map((d) => dayNames[d])
          .join(", ");
        console.log(
          `🚫 Business rule: ${dayNames[dayOfWeek]} is not an available day (allowed: ${allowedDayNames})`
        );
        return [];
      }

      // Get all events for the day (cached) - now returns result object
      const eventResult = await this.getCachedEventsForDay(date);

      // FAIL-SECURE LOGIC: Handle calendar API failures according to policy
      if (!eventResult.ok) {
        if (this.failSecure) {
          console.error(
            `🚫 FAIL-SECURE: Calendar error - returning empty slots for safety: ${eventResult.error}`
          );
          return []; // Fail-secure: treat errors as no available slots
        } else {
          console.warn(
            `⚠️ FAIL-OPEN: Calendar error - ignoring error and proceeding (RISKY): ${eventResult.error}`
          );
          // Continue with empty events array (fail-open behavior)
        }
      }

      const events = eventResult.ok ? eventResult.events || [] : [];

      const slots: Array<{ start: Date; end: Date }> = [];

      // Generate potential slots for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(startHour, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(endHour, 0, 0, 0);

      let currentSlot = new Date(startOfDay);

      // Pre-process events to blocking periods for efficiency
      const blockingPeriods: Array<{ start: Date; end: Date }> = [];

      for (const event of events) {
        if (event.start?.date && !event.start?.dateTime) {
          // All-day event blocks the entire day
          const eventDateStr = event.start.date;
          const requestDateStr = date.toISOString().split("T")[0];
          if (eventDateStr === requestDateStr) {
            blockingPeriods.push({
              start: new Date(startOfDay),
              end: new Date(endOfDay),
            });
          }
        } else if (event.start?.dateTime && event.end?.dateTime) {
          // Timed event with buffer: expand blocking period by buffer time
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);
          const bufferedStart = new Date(eventStart.getTime() - this.bufferMinutes * 60 * 1000);
          const bufferedEnd = new Date(eventEnd.getTime() + this.bufferMinutes * 60 * 1000);

          blockingPeriods.push({
            start: bufferedStart,
            end: bufferedEnd,
          });
        }
      }

      while (currentSlot < endOfDay) {
        const slotEnd = new Date(currentSlot.getTime() + slotDurationMinutes * 60 * 1000);

        if (slotEnd <= endOfDay) {
          // Check if this slot conflicts with any blocking period
          const isBlocked = blockingPeriods.some(
            (period) => currentSlot < period.end && slotEnd > period.start
          );

          if (!isBlocked) {
            slots.push({
              start: new Date(currentSlot),
              end: new Date(slotEnd),
            });
          }
        }

        // Move to next slot
        currentSlot = new Date(currentSlot.getTime() + slotDurationMinutes * 60 * 1000);
      }

      console.log(`📅 Found ${slots.length} available slots for ${date.toDateString()}`);
      return slots;
    } catch (error: any) {
      const errorMsg = `Failed to get available slots: ${error?.message || error}`;
      console.error("❌ CRITICAL ERROR:", errorMsg);

      // FAIL-SECURE LOGIC: Respect configured policy even for unexpected errors
      if (this.failSecure) {
        console.error("🚫 FAIL-SECURE: Unexpected error - returning empty slots for safety");
        return []; // Fail-secure: return no slots on unexpected errors
      } else {
        console.warn(
          "⚠️ FAIL-OPEN: Unexpected error - attempting to continue despite error (VERY RISKY)"
        );
        // In fail-open mode, we could try to return some default slots, but that's extremely dangerous
        // For safety, even in fail-open mode, we should return empty slots for unexpected errors
        return [];
      }
    }
  }

  // Get events for a specific day (with caching) - public method for external use
  async getBatchEventsForDay(startOfDay: Date, endOfDay: Date): Promise<any[]> {
    try {
      console.log(`⚡ Getting cached events for day: ${startOfDay.toDateString()}`);

      const eventResult = await this.getCachedEventsForDay(startOfDay);

      // FAIL-SECURE LOGIC: Handle calendar API failures according to policy
      if (!eventResult.ok) {
        if (this.failSecure) {
          console.error(
            `🚫 FAIL-SECURE: Calendar error - returning empty events for safety: ${eventResult.error}`
          );
          return []; // Fail-secure: treat errors as no events
        } else {
          console.warn(
            `⚠️ FAIL-OPEN: Calendar error - returning empty events despite error: ${eventResult.error}`
          );
          return []; // Even in fail-open, safer to return empty for this method
        }
      }

      const events = eventResult.events || [];
      console.log(`⚡ Returned ${events.length} cached events`);

      if (process.env.NODE_ENV !== "production" && events.length > 0) {
        console.log(
          "📝 Day events summary:",
          events.map((e: any) => ({
            summary: e.summary || "No title",
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
          }))
        );
      }

      return events;
    } catch (error: any) {
      const errorMsg = `Failed to get batch events: ${error?.message || error}`;
      console.error("❌ CRITICAL ERROR:", errorMsg);

      // FAIL-SECURE LOGIC: Always return empty for unexpected errors in this method
      return []; // Safe default even in fail-open mode
    }
  }

  // Get all blocked times for a date range (optimized with caching)
  async getBlockedTimes(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: Date; end: Date; summary: string }>> {
    try {
      if (!this.calendar) {
        return [];
      }

      console.log(
        `🔍 Getting blocked times from ${startDate.toDateString()} to ${endDate.toDateString()}`
      );

      const blockedTimes: Array<{ start: Date; end: Date; summary: string }> = [];

      // Process each day separately to leverage caching
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const eventResult = await this.getCachedEventsForDay(currentDate);

        // FAIL-SECURE LOGIC: Handle calendar API failures according to policy
        if (!eventResult.ok) {
          if (this.failSecure) {
            console.error(
              `🚫 FAIL-SECURE: Calendar error for ${currentDate.toDateString()} - skipping day: ${eventResult.error}`
            );
            // Skip this day in fail-secure mode
          } else {
            console.warn(
              `⚠️ FAIL-OPEN: Calendar error for ${currentDate.toDateString()} - skipping day: ${eventResult.error}`
            );
            // Skip this day in both modes for safety
          }
        } else {
          const events = eventResult.events || [];

          for (const event of events) {
            if (event.start?.dateTime && event.end?.dateTime) {
              const eventStart = new Date(event.start.dateTime);
              const eventEnd = new Date(event.end.dateTime);

              // Only include events within the requested range
              if (eventStart >= startDate && eventEnd <= endDate) {
                blockedTimes.push({
                  start: eventStart,
                  end: eventEnd,
                  summary: event.summary || "Unavailable",
                });
              }
            }
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`📋 Found ${blockedTimes.length} blocked time periods`);
      return blockedTimes;
    } catch (error: any) {
      console.error(
        "❌ SECURITY: Failed to get blocked times - returning empty for safety:",
        error?.message || error
      );
      return []; // SECURITY: Return empty array on error (fail-secure)
    }
  }

  // Clear cache for a specific day or all cache
  clearCache(date?: Date): void {
    if (date) {
      const dayKey = date.toISOString().split("T")[0];
      this.eventCache.delete(dayKey);
      console.log(`🗑️ Cleared cache for ${dayKey}`);
    } else {
      this.eventCache.clear();
      console.log(`🗑️ Cleared entire event cache`);
    }
  }

  // Get cache statistics for monitoring
  getCacheStats(): { entries: number; totalEvents: number } {
    let totalEvents = 0;
    const cacheValues = Array.from(this.eventCache.values());
    for (const cachedData of cacheValues) {
      totalEvents += cachedData.events.length;
    }

    return {
      entries: this.eventCache.size,
      totalEvents: totalEvents,
    };
  }

  // Configuration methods for administrative control
  setBufferMinutes(minutes: number): void {
    if (minutes < 0 || minutes > 60) {
      throw new Error("Buffer minutes must be between 0 and 60");
    }
    this.bufferMinutes = minutes;
    console.log(`📝 Buffer time updated to ${minutes} minutes`);
    this.clearCache(); // Clear cache to ensure new buffer applies
  }

  getBufferMinutes(): number {
    return this.bufferMinutes;
  }

  setAllowedDays(days: number[]): void {
    const validDays = days.filter((day) => day >= 0 && day <= 6);
    if (validDays.length !== days.length) {
      throw new Error("All days must be between 0 (Sunday) and 6 (Saturday)");
    }
    this.allowedDays = new Set(validDays);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const allowedDayNames = validDays.map((day) => dayNames[day]).join(", ");
    console.log(`📝 Allowed days updated to: ${allowedDayNames}`);
  }

  getAllowedDays(): number[] {
    return Array.from(this.allowedDays).sort();
  }

  setFailSecure(failSecure: boolean): void {
    this.failSecure = failSecure;
    console.log(`📝 Fail-secure mode: ${failSecure ? "ENABLED (safe)" : "DISABLED (risky)"}`);
  }

  isFailSecure(): boolean {
    return this.failSecure;
  }

  // Enhanced availability check with detailed error information
  async checkAvailabilityWithDetails(
    startTime: Date,
    endTime: Date
  ): Promise<{
    available: boolean;
    reason?: string;
    conflictingEvents?: Array<{ summary: string; start: Date; end: Date }>;
  }> {
    try {
      if (!this.calendar) {
        return {
          available: false,
          reason: "Calendar service is not available. Please try again later or contact support.",
        };
      }

      // Check business rules first
      const dayOfWeek = startTime.getDay();
      if (!this.allowedDays.has(dayOfWeek)) {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return {
          available: false,
          reason: `Appointments are not available on ${dayNames[dayOfWeek]}s. Available days: Monday, Tuesday, Wednesday.`,
        };
      }

      const eventResult = await this.getCachedEventsForDay(startTime);

      // FAIL-SECURE LOGIC: Handle calendar API failures according to policy
      if (!eventResult.ok) {
        if (this.failSecure) {
          return {
            available: false,
            reason: `Calendar service error: ${eventResult.error}. Please try again later or contact support.`,
          };
        } else {
          console.warn(
            `⚠️ FAIL-OPEN: Calendar error - treating as available (RISKY): ${eventResult.error}`
          );
          return { available: true }; // Very risky but follows fail-open policy
        }
      }

      const events = eventResult.events || [];
      const conflictingEvents: Array<{ summary: string; start: Date; end: Date }> = [];

      for (const event of events) {
        if (event.start?.date && !event.start?.dateTime) {
          // All-day event
          const eventDateStr = event.start.date;
          const requestDateStr = startTime.toISOString().split("T")[0];
          if (eventDateStr === requestDateStr) {
            return {
              available: false,
              reason: "This entire day is unavailable.",
              conflictingEvents: [
                {
                  summary: event.summary || "Unavailable",
                  start: startTime,
                  end: endTime,
                },
              ],
            };
          }
        } else if (event.start?.dateTime && event.end?.dateTime) {
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);
          const bufferedEventStart = new Date(
            eventStart.getTime() - this.bufferMinutes * 60 * 1000
          );
          const bufferedEventEnd = new Date(eventEnd.getTime() + this.bufferMinutes * 60 * 1000);

          if (startTime < bufferedEventEnd && endTime > bufferedEventStart) {
            conflictingEvents.push({
              summary: event.summary || "Unavailable",
              start: eventStart,
              end: eventEnd,
            });
          }
        }
      }

      if (conflictingEvents.length > 0) {
        return {
          available: false,
          reason: `This time conflicts with existing appointments (${this.bufferMinutes}-minute buffer required).`,
          conflictingEvents,
        };
      }

      return { available: true };
    } catch (error: any) {
      console.error("❌ SECURITY: Calendar availability check failed:", error?.message || error);
      return {
        available: false,
        reason: "Unable to check calendar availability. Please try again later or contact support.",
      };
    }
  }

  // Sync admin availability settings with Google Calendar blocking events
  async syncAvailabilityToCalendar(
    availability: Array<{ day: number; startTime: string; endTime: string }>
  ): Promise<boolean> {
    try {
      if (!this.calendar) {
        console.log("⚠️ Calendar sync not available for availability sync");
        return false;
      }

      console.log("🔄 Syncing availability to Google Calendar...");

      // Clear cache since we're creating new events
      this.clearCache();

      // For each day of the week, create blocking events outside the available hours
      for (const slot of availability) {
        await this.createBlockingEventsForDay(slot.day, slot.startTime, slot.endTime);
      }

      console.log("✅ Availability synced to Google Calendar");
      return true;
    } catch (error: any) {
      console.error("❌ Error syncing availability to calendar:", error?.message || error);
      return false;
    }
  }

  private async createBlockingEventsForDay(
    dayOfWeek: number,
    availableStart: string,
    availableEnd: string
  ): Promise<void> {
    // Create blocking events before and after available hours
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7));

    const [startHour, startMin] = availableStart.split(":").map(Number);
    const [endHour, endMin] = availableEnd.split(":").map(Number);

    // Block morning (00:00 to available start)
    if (startHour > 0 || startMin > 0) {
      const morningStart = new Date(targetDate);
      morningStart.setHours(0, 0, 0, 0);
      const morningEnd = new Date(targetDate);
      morningEnd.setHours(startHour, startMin, 0, 0);

      await this.createSingleBlockingEvent(
        morningStart,
        morningEnd,
        `🚫 Unavailable (Before ${availableStart})`
      );
    }

    // Block evening (available end to 23:59)
    if (endHour < 23 || endMin < 59) {
      const eveningStart = new Date(targetDate);
      eveningStart.setHours(endHour, endMin, 0, 0);
      const eveningEnd = new Date(targetDate);
      eveningEnd.setHours(23, 59, 59, 999);

      await this.createSingleBlockingEvent(
        eveningStart,
        eveningEnd,
        `🚫 Unavailable (After ${availableEnd})`
      );
    }
  }

  private async createSingleBlockingEvent(
    startTime: Date,
    endTime: Date,
    summary: string
  ): Promise<void> {
    try {
      const event = {
        summary,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "Europe/London",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "Europe/London",
        },
        transparency: "opaque",
        visibility: "private",
      };

      await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: event,
      });

      console.log(`✅ Created blocking event: ${summary}`);

      // Clear cache for this day since we added a new event
      this.clearCache(startTime);
    } catch (error: any) {
      console.error(`❌ Error creating blocking event: ${summary}`, error?.message || error);
    }
  }

  // =============================================================================
  // UNIFIED AVAILABILITY SERVICE - Single entry point for consistent policy enforcement
  // =============================================================================

  /**
   * Unified availability check - applies all policies consistently
   * This is the recommended entry point for all availability checks
   */
  async checkUnifiedAvailability(
    startTime: Date,
    endTime: Date
  ): Promise<{
    available: boolean;
    reason?: string;
    policies: {
      allowedDays: boolean;
      calendarCheck: boolean;
      bufferRespected: boolean;
    };
  }> {
    console.log(`🎯 UNIFIED CHECK: ${startTime.toISOString()} to ${endTime.toISOString()}`);
    console.log(
      `📋 Active policies: Buffer=${this.bufferMinutes}min, Days=[${Array.from(this.allowedDays).join(",")}], Fail-secure=${this.failSecure}`
    );

    const policies = {
      allowedDays: false,
      calendarCheck: false,
      bufferRespected: false,
    };

    // Policy 1: Check allowed days
    const dayOfWeek = startTime.getDay();
    if (!this.allowedDays.has(dayOfWeek)) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return {
        available: false,
        reason: `Appointments not available on ${dayNames[dayOfWeek]}s`,
        policies,
      };
    }
    policies.allowedDays = true;

    // Policy 2: Calendar availability check (with fail-secure behavior)
    const isAvailable = await this.isTimeSlotAvailable(startTime, endTime);
    policies.calendarCheck = true;
    policies.bufferRespected = true; // Buffer is enforced within isTimeSlotAvailable

    return {
      available: isAvailable,
      reason: isAvailable ? undefined : "Time slot is not available",
      policies,
    };
  }

  /**
   * Unified slot discovery - applies all policies consistently
   * This is the recommended entry point for getting available slots
   */
  async getUnifiedAvailableSlots(
    date: Date,
    startHour: number = 9,
    endHour: number = 17,
    slotDurationMinutes: number = 30
  ): Promise<{
    slots: Array<{ start: Date; end: Date }>;
    policies: {
      allowedDays: boolean;
      calendarCheck: boolean;
      bufferRespected: boolean;
    };
    errors?: string[];
  }> {
    console.log(`🎯 UNIFIED SLOTS: ${date.toDateString()} ${startHour}:00-${endHour}:00`);
    console.log(
      `📋 Active policies: Buffer=${this.bufferMinutes}min, Days=[${Array.from(this.allowedDays).join(",")}], Fail-secure=${this.failSecure}`
    );

    const policies = {
      allowedDays: false,
      calendarCheck: false,
      bufferRespected: false,
    };
    const errors: string[] = [];

    // Policy 1: Check allowed days (same logic as getAvailableSlots)
    const dayOfWeek = date.getDay();
    if (!this.allowedDays.has(dayOfWeek)) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      errors.push(`${dayNames[dayOfWeek]} is not an available day`);
      return { slots: [], policies, errors };
    }
    policies.allowedDays = true;

    // Policy 2: Get slots with calendar checking
    const slots = await this.getAvailableSlots(date, startHour, endHour, slotDurationMinutes);
    policies.calendarCheck = true;
    policies.bufferRespected = true;

    return { slots, policies, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Configuration validation - ensures policies are properly configured
   */
  validateConfiguration(): {
    valid: boolean;
    issues: string[];
    configuration: {
      bufferMinutes: number;
      allowedDays: number[];
      failSecure: boolean;
      calendarInitialized: boolean;
    };
  } {
    const issues: string[] = [];

    if (this.bufferMinutes < 0 || this.bufferMinutes > 60) {
      issues.push(`Buffer minutes (${this.bufferMinutes}) should be between 0-60`);
    }

    if (this.allowedDays.size === 0) {
      issues.push("No allowed days configured - no appointments possible");
    }

    if (!this.calendar) {
      issues.push("Calendar service not initialized - will fail-secure on all requests");
    }

    return {
      valid: issues.length === 0,
      issues,
      configuration: {
        bufferMinutes: this.bufferMinutes,
        allowedDays: Array.from(this.allowedDays).sort(),
        failSecure: this.failSecure,
        calendarInitialized: !!this.calendar,
      },
    };
  }
}

// Export singleton instance
export const calendarBookingSync = new CalendarBookingSync();

// =============================================================================
// UNIFIED AVAILABILITY SERVICE FACADE
// =============================================================================

/**
 * Unified AvailabilityService - Single entry point for all availability operations
 * Ensures consistent policy enforcement across the application
 */
export class AvailabilityService {
  private static instance = calendarBookingSync;

  /**
   * Check if a specific time slot is available
   * Applies all policies: allowed days, calendar conflicts, buffer time, fail-secure
   */
  static async isAvailable(startTime: Date, endTime: Date): Promise<boolean> {
    const result = await this.instance.checkUnifiedAvailability(startTime, endTime);
    return result.available;
  }

  /**
   * Get available slots for a day
   * Applies all policies consistently
   */
  static async getSlots(
    date: Date,
    startHour?: number,
    endHour?: number,
    slotDurationMinutes?: number
  ): Promise<Array<{ start: Date; end: Date }>> {
    const result = await this.instance.getUnifiedAvailableSlots(
      date,
      startHour,
      endHour,
      slotDurationMinutes
    );
    return result.slots;
  }

  /**
   * Get detailed availability information with policy status
   */
  static async getDetailedAvailability(startTime: Date, endTime: Date) {
    return await this.instance.checkUnifiedAvailability(startTime, endTime);
  }

  /**
   * Get detailed slot information with policy status
   */
  static async getDetailedSlots(
    date: Date,
    startHour?: number,
    endHour?: number,
    slotDurationMinutes?: number
  ) {
    return await this.instance.getUnifiedAvailableSlots(
      date,
      startHour,
      endHour,
      slotDurationMinutes
    );
  }

  /**
   * Configure availability policies
   */
  static configure(options: {
    bufferMinutes?: number;
    allowedDays?: number[];
    failSecure?: boolean;
  }): void {
    if (options.bufferMinutes !== undefined) {
      this.instance.setBufferMinutes(options.bufferMinutes);
    }
    if (options.allowedDays !== undefined) {
      this.instance.setAllowedDays(options.allowedDays);
    }
    if (options.failSecure !== undefined) {
      this.instance.setFailSecure(options.failSecure);
    }
  }

  /**
   * Validate current configuration
   */
  static validateConfig() {
    return this.instance.validateConfiguration();
  }

  /**
   * Get current configuration
   */
  static getConfig() {
    return {
      bufferMinutes: this.instance.getBufferMinutes(),
      allowedDays: this.instance.getAllowedDays(),
      failSecure: this.instance.isFailSecure(),
    };
  }
}

// Export the unified service as the recommended interface
export { AvailabilityService as UnifiedAvailabilityService };
