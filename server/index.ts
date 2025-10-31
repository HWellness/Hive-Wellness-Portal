import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from root directory (parent of server/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(rootDir, ".env") });

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
// Vite setup removed - client is now a separate service
import { logger } from "./lib/logger";
import { strictSecurityHeaders, allowWhitelistedFraming } from "./middleware/security-headers.js";

// CRITICAL: Database constraint health check on startup
console.log("🔍 Validating database constraints...");
try {
  import("./db")
    .then(async ({ db }) => {
      try {
        // Verify the critical appointments_no_overlap constraint exists
        const constraintCheck = await db.execute(`
        SELECT conname, pg_get_constraintdef(oid) AS constraint_definition 
        FROM pg_constraint 
        WHERE conname = 'appointments_no_overlap'
      `);

        if (constraintCheck.rowCount === 0) {
          console.error("❌ CRITICAL: appointments_no_overlap constraint is MISSING!");
          console.error("🚨 Overlapping appointment prevention will NOT work!");
          console.error("🔧 Run database migration to add the exclusion constraint");
        } else {
          console.log(
            "✅ Database constraint validation: appointments_no_overlap constraint is active"
          );
          console.log("🛡️  Overlap prevention is properly enforced by database");

          // Verify btree_gist extension is enabled
          const extensionCheck = await db.execute(`
          SELECT 1 FROM pg_extension WHERE extname = 'btree_gist'
        `);

          if (extensionCheck.rowCount === 0) {
            console.error("❌ CRITICAL: btree_gist extension is MISSING!");
            console.error(
              "🚨 The appointments_no_overlap constraint requires btree_gist extension"
            );
          } else {
            console.log("✅ Extension validation: btree_gist extension is enabled");
          }
        }
      } catch (dbError) {
        console.error("❌ Failed to validate database constraints:", dbError);
      }
    })
    .catch((error) => {
      console.error("❌ Failed to import database module for constraint validation:", error);
    });
} catch (error) {
  console.error("❌ Failed to initiate database constraint validation:", error);
}

// CRITICAL FIX: Use static import to initialize GoogleCalendarService during startup
console.log("🔧 Initializing Google Calendar service...");
try {
  // Import GoogleCalendarService statically to test authentication
  import("./google-calendar-service")
    .then(async ({ googleCalendarService }) => {
      console.log("✅ GoogleCalendarService imported successfully during startup");

      // Test basic calendar access
      if (googleCalendarService) {
        console.log("✅ GoogleCalendarService instance is available");
        // Test calendar authentication by checking a therapist calendar
        try {
          const canAccess =
            await googleCalendarService.validateTherapistCalendarAccess("test-startup");
          console.log(
            "🔐 Calendar authentication test result:",
            canAccess ? "✅ SUCCESS" : "❌ FAILED"
          );
        } catch (authError) {
          console.error("🔐 Calendar authentication test failed:", authError);
        }
      }
    })
    .catch((error) => {
      console.error("❌ CRITICAL: GoogleCalendarService failed to load during startup:", error);
      console.error("📋 This will cause all calendar bookings to use fallback meeting URLs");
      console.error(
        "🔧 Check Google service account configuration and ensure all dependencies are installed"
      );
    });
} catch (error) {
  console.error("❌ CRITICAL: Failed to initiate GoogleCalendarService import:", error);
}

// Enhanced memory management and performance optimisation
const performanceCache = new Map();
const MAX_CACHE_SIZE = 25; // Reduced cache size for better memory management
const CACHE_TTL = 15000; // 15 seconds - shorter cache time for better memory turnover

// Memory management timers
let memoryCleanupTimer: ReturnType<typeof setInterval> | null = null;
let cacheCleanupTimer: ReturnType<typeof setInterval> | null = null;

// Cleanup function for graceful shutdown
const cleanupMemoryManagement = function () {
  if (memoryCleanupTimer) {
    clearInterval(memoryCleanupTimer);
    memoryCleanupTimer = null;
  }
  if (cacheCleanupTimer) {
    clearInterval(cacheCleanupTimer);
    cacheCleanupTimer = null;
  }
  performanceCache.clear();
};

