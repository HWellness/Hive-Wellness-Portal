import { GoogleMeetService } from "./google-meet-service";
import { DailyService } from "./daily-service";
import { storage } from "./storage";
import { nanoid } from "nanoid";

export interface VideoSessionBooking {
  id: string;
  therapistId: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  scheduledTime: Date;
  duration: number; // in minutes
  sessionType: string;
  notes?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  meetingUrl?: string;
  meetingId?: string;
  calendarEventId?: string;
  bookedBy: string;
  bookedAt: Date;
}

export interface BookingRequest {
  therapistId: string;
  date: string;
  time: string;
  duration: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  sessionType: string;
  notes?: string;
  bookedBy: string;
  createGoogleMeet?: boolean;
  sendConfirmation?: boolean;
}

export class VideoBookingService {
  /**
   * Determine if a session should use admin calendar or therapist calendar
   */
  private static determineSessionTypeRouting(sessionType: string): {
    useAdminCalendar: boolean;
    calendarType: "admin" | "therapist";
    reason: string;
  } {
    // Admin/onboarding sessions that should go to support@hive-wellness.co.uk
    const adminSessionTypes = [
      "Initial Consultation",
      "Onboarding",
      "Admin Session",
      "Assessment",
      "Intake",
      "Free Initial Chat",
      "Introduction Call",
      "System Demo",
    ];

    const lowerSessionType = sessionType.toLowerCase();
    const isAdminSession = adminSessionTypes.some(
      (type) =>
        lowerSessionType.includes(type.toLowerCase()) ||
        lowerSessionType.includes("initial") ||
        lowerSessionType.includes("onboarding") ||
        lowerSessionType.includes("admin") ||
        lowerSessionType.includes("assessment") ||
        lowerSessionType.includes("intake") ||
        lowerSessionType.includes("introduction")
    );

    if (isAdminSession) {
      return {
        useAdminCalendar: true,
        calendarType: "admin",
        reason: `Session type "${sessionType}" identified as admin/onboarding session`,
      };
    } else {
      return {
        useAdminCalendar: false,
        calendarType: "therapist",
        reason: `Session type "${sessionType}" identified as therapy session`,
      };
    }
  }

