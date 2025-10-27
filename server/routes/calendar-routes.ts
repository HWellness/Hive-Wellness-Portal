/**
 * Calendar Service API Routes
 * RESTful endpoints for calendar management operations
 */

import { Router } from "express";
import { calendarService } from "../services/calendar-service";
import { calendarWebhookHandler } from "../services/calendar-webhook-handler";
import { calendarChannelManager } from "../services/calendar-channel-manager";
import { therapistCalendarOnboardingService } from "../services/therapist-calendar-onboarding";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

const router = Router();

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

const createCalendarSchema = z.object({
  therapistId: z.string().min(1),
  therapistEmail: z.string().email(),
});

const checkAvailabilitySchema = z.object({
  calendarId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const createEventSchema = z.object({
  calendarId: z.string().min(1),
  appointmentId: z.string().min(1),
  event: z.object({
    summary: z.string().min(1),
    description: z.string().optional(),
    start: z.object({
      dateTime: z.string().datetime(),
      timeZone: z.string().default("Europe/London"),
    }),
    end: z.object({
      dateTime: z.string().datetime(),
      timeZone: z.string().default("Europe/London"),
    }),
    attendees: z
      .array(
        z.object({
          email: z.string().email(),
          displayName: z.string().optional(),
        })
      )
      .optional(),
    extendedProperties: z
      .object({
        private: z
          .object({
            therapistId: z.string(),
            appointmentId: z.string(),
          })
          .optional(),
      })
      .optional(),
  }),
});

const batchAvailabilitySchema = z.object({
  requests: z.array(
    z.object({
      therapistId: z.string().min(1),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
    })
  ),
});

const webhookEventSchema = z.object({
  channelId: z.string().min(1),
  resourceId: z.string().min(1),
  resourceState: z.enum(["not_exists", "exists", "sync"]),
  resourceUri: z.string().url(),
  channelExpiration: z.string().optional(),
  channelToken: z.string().optional(),
  messageNumber: z.string().optional(),
});

const batchSetupSchema = z.object({
  therapistIds: z.array(z.string()).optional(),
});

// ============================================================================
// CALENDAR MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/calendar/create
 * Create a managed calendar for a therapist
 */
router.post("/create", isAuthenticated, async (req, res) => {
  try {
    const { therapistId, therapistEmail } = createCalendarSchema.parse(req.body);

    // Check if user has permission
    if (!req.user || ((req.user as any).role !== "admin" && (req.user as any).id !== therapistId)) {
      return res.status(403).json({
        error: "Insufficient permissions to create calendar",
      });
    }

    const calendar = await calendarService.createManagedCalendar(therapistId, therapistEmail);

    res.json({
      success: true,
      calendar: {
        id: calendar.id,
        googleCalendarId: calendar.googleCalendarId,
        therapistId: calendar.therapistId,
        integrationStatus: calendar.integrationStatus,
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating calendar:", error);
    res.status(500).json({
      error: "Failed to create calendar",
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/list
 * List all therapist calendars (admin only)
 */
router.get("/list", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || (req.user as any).role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    const calendars = await storage.listTherapistCalendars();

    res.json({
      success: true,
      calendars: calendars.map((cal) => ({
        id: cal.id,
        therapistId: cal.therapistId,
        googleCalendarId: cal.googleCalendarId,
        integrationStatus: cal.integrationStatus,
        channelId: cal.channelId,
        channelExpiresAt: cal.channelExpiresAt,
      })),
    });
  } catch (error: any) {
    console.error("❌ Error listing calendars:", error);
    res.status(500).json({
      error: "Failed to list calendars",
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/:therapistId
 * Get calendar info for a specific therapist
 */
router.get("/:therapistId", isAuthenticated, async (req, res) => {
  try {
    const { therapistId } = req.params;

    // Check permissions
    if (!req.user || ((req.user as any).role !== "admin" && (req.user as any).id !== therapistId)) {
      return res.status(403).json({
        error: "Insufficient permissions",
      });
    }

    const calendar = await storage.getTherapistCalendar(therapistId);

    if (!calendar) {
      return res.status(404).json({
        error: "Calendar not found",
      });
    }

    res.json({
      success: true,
      calendar: {
        id: calendar.id,
        therapistId: calendar.therapistId,
        googleCalendarId: calendar.googleCalendarId,
        integrationStatus: calendar.integrationStatus,
        ownerAccountEmail: calendar.ownerAccountEmail,
        therapistSharedEmail: calendar.therapistSharedEmail,
      },
    });
  } catch (error: any) {
    console.error("❌ Error getting calendar:", error);
    res.status(500).json({
      error: "Failed to get calendar",
      details: error.message,
    });
  }
});

// ============================================================================
// AVAILABILITY & CONFLICT CHECKING
// ============================================================================

/**
 * POST /api/calendar/check-availability
 * Check if a time slot is available
 */
router.post("/check-availability", isAuthenticated, async (req, res) => {
  try {
    const { calendarId, startTime, endTime } = checkAvailabilitySchema.parse(req.body);

    const hasConflict = await calendarService.checkConflicts(
      calendarId,
      new Date(startTime),
      new Date(endTime)
    );

    if (hasConflict) {
      const busyTimes = await calendarService.listBusy(
        calendarId,
        new Date(startTime),
        new Date(endTime)
      );

      res.json({
        success: true,
        available: false,
        conflicts: busyTimes,
      });
    } else {
      res.json({
        success: true,
        available: true,
      });
    }
  } catch (error: any) {
    console.error("❌ Error checking availability:", error);
    res.status(500).json({
      error: "Failed to check availability",
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/batch-availability
 * Batch check availability for multiple therapists
 */
router.post("/batch-availability", isAuthenticated, async (req, res) => {
  try {
    const { requests } = batchAvailabilitySchema.parse(req.body);

    const availabilityRequests = requests.map((req) => ({
      therapistId: req.therapistId,
      startTime: new Date(req.startTime),
      endTime: new Date(req.endTime),
    }));

    const responses = await calendarService.batchCheckAvailability(availabilityRequests);

    res.json({
      success: true,
      responses,
    });
  } catch (error: any) {
    console.error("❌ Error batch checking availability:", error);
    res.status(500).json({
      error: "Failed to batch check availability",
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/:calendarId/busy
 * Get busy times for a calendar
 */
router.get("/:calendarId/busy", isAuthenticated, async (req, res) => {
  try {
    const { calendarId } = req.params;
    const { timeMin, timeMax } = req.query;

    if (!timeMin || !timeMax) {
      return res.status(400).json({
        error: "timeMin and timeMax parameters are required",
      });
    }

    const busyTimes = await calendarService.listBusy(
      calendarId,
      new Date(timeMin as string),
      new Date(timeMax as string)
    );

    res.json({
      success: true,
      busyTimes,
    });
  } catch (error: any) {
    console.error("❌ Error getting busy times:", error);
    res.status(500).json({
      error: "Failed to get busy times",
      details: error.message,
    });
  }
});

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

/**
 * POST /api/calendar/events
 * Create a calendar event
 */
router.post("/events", isAuthenticated, async (req, res) => {
  try {
    const { calendarId, appointmentId, event } = createEventSchema.parse(req.body);

    const eventId = await calendarService.createEvent(calendarId, event, appointmentId);

    res.json({
      success: true,
      eventId,
    });
  } catch (error: any) {
    console.error("❌ Error creating event:", error);

    if (error.name === "ConflictDetectedError") {
      return res.status(409).json({
        error: "Calendar conflict detected",
        conflicts: error.conflicts,
      });
    }

    res.status(500).json({
      error: "Failed to create event",
      details: error.message,
    });
  }
});

/**
 * PUT /api/calendar/events/:calendarId/:eventId
 * Update a calendar event
 */
router.put("/events/:calendarId/:eventId", isAuthenticated, async (req, res) => {
  try {
    const { calendarId, eventId } = req.params;
    const updates = req.body;

    await calendarService.updateEvent(calendarId, eventId, updates);

    res.json({
      success: true,
      message: "Event updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating event:", error);
    res.status(500).json({
      error: "Failed to update event",
      details: error.message,
    });
  }
});

/**
 * DELETE /api/calendar/events/:calendarId/:eventId
 * Delete a calendar event
 */
router.delete("/events/:calendarId/:eventId", isAuthenticated, async (req, res) => {
  try {
    const { calendarId, eventId } = req.params;

    await calendarService.deleteEvent(calendarId, eventId);

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting event:", error);
    res.status(500).json({
      error: "Failed to delete event",
      details: error.message,
    });
  }
});

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

/**
 * POST /api/calendar/webhook
 * Handle Google Calendar webhook notifications
 * Note: This endpoint should be publicly accessible (no auth)
 */
router.post("/webhook", async (req, res) => {
  try {
    // Get webhook data from headers and body
    const channelId = req.headers["x-goog-channel-id"] as string;
    const resourceId = req.headers["x-goog-resource-id"] as string;
    const resourceState = req.headers["x-goog-resource-state"] as string;
    const resourceUri = req.headers["x-goog-resource-uri"] as string;
    const channelExpiration = req.headers["x-goog-channel-expiration"] as string;
    const channelToken = req.headers["x-goog-channel-token"] as string;
    const messageNumber = req.headers["x-goog-message-number"] as string;

    if (!channelId || !resourceId || !resourceState || !resourceUri) {
      return res.status(400).json({
        error: "Missing required webhook headers",
      });
    }

    const webhookEvent = {
      channelId,
      resourceId,
      resourceState: resourceState as "not_exists" | "exists" | "sync",
      resourceUri,
      channelExpiration,
      channelToken,
      messageNumber,
    };

    // Process the webhook asynchronously
    const result = await calendarWebhookHandler.processWebhook(webhookEvent);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("❌ Error processing webhook:", error);
    res.status(500).json({
      error: "Failed to process webhook",
      details: error.message,
    });
  }
});

// ============================================================================
// ADMIN & MONITORING ENDPOINTS
// ============================================================================

/**
 * GET /api/calendar/metrics
 * Get calendar service metrics (admin only)
 */
router.get("/metrics", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || (req.user as any).role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    const metrics = calendarService.getMetrics();
    const channelStats = await calendarChannelManager.getStats();

    res.json({
      success: true,
      metrics,
      channelStats,
    });
  } catch (error: any) {
    console.error("❌ Error getting metrics:", error);
    res.status(500).json({
      error: "Failed to get metrics",
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/admin/renew-channels
 * Manually trigger channel renewal (admin only)
 */
router.post("/admin/renew-channels", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || (req.user as any).role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    await calendarChannelManager.triggerRenewalCheck();

    res.json({
      success: true,
      message: "Channel renewal check triggered",
    });
  } catch (error: any) {
    console.error("❌ Error triggering channel renewal:", error);
    res.status(500).json({
      error: "Failed to trigger channel renewal",
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/admin/recreate-channels
 * Recreate all webhook channels (admin only)
 */
router.post("/admin/recreate-channels", isAuthenticated, async (req, res) => {
  try {
    if (!req.user || (req.user as any).role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    const result = await calendarChannelManager.recreateAllChannels();

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("❌ Error recreating channels:", error);
    res.status(500).json({
      error: "Failed to recreate channels",
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/health
 * Health check for calendar service
 */
router.get("/health", async (req, res) => {
  try {
    const calendarHealth = await calendarService.healthCheck();
    const webhookHealth = await calendarWebhookHandler.healthCheck();
    const channelHealth = await calendarChannelManager.healthCheck();

    const overallStatus =
      calendarHealth.status === "healthy" &&
      webhookHealth.status === "healthy" &&
      channelHealth.status === "healthy"
        ? "healthy"
        : "unhealthy";

    res.json({
      status: overallStatus,
      components: {
        calendar: calendarHealth,
        webhook: webhookHealth,
        channels: channelHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Error checking health:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// THERAPIST CALENDAR ONBOARDING ENDPOINTS
// ============================================================================

/**
 * POST /api/calendar/therapists/:id/setup
 * Set up automated calendar for a therapist
 */
router.post("/therapists/:id/setup", isAuthenticated, async (req, res) => {
  try {
    const { id: therapistId } = req.params;

    // Check permissions - admin or the therapist themselves
    if (!req.user || ((req.user as any).role !== "admin" && (req.user as any).id !== therapistId)) {
      return res.status(403).json({
        error: "Insufficient permissions to set up calendar",
      });
    }

    // Get therapist details
    const therapist = await storage.getUser(therapistId);
    if (!therapist || therapist.role !== "therapist") {
      return res.status(404).json({
        error: "Therapist not found",
      });
    }

    if (!therapist.email) {
      return res.status(400).json({
        error: "Therapist email is required for calendar setup",
      });
    }

    // Set up calendar
    const result = await therapistCalendarOnboardingService.setupTherapistCalendar(
      therapistId,
      therapist.email
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Calendar setup completed successfully",
        calendarId: result.calendarId,
        googleCalendarId: result.googleCalendarId,
        setupStep: result.setupStep,
      });
    } else {
      const statusCode = result.retryable ? 503 : 400;
      res.status(statusCode).json({
        success: false,
        error: result.error,
        setupStep: result.setupStep,
        retryable: result.retryable,
      });
    }
  } catch (error: any) {
    console.error(`❌ Error setting up calendar for therapist ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: "Internal server error during calendar setup",
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/therapists/:id/status
 * Get calendar setup status for a therapist
 */
router.get("/therapists/:id/status", isAuthenticated, async (req, res) => {
  try {
    const { id: therapistId } = req.params;

    // Check permissions - admin or the therapist themselves
    if (!req.user || ((req.user as any).role !== "admin" && (req.user as any).id !== therapistId)) {
      return res.status(403).json({
        error: "Insufficient permissions to view calendar status",
      });
    }

    // Get calendar status
    const status = await therapistCalendarOnboardingService.getCalendarStatus(therapistId);

    res.json({
      success: true,
      status,
    });
  } catch (error: any) {
    console.error(`❌ Error getting calendar status for therapist ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to get calendar status",
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/admin/batch-setup
 * Batch setup calendars for multiple therapists (admin only)
 */
router.post("/admin/batch-setup", isAuthenticated, async (req, res) => {
  try {
    // Admin only
    if (!req.user || (req.user as any).role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    const { therapistIds } = batchSetupSchema.parse(req.body);

    console.log("🔄 Starting batch calendar setup operation");
    const result = await therapistCalendarOnboardingService.batchSetupCalendars(therapistIds);

    res.json({
      success: true,
      message: `Batch setup completed: ${result.successful}/${result.totalTherapists} successful`,
      result,
    });
  } catch (error: any) {
    console.error("❌ Error in batch calendar setup:", error);
    res.status(500).json({
      success: false,
      error: "Failed to execute batch calendar setup",
      details: error.message,
    });
  }
});

/**
 * POST /api/calendar/therapists/:id/rollback
 * Rollback calendar setup for a therapist (admin only)
 */
router.post("/therapists/:id/rollback", isAuthenticated, async (req, res) => {
  try {
    const { id: therapistId } = req.params;

    // Admin only
    if (!req.user || (req.user as any).role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    // Get calendar info for rollback
    const calendar = await storage.getTherapistCalendar(therapistId);
    const calendarId = calendar?.googleCalendarId;

    const success = await therapistCalendarOnboardingService.rollbackCalendarSetup(
      therapistId,
      calendarId
    );

    if (success) {
      res.json({
        success: true,
        message: "Calendar setup rollback completed",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to rollback calendar setup",
      });
    }
  } catch (error: any) {
    console.error(`❌ Error rolling back calendar for therapist ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: "Failed to rollback calendar setup",
      details: error.message,
    });
  }
});

/**
 * GET /api/calendar/admin/onboarding-stats
 * Get calendar onboarding statistics (admin only)
 */
router.get("/admin/onboarding-stats", isAuthenticated, async (req, res) => {
  try {
    // Admin only
    if (!req.user || (req.user as any).role !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    // Get all therapist calendars for statistics
    const calendars = await storage.listTherapistCalendars();
    const allTherapists = await storage.getAllUsers();
    const therapists = allTherapists.filter((user) => user.role === "therapist" && user.isActive);

    const stats = {
      totalTherapists: therapists.length,
      calendarsConfigured: calendars.filter((cal) => cal.integrationStatus === "active").length,
      calendarsPending: calendars.filter((cal) => cal.integrationStatus === "pending").length,
      calendarsError: calendars.filter((cal) => cal.integrationStatus === "error").length,
      therapistsWithoutCalendar: therapists.length - calendars.length,
      configurationRate:
        therapists.length > 0
          ? Math.round(
              (calendars.filter((cal) => cal.integrationStatus === "active").length /
                therapists.length) *
                100
            )
          : 0,
    };

    res.json({
      success: true,
      stats,
      calendars: calendars.map((cal) => ({
        therapistId: cal.therapistId,
        googleCalendarId: cal.googleCalendarId,
        integrationStatus: cal.integrationStatus,
        ownerAccountEmail: cal.ownerAccountEmail,
        therapistSharedEmail: cal.therapistSharedEmail,
        createdAt: cal.createdAt ? new Date(cal.createdAt).toISOString() : undefined,
        updatedAt: cal.updatedAt ? new Date(cal.updatedAt).toISOString() : undefined,
      })),
    });
  } catch (error: any) {
    console.error("❌ Error getting onboarding stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get onboarding statistics",
      details: error.message,
    });
  }
});

export default router;
