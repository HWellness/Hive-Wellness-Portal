import { db } from "./db";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { introductionCalls, appointments, users } from "../shared/schema";
import { dailyService } from "./daily-service";

export interface VideoSessionData {
  id: string;
  sessionType: string;
  scheduledAt: string;
  duration: number;
  status: string;
  meetingUrl: string;
  meetingId?: string;
  calendarEventId?: string;
  clientName: string;
  clientEmail?: string;
  therapistName?: string;
  joinInstructions?: string;
  clientId?: string;
  therapistId?: string;
  endTime?: string;
  participants?: Array<{ id: string; name: string; role: string }>;
}

export interface VideoSessionParticipant {
  userId: string;
  name: string;
  role: "client" | "therapist" | "admin";
  joinedAt?: Date;
  leftAt?: Date;
}

export class VideoSessionService {
  /**
   * Get video session data for a given session ID
   */
  static async getVideoSession(sessionId: string): Promise<VideoSessionData | null> {
    try {
      console.log(`VideoSessionService: Getting video session details for ${sessionId}`);

      // Get appointment first, then fetch user data separately to avoid join issues
      const appointmentRows = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, sessionId));

      if (appointmentRows.length > 0) {
        const appointment = appointmentRows[0];

        // Fetch client and therapist data separately
        const [clientRows, therapistRows] = await Promise.all([
          appointment.clientId
            ? db.select().from(users).where(eq(users.id, appointment.clientId))
            : Promise.resolve([]),
          appointment.primaryTherapistId
            ? db.select().from(users).where(eq(users.id, appointment.primaryTherapistId))
            : Promise.resolve([]),
        ]);

        const client = clientRows[0];
        const therapist = therapistRows[0];

        // Process the appointment data
        const session = { appointment, client, therapist };
        // Use the session data we already have

        console.log(`VideoSessionService: Found therapy session:`, {
          id: appointment.id,
          clientName: client?.firstName,
          therapistName: therapist?.firstName,
          scheduledAt: appointment.scheduledAt,
        });

        // Use existing Daily.co room URL if available, otherwise create persistent one
        let meetingUrl = appointment.dailyRoomUrl;

        if (!meetingUrl) {
          console.log(`📅 Creating persistent Daily.co room for therapy session ${sessionId}`);
          // Create real Daily.co room for the session
          if (client && therapist) {
            try {
              const roomData = await dailyService.createTherapyRoom({
                sessionId: sessionId,
                clientName: client.firstName || "Client",
                therapistName: therapist.firstName || "Therapist",
                scheduledAt: appointment.scheduledAt,
                duration: appointment.duration || 50,
              });

              meetingUrl = roomData.roomUrl;

              // Update database with persistent Daily.co room URL
              await db
                .update(appointments)
                .set({
                  dailyRoomUrl: meetingUrl,
                  dailyRoomName: roomData.roomName,
                })
                .where(eq(appointments.id, sessionId));

              console.log(`✅ Persistent Daily.co room created and stored: ${meetingUrl}`);
            } catch (roomError) {
              console.error(
                `❌ Failed to create Daily.co room for session ${sessionId}:`,
                roomError
              );
              console.log(
                `⚠️ Session ${sessionId} will be returned without meeting URL - Daily.co integration temporarily unavailable`
              );
              // Don't throw - continue to return session data without meeting URL
              // The join route will handle this gracefully and provide appropriate user feedback
              meetingUrl = null;
            }
          } else {
            console.error(
              `❌ Cannot create Daily.co room - missing client or therapist data for appointment ${sessionId}`
            );
            console.log(
              `⚠️ Session ${sessionId} will be returned without meeting URL - missing participant information`
            );
            meetingUrl = null;
          }
        } else {
          console.log(`✅ Using existing persistent Daily.co room: ${meetingUrl}`);
        }

        const sessionData: VideoSessionData = {
          id: appointment.id,
          sessionType: appointment.sessionType || "therapy",
          scheduledAt: appointment.scheduledAt.toISOString(),
          endTime: appointment.endTime?.toISOString(),
          duration: appointment.duration || 50,
          status: appointment.status || "scheduled",
          meetingUrl: meetingUrl || "", // Ensure never undefined/null
          meetingId: undefined,
          calendarEventId: appointment.calendarEventId || undefined,
          clientName: `${client?.firstName || ""} ${client?.lastName || ""}`.trim(),
          clientEmail: client?.email,
          therapistName: `${therapist?.firstName || ""} ${therapist?.lastName || ""}`.trim(),
          clientId: client?.id,
          therapistId: therapist?.id,
          participants: [
            {
              id: client?.id || "",
              name: `${client?.firstName || ""} ${client?.lastName || ""}`.trim(),
              role: "client",
            },
            {
              id: therapist?.id || "",
              name: `${therapist?.firstName || ""} ${therapist?.lastName || ""}`.trim(),
              role: "therapist",
            },
          ],
          joinInstructions: `
To join your therapy session:

1. Click "Join Video Session" button below
2. Choose "Join with browser" (no app download required)
3. Allow camera and microphone access when prompted
4. Wait for your therapist to join

Meeting URL: ${meetingUrl}

Session details:
- Client: ${client?.firstName || "Unknown"}
- Therapist: ${therapist?.firstName || "Unknown"}
- Scheduled: ${new Date(appointment.scheduledAt).toLocaleString("en-GB", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/London",
          })}
- Duration: ${appointment.duration || 50} minutes
          `.trim(),
        };

        return sessionData;
      }

