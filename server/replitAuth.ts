import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err) {
        return res.redirect("/api/login");
      }
      if (!user) {
        return res.redirect("/api/login");
      }

      // Log the user in
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.redirect("/api/login");
        }

        try {
          // Check if user has MFA enabled
          let userData;
          const userId = user.claims?.sub || user.id;

          if (userId) {
            try {
              userData = await storage.getUserById(userId);
            } catch (error) {
              // User might not exist in DB yet, proceed without MFA check
              return res.redirect("/");
            }
          }

          // If MFA is enabled, redirect to verification page
          if (userData && userData.mfaEnabled) {
            // Set session flag indicating MFA is required
            (req.session as any).needsMfaVerification = true;
            (req.session as any).mfaUserId = userId;
            return res.redirect("/mfa-verify");
          }

          // No MFA required, proceed normally
          return res.redirect("/");
        } catch (error) {
          console.error("MFA check error during callback:", error);
          return res.redirect("/");
        }
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
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

  // Fast session checks first - no logging to improve performance

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

  // Check Replit Auth (slower) - only if isAuthenticated method exists
  if (req.isAuthenticated && !req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // If no isAuthenticated method, fall back to checking for user in request
  if (!req.isAuthenticated && !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = req.user as any;

  // Check if MFA verification is needed (for Replit Auth users)
  if ((req.session as any)?.needsMfaVerification && !req.path.startsWith("/api/mfa")) {
    return res.status(403).json({
      message: "MFA verification required",
      code: "MFA_REQUIRED",
      redirectTo: "/mfa-verify",
    });
  }

  // Demo users don't need token checks
  if (user && user.id && user.id.startsWith("demo-")) {
    return next();
  }

  // Regular Replit Auth token validation
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Token refresh if needed
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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
        if (user.claims?.sub) {
          userData = await storage.getUserById(user.claims.sub);
        } else if (user.id) {
          userData = await storage.getUserById(user.id);
        }
      } catch (error) {
        // If user not found in database, create them (for new Replit auth users)
        if (user.claims?.sub) {
          await storage.upsertUser({
            id: user.claims.sub,
            email: user.claims.email,
            firstName: user.claims.first_name,
            lastName: user.claims.last_name,
            profileImageUrl: user.claims.profile_image_url,
          });
          userData = await storage.getUserById(user.claims.sub);
        }
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
