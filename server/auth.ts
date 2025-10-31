import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Always false for development and iframe compatibility
      sameSite: "lax", // Allow cross-site requests for login
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Public endpoints that don't require authentication
  const publicEndpoints = ["/api/calendar/availability", "/api/health", "/api/therapy-categories"];

  // Skip authentication for public endpoints
  // Use originalUrl because req.path has /api prefix stripped when middleware is mounted
  if (
    publicEndpoints.some(
      (path) =>
        req.originalUrl === path ||
        req.originalUrl.startsWith(path + "?") ||
        req.originalUrl.startsWith(path + "/")
    )
  ) {
    return next();
  }

  // Priority 1: Email auth user (fastest check)
  if ((req.session as any)?.emailAuthUser) {
    req.user = (req.session as any).emailAuthUser;

    // Check if MFA verification is needed
    if ((req.session as any)?.needsMfaVerification && !req.path.startsWith("/api/mfa")) {
      return res.status(403).json({
        message: "MFA verification required",
        code: "MFA_REQUIRED",
        redirectTo: "/mfa-verify",
      });
    }

    return next();
  }

  // Priority 2: Demo user
  if ((req.session as any)?.demoUser) {
    req.user = (req.session as any).demoUser;
    return next();
  }

  // Priority 3: Regular session user
  if ((req.session as any)?.user) {
    req.user = (req.session as any).user;
    return next();
  }

  // No authentication found
  return res.status(401).json({ message: "Not authenticated" });
};

// Enhanced authentication middleware that includes MFA verification
export const isAuthenticatedWithMFA: RequestHandler = async (req, res, next) => {
  // First run standard authentication
  return isAuthenticated(req, res, async () => {
    try {
      // Get user from database to check MFA status
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Find user in storage to get MFA settings
      let userData;
      try {
        if (user.id) {
          userData = await storage.getUserById(user.id);
        }
      } catch (error) {
        // User not found - cannot proceed with MFA check
        return res.status(401).json({ message: "User not found" });
      }

      // If MFA is not enabled, proceed normally
      if (!userData || !userData.mfaEnabled) {
        return next();
      }

      // Check if MFA was recently verified in this session
      const session = req.session as any;
      const now = Date.now();
      const mfaTimeout = 30 * 60 * 1000; // 30 minutes

      if (session.mfaVerifiedAt && now - session.mfaVerifiedAt < mfaTimeout) {
        return next();
      }

      // MFA verification required
      return res.status(403).json({
        message: "MFA verification required",
        code: "MFA_VERIFICATION_REQUIRED",
        mfaEnabled: true,
      });
    } catch (error) {
      console.error("MFA authentication check error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  });
};
