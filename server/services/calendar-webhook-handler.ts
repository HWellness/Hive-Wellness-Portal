/**
 * Calendar Webhook Handler
 * Processes Google Calendar push notifications for real-time sync
 */

import { storage } from "../storage";
import { calendarService } from "./calendar-service";
import { db } from "../db";
import { therapistCalendars, appointments } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface WebhookEvent {
  channelId: string;
  resourceId: string;
  resourceState: "not_exists" | "exists" | "sync";
  resourceUri: string;
  channelExpiration?: string;
  channelToken?: string;
  messageNumber?: string;
}

export interface SyncResult {
  calendarId: string;
  eventsProcessed: number;
  conflicts: number;
  errors: string[];
}

export class CalendarWebhookHandler {
  private readonly syncTokenCache = new Map<string, string>();
  private readonly processingLock = new Set<string>();

  /**
   * Process incoming webhook notification
   */
  async processWebhook(event: WebhookEvent): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`📥 Processing webhook for channel ${event.channelId}:`, event.resourceState);

    try {
      // Find calendar associated with this channel
      const calendars = await storage.listTherapistCalendars();
      const calendar = calendars.find((cal) => cal.channelId === event.channelId);

      if (!calendar) {
        console.warn(`⚠️ No calendar found for channel ${event.channelId}`);
        return {
          calendarId: "",
          eventsProcessed: 0,
          conflicts: 0,
          errors: [`No calendar found for channel ${event.channelId}`],
        };
      }

      // Check if already processing this calendar
      if (this.processingLock.has(calendar.googleCalendarId!)) {
        console.log(`⏳ Calendar ${calendar.googleCalendarId} already being processed, skipping`);
        return {
          calendarId: calendar.googleCalendarId!,
          eventsProcessed: 0,
          conflicts: 0,
          errors: ["Already processing"],
        };
      }

      // Lock processing for this calendar
      this.processingLock.add(calendar.googleCalendarId!);

      try {
        const result = await this.syncCalendarEvents(calendar);
        console.log(`✅ Webhook processed in ${Date.now() - startTime}ms:`, result);
        return result;
      } finally {
        this.processingLock.delete(calendar.googleCalendarId!);
      }
    } catch (error: any) {
      console.error(`❌ Webhook processing failed:`, error);
      return {
        calendarId: "",
        eventsProcessed: 0,
        conflicts: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Sync calendar events and detect conflicts
   */
  private async syncCalendarEvents(calendar: any): Promise<SyncResult> {
    if (!calendar.googleCalendarId) {
      throw new Error("Calendar missing Google Calendar ID");
    }

    const result: SyncResult = {
      calendarId: calendar.googleCalendarId,
      eventsProcessed: 0,
      conflicts: 0,
      errors: [],
    };

    try {
      // Get events since last sync
      const events = await this.getCalendarEventsSinceLastSync(calendar);
      result.eventsProcessed = events.length;

      if (events.length === 0) {
        console.log(`📅 No new events for calendar ${calendar.googleCalendarId}`);
        return result;
      }

      console.log(
        `📅 Processing ${events.length} events for calendar ${calendar.googleCalendarId}`
      );

      // Process each event
      for (const event of events) {
        try {
          await this.processCalendarEvent(calendar, event);
        } catch (error: any) {
          console.error(`❌ Error processing event ${event.id}:`, error);
          result.errors.push(`Event ${event.id}: ${error.message}`);
        }
      }

      // Check for conflicts with existing appointments
      const conflicts = await this.detectConflicts(calendar);
      result.conflicts = conflicts.length;

      if (conflicts.length > 0) {
        console.warn(
          `⚠️ Detected ${conflicts.length} conflicts for calendar ${calendar.googleCalendarId}`
        );
        await this.handleConflicts(calendar, conflicts);
      }

      // Update sync token for efficient future syncing
      await this.updateSyncToken(calendar);

      return result;
    } catch (error: any) {
      console.error(`❌ Calendar sync failed for ${calendar.googleCalendarId}:`, error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Get calendar events since last sync using sync tokens
   */
  private async getCalendarEventsSinceLastSync(calendar: any): Promise<any[]> {
    try {
      const { google } = await import("googleapis");
      const calendarApi = google.calendar({ version: "v3" });

      const params: any = {
        calendarId: calendar.googleCalendarId,
        singleEvents: true,
        orderBy: "startTime",
      };

      // Use sync token for incremental sync if available
      if (calendar.syncToken) {
        params.syncToken = calendar.syncToken;
        console.log(`🔄 Using sync token for incremental sync: ${calendar.googleCalendarId}`);
      } else {
        // First sync - get events from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        params.timeMin = thirtyDaysAgo.toISOString();
        console.log(
          `🔄 First sync for calendar ${calendar.googleCalendarId} - fetching last 30 days`
        );
      }

      const response = await calendarApi.events.list(params);

      // Store new sync token
      if (response.data.nextSyncToken) {
        this.syncTokenCache.set(calendar.googleCalendarId, response.data.nextSyncToken);
      }

      return response.data.items || [];
    } catch (error: any) {
      // Handle sync token invalidation
      if (error.code === 410 && calendar.syncToken) {
        console.log(
          `🔄 Sync token invalidated for ${calendar.googleCalendarId}, falling back to full sync`
        );

        // Clear sync token and retry with full sync
        await storage.updateCalendarSyncToken(calendar.id, "");
        return this.getCalendarEventsSinceLastSync({ ...calendar, syncToken: null });
      }

      throw error;
    }
  }

  /**
   * Process individual calendar event
   */
  private async processCalendarEvent(calendar: any, event: any): Promise<void> {
    try {
      // Check if this is an appointment-related event
      const appointmentId = event.extendedProperties?.private?.appointmentId;

      if (!appointmentId) {
        console.log(`📅 Non-appointment event: ${event.summary || event.id}`);
        return;
      }

      // Get existing appointment
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        console.warn(`⚠️ Appointment ${appointmentId} not found for event ${event.id}`);
        return;
      }

      // Check if event was deleted
      if (event.status === "cancelled") {
        console.log(`🗑️ Event cancelled: ${event.id}, updating appointment status`);
        await storage.updateAppointmentStatus(appointmentId, "cancelled");
        return;
      }

      // Check if event time was changed
      if (event.start?.dateTime && event.end?.dateTime) {
        const newStartTime = new Date(event.start.dateTime);
        const newEndTime = new Date(event.end.dateTime);

        if (
          newStartTime.getTime() !== appointment.scheduledAt.getTime() ||
          newEndTime.getTime() !== appointment.endTime.getTime()
        ) {
          console.log(`⏰ Event time changed: ${event.id}, updating appointment`);
          await storage.updateAppointment(appointmentId, {
            scheduledAt: newStartTime,
            endTime: newEndTime,
          });
        }
      }

      console.log(`✅ Processed event: ${event.id} for appointment ${appointmentId}`);
    } catch (error: any) {
      console.error(`❌ Error processing calendar event ${event.id}:`, error);
      throw error;
    }
  }

  /**
   * Detect conflicts between calendar events and appointments
   */
  private async detectConflicts(calendar: any): Promise<any[]> {
    try {
      // Get busy times for the next 30 days
      const startTime = new Date();
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + 30);

      const busyTimes = await calendarService.listBusy(
        calendar.googleCalendarId,
        startTime,
        endTime
      );

      // Get appointments for this therapist in the same period
      const appointments = await storage.getAppointmentsByTherapist(calendar.therapistId);
      const upcomingAppointments = appointments.filter(
        (apt) =>
          apt.scheduledAt >= startTime && apt.scheduledAt <= endTime && apt.status !== "cancelled"
      );

      const conflicts: any[] = [];

      // Check each appointment against busy times
      for (const appointment of upcomingAppointments) {
        const aptStart = appointment.scheduledAt;
        const aptEnd = appointment.endTime;

        const conflictingBusyTime = busyTimes.find((busyTime) => {
          const busyStart = new Date(busyTime.start);
          const busyEnd = new Date(busyTime.end);

          // Check for overlap
          return aptStart < busyEnd && aptEnd > busyStart;
        });

        if (conflictingBusyTime) {
          conflicts.push({
            appointment,
            busyTime: conflictingBusyTime,
            calendarId: calendar.googleCalendarId,
          });
        }
      }

      return conflicts;
    } catch (error: any) {
      console.error(
        `❌ Error detecting conflicts for calendar ${calendar.googleCalendarId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Handle detected conflicts
   */
  private async handleConflicts(calendar: any, conflicts: any[]): Promise<void> {
    console.log(
      `🚨 Handling ${conflicts.length} conflicts for calendar ${calendar.googleCalendarId}`
    );

    for (const conflict of conflicts) {
      try {
        // Log the conflict for admin review
        console.warn(`⚠️ CONFLICT DETECTED:`, {
          appointmentId: conflict.appointment.id,
          appointmentTime: conflict.appointment.scheduledAt,
          busyTime: conflict.busyTime,
          calendarId: conflict.calendarId,
        });

        // Update appointment status to show conflict
        await storage.updateAppointment(conflict.appointment.id, {
          status: "rescheduled", // Mark for rescheduling
          notes: `Calendar conflict detected: ${conflict.busyTime.summary || "Busy time"}`,
        });

        // Could also send notifications here
        // await notificationService.sendConflictAlert(conflict);
      } catch (error: any) {
        console.error(
          `❌ Error handling conflict for appointment ${conflict.appointment.id}:`,
          error
        );
      }
    }
  }

  /**
   * Update sync token for efficient future syncing
   */
  private async updateSyncToken(calendar: any): Promise<void> {
    const newSyncToken = this.syncTokenCache.get(calendar.googleCalendarId);

    if (newSyncToken && newSyncToken !== calendar.syncToken) {
      try {
        await storage.updateCalendarSyncToken(calendar.id, newSyncToken);
        console.log(`✅ Updated sync token for calendar ${calendar.googleCalendarId}`);
      } catch (error: any) {
        console.error(`❌ Error updating sync token:`, error);
      }
    }
  }

  /**
   * Health check for webhook processing
   */
  async healthCheck(): Promise<{ status: "healthy" | "unhealthy"; details: any }> {
    try {
      const calendars = await storage.listTherapistCalendars();
      const activeChannels = calendars.filter(
        (cal) => cal.channelId && cal.channelExpiresAt && cal.channelExpiresAt > new Date()
      );

      return {
        status: "healthy",
        details: {
          totalCalendars: calendars.length,
          activeChannels: activeChannels.length,
          processingLocks: this.processingLock.size,
          syncTokenCache: this.syncTokenCache.size,
        },
      };
    } catch (error: any) {
      return {
        status: "unhealthy",
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Process expired channels and renew them
   */
  async processExpiredChannels(): Promise<void> {
    try {
      const expiryBuffer = new Date();
      expiryBuffer.setHours(expiryBuffer.getHours() + 24); // Renew 24 hours before expiry

      const calendarsToRenew = await storage.getCalendarsNeedingChannelRenewal(expiryBuffer);

      console.log(`🔄 Found ${calendarsToRenew.length} channels needing renewal`);

      for (const calendar of calendarsToRenew) {
        if (!calendar.channelId) continue;

        try {
          console.log(`🔄 Renewing channel for calendar ${calendar.googleCalendarId}`);
          await calendarService.renewChannel(calendar.channelId);
          console.log(`✅ Successfully renewed channel for calendar ${calendar.googleCalendarId}`);
        } catch (error: any) {
          console.error(
            `❌ Failed to renew channel for calendar ${calendar.googleCalendarId}:`,
            error
          );
        }
      }
    } catch (error: any) {
      console.error(`❌ Error processing expired channels:`, error);
    }
  }

  /**
   * Clear processing locks (for admin use)
   */
  clearProcessingLocks(): void {
    this.processingLock.clear();
    console.log("🗑️ Cleared all processing locks");
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): { lockedCalendars: string[]; syncTokens: number } {
    return {
      lockedCalendars: Array.from(this.processingLock),
      syncTokens: this.syncTokenCache.size,
    };
  }
}

// Singleton instance
export const calendarWebhookHandler = new CalendarWebhookHandler();