      // Fallback: Check introduction calls table
      const introCalls = await db
        .select()
        .from(introductionCalls)
        .where(eq(introductionCalls.id, sessionId));

      if (introCalls.length > 0) {
        const introCall = introCalls[0];

        // Use existing meeting link if available, otherwise create persistent one
        let meetingUrl = introCall.meetingLink;

        if (!meetingUrl) {
          console.log(`📅 Creating persistent Daily.co room for introduction call ${sessionId}`);
          // Create Daily.co room for introduction call
          try {
            const roomData = await dailyService.createTherapyRoom({
              sessionId: sessionId,
              clientName: introCall.name || "Client",
              therapistName: "Hive Wellness Team",
              scheduledAt: introCall.preferredDate,
              duration: 15, // Introduction calls are typically 15 minutes
            });
            meetingUrl = roomData.roomUrl;

            // Update database with persistent meeting link
            await db
              .update(introductionCalls)
              .set({
                meetingLink: meetingUrl,
              })
              .where(eq(introductionCalls.id, sessionId));

            console.log(`✅ Persistent meeting link created and stored: ${meetingUrl}`);
          } catch (roomError) {
            console.error(
              `❌ Failed to create Daily.co room for introduction call ${sessionId}:`,
              roomError
            );
            meetingUrl = null;
          }
        } else {
          console.log(`✅ Using existing persistent meeting link: ${meetingUrl}`);
        }

        const sessionData: VideoSessionData = {
          id: introCall.id,
          sessionType: "introduction-call",
          scheduledAt: introCall.preferredDate.toISOString(),
          duration: 30,
          status: introCall.status || "confirmed",
          meetingUrl: meetingUrl || "",
          meetingId: undefined,
          calendarEventId: undefined,
          clientName: introCall.name,
          clientEmail: introCall.email,
          therapistName: "Hive Wellness Team",
          joinInstructions: `
To join your video session:

1. Click "Join Video Session" button below
2. Choose "Join with browser" (no app download required)
3. Allow camera and microphone access when prompted  
4. Wait for the Hive Wellness team member to join

Meeting URL: ${meetingUrl}

Session starts at: ${new Date(introCall.preferredDate).toLocaleString("en-GB", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/London",
          })}
          `.trim(),
        };

        console.log(`VideoSessionService: Found intro call session:`, {
          id: sessionData.id,
          meetingUrl: sessionData.meetingUrl,
          scheduledAt: sessionData.scheduledAt,
        });

        return sessionData;
      }

      // CRITICAL FIX: Check for known demo sessions with proper meetingUrl
      console.log(
        `VideoSessionService: Session ${sessionId} not found in database, checking demo sessions...`
      );

      // Define demo sessions directly (matching video-sessions.ts createDemoSessions)
      const demoSessions: { [key: string]: any } = {
        "shared-demo-session": {
          id: "shared-demo-session",
          sessionType: "therapy",
          clientId: "demo-client-1",
          therapistId: "demo-therapist-1",
          scheduledAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          duration: 60,
          status: "scheduled",
          clientName: "Demo Client",
          therapistName: "Dr. Demo Therapist",
          meetingUrl: "https://meet.google.com/demo-shared-session",
        },
        "client-demo-session": {
          id: "client-demo-session",
          sessionType: "therapy",
          clientId: "demo-client-1",
          therapistId: "demo-therapist-1",
          scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          duration: 50,
          status: "scheduled",
          clientName: "Demo Client",
          therapistName: "Dr. Demo Therapist",
          meetingUrl: "https://meet.google.com/demo-client-session",
        },
        "therapist-demo-session": {
          id: "therapist-demo-session",
          sessionType: "therapy",
          clientId: "demo-client-1",
          therapistId: "demo-therapist-1",
          scheduledAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          duration: 50,
          status: "scheduled",
          clientName: "Demo Client",
          therapistName: "Dr. Demo Therapist",
          meetingUrl: "https://meet.google.com/demo-therapist-session",
        },
      };

