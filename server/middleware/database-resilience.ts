import { Request, Response, NextFunction } from "express";
import { db, pool } from "../db";

// Database connection health monitoring
export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private connectionStatus = "healthy";
  private lastHealthCheck = Date.now();
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Enhanced health check with timeout and Railway-specific debugging
      const startTime = Date.now();

      // Test basic connection
      await Promise.race([
        db.execute("SELECT 1"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), 5000)
        ),
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ Database health check passed (${duration}ms)`);

      this.connectionStatus = "healthy";
      this.lastHealthCheck = Date.now();
      return true;
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        stack: error.stack?.split("\n").slice(0, 3).join("\n"), // First 3 lines only
        timestamp: new Date().toISOString(),
      };

      console.error("❌ Database health check failed:", errorDetails);

      // Railway-specific error handling
      if (error.message?.includes("WebSocket") || error.message?.includes("ws")) {
        console.error(
          "🚨 WebSocket connection issue detected - this may be a Railway environment compatibility issue"
        );
        console.log(
          "💡 Suggestion: Check if Railway supports WebSocket connections for Neon serverless"
        );
      }

      if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
        console.error(
          "⏱️ Database connection timeout - Railway may have network connectivity issues"
        );
      }

      if (error.message?.includes("ENOTFOUND") || error.message?.includes("DNS")) {
        console.error("🌐 DNS resolution failed - check DATABASE_URL configuration on Railway");
      }

      this.connectionStatus = "unhealthy";
      return false;
    }
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      lastCheck: this.lastHealthCheck,
      timeSinceLastCheck: Date.now() - this.lastHealthCheck,
    };
  }

  async periodicHealthCheck() {
    setInterval(async () => {
      await this.checkConnection();
    }, this.HEALTH_CHECK_INTERVAL);
  }
}

// Circuit breaker pattern for database operations
export class DatabaseCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minute
  private readonly retryTimeout = 30000; // 30 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN - database operations are temporarily disabled");
      }
    }

    try {
      const result = await this.executeWithRetry(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry for certain types of errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private isNonRetryableError(error: any): boolean {
    // Don't retry validation errors, auth errors, etc.
    const nonRetryableMessages = [
      "validation",
      "unauthorized",
      "forbidden",
      "not found",
      "duplicate key",
    ];

    const errorMessage = error.message?.toLowerCase() || "";
    return nonRetryableMessages.some((msg) => errorMessage.includes(msg));
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Enhanced database middleware with resilience
const dbHealthMonitor = DatabaseHealthMonitor.getInstance();
const circuitBreaker = new DatabaseCircuitBreaker();

export const databaseResilienceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if database operations are needed for this request
    const requiresDatabase = req.method !== "GET" || req.path.startsWith("/api/");

    if (requiresDatabase) {
      // Check database health
      const isHealthy = await dbHealthMonitor.checkConnection();

      if (!isHealthy) {
        return res.status(503).json({
          error: "Database temporarily unavailable",
          message: "Please try again in a few moments",
          retryAfter: 30,
        });
      }
    }

    // Add database utilities to request
    req.dbUtils = {
      executeWithCircuitBreaker: circuitBreaker.execute.bind(circuitBreaker),
      getDbHealth: dbHealthMonitor.getStatus.bind(dbHealthMonitor),
      getCircuitBreakerState: circuitBreaker.getState.bind(circuitBreaker),
    };

    next();
  } catch (error) {
    console.error("Database resilience middleware error:", error);
    next(error);
  }
};

// Enhanced transaction wrapper with timeout and retry logic
export async function withTransaction<T>(
  operation: (tx: any) => Promise<T>,
  timeoutMs = 30000
): Promise<T> {
  return circuitBreaker.execute(async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Transaction timeout")), timeoutMs);
    });

    const operationPromise = db.transaction(operation);

    return Promise.race([operationPromise, timeoutPromise]);
  });
}

// Query timeout wrapper
export function withQueryTimeout<T>(queryPromise: Promise<T>, timeoutMs = 10000): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Query timeout")), timeoutMs);
  });

  return Promise.race([queryPromise, timeoutPromise]);
}

// Start periodic health checks
dbHealthMonitor.periodicHealthCheck();

// Type augmentation for request object
declare global {
  namespace Express {
    interface Request {
      dbUtils?: {
        executeWithCircuitBreaker: <T>(operation: () => Promise<T>) => Promise<T>;
        getDbHealth: () => any;
        getCircuitBreakerState: () => any;
      };
    }
  }
}
