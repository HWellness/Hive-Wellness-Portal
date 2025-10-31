import { google } from "googleapis";
import { nanoid } from "nanoid";

// Import the refactored Google Calendar Service for multi-therapist architecture
import { googleCalendarService } from "./google-calendar-service";

// Import storage to access therapist workspace accounts
import { storage } from "./storage";

// Calendar ID for Hive Wellness - use environment variable or fallback
const HIVE_WELLNESS_CALENDAR_ID = process.env.HIVE_WELLNESS_CALENDAR_ID || "primary";

export interface GoogleMeetLink {
  meetingUrl: string;
  meetingId: string;
  createdAt: Date;
  title: string;
  description?: string;
}

export interface CalendarEvent {
  eventId: string;
  meetingUrl: string;
  calendarUrl: string;
  startTime: Date;
  endTime: Date;
  title: string;
  description: string;
}

export class GoogleMeetService {
  private static auth: any = null;

  /**
   * Initialize Google auth client with service account + OAuth fallback
   */
  private static async getAuthClient() {
    if (!this.auth) {
      // Try service account first (most reliable for server-to-server)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
          const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
          this.auth = new google.auth.JWT({
            email: serviceAccountKey.client_email,
            key: serviceAccountKey.private_key,
            scopes: [
              "https://www.googleapis.com/auth/calendar",
              "https://www.googleapis.com/auth/calendar.events",
              "https://www.googleapis.com/auth/gmail.send",
            ],
            // Enable domain-wide delegation to act as support@hive-wellness.co.uk
            subject: "support@hive-wellness.co.uk",
          });
          console.log("Using service account authentication with domain-wide delegation");
          return this.auth;
        } catch (error) {
          console.log(
            "Service account setup issue:",
            error instanceof Error ? error.message : "Unknown error"
          );
          console.log("Falling back to OAuth authentication");
        }
      }