      const demoSession = demoSessions[sessionId];

      if (demoSession) {
        console.log(`VideoSessionService: Found demo session: ${sessionId}`);

        // Convert demo session format to VideoSessionData format
        const sessionData: VideoSessionData = {
          id: demoSession.id,
          sessionType: demoSession.sessionType,
          scheduledAt: demoSession.scheduledAt,
          duration: demoSession.duration,
          status: demoSession.status,
          meetingUrl: demoSession.meetingUrl, // Use predefined demo meeting URL
          clientName: demoSession.clientName || "Demo Client",
          therapistName: demoSession.therapistName || "Demo Therapist",
          clientId: demoSession.clientId,
          therapistId: demoSession.therapistId,
          participants: [
            {
              id: demoSession.clientId,
              name: demoSession.clientName || "Demo Client",
              role: "client",
            },
            {
              id: demoSession.therapistId,
              name: demoSession.therapistName || "Demo Therapist",
              role: "therapist",
            },
          ],
          joinInstructions: `
Demo session for testing video functionality.

To join:
1. Click "Join Video Session" button
2. This is a demo session for testing purposes
3. Meeting URL: ${demoSession.meetingUrl}

Session details:
- Session ID: ${sessionId}
- Type: ${demoSession.sessionType}
- Duration: ${demoSession.duration} minutes
          `.trim(),
        };

        return sessionData;
      }