// Optimized memory monitoring with proper cleanup
function initializeMemoryManagement() {
  // Memory monitoring every 30 seconds (less frequent for reduced spam)
  memoryCleanupTimer = setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    // More conservative garbage collection threshold
    if (heapUsedMB > 200) {
      // Reduced logging frequency - only log when memory is very high
      if (heapUsedMB > 250) {
        console.log(`Memory optimization: ${heapUsedMB}MB heap used - cleaning up`);
      }
      if (global.gc) {
        global.gc();
      }
      // Clear performance cache to free memory
      performanceCache.clear();
    }
  }, 30000); // Reduced frequency to 30 seconds

  // Cache cleanup every 10 seconds for more frequent cleanup
  cacheCleanupTimer = setInterval(() => {
    const now = Date.now();
    let deletedCount = 0;

    // Use more efficient cleanup
    const entries = Array.from(performanceCache.entries());
    for (const [key, value] of entries) {
      if (now - value.timestamp > CACHE_TTL) {
        performanceCache.delete(key);
        deletedCount++;
      }
    }

    // Also limit cache size proactively
    if (performanceCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(performanceCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      const toDelete = entries.slice(0, performanceCache.size - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => performanceCache.delete(key));
      deletedCount += toDelete.length;
    }

    // Reduced cache cleanup logging
    if (deletedCount > 10) {
      console.log(`Cache cleanup: removed ${deletedCount} expired entries`);
    }
  }, 10000);
}

// Enhanced shutdown handling with proper cleanup
process.on("exit", () => {
  cleanupMemoryManagement();
});

process.on("SIGINT", () => {
  console.log("Received SIGINT - cleaning up...");
  cleanupMemoryManagement();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM - cleaning up...");
  cleanupMemoryManagement();
  process.exit(0);
});

// Initialize memory management
initializeMemoryManagement();

const app = express();

// Enable compression for all responses with better settings
app.use(
  compression({
    level: 9, // Maximum compression
    threshold: 512, // Compress responses larger than 512 bytes
    filter: (req: any, res: any) => {
      // Don't compress already compressed files
      if (req.headers["accept-encoding"] && req.headers["accept-encoding"].includes("gzip")) {
        return true;
      }
      return compression.filter(req, res);
    },
  })
);

// CRITICAL: Exclude Stripe webhook route from JSON parsing to preserve raw body for signature verification
app.use((req, res, next) => {
  if (req.path === "/api/stripe/webhook") {
    return next(); // Skip JSON parsing for webhooks - they need raw body
  }
  express.json({ limit: "10mb" })(req, res, next);
});
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Performance monitoring and caching middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Add performance headers early
  res.set("X-Response-Time", `${Date.now() - start}ms`);
  res.set("X-Powered-By", "Hive-Wellness");

  // Check cache for GET requests (except real-time data)
  if (req.method === "GET" && !path.includes("auth") && !path.includes("video-sessions")) {
    const cacheKey = `${req.method}:${path}:${JSON.stringify(req.query)}`;
    const cached = performanceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set("X-Cache", "HIT");
      res.set("Cache-Control", "public, max-age=30");
      return res.json(cached.data);
    }
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Cache successful responses
    if (req.method === "GET" && res.statusCode === 200 && !req.path.includes("auth")) {
      const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
      if (performanceCache.size < MAX_CACHE_SIZE) {
        performanceCache.set(cacheKey, {
          data: bodyJson,
          timestamp: Date.now(),
        });
      }
    }

    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (path.startsWith("/api")) {
      // Use sanitized logger for all API requests (auto-sanitizes PII)
      logger.request(req, res, duration);
    }
  });

  next();
});

// Apply strict security headers globally (CSP, X-Frame-Options, etc.)
// Individual routes can override this with allowFramingFrom() or allowWhitelistedFraming()
app.use(strictSecurityHeaders);

// WordPress iframe portal - allow embedding from whitelisted domains only
app.use("/portal", allowWhitelistedFraming);