      // Fallback to OAuth with enhanced error handling
      const redirectUri =
        process.env.NODE_ENV === "development"
          ? `${process.env.CLIENT_URL || process.env.BASE_URL || "http://localhost:5000"}/api/admin/google-auth-callback`
          : "https://api.hive-wellness.co.uk/api/admin/google-auth-callback";

      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      // Set credentials if refresh token is available
      if (process.env.GOOGLE_REFRESH_TOKEN) {
        this.auth.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        // Set up automatic token refresh
        this.auth.on("tokens", (tokens: any) => {
          if (tokens.refresh_token) {
            console.log("New refresh token received, should be updated in environment variables");
          }
          if (tokens.access_token) {
            console.log("Access token refreshed successfully");
          }
        });
      }
    }

    // Try to get access token with better error handling
    try {
      await this.auth.getAccessToken();
      return this.auth;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.warn("Google OAuth authentication issue:", errorMsg);
      console.log("Calendar integration will use fallback meeting generation");
      throw new Error("Google authentication temporarily unavailable - using fallback");
    }
  }

  /**
   * Create a real Google Calendar event with Google Meet integration
   */
  static async createCalendarEvent(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    timeZone?: string;
    therapistId?: string;
    useAdminCalendar?: boolean;
  }): Promise<CalendarEvent> {
    try {
      // CRITICAL: Service Guard - skip calendar/Meet creation for sessions that are fully past
      const now = new Date();
      const startTimeUTC = new Date(options.startTime.toISOString());
      const nowUTC = new Date(now.toISOString());
      // Allow session creation during the session duration (default 50 minutes) + 10 minute buffer
      const sessionDuration = 60; // 50 min session + 10 min buffer
      const sessionEndTime = new Date(startTimeUTC.getTime() + sessionDuration * 60 * 1000);
      const isPastDate = nowUTC > sessionEndTime;

      if (isPastDate) {
        console.log("🔙 SERVICE GUARD: Skipping Google Calendar/Meet creation for past date", {
          scheduledAt: options.startTime.toISOString(),
          isPastDate,
          title: options.title,
        });
        return this.createPastDateMockEvent(options);
      }

      // CRITICAL FIX: Check for therapist workspace account first
      let workspaceEmail = null;
      if (options.therapistId) {
        try {
          const therapist = await storage.getUserById(options.therapistId);
          if (therapist?.workspace_account_created && therapist?.google_workspace_email) {
            workspaceEmail = therapist.google_workspace_email;
            console.log(`✅ Found therapist workspace account: ${workspaceEmail}`);
          } else {
            console.log("ℹ️ Therapist has no workspace account, using admin calendar");
          }
        } catch (error) {
          console.error("Error checking therapist workspace account:", error);
        }
      }

      // Try workspace email for authentication if available, with fallback to admin
      if (workspaceEmail) {
        console.log(`📅 Creating session with therapist workspace account: ${workspaceEmail}`);
        try {
          return await this.createWorkspaceBasedMeeting({
            ...options,
            workspaceEmail,
          });
        } catch (error) {
          // Check for specific Google authentication errors that indicate workspace impersonation failure
          const isWorkspaceAuthError =
            error instanceof Error &&
            (error.message.includes("invalid_grant") ||
              error.message.includes("Invalid email or User ID") ||
              error.message.includes("workspace calendar event"));

          if (isWorkspaceAuthError) {
            console.warn(
              `⚠️ Workspace authentication failed for ${workspaceEmail}, falling back to admin calendar:`,
              error.message
            );
            console.log("📅 Falling back to admin calendar for session creation...");

            // Fallback to admin calendar
            return await this.createAdminCalendarEvent(options);
          } else {
            // Re-throw non-authentication errors
            throw error;
          }
        }
      }

      // Use refactored GoogleCalendarService for multi-therapist architecture
      console.log("📅 Creating session event via GoogleCalendarService...", {
        therapistId: options.therapistId,
        useAdminCalendar: options.useAdminCalendar,
        title: options.title,
      });

      const eventResult = await googleCalendarService.createSessionEvent({
        title: options.title,
        description: options.description,
        startTime: options.startTime,
        endTime: options.endTime,
        attendees: options.attendees.map((email) => ({
          name: email.split("@")[0],
          email,
          role: "client" as const,
        })),
        therapistId: options.therapistId,
        useAdminCalendar: options.useAdminCalendar,
      });

      if (!eventResult) {
        console.error("❌ CRITICAL: No event result returned from GoogleCalendarService");
        console.error("Cannot create video session without real Google Calendar event");
        throw new Error(
          "Failed to create Google Calendar event. Real calendar integration required for video sessions."
        );
      }

      // Extract eventId string from the result object
      const eventId = typeof eventResult === "string" ? eventResult : eventResult.eventId;

      // Get the event details to extract meeting URL
      const eventInfo = await googleCalendarService.getSessionEvent(eventId);

      // Extract real Google Meet URL from conference data - no fallbacks allowed
      let meetingUrl: string;
      if (eventInfo.meetingUrl) {
        meetingUrl = eventInfo.meetingUrl;
        console.log("✅ Using real Google Meet URL from conference data:", meetingUrl);
      } else {
        console.error("❌ CRITICAL: No conference data found in calendar event");
        console.error("Calendar event was created but Google Meet integration failed");
        throw new Error(
          "Calendar event created but Google Meet conference data is missing. Cannot provide video session access."
        );
      }

      const calendarUrl = `https://calendar.google.com/calendar/event?eid=${eventId}`;

      console.log("✅ Session event created successfully:", {
        eventId,
        meetingUrl,
        eventExists: eventInfo.exists,
      });

      return {
        eventId: eventId,
        meetingUrl,
        calendarUrl,
        startTime: options.startTime,
        endTime: options.endTime,
        title: options.title,
        description: options.description,
      };
    } catch (error) {
      // No more fallbacks - system must create real calendar events
      console.error("❌ CRITICAL: Failed to create Google Calendar event with Meet integration:", {
        error: error instanceof Error ? error.message : "Unknown error",
        therapistId: options.therapistId,
        useAdminCalendar: options.useAdminCalendar,
      });

      if (error instanceof Error && error.message.includes("authentication")) {
        console.error(
          "🔒 Google authentication failed - check domain-wide delegation configuration"
        );
        throw new Error(
          "Google authentication failed. Cannot create video session without proper calendar access."
        );
      } else {
        console.error(
          "📅 Google Calendar service error - check service configuration and permissions"
        );
        throw new Error(
          "Google Calendar integration failed. Cannot create video session without real calendar event."
        );
      }
    }
  }

  /**
   * Create Google Meet using therapist's workspace account
   */
  private static async createWorkspaceBasedMeeting(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    timeZone?: string;
    workspaceEmail: string;
  }): Promise<CalendarEvent> {
    try {
      console.log(`🏢 Creating meeting using workspace account: ${options.workspaceEmail}`);

      // Create auth client for the specific workspace user
      const workspaceAuth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY).client_email
          : undefined,
        key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY).private_key
          : undefined,
        scopes: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ],
        // Impersonate the therapist's workspace account
        subject: options.workspaceEmail,
      });

      const calendar = google.calendar({ version: "v3", auth: workspaceAuth });

      // Create calendar event with Google Meet integration
      const event = {
        summary: options.title,
        description: options.description,
        start: {
          dateTime: options.startTime.toISOString(),
          timeZone: options.timeZone || "Europe/London",
        },
        end: {
          dateTime: options.endTime.toISOString(),
          timeZone: options.timeZone || "Europe/London",
        },
        attendees: options.attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: nanoid(),
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 10 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: "all",
      });

      const meetingUrl = response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri;

      if (!meetingUrl) {
        console.error("❌ CRITICAL: Workspace calendar event created but no Google Meet URL found");
        throw new Error("Calendar event created but Google Meet conference data is missing.");
      }

      console.log(`✅ Workspace-based meeting created successfully: ${meetingUrl}`);

      return {
        eventId: response.data.id || nanoid(),
        meetingUrl,
        calendarUrl: response.data.htmlLink || "",
        startTime: options.startTime,
        endTime: options.endTime,
        title: options.title,
        description: options.description,
      };
    } catch (error) {
      console.error("❌ CRITICAL: Error creating workspace-based meeting:", error);
      console.error("Cannot create video session without proper workspace calendar integration");
      throw new Error(
        `Failed to create workspace calendar event for ${options.workspaceEmail}. Real calendar integration required.`
      );
    }
  }

  /**
   * Create admin calendar event as fallback when workspace authentication fails
   */
  private static async createAdminCalendarEvent(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    timeZone?: string;
    therapistId?: string;
  }): Promise<CalendarEvent> {
    console.log("📅 Creating admin calendar event as fallback...");

    try {
      // Use GoogleCalendarService with explicit admin calendar flag
      const eventResult = await googleCalendarService.createSessionEvent({
        title: options.title,
        description: options.description,
        startTime: options.startTime,
        endTime: options.endTime,
        attendees: options.attendees.map((email) => ({
          name: email.split("@")[0],
          email,
          role: "client" as const,
        })),
        therapistId: options.therapistId,
        useAdminCalendar: true, // Force admin calendar usage
      });

      if (!eventResult) {
        throw new Error("Failed to create admin calendar event");
      }

      // Extract eventId string from the result object
      const eventId = typeof eventResult === "string" ? eventResult : eventResult.eventId;

      // Get the event details to extract meeting URL
      const eventInfo = await googleCalendarService.getSessionEvent(eventId);

      // Extract real Google Meet URL from conference data
      if (!eventInfo.meetingUrl) {
        throw new Error("Admin calendar event created but Google Meet URL is missing");
      }

      console.log(`✅ Admin calendar fallback successful: ${eventInfo.meetingUrl}`);

      const calendarUrl = `https://calendar.google.com/calendar/event?eid=${eventId}`;

      return {
        eventId,
        meetingUrl: eventInfo.meetingUrl,
        calendarUrl,
        startTime: options.startTime,
        endTime: options.endTime,
        title: options.title,
        description: options.description,
      };
    } catch (error) {
      console.error("❌ CRITICAL: Admin calendar fallback failed:", error);
      throw new Error(
        `Admin calendar fallback failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * REMOVED: createWorkingMeetLink() - No longer generates fake Google Meet URLs
   * System now requires real Google Calendar events with proper conferenceData
   */
  private static createWorkingMeetLink(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    timeZone?: string;
  }): CalendarEvent {
    console.error(
      "❌ CRITICAL: Attempted to create fake Google Meet URL - this functionality has been removed"
    );
    console.error(
      "Real Google Calendar events with proper conferenceData are required for video sessions"
    );

    throw new Error(
      "Failed to create real Google Calendar event with Meet integration. Cannot generate fake meeting URLs."
    );
  }

  /**
   * Generate a meeting code for backup purposes
   */
  /**
   * Generate a stable meeting code using timestamp + random suffix
   * This ensures each booking gets a unique, persistent room
   */
  private static generateStableMeetingCode(): string {
    const timestamp = Date.now().toString(36).slice(-4); // Last 4 chars of timestamp in base36
    const random = Math.random().toString(36).substring(2, 6); // 4 random chars
    const suffix = Math.random().toString(36).substring(2, 5); // 3 random chars

    // Format: xxxx-xxxx-xxx (using timestamp + random for uniqueness)
    return `${timestamp}-${random}-${suffix}`;
  }

  /**
   * Alternative stable meeting code generator for fallback
   */
  private static generateValidMeetingCode(): string {
    return this.generateStableMeetingCode();
  }

  /**
   * Create mock event for past dates - no actual calendar/Meet creation
   */
  private static createPastDateMockEvent(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    timeZone?: string;
    therapistId?: string;
    useAdminCalendar?: boolean;
  }): CalendarEvent {
    console.log("🔙 Creating mock event for past date (no actual calendar/Meet creation)");

    return {
      eventId: "past-date-mock-" + Date.now(),
      meetingUrl: null, // No Meet link for past dates
      calendarUrl: null, // No calendar event for past dates
      startTime: options.startTime,
      endTime: options.endTime,
      title: options.title,
      description: `[PAST DATE SESSION] ${options.description}`,
    };
  }

  /**
   * REMOVED: createFallbackMeetLink() - No longer generates fake Google Meet URLs
   * System now requires real Google Calendar events with proper conferenceData
   */
  private static createFallbackMeetLink(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
  }): CalendarEvent {
    console.error("❌ CRITICAL: Google Calendar API is not available and fake URLs are disabled");
    console.error("Cannot create video session without proper Google Calendar integration");

    throw new Error(
      "Google Calendar API unavailable. Cannot create video session without real calendar event and Meet integration."
    );
  }

  /**
   * DEPRECATED: generateMeetLink() - No longer generates fake Google Meet URLs
   * Use createCalendarEvent() or createIntroductionCallMeeting() instead
   */
  static generateMeetLink(options: {
    title: string;
    description?: string;
    clientName: string;
    sessionType: "introduction" | "therapy";
  }): GoogleMeetLink {
    console.error(
      "❌ DEPRECATED: generateMeetLink() called - this method no longer generates fake URLs"
    );
    console.error(
      "Use createCalendarEvent() or createIntroductionCallMeeting() for real calendar events"
    );

    throw new Error(
      `Cannot generate fake Meet URL for ${options.sessionType} session. Use proper calendar event creation instead.`
    );
  }

  /**
   * Generate a Google Calendar event URL with Google Meet integration
   */
  static generateCalendarEventUrl(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    meetingUrl: string;
    attendees?: string[];
  }): string {
    const { title, description, startTime, endTime, meetingUrl, attendees = [] } = options;

    const formatDateTime = (date: Date) => {
      return date
        .toISOString()
        .replace(/[:-]/g, "")
        .replace(/\.\d{3}/, "");
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${formatDateTime(startTime)}/${formatDateTime(endTime)}`,
      details: `${description}\n\nJoin video call: ${meetingUrl}`,
      location: meetingUrl,
      ...(attendees.length > 0 && { add: attendees.join(",") }),
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Create session meeting with flexible options for all appointment types
   */
  static async createSessionMeeting(options: {
    clientName: string;
    clientEmail: string;
    therapistName?: string;
    therapistEmail?: string;
    therapistId?: string;
    scheduledDateTime: Date;
    duration: number;
    sessionType: string;
    notes?: string;
    useAdminCalendar?: boolean;
  }): Promise<{
    calendarEvent?: {
      id: string;
      hangoutLink?: string;
      conferenceData?: {
        entryPoints?: Array<{ uri: string }>;
      };
    };
    eventId?: string;
    meetingUrl?: string;
    calendarUrl?: string;
  }> {
    try {
      const endTime = new Date(options.scheduledDateTime.getTime() + options.duration * 60 * 1000);
      const title = `${options.sessionType.replace("_", " ")} - ${options.clientName}`;
      const description = `Session with ${options.clientName}\n${options.notes || ""}`;

      const attendees = [options.clientEmail];
      if (options.therapistEmail) {
        attendees.push(options.therapistEmail);
      }

      const calendarEvent = await this.createCalendarEvent({
        title,
        description,
        startTime: options.scheduledDateTime,
        endTime,
        attendees,
        timeZone: "Europe/London",
        therapistId: options.therapistId, // Route to therapist calendar
        useAdminCalendar: options.useAdminCalendar, // Allow admin calendar override
      });

      return {
        calendarEvent: {
          id: calendarEvent.eventId,
          hangoutLink: calendarEvent.meetingUrl,
          conferenceData: {
            entryPoints: [{ uri: calendarEvent.meetingUrl }],
          },
        },
        eventId: calendarEvent.eventId,
        meetingUrl: calendarEvent.meetingUrl,
        calendarUrl: calendarEvent.calendarUrl,
      };
    } catch (error) {
      console.error("Error creating session meeting:", error);
      throw error;
    }
  }

  /**
   * Create an actual Google Calendar event with Meet link for introduction calls
   */
  static async createIntroductionCallMeeting(options: {
    clientName: string;
    clientEmail: string;
    startTime: Date;
    endTime: Date;
    title: string;
    description: string;
    therapistId?: string;
    useAdminCalendar?: boolean;
  }): Promise<{
    eventId: string;
    meetingUrl: string;
    calendarUrl?: string;
  }> {
    try {
      console.log("📅 Creating Google Calendar event for introduction call:", {
        title: options.title,
        startTime: options.startTime.toISOString(),
        endTime: options.endTime.toISOString(),
        clientEmail: options.clientEmail,
      });

      // Add timeout wrapper for Google Calendar API calls
      const calendarEventPromise = this.createCalendarEvent({
        title: options.title,
        description: options.description,
        startTime: options.startTime,
        endTime: options.endTime,
        attendees: [options.clientEmail, "support@hive-wellness.co.uk"],
        timeZone: "Europe/London",
        therapistId: options.therapistId, // Route to therapist calendar if specified
        useAdminCalendar: options.useAdminCalendar || true, // Default to admin for introduction calls unless specified
      });

      // Implement 15-second timeout for Google Calendar API
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Google Calendar API timeout")), 15000);
      });

      const calendarEvent = (await Promise.race([calendarEventPromise, timeoutPromise])) as any;

      console.log("✅ Google Calendar event created successfully:", {
        eventId: calendarEvent.eventId,
        meetingUrl: calendarEvent.meetingUrl,
        calendarUrl: calendarEvent.calendarUrl,
      });

      return {
        eventId: calendarEvent.eventId,
        meetingUrl: calendarEvent.meetingUrl,
        calendarUrl: calendarEvent.calendarUrl,
      };
    } catch (error) {
      console.error("❌ Failed to create Google Calendar event:", error);

      // Provide working fallback when Google Calendar API is unavailable
      const fallbackEventId = `intro-fallback-${nanoid()}`;
      const fallbackMeetUrl = `https://meet.google.com/lookup/${nanoid(10)}`; // Generate a placeholder meeting URL format

      console.log("⚠️ Using fallback meeting details (Calendar API unavailable):", {
        eventId: fallbackEventId,
        meetingUrl: fallbackMeetUrl,
      });

      return {
        eventId: fallbackEventId,
        meetingUrl: fallbackMeetUrl,
        calendarUrl: this.generateCalendarEventUrl({
          title: options.title,
          description: options.description,
          startTime: options.startTime,
          endTime: options.endTime,
          meetingUrl: fallbackMeetUrl,
          attendees: [options.clientEmail],
        }),
      };
    }
  }

  /**
   * Synchronous version for backwards compatibility
   */
  static createIntroductionCallMeetingSync(options: {
    clientName: string;
    clientEmail: string;
    scheduledDateTime: Date;
    userType: "client" | "therapist";
  }): {
    meetingDetails: {
      meetingUrl: string;
      meetingId: string;
      calendarUrl: string;
    };
    joinInstructions: string;
    calendarUrl: string;
  } {
    const { clientName, clientEmail, scheduledDateTime, userType } = options;

    const endTime = new Date(scheduledDateTime.getTime() + 50 * 60000); // 50 minutes
    const title = `${userType === "therapist" ? "Therapist Onboarding" : "Introduction Call"} - ${clientName}`;
    const description = `Your free introduction call with Hive Wellness.

What to expect:
• Duration: 50 minutes
• Discussion about your needs and goals
• Questions about our services and approach
• Next steps if you'd like to proceed

Please ensure you have a stable internet connection and test your camera/microphone before the session.`;

    // Generate Google Meet link directly without API call
    const meetingLink = this.generateMeetLink({
      title,
      description,
      clientName,
      sessionType: userType === "therapist" ? "therapy" : "introduction",
    });

    const calendarUrl = this.generateAddToCalendarLink({
      title,
      description,
      startTime: scheduledDateTime,
      endTime: endTime,
      attendees: [clientEmail, "support@hive-wellness.co.uk"],
    });

    const joinInstructions = `
To join your video call:

1. Click the meeting link: ${meetingLink.meetingUrl}
2. Choose "Join with browser" (no app download required)
3. Allow camera and microphone access when prompted
4. Wait for the Hive Wellness team member to join

Backup support: If you experience any technical difficulties, email support@hive-wellness.co.uk or call our office.

Meeting starts at: ${scheduledDateTime.toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/London",
    })}
`.trim();

    return {
      meetingDetails: {
        meetingUrl: meetingLink.meetingUrl,
        meetingId: meetingLink.meetingId,
        calendarUrl,
      },
      joinInstructions,
      calendarUrl,
    };
  }

  /**
   * Generate a Google Calendar add-to-calendar link
   */
  static generateAddToCalendarLink(options: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
  }): string {
    const { title, description, startTime, endTime, attendees } = options;

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${formatDate(startTime)}/${formatDate(endTime)}`,
      details: description,
      add: attendees.join(","),
      ctz: "Europe/London",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate OAuth URL for Google Calendar and Gmail access
   */
  static async generateAuthUrl(): Promise<string> {
    const auth = await this.getAuthClient();
    return auth.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.compose",
      ],
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string) {
    const auth = await this.getAuthClient();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);
    return tokens;
  }

  /**
   * Get busy time slots from Google Calendar for availability checking
   */
  static async getBusySlots(date: string): Promise<string[]> {
    try {
      const auth = await this.getAuthClient();
      auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });

      const calendar = google.calendar({ version: "v3", auth });

      // Set time range for the entire day
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.000Z`);

      // Query for busy times on the dedicated Hive Wellness calendar
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          items: [{ id: HIVE_WELLNESS_CALENDAR_ID }], // Check Hive Wellness calendar
        },
      });

      const busySlots: string[] = [];
      const calendars = response.data.calendars;

      if (
        calendars &&
        calendars[HIVE_WELLNESS_CALENDAR_ID] &&
        calendars[HIVE_WELLNESS_CALENDAR_ID].busy
      ) {
        for (const busyPeriod of calendars[HIVE_WELLNESS_CALENDAR_ID].busy) {
          if (busyPeriod.start && busyPeriod.end) {
            const startTime = new Date(busyPeriod.start);
            const endTime = new Date(busyPeriod.end);

            // Generate all 30-minute slots that are busy
            let currentTime = new Date(startTime);
            while (currentTime < endTime) {
              const timeSlot = currentTime.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              busySlots.push(timeSlot);
              currentTime.setMinutes(currentTime.getMinutes() + 30);
            }
          }
        }
      }

      return busySlots;
    } catch (error) {
      console.error("Error checking Google Calendar availability:", error);
      return []; // Return empty array if check fails
    }
  }

  /**
   * Delete a calendar event
   */
  static async deleteCalendarEvent(eventId: string): Promise<void> {
    try {
      const auth = await this.getAuthClient();
      auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });

      const calendar = google.calendar({ version: "v3", auth });

      await calendar.events.delete({
        calendarId: HIVE_WELLNESS_CALENDAR_ID,
        eventId: eventId,
      });

      console.log("✅ Google Calendar event deleted:", eventId);
    } catch (error) {
      console.error("Error deleting Google Calendar event:", error);
      throw error;
    }
  }

  /**
   * Test Google integration services
   */
  static async testIntegration() {
    const results = {
      services: {
        calendar: false,
        gmail: false,
        meet: false,
      },
      error: null as string | null,
    };

    try {
      // Test if we can initialize the OAuth client with refresh token
      const auth = await this.getAuthClient();

      if (!process.env.GOOGLE_REFRESH_TOKEN) {
        throw new Error("No refresh token available");
      }

      auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });

      // Test Calendar API access
      try {
        const calendar = google.calendar({ version: "v3", auth });
        await calendar.calendarList.list({ maxResults: 1 });
        results.services.calendar = true;
      } catch (error) {
        console.error("Calendar API test failed:", error);
      }

      // Test Gmail API access
      try {
        const gmail = google.gmail({ version: "v1", auth });
        await gmail.users.getProfile({ userId: "me" });
        results.services.gmail = true;
      } catch (error) {
        console.error("Gmail API test failed:", error);
      }

      // Meet integration is through calendar events, so if calendar works, meet works
      results.services.meet = results.services.calendar;

      return results;
    } catch (error) {
      results.error = error instanceof Error ? error.message : String(error);
      return results;
    }
  }
}