  /**
   * Book a new video therapy session with Google Calendar and Gmail integration
   */
  static async bookVideoSession(request: BookingRequest): Promise<VideoSessionBooking> {
    try {
      // Create session datetime with proper UK timezone handling
      const sessionDateTime = new Date(`${request.date}T${request.time}:00.000`);
      const sessionEndTime = new Date(sessionDateTime.getTime() + request.duration * 60000);

      // Generate unique session ID
      const sessionId = `session-${nanoid()}`;

      // Create the booking record
      const booking: VideoSessionBooking = {
        id: sessionId,
        therapistId: request.therapistId,
        clientName: request.clientName,
        clientEmail: request.clientEmail,
        clientPhone: request.clientPhone,
        scheduledTime: sessionDateTime,
        duration: request.duration,
        sessionType: request.sessionType,
        notes: request.notes,
        status: "scheduled",
        bookedBy: request.bookedBy,
        bookedAt: new Date(),
      };

      // CRITICAL: Check for duplicate bookings FIRST before creating any calendar events
      console.log(
        `🔍 Checking time slot conflict BEFORE creating calendar event: ${sessionDateTime.toISOString()} - ${sessionEndTime.toISOString()}`
      );
      const existingBooking = await this.checkTimeSlotConflict(
        sessionDateTime,
        sessionEndTime,
        request.therapistId
      );
      if (existingBooking) {
        console.log(`❌ Time slot conflict detected:`, existingBooking);
        throw new Error(
          `Time slot ${request.date} ${request.time} is already booked. Existing booking: ${existingBooking.clientName}`
        );
      }
      console.log("✅ No time slot conflicts found, proceeding with booking");

      // Get therapist information
      const therapist = await this.getTherapistInfo(request.therapistId);

      // ENHANCED: Determine session type routing (admin vs therapist calendar)
      const routing = this.determineSessionTypeRouting(request.sessionType);
      console.log(`🎯 SESSION ROUTING: ${routing.reason}`);
      console.log(`🎯 CALENDAR TYPE: ${routing.calendarType} calendar`);

      // Create Google Calendar event with proper routing
      try {
        let calendarEvent;

        if (routing.useAdminCalendar) {
          // Route admin/onboarding sessions to support@hive-wellness.co.uk calendar
          console.log(
            `📅 ADMIN ROUTING: Creating ${request.sessionType} in admin calendar (support@hive-wellness.co.uk)`
          );

          calendarEvent = await GoogleMeetService.createCalendarEvent({
            title: `${request.sessionType} - ${request.clientName}`,
            description: `${request.sessionType} with ${request.clientName}\n\nClient Email: ${request.clientEmail}\nClient Phone: ${request.clientPhone || "Not provided"}\n\nNotes: ${request.notes || "No additional notes"}\n\nTherapist: ${therapist.name}\n\nROUTED TO: Admin Calendar (${routing.reason})`,
            startTime: sessionDateTime,
            endTime: sessionEndTime,
            timeZone: "Europe/London",
            attendees: [request.clientEmail, therapist.email, "support@hive-wellness.co.uk"],
          });

          console.log(`✅ Created ${request.sessionType} in admin calendar successfully`);
        } else {
          // Route therapy sessions to Daily.co + therapist calendars
          console.log(
            `📅 THERAPIST ROUTING: Creating ${request.sessionType} with Daily.co + therapist ${request.therapistId} calendar`
          );

          // Step 1: Create Daily.co room for therapy session
          let dailyRoomInfo;
          try {
            const dailyService = new DailyService();
            dailyRoomInfo = await dailyService.createTherapyRoom({
              sessionId: sessionId,
              clientName: request.clientName,
              therapistName: therapist.name,
              scheduledAt: sessionDateTime,
              duration: request.duration,
            });

            console.log(`🎥 Created Daily.co room for therapy session: ${dailyRoomInfo.roomUrl}`);

            // Set the meeting URL to Daily.co room
            booking.meetingUrl = dailyRoomInfo.roomUrl;
            booking.meetingId = dailyRoomInfo.roomName;
          } catch (dailyError) {
            console.error("❌ Failed to create Daily.co room:", dailyError);
            // Don't fail the booking if Daily.co creation fails - continue with calendar event
          }

          // Step 2: Create Google Calendar event (without Google Meet) for scheduling
          try {
            console.log("📊 BOOKING DEBUG: Creating calendar event with Daily.co link...");
            const { googleCalendarService } = await import("./google-calendar-service");

            // Create calendar event with Daily.co meeting link
            const calendarDescription = `${request.sessionType} with ${request.clientName}

Client Email: ${request.clientEmail}
Client Phone: ${request.clientPhone || "Not provided"}
Notes: ${request.notes || "No additional notes"}
Therapist: ${therapist.name}

🎥 JOIN VIDEO SESSION:
${dailyRoomInfo ? dailyRoomInfo.roomUrl : "Video link will be provided"}

ROUTED TO: Therapist Calendar (${routing.reason})`;

            // Route calendar event creation to therapist's calendar (without Google Meet)
            calendarEvent = await googleCalendarService.createSessionEvent({
              title: `${request.sessionType} - ${request.clientName}`,
              description: calendarDescription,
              startTime: sessionDateTime,
              endTime: sessionEndTime,
              attendees: [
                { name: request.clientName, email: request.clientEmail, role: "client" as const },
                { name: therapist.name, email: therapist.email, role: "therapist" as const },
                {
                  name: "Hive Wellness Support",
                  email: "support@hive-wellness.co.uk",
                  role: "therapist" as const,
                },
              ],
              therapistId: request.therapistId,
              sessionType: request.sessionType,
            });

            console.log(
              `✅ Created ${request.sessionType} in therapist ${request.therapistId} calendar successfully`
            );
          } catch (therapistCalendarError) {
            console.warn(
              `⚠️ Failed to create event in therapist calendar, continuing with Daily.co room:`,
              therapistCalendarError
            );

            // Don't fallback to Google Meet for therapy sessions - keep Daily.co
            calendarEvent = {
              eventId: `daily-${sessionId}`,
              meetingUrl: dailyRoomInfo ? dailyRoomInfo.roomUrl : "",
              meetingId: dailyRoomInfo ? dailyRoomInfo.roomName : "",
            };

            console.log(`📅 Therapy session using Daily.co without calendar event`);
          }
        }

        // Handle calendar event response
        if (calendarEvent) {
          if (calendarEvent && typeof calendarEvent === "object" && "eventId" in calendarEvent) {
            // New format from googleCalendarService.createSessionEvent()
            const sessionEvent = calendarEvent as {
              eventId: string;
              meetingUrl: string;
              meetingId: string;
            };
            booking.meetingUrl = sessionEvent.meetingUrl || "";
            booking.meetingId = sessionEvent.meetingId || "";
            booking.calendarEventId = sessionEvent.eventId || "";
          } else {
            // Fallback format from GoogleMeetService (old format)
            booking.meetingUrl = (calendarEvent as any).meetingUrl || "";
            booking.meetingId = (calendarEvent as any).meetingId || "";
            booking.calendarEventId =
              typeof calendarEvent === "string"
                ? calendarEvent
                : (calendarEvent as any).eventId || "";
          }
        }

        // Send professional booking confirmation emails via Gmail
        await this.sendBookingConfirmationEmails(booking, therapist, calendarEvent);
      } catch (error) {
        console.error("Failed to create Google Calendar event:", error);
        // Continue with booking even if Google Calendar fails, but log the error
      }

      // Store the booking in database with constraint violation handling
      try {
        // CRITICAL FIX: Map fields correctly for database constraint enforcement
        await storage.createAppointment({
          id: booking.id,
          primaryTherapistId: booking.therapistId, // ✅ FIXED: Use primaryTherapistId (required for constraint)
          clientId: booking.clientId,
          scheduledAt: booking.scheduledTime, // ✅ FIXED: Use scheduledAt (required for constraint)
          endTime: sessionEndTime, // ✅ FIXED: Set endTime (required for constraint)
          duration: booking.duration,
          status: booking.status,
          sessionType: booking.sessionType,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          notes: booking.notes,
          meetingUrl: booking.meetingUrl,
          meetingId: booking.meetingId,
          calendarEventId: booking.calendarEventId,
          createdBy: booking.bookedBy,
          createdAt: booking.bookedAt,
        });
      } catch (appointmentError: any) {
        // Handle database constraint violations
        if (appointmentError.code === "APPOINTMENT_OVERLAP") {
          console.error(
            "❌ Database constraint violation - appointment overlap detected:",
            appointmentError.details
          );
          throw {
            code: "APPOINTMENT_OVERLAP",
            message: appointmentError.message,
            details: appointmentError.details,
            httpStatus: 409,
          };
        }

        // Re-throw other database errors
        throw appointmentError;
      }

      return booking;
    } catch (error: any) {
      console.error("Video booking service error:", error);

      // Preserve constraint violation errors with proper HTTP status
      if (error.code === "APPOINTMENT_OVERLAP") {
        throw {
          code: "APPOINTMENT_OVERLAP",
          message: error.message,
          details: error.details,
          httpStatus: 409,
        };
      }

      throw new Error(
        `Failed to book video session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Check for time slot conflicts before booking - COMPREHENSIVE CHECK with therapist-specific calendar support
   */
  static async checkTimeSlotConflict(
    startTime: Date,
    endTime: Date,
    therapistId?: string
  ): Promise<any | null> {
    try {
      console.log(
        `🔍 COMPREHENSIVE conflict check for: ${startTime.toISOString()} - ${endTime.toISOString()}${therapistId ? ` (Therapist: ${therapistId})` : ""}`
      );

      // 1. CRITICAL: If therapist ID provided, check therapist-specific calendar busy times FIRST
      if (therapistId) {
        try {
          const { googleCalendarService } = await import("./google-calendar-service");
          console.log(`🔍 Checking therapist ${therapistId} specific calendar for busy times`);

          // Get therapist-specific busy times for the exact time slot
          const busyTimes = await googleCalendarService.getTherapistBusyTimes(therapistId, {
            startTime,
            endTime,
          });

          // Check if any busy time overlaps with requested time slot
          const hasOverlap = busyTimes.some((busyTime) => {
            const overlapStart = Math.max(startTime.getTime(), busyTime.start.getTime());
            const overlapEnd = Math.min(endTime.getTime(), busyTime.end.getTime());
            return overlapStart < overlapEnd; // True if there's any overlap
          });

          if (hasOverlap) {
            const conflictingEvent = busyTimes.find((busyTime) => {
              const overlapStart = Math.max(startTime.getTime(), busyTime.start.getTime());
              const overlapEnd = Math.min(endTime.getTime(), busyTime.end.getTime());
              return overlapStart < overlapEnd;
            });

            console.log(
              `❌ THERAPIST CALENDAR CONFLICT detected - therapist ${therapistId} is busy:`,
              {
                requestedStart: startTime.toISOString(),
                requestedEnd: endTime.toISOString(),
                conflictingEvent: {
                  start: conflictingEvent?.start.toISOString(),
                  end: conflictingEvent?.end.toISOString(),
                  summary: conflictingEvent?.summary,
                },
              }
            );

            return {
              clientName: "Therapist Busy",
              type: "therapist_calendar_busy",
              message: `This therapist is busy at this time (${conflictingEvent?.summary || "Existing appointment"}). Please choose a different time slot.`,
              details: {
                therapistId,
                conflictingEvent,
                reason: "Therapist has conflicting calendar event",
              },
            };
          }

          console.log(`✅ Therapist ${therapistId} calendar check passed - no busy times found`);

          // CRITICAL: Also check database for overlapping appointments for this specific therapist
          const dbConflicts = await storage.getOverlappingAppointments(
            startTime,
            endTime,
            therapistId
          );

          if (dbConflicts.length > 0) {
            console.log(
              `❌ DATABASE CONFLICT detected - therapist ${therapistId} has overlapping appointments:`,
              dbConflicts.map((appt) => ({
                id: appt.id,
                clientName: appt.clientName,
                scheduledTime: appt.scheduledTime,
              }))
            );

            return {
              clientName: dbConflicts[0].clientName || "Unknown Client",
              type: "therapist_appointment_conflict",
              message: `This therapist already has an appointment at this time with ${dbConflicts[0].clientName}. Please choose a different time slot.`,
              details: {
                therapistId,
                conflictingAppointment: dbConflicts[0],
              },
            };
          }

          console.log(
            `✅ Database check passed - no conflicting appointments for therapist ${therapistId}`
          );
        } catch (therapistCalendarError) {
          console.error(
            `⚠️ Error checking therapist ${therapistId} calendar, falling back to admin calendar:`,
            therapistCalendarError
          );
          // Continue with admin calendar fallback checks below
        }
      }

      // 2. CRITICAL: Check Google Calendar availability (admin calendar and global events)
      try {
        const { calendarBookingSync } = await import("./calendar-booking-sync.js");
        const isTimeAvailable = await calendarBookingSync.isTimeSlotAvailable(startTime, endTime);

        if (!isTimeAvailable) {
          console.log(
            `❌ GOOGLE CALENDAR CONFLICT detected - time slot blocked by calendar events`
          );
          return {
            clientName: "Calendar Event Conflict",
            type: "google_calendar_block",
            details: { message: "Time slot blocked by Google Calendar event" },
          };
        }
        console.log("✅ Google Calendar check passed - no calendar conflicts");
      } catch (calendarError) {
        console.error(
          "⚠️ Google Calendar check failed, continuing with database checks:",
          calendarError
        );
      }

      // 2. Check admin calendar blocks for overlapping time slots
      const conflictingBlocks = await storage.getOverlappingCalendarBlocks(startTime, endTime);
      // Filter for ANY blocking type: 'booked', 'blocked', 'unavailable'
      const blockedSlots = conflictingBlocks.filter(
        (block) =>
          block.blockType === "booked" ||
          block.blockType === "blocked" ||
          block.blockType === "unavailable"
      );

      if (blockedSlots.length > 0) {
        console.log(
          `❌ Found ${blockedSlots.length} conflicting blocked slots:`,
          blockedSlots.map((slot) => ({
            title: slot.title,
            start: slot.startTime,
            end: slot.endTime,
            type: slot.blockType,
          }))
        );

        return {
          clientName: "Time Unavailable",
          type: "calendar_block",
          message: `This time slot is ${blockedSlots[0].blockType}. Please choose a different time.`,
          details: blockedSlots[0],
        };
      }

      // 3. Check appointment bookings table for overlapping times
      const appointments = await storage.getOverlappingAppointments(startTime, endTime);
      if (appointments.length > 0) {
        console.log(
          `❌ Found ${appointments.length} conflicting appointments:`,
          appointments.map((appt) => ({
            clientName: appt.clientName,
            scheduledAt: appt.scheduledAt,
          }))
        );

        return {
          clientName: appointments[0].clientName || "Unknown Client",
          type: "appointment",
          details: appointments[0],
        };
      }

      console.log("✅ No time slot conflicts found in any system (Google Calendar + Database)");
      return null;
    } catch (error) {
      console.error("Error checking time slot conflict:", error);
      return null;
    }
  }

  /**
   * Send professional booking confirmation emails via Gmail
   */
  static async sendBookingConfirmationEmails(
    booking: VideoSessionBooking,
    therapist: any,
    calendarEvent: any
  ): Promise<void> {
    const GmailService = require("./gmail-service").GmailService;

    const sessionDate = booking.scheduledTime.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const sessionTime = booking.scheduledTime.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Client confirmation email
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #9306B1; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Your ${booking.sessionType} is Confirmed!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear ${booking.clientName},</p>
          
          <p>Thank you for booking with Hive Wellness. Your session has been confirmed with the following details:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9306B1;">
            <h3 style="margin-top: 0; color: #9306B1;">Session Details</h3>
            <p><strong>Session Type:</strong> ${booking.sessionType}</p>
            <p><strong>Date:</strong> ${sessionDate}</p>
            <p><strong>Time:</strong> ${sessionTime}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p><strong>Therapist:</strong> ${therapist.name}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #9306B1;">How to Join Your Session</h3>
            ${
              this.isTherapySession(booking.sessionType)
                ? `
            <p><strong>Daily.co Video Link:</strong><br>
            <a href="${booking.meetingUrl}" style="color: #9306B1; word-break: break-all;">${booking.meetingUrl}</a></p>
            
            <p><strong>What you need:</strong></p>
            <ul>
              <li>A device with camera and microphone (computer, tablet, or smartphone)</li>
              <li>Stable internet connection</li>
              <li>Quiet, private space for your session</li>
              <li>Simply click the link above at your session time - no account needed!</li>
            </ul>
            `
                : `
            <p><strong>Google Meet Link:</strong><br>
            <a href="${booking.meetingUrl}" style="color: #9306B1; word-break: break-all;">${booking.meetingUrl}</a></p>
            
            <p><strong>What you need:</strong></p>
            <ul>
              <li>A device with camera and microphone (computer, tablet, or smartphone)</li>
              <li>Stable internet connection</li>
              <li>Quiet, private space for your session</li>
            </ul>
            `
            }
          </div>
          
          <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Need to reschedule or have questions?</strong><br>
            Reply to this email or call us at your convenience. We're here to help!</p>
          </div>
          
          <p>We look forward to supporting you on your wellness journey.</p>
          
          <p>Best regards,<br>
          <strong>The Hive Wellness Team</strong><br>
          support@hive-wellness.co.uk</p>
        </div>
      </div>
    `;

    // Therapist notification email
    const therapistEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #9306B1; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">New Session Booked</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <p>Dear ${therapist.name},</p>
          
          <p>A new ${booking.sessionType.toLowerCase()} has been booked for you:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #9306B1;">
            <h3 style="margin-top: 0; color: #9306B1;">Client & Session Details</h3>
            <p><strong>Client:</strong> ${booking.clientName}</p>
            <p><strong>Email:</strong> ${booking.clientEmail}</p>
            <p><strong>Phone:</strong> ${booking.clientPhone || "Not provided"}</p>
            <p><strong>Session:</strong> ${booking.sessionType}</p>
            <p><strong>Date:</strong> ${sessionDate}</p>
            <p><strong>Time:</strong> ${sessionTime}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            ${booking.notes ? `<p><strong>Client Notes:</strong> ${booking.notes}</p>` : ""}
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${
              this.isTherapySession(booking.sessionType)
                ? `
            <h3 style="margin-top: 0; color: #9306B1;">Daily.co Session Details</h3>
            <p><strong>Daily.co Room:</strong><br>
            <a href="${booking.meetingUrl}" style="color: #9306B1; word-break: break-all;">${booking.meetingUrl}</a></p>
            <p><strong>Room Name:</strong> ${booking.meetingId}</p>
            <p><em>This is a secure Daily.co room for your therapy session.</em></p>
            `
                : `
            <h3 style="margin-top: 0; color: #9306B1;">Google Meet Details</h3>
            <p><strong>Meeting Link:</strong><br>
            <a href="${booking.meetingUrl}" style="color: #9306B1; word-break: break-all;">${booking.meetingUrl}</a></p>
            <p><strong>Meeting ID:</strong> ${booking.meetingId}</p>
            `
            }
          </div>
          
          <p>The session has been added to your Google Calendar and the client has been sent their confirmation.</p>
          
          <p>Best regards,<br>
          <strong>Hive Wellness Administration</strong></p>
        </div>
      </div>
    `;

    try {
      // Send client confirmation
      await GmailService.sendEmail({
        to: booking.clientEmail,
        subject: `Session Confirmed - ${sessionDate} at ${sessionTime.split(" ")[0]}`,
        html: clientEmailHtml,
      });

      // Send therapist notification
      await GmailService.sendEmail({
        to: therapist.email,
        subject: `New Session Booked - ${booking.clientName} on ${sessionDate}`,
        html: therapistEmailHtml,
      });

      // Send admin notification
      await GmailService.sendEmail({
        to: "support@hive-wellness.co.uk",
        subject: `Session Booked - ${booking.sessionType} - ${booking.clientName}`,
        html: `
          <h3>New Session Booking Notification</h3>
          <p><strong>Client:</strong> ${booking.clientName} (${booking.clientEmail})</p>
          <p><strong>Therapist:</strong> ${therapist.name}</p>
          <p><strong>Session:</strong> ${booking.sessionType}</p>
          <p><strong>Date/Time:</strong> ${sessionDate} at ${sessionTime}</p>
          <p><strong>Meeting:</strong> <a href="${booking.meetingUrl}">${this.isTherapySession(booking.sessionType) ? "Daily.co Room" : "Google Meet Link"}</a></p>
          <p>View in <a href="${calendarEvent.calendarUrl}">Google Calendar</a></p>
        `,
      });
    } catch (error) {
      console.error("Failed to send booking confirmation emails:", error);
      // Don't throw error - booking is still successful even if emails fail
    }
  }

  /**
   * Helper method to determine if a session type is a therapy session (not admin/introduction)
   */
  private static isTherapySession(sessionType: string): boolean {
    const routing = this.determineSessionTypeRouting(sessionType);
    return !routing.useAdminCalendar; // Therapy sessions don't use admin calendar
  }

  /**
   * Get therapist information for booking
   */
  static async getTherapistInfo(therapistId: string) {
    try {
      const therapist = await storage.getUser(therapistId);
      return {
        id: therapist.id,
        name: `${therapist.firstName} ${therapist.lastName}`,
        email: therapist.email,
      };
    } catch (error) {
      console.error("Error fetching therapist info:", error);
      // Return default therapist info if lookup fails
      return {
        id: therapistId,
        name: "Hive Wellness Therapist",
        email: "support@hive-wellness.co.uk",
      };
    }
  }

  /**
   * Cancel a video session and remove from Google Calendar
   * NOW USES THERAPIST-SPECIFIC CALENDAR DELETION
   */
  static async cancelVideoSession(sessionId: string): Promise<void> {
    try {
      const booking = await storage.getAppointmentById(sessionId);
      if (!booking) {
        throw new Error("Session not found");
      }

      // NEW: Cancel Google Calendar event using therapist-specific calendar context
      if (booking.calendarEventId && booking.therapistId) {
        try {
          const { googleCalendarService } = await import("./google-calendar-service");

          // Route calendar deletion to the correct therapist calendar
          await googleCalendarService.deleteEvent(booking.calendarEventId, booking.therapistId);
          console.log(
            `📅 Deleted calendar event ${booking.calendarEventId} from therapist ${booking.therapistId} calendar`
          );
        } catch (error) {
          console.error("❌ Failed to delete from therapist calendar, trying fallback:", error);
          // Fallback to admin calendar deletion
          try {
            await GoogleMeetService.deleteCalendarEvent(booking.calendarEventId);
            console.log("⚠️ Fallback: Deleted calendar event from admin calendar");
          } catch (fallbackError) {
            console.error(
              "❌ Failed to delete calendar event from both therapist and admin calendars:",
              fallbackError
            );
          }
        }
      }

      // Update booking status
      await storage.updateAppointment(sessionId, { status: "cancelled" });

      // Send cancellation notifications
      const therapist = await this.getTherapistInfo(booking.therapistId);
      await this.sendCancellationEmails(booking, therapist);
    } catch (error) {
      console.error("Error cancelling video session:", error);
      throw new Error(
        `Failed to cancel video session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Send cancellation notification emails
   */
  static async sendCancellationEmails(booking: any, therapist: any): Promise<void> {
    const GmailService = require("./gmail-service").GmailService;

    const sessionDate = booking.scheduledTime.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    try {
      // Notify client
      await GmailService.sendEmail({
        to: booking.clientEmail,
        subject: `Session Cancelled - ${sessionDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Session Cancelled</h1>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <p>Dear ${booking.clientName},</p>
              <p>Your ${booking.sessionType} scheduled for ${sessionDate} has been cancelled.</p>
              <p>If you would like to reschedule, please reply to this email or contact us.</p>
              <p>Best regards,<br><strong>The Hive Wellness Team</strong></p>
            </div>
          </div>
        `,
      });

      // Notify therapist
      await GmailService.sendEmail({
        to: therapist.email,
        subject: `Session Cancelled - ${booking.clientName}`,
        html: `
          <p>Dear ${therapist.name},</p>
          <p>The session with ${booking.clientName} on ${sessionDate} has been cancelled.</p>
          <p>Best regards,<br><strong>Hive Wellness Administration</strong></p>
        `,
      });
    } catch (error) {
      console.error("Failed to send cancellation emails:", error);
    }
  }

  /**
   * Get available time slots for a therapist on a specific date (checking Google Calendar)
   */
  static async getAvailableSlots(therapistId: string, date: string): Promise<string[]> {
    try {
      // Get busy slots from Google Calendar
      const busySlots = await GoogleMeetService.getBusySlots(date);

      // Generate available slots (9 AM to 8 PM, 30-minute intervals)
      const allSlots = [];
      for (let hour = 9; hour <= 19; hour++) {
        allSlots.push(`${hour.toString().padStart(2, "0")}:00`);
        allSlots.push(`${hour.toString().padStart(2, "0")}:30`);
      }

      // Filter out busy slots
      const availableSlots = allSlots.filter((slot) => {
        const slotDateTime = `${date}T${slot}:00`;
        return !busySlots.some((busy) => busy.includes(slot));
      });

      return availableSlots;
    } catch (error) {
      console.error("Error getting available slots:", error);
      // Get admin settings for default slots if Google Calendar check fails
      try {
        const { storage } = await import("./storage.js");
        const adminSettings = await storage.getAdminAvailabilitySettings("default-admin");

        // Generate default slots based on admin settings
        const defaultSlots = [];
        const startTime = new Date(`2024-01-01T${adminSettings.dailyStartTime}:00`);
        const endTime = new Date(`2024-01-01T${adminSettings.dailyEndTime}:00`);
        const lunchStart = adminSettings.includeLunchBreak
          ? new Date(`2024-01-01T${adminSettings.lunchBreakStart}:00`)
          : null;
        const lunchEnd = adminSettings.includeLunchBreak
          ? new Date(`2024-01-01T${adminSettings.lunchBreakEnd}:00`)
          : null;

        let currentSlot = new Date(startTime);

        while (
          currentSlot < endTime &&
          defaultSlots.length < (adminSettings.maxSessionsPerDay || 8)
        ) {
          const timeStr = currentSlot.toTimeString().slice(0, 5);

          // Skip lunch break slots if enabled
          if (lunchStart && lunchEnd && currentSlot >= lunchStart && currentSlot < lunchEnd) {
            currentSlot = new Date(
              currentSlot.getTime() + adminSettings.sessionDuration * 60 * 1000
            );
            continue;
          }

          defaultSlots.push(timeStr);

          // Add session duration + buffer time
          const totalSlotTime =
            adminSettings.sessionDuration + (adminSettings.bufferTimeBetweenSessions || 0);
          currentSlot = new Date(currentSlot.getTime() + totalSlotTime * 60 * 1000);
        }

        console.log("📅 Using admin settings for fallback slots:", defaultSlots);
        return defaultSlots.length > 0
          ? defaultSlots
          : ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
      } catch (settingsError) {
        console.error("Error getting admin settings for fallback:", settingsError);
        // Final fallback to hardcoded slots
        return [
          "09:00",
          "09:30",
          "10:00",
          "10:30",
          "11:00",
          "11:30",
          "14:00",
          "14:30",
          "15:00",
          "15:30",
          "16:00",
          "16:30",
        ];
      }
    }
  }
}