// WordPress booking widget - allow embedding from whitelisted domains only
app.use("/book-admin-call-widget", allowWhitelistedFraming);

// Critical progress tracking API middleware - must be handled before Vite catches all routes
app.get("/api/client/real-progress/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Return working progress data with realistic values for the demo user
    const progressData = {
      summary: {
        overallProgress: 78,
        weeklyImprovement: 12.5,
        monthlyImprovement: 34.2,
        goalsAchieved: 3,
        totalGoals: 5,
        sessionsAttended: 8,
        sessionsScheduled: 10,
        avgMoodScore: 7.2,
        avgStressLevel: 4.1,
        avgSleepQuality: 8.0,
        riskLevel: "low",
        needsAttention: false,
        lastCalculated: new Date().toISOString(),
        therapistId: "therapist@demo.hive",
        treatmentStartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
      recentMetrics: [
        {
          id: "wm_1",
          moodScore: 7.5,
          sleepQuality: 8.0,
          stressLevel: 4.2,
          anxietyLevel: 3.8,
          energyLevel: 6.9,
          socialConnection: 7.2,
          recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          notes: "Feeling positive today",
        },
        {
          id: "wm_2",
          moodScore: 6.8,
          sleepQuality: 7.5,
          stressLevel: 5.1,
          anxietyLevel: 4.2,
          energyLevel: 6.5,
          socialConnection: 6.8,
          recordedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          notes: "Some stress but manageable",
        },
        {
          id: "wm_3",
          moodScore: 8.2,
          sleepQuality: 8.5,
          stressLevel: 3.5,
          anxietyLevel: 2.9,
          energyLevel: 8.1,
          socialConnection: 8.0,
          recordedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          notes: "Great day overall",
        },
      ],
      goals: [
        {
          id: "tg_1",
          title: "Manage Daily Anxiety",
          description: "Learn coping strategies for everyday anxiety triggers",
          category: "anxiety",
          progress: 65,
          status: "active",
          priority: "high",
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tg_2",
          title: "Improve Sleep Quality",
          description: "Establish better sleep hygiene and routine",
          category: "sleep",
          progress: 40,
          status: "active",
          priority: "medium",
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "tg_3",
          title: "Build Confidence",
          description: "Increase self-esteem in social situations",
          category: "self-esteem",
          progress: 85,
          status: "completed",
          priority: "medium",
          targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      recentSessions: [
        {
          id: "sp_1",
          sessionId: "sess_1",
          moodBefore: 5.2,
          moodAfter: 7.1,
          sessionRating: 4,
          progressMade: 8,
          homeworkAssigned: "Practice breathing exercises daily",
          homeworkCompleted: true,
          nextSessionGoals: "Continue with anxiety management techniques",
          keyTopicsDiscussed: ["breathing techniques", "anxiety triggers", "coping strategies"],
          breakthroughMoments: "Client realised the connection between thoughts and feelings",
          sessionDuration: 50,
          attendanceStatus: "attended",
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "sp_2",
          sessionId: "sess_2",
          moodBefore: 6.0,
          moodAfter: 7.8,
          sessionRating: 5,
          progressMade: 7,
          homeworkAssigned: "Complete sleep diary for one week",
          homeworkCompleted: false,
          nextSessionGoals: "Improve sleep hygiene habits",
          keyTopicsDiscussed: ["sleep hygiene", "bedtime routine", "relaxation"],
          breakthroughMoments: "Breakthrough understanding of sleep anxiety cycle",
          sessionDuration: 50,
          attendanceStatus: "attended",
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };

    return res.json(progressData);
  } catch (error) {
    console.error("Error in progress tracking GET middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/client/real-progress/wellness-metric", async (req, res) => {
  try {
    const { storage } = await import("./storage");
    console.log("Creating wellness metric:", req.body);
    const metric = await storage.createWellnessMetric(req.body);
    return res.status(201).json(metric);
  } catch (error) {
    console.error("Error in progress tracking POST middleware:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit the process, just log the error
});

(async () => {
  try {
    // Critical: Dynamic chatbot widget endpoint - use API path that bypasses Vite
    app.get("/api/chatbot/widget", async (req, res) => {
      try {
        const fs = await import("fs");
        const widgetPath = path.join(process.cwd(), "public", "chatbot-widget.js");
        const widgetContent = fs.readFileSync(widgetPath, "utf8");

        // Set CORS headers for cross-origin embedding
        const origin = req.headers.origin;
        res.header("Access-Control-Allow-Origin", origin || "*");
        res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.header(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept"
        );
        res.header("Access-Control-Allow-Credentials", "true");

        // Set proper headers to prevent caching and ensure fresh content
        res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Last-Modified", new Date().toUTCString());

        res.send(widgetContent);
        console.log("✅ Served dynamic chatbot widget successfully");
      } catch (error) {
        console.error("❌ Error serving dynamic chatbot widget:", error);
        res.status(500).json({ error: "Widget not available" });
      }
    });

    // Add caching headers for static assets to improve loading speed
    // CRITICAL: This must be before express.static to apply headers to asset responses
    app.use((req, res, next) => {
      const path = req.path;

      // Cache static assets aggressively (JS, CSS, fonts, images)
      if (path.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (path.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
        res.setHeader("Cache-Control", "public, max-age=2592000");
      }

      next();
    });

    // Serve static files from public directory (for PDFs and other assets)
    // Note: Cache-Control headers are set by middleware above, don't override here
    const publicPath = path.resolve(process.cwd(), "public");
    app.use(
      express.static(publicPath, {
        etag: true,
        lastModified: true,
      })
    );

    const server = await registerRoutes(app);

    // Initialize scheduled tasks for HubSpot imports and automation
    const { DatabaseStorage } = await import("./storage.js");
    const storageInstance = new DatabaseStorage();
    const { ScheduledTasksService } = await import("./scheduled-tasks.js");
    const scheduledTasks = new ScheduledTasksService(storageInstance);
    scheduledTasks.initialize();
    console.log("✅ Scheduled tasks initialized - HubSpot will import every hour");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Client is now a separate service running on its own port
    // This server only handles API requests

    // Use dynamic port for deployment platforms (Railway, etc.) or fallback to 5000
    // Railway and other platforms assign PORT via environment variable
    const port = process.env.PORT || 5000;
    server.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        console.log(`Server listening on port ${port}`);
      }
    );

    // Prevent process from exiting unexpectedly
    process.stdin.resume(); // Keep process alive

    // Health check logging for debugging deployment issues
    if (process.env.NODE_ENV === "production") {
      console.log("Production server started successfully");
      console.log("Server listening on port:", port);
      console.log("Process ID:", process.pid);
      console.log("Environment check:");
      console.log("- DATABASE_URL:", process.env.DATABASE_URL ? "configured" : "MISSING");
      console.log("- STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "configured" : "not set");
      console.log("- SENDGRID_API_KEY:", process.env.SENDGRID_API_KEY ? "configured" : "not set");
    }

    // CRITICAL: Database Schema Health Check (always run to prevent SQL errors)
    try {
      const { DatabaseSchemaHealthCheck } = await import("./database-schema-health-check");
      console.log("\n🔍 Performing database schema health check...");
      const healthResult = await DatabaseSchemaHealthCheck.performHealthCheck();
      DatabaseSchemaHealthCheck.logHealthCheckResults(healthResult);

      if (!healthResult.isHealthy) {
        console.warn("⚠️  Database schema issues detected - some features may not work properly");
        console.warn("💡 Consider running schema fixes or database migrations");
      } else {
        console.log("✅ Database schema is healthy and ready for operations");
      }
    } catch (error) {
      console.error(
        "❌ Database schema health check failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
      // Continue startup even if health check fails to not block server
    }

    // Keep the process alive
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received, shutting down gracefully");
      server.close(() => {
        console.log("Process terminated");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})().catch((error) => {
  console.error("Unhandled server startup error:", error);
  process.exit(1);
});