      console.log(
        `VideoSessionService: Session ${sessionId} not found in appointments or introduction calls`
      );
      return null;
    } catch (error) {
      console.error("VideoSessionService: Error getting video session:", error);
      return null;
    }
  }

  /**
   * Get all video sessions for a specific user (client or therapist)
   */
  static async getUserVideoSessions(
    userId: string,
    userEmail?: string
  ): Promise<VideoSessionData[]> {
    try {
      console.log(
        `VideoSessionService: Getting video sessions for user ${userId}, email: ${userEmail}`
      );

      const sessions: VideoSessionData[] = [];

      // Get appointments where user is either client or therapist
      const appointmentRows = await db
        .select()
        .from(appointments)
        .where(or(eq(appointments.clientId, userId), eq(appointments.primaryTherapistId, userId)));

      // Process each appointment with user data
      for (const appointment of appointmentRows) {
        const [clientRows, therapistRows] = await Promise.all([
          appointment.clientId
            ? db.select().from(users).where(eq(users.id, appointment.clientId))
            : Promise.resolve([]),
          appointment.primaryTherapistId
            ? db.select().from(users).where(eq(users.id, appointment.primaryTherapistId))
            : Promise.resolve([]),
        ]);

        const client = clientRows[0];
        const therapist = therapistRows[0];

        // Use existing Daily.co room URL from appointment
        let meetingUrl = appointment.dailyRoomUrl;
        if (!meetingUrl) {
          // For appointments without Daily.co URLs, include them anyway - joinVideoSession will create URL on-demand
          console.log(
            `VideoSessionService: No Daily.co URL for appointment ${appointment.id}, session may be pending setup`
          );
          meetingUrl = ""; // Empty URL - will be created when user joins
        }

        sessions.push({
          id: appointment.id,
          sessionType: appointment.sessionType || "therapy",
          scheduledAt: appointment.scheduledAt.toISOString(),
          endTime: appointment.endTime?.toISOString(),
          duration: appointment.duration || 50,
          status: appointment.status || "scheduled",
          meetingUrl: meetingUrl,
          clientName: `${client?.firstName || ""} ${client?.lastName || ""}`.trim(),
          clientEmail: client?.email,
          therapistName: `${therapist?.firstName || ""} ${therapist?.lastName || ""}`.trim(),
          clientId: client?.id,
          therapistId: therapist?.id,
          participants: [
            {
              id: client?.id || "",
              name: `${client?.firstName || ""} ${client?.lastName || ""}`.trim(),
              role: "client",
            },
            {
              id: therapist?.id || "",
              name: `${therapist?.firstName || ""} ${therapist?.lastName || ""}`.trim(),
              role: "therapist",
            },
          ],
        });
      }

      // SECURITY FIX: Get introduction calls where user's email matches (not userId)
      // Only fetch if userEmail is provided to avoid unnecessary queries
      let introCalls: any[] = [];
      if (userEmail) {
        introCalls = await db
          .select()
          .from(introductionCalls)
          .where(eq(introductionCalls.email, userEmail));
        console.log(
          `VideoSessionService: Found ${introCalls.length} introduction calls for email ${userEmail}`
        );
      } else {
        console.log(`VideoSessionService: Skipping introduction calls - no user email provided`);
      }

      for (const introCall of introCalls) {
        let meetingUrl = introCall.meetingLink;
        if (!meetingUrl) {
          // For introduction calls without meeting URLs, include them anyway - joinVideoSession will create URL on-demand
          console.log(
            `VideoSessionService: No meeting URL for introduction call ${introCall.id}, call may be pending setup`
          );
          meetingUrl = ""; // Empty URL - will be created when user joins
        }

        sessions.push({
          id: introCall.id,
          sessionType: "introduction-call",
          scheduledAt: introCall.preferredDate.toISOString(),
          duration: 30,
          status: introCall.status || "confirmed",
          meetingUrl: meetingUrl,
          clientName: introCall.name,
          clientEmail: introCall.email,
          therapistName: "Hive Wellness Team",
        });
      }

      console.log(`VideoSessionService: Found ${sessions.length} sessions for user ${userId}`);
      return sessions.sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    } catch (error) {
      console.error("VideoSessionService: Error getting user video sessions:", error);
      throw new Error(
        `Failed to get user video sessions: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Track when a user joins a video session
   */
  static async joinVideoSession(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; meetingUrl: string }> {
    try {
      console.log(`VideoSessionService: User ${userId} joining session ${sessionId}`);

      const sessionData = await this.getVideoSession(sessionId);
      if (!sessionData) {
        throw new Error("Session not found");
      }

      // Update session status if it's scheduled
      if (sessionData.sessionType === "therapy") {
        await db
          .update(appointments)
          .set({
            status: "in_progress",
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, sessionId));
      }

      // Create Google Meet URL if missing
      let meetingUrl = sessionData.meetingUrl;

      if (!meetingUrl && sessionData.sessionType === "therapy") {
        console.log(`📅 Creating Daily.co room on-demand for session ${sessionId}...`);
        try {
          // Get appointment details for therapist ID
          const appointment = await db
            .select()
            .from(appointments)
            .where(eq(appointments.id, sessionId))
            .limit(1);

          if (appointment.length > 0) {
            const roomData = await dailyService.createTherapyRoom({
              sessionId: sessionId,
              clientName: sessionData.clientName || "Client",
              therapistName: "Therapist",
              scheduledAt: new Date(sessionData.scheduledAt),
              duration: sessionData.duration || 50,
            });

            meetingUrl = roomData.roomUrl;
            console.log(`✅ Daily.co room created on-demand: ${meetingUrl}`);

            // Update appointment with the new Daily.co URL
            await db
              .update(appointments)
              .set({
                dailyRoomUrl: meetingUrl,
                dailyRoomName: roomData.roomName,
                updatedAt: new Date(),
              })
              .where(eq(appointments.id, sessionId));
          }
        } catch (meetError) {
          console.warn("Failed to create Daily.co room on-demand:", meetError);
          // Continue without URL - better to let user try than fail completely
        }
      }

      console.log(
        `✅ User ${userId} successfully joined session ${sessionId} with meeting URL: ${meetingUrl || "none"}`
      );
      return {
        success: true,
        meetingUrl: meetingUrl || "",
      };
    } catch (error) {
      console.error("VideoSessionService: Error joining video session:", error);
      throw new Error(
        `Failed to join video session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * PRODUCTION-READY: Track when a user leaves a video session with automatic completion detection
   */
  static async leaveVideoSession(
    sessionId: string,
    userId: string,
    options?: {
      autoComplete?: boolean;
    }
  ): Promise<{
    success: boolean;
    sessionCompleted?: boolean;
    requiresManualCompletion?: boolean;
    paymentTriggered?: boolean;
    paymentResult?: any;
  }> {
    try {
      console.log(`VideoSessionService: User ${userId} leaving session ${sessionId}`);

      let sessionCompleted = false;
      let requiresManualCompletion = false;
      let paymentTriggered = false;
      let paymentResult: any = undefined;

      // ENHANCED: Automatic completion detection for production reliability
      if (options?.autoComplete) {
        const sessionData = await this.getVideoSession(sessionId);

        if (
          sessionData &&
          sessionData.sessionType === "therapy" &&
          sessionData.status === "in_progress"
        ) {
          // Check if session has run for minimum required duration
          const scheduledAt = new Date(sessionData.scheduledAt);
          const now = new Date();
          const sessionDuration = (now.getTime() - scheduledAt.getTime()) / 1000 / 60; // minutes
          const minimumSessionDuration = 10; // 10 minutes minimum for billing

          if (sessionDuration >= minimumSessionDuration) {
            console.log(
              `⏰ Session ${sessionId} ran for ${sessionDuration.toFixed(1)} minutes - triggering automatic completion with payment`
            );

            // PRODUCTION ENHANCEMENT: Automatically trigger session completion with payment processing
            try {
              // Dynamic import to avoid circular dependencies
              const { SessionPaymentService } = await import("./session-payment-service");

              const completionData = {
                sessionId,
                userId,
                userRole: "participant" as "client" | "therapist" | "admin",
                actualDuration: Math.round(sessionDuration),
                completedBy: "system" as const,
                reason: "user_left_after_minimum_duration",
                sessionStartTime: scheduledAt,
                sessionEndTime: now,
              };

              console.log(
                `🚀 Triggering automatic session completion with payment for session ${sessionId}`
              );

              paymentResult = await SessionPaymentService.completeSessionWithPayment(
                completionData,
                {
                  idempotencyKey: `auto-complete-${sessionId}-${Date.now()}`,
                  paymentTiming: "immediate",
                }
              );

              paymentTriggered = true;
              sessionCompleted = paymentResult.success;

              if (paymentResult.success) {
                console.log(
                  `✅ Session ${sessionId} automatically completed with payment processing initiated`
                );
              } else {
                console.log(
                  `⚠️ Session ${sessionId} completion attempted but payment processing failed: ${paymentResult.error}`
                );
                requiresManualCompletion = true;
              }
            } catch (autoCompletionError) {
              console.error(
                `❌ Automatic session completion failed for ${sessionId}:`,
                autoCompletionError
              );
              requiresManualCompletion = true;

              // Fallback: Mark session as requiring manual completion
              console.log(
                `🔄 Session ${sessionId} marked for manual completion due to auto-completion failure`
              );
            }
          } else {
            console.log(
              `⏰ Session ${sessionId} only ran ${sessionDuration.toFixed(1)} minutes - below minimum ${minimumSessionDuration} minutes for billing`
            );

            // For very short sessions, mark as completed without payment
            try {
              await this.markSessionCompletedWithoutPayment(sessionId, "session_too_short");
              sessionCompleted = true;
              console.log(
                `✅ Session ${sessionId} marked as completed without payment (duration too short)`
              );
            } catch (error) {
              console.error(`❌ Failed to mark short session as completed:`, error);
              requiresManualCompletion = true;
            }
          }
        } else {
          // Non-therapy sessions or sessions not in progress
          if (sessionData?.sessionType !== "therapy") {
            console.log(`ℹ️ Non-therapy session ${sessionId} - no payment processing required`);
            sessionCompleted = true;
          }
        }
      }

      console.log(`✅ User ${userId} left session ${sessionId}`, {
        sessionCompleted,
        requiresManualCompletion,
        paymentTriggered,
        paymentSuccess: paymentResult?.success,
      });

      return {
        success: true,
        sessionCompleted,
        requiresManualCompletion,
        paymentTriggered,
        paymentResult,
      };
    } catch (error) {
      console.error("VideoSessionService: Error leaving video session:", error);
      throw new Error(
        `Failed to leave video session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * PRODUCTION UTILITY: Mark session as completed without payment (for short sessions or free sessions)
   */
  private static async markSessionCompletedWithoutPayment(
    sessionId: string,
    reason: string
  ): Promise<void> {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { appointments } = await import("../shared/schema");

      await db
        .update(appointments)
        .set({
          status: "completed",
          updatedAt: new Date(),
          notes: reason,
        })
        .where(eq(appointments.id, sessionId));

      console.log(`✅ Session ${sessionId} marked as completed without payment: ${reason}`);
    } catch (error) {
      console.error(`❌ Failed to mark session as completed without payment:`, error);
      throw error;
    }
  }
}
