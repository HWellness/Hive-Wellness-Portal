import { Express } from "express";
import { emailEngine } from "./email-engine";
import { isAuthenticated } from "./auth";
import { db } from "./db";
import { emailQueue } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { productionDataService } from "./production-data-service";

// Import getUserFromRequest function from routes.ts
function getUserFromRequest(req: any): { user: any; userId: string } | null {
  // Check for demo user first
  if ((req.session as any)?.demoUser) {
    const user = (req.session as any).demoUser;
    return { user, userId: user.id };
  }

  // Check for regular authenticated user
  if (req.isAuthenticated() && req.user?.claims?.sub) {
    return { user: req.user, userId: req.user.claims.sub };
  }

  return null;
}

export function registerEmailRoutes(app: Express) {
  // Send direct email endpoint (multi-role access)
  app.post("/api/emails/send-direct", isAuthenticated, async (req: any, res) => {
    try {
      const authInfo = getUserFromRequest(req);
      if (!authInfo) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { user } = authInfo;
      const userRole = user.role || user.claims?.role;

      // Allow admin, therapist, and institution roles to send emails
      if (!["admin", "therapist", "institution"].includes(userRole)) {
        return res.status(403).json({ error: "Insufficient permissions to send emails" });
      }

      const { to, cc, subject, body, priority = "normal", template } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required fields: to, subject, body" });
      }

      // Send email directly through SendGrid
      const result = await emailEngine.sendDirectEmail({
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        subject,
        body,
        priority,
        template,
        from: "support@hive-wellness.co.uk",
      });

      res.json({
        success: true,
        result,
        message: "Email sent successfully",
      });
    } catch (error) {
      console.error("Error sending direct email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Send email to users endpoint (multi-role access)
  app.post("/api/emails/send-to-users", isAuthenticated, async (req: any, res) => {
    try {
      const authInfo = getUserFromRequest(req);
      if (!authInfo) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { user } = authInfo;
      const userRole = user.role || user.claims?.role;

      // Allow admin, therapist, and institution roles to send emails
      if (!["admin", "therapist", "institution"].includes(userRole)) {
        return res.status(403).json({ error: "Insufficient permissions to send emails" });
      }

      const { recipientType, userIds, subject, body, priority = "normal", template } = req.body;

      if (!subject || !body) {
        return res.status(400).json({ error: "Missing required fields: subject, body" });
      }

      let recipients = [];

      // Get recipients based on type
      switch (recipientType) {
        case "all-clients":
          recipients = await productionDataService.getUsersByRole("client");
          break;
        case "all-therapists":
          recipients = await productionDataService.getUsersByRole("therapist");
          break;
        case "specific-users":
          if (!userIds || userIds.length === 0) {
            return res.status(400).json({ error: "User IDs required for specific users" });
          }
          recipients = await productionDataService.getUsersByIds(userIds);
          break;
        default:
          return res.status(400).json({ error: "Invalid recipient type" });
      }

      // Queue emails for all recipients
      const emailPromises = recipients.map((recipient: any) =>
        emailEngine.queueEmail(
          template || "general",
          recipient.email || "",
          { body, content: body, ...recipient },
          priority as "high" | "normal" | "low"
        )
      );

      await Promise.all(emailPromises);

      res.json({
        success: true,
        recipientCount: recipients.length,
        message: `Emails queued for ${recipients.length} recipients`,
      });
    } catch (error) {
      console.error("Error sending emails to users:", error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  // Process email queue endpoint (admin only)
  app.post("/api/emails/process-queue", isAuthenticated, async (req: any, res) => {
    try {
      const authInfo = getUserFromRequest(req);
      if (!authInfo) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { user } = authInfo;
      // Check role from demo user or email auth user
      const userRole = user.role;
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const batchSize = parseInt(req.body.batchSize) || 10;
      const results = await emailEngine.processEmailQueue(batchSize);

      res.json({
        success: true,
        processed: results.length,
        results,
      });
    } catch (error) {
      console.error("Error processing email queue:", error);
      res.status(500).json({ error: "Failed to process email queue" });
    }
  });

  // Get email queue statistics
  app.get("/api/emails/stats", isAuthenticated, async (req: any, res) => {
    try {
      const authInfo = getUserFromRequest(req);
      if (!authInfo) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { user } = authInfo;
      const userRole = user.role || user.claims?.role;
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const stats = await productionDataService.getRealEmailStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting email stats:", error);
      res.status(500).json({ error: "Failed to get email stats" });
    }
  });

  // Get email queue entries
  app.get("/api/emails/queue", isAuthenticated, async (req: any, res) => {
    try {
      const authInfo = getUserFromRequest(req);
      if (!authInfo) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { user } = authInfo;
      const userRole = user.role || user.claims?.role;
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      const emails = await productionDataService.getRealEmailQueue(status, limit);
      res.json(emails);
    } catch (error) {
      console.error("Error getting email queue:", error);
      res.status(500).json({ error: "Failed to get email queue" });
    }
  });

  // Send test email
  app.post("/api/emails/send-test", isAuthenticated, async (req: any, res) => {
    try {
      const authInfo = getUserFromRequest(req);
      if (!authInfo) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { user } = authInfo;
      const userRole = user.role || user.claims?.role;
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { type, to, testData } = req.body;

      if (!type || !to) {
        return res.status(400).json({ error: "Email type and recipient required" });
      }

      // Queue test email
      const emailRecord = await emailEngine.queueEmail(
        type,
        to,
        testData || {
          firstName: "Test User",
          portalUrl: "https://hivewellness.com/portal",
          clientName: "Test Client",
          therapistName: "Dr. Test Therapist",
          date: new Date().toLocaleDateString("en-GB"),
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        },
        "high"
      );

      res.json({
        success: true,
        message: "Test email queued successfully",
        emailId: emailRecord.id,
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Trigger automated emails (webhooks/system calls)
  app.post("/api/emails/trigger/welcome", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      await emailEngine.triggerWelcomeEmail(userId);
      res.json({ success: true, message: "Welcome email triggered" });
    } catch (error) {
      console.error("Error triggering welcome email:", error);
      res.status(500).json({ error: "Failed to trigger welcome email" });
    }
  });

  app.post("/api/emails/trigger/appointment-reminder", isAuthenticated, async (req: any, res) => {
    try {
      const { appointmentId } = req.body;
      if (!appointmentId) {
        return res.status(400).json({ error: "Appointment ID required" });
      }

      await emailEngine.triggerAppointmentReminder(appointmentId);
      res.json({ success: true, message: "Appointment reminder triggered" });
    } catch (error) {
      console.error("Error triggering appointment reminder:", error);
      res.status(500).json({ error: "Failed to trigger appointment reminder" });
    }
  });

  // Schedule automated reminders (cron-like endpoint)
  app.post("/api/emails/schedule-reminders", isAuthenticated, async (req: any, res) => {
    try {
      const authInfo = getUserFromRequest(req);
      if (!authInfo) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { user } = authInfo;
      const userRole = user.role || user.claims?.role;
      if (userRole !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      await emailEngine.scheduleAutomatedReminders();
      res.json({ success: true, message: "Automated reminders scheduled" });
    } catch (error) {
      console.error("Error scheduling automated reminders:", error);
      res.status(500).json({ error: "Failed to schedule automated reminders" });
    }
  });
}
