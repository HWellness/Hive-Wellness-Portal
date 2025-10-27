import { Request, Response, NextFunction } from "express";

// External API status tracking
export interface ApiStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  failures: number;
  circuitBreakerState: "CLOSED" | "OPEN" | "HALF_OPEN";
  lastFailure: number;
  responseTime: number;
  successCount: number;
  errorCount: number;
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }

  getState() {
    return this.state;
  }

  getFailures() {
    return this.failures;
  }
}

// External API manager with retry logic
export class ExternalApiManager {
  private static instance: ExternalApiManager;
  private apis = new Map<string, ApiStatus>();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  static getInstance(): ExternalApiManager {
    if (!ExternalApiManager.instance) {
      ExternalApiManager.instance = new ExternalApiManager();
    }
    return ExternalApiManager.instance;
  }

  constructor() {
    this.initializeApis();
  }

  private initializeApis() {
    const apiNames = ["stripe", "sendgrid"];

    apiNames.forEach((name) => {
      this.apis.set(name, {
        name,
        status: "healthy",
        failures: 0,
        circuitBreakerState: "CLOSED",
        lastFailure: 0,
        responseTime: 0,
        successCount: 0,
        errorCount: 0,
      });

      this.circuitBreakers.set(name, new CircuitBreaker());
    });
  }

  async executeWithRetry<T>(
    apiName: string,
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000, timeoutMs = 30000 } = options;

    const circuitBreaker = this.circuitBreakers.get(apiName);
    if (!circuitBreaker) {
      throw new Error(`Unknown API: ${apiName}`);
    }

    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Operation timeout")), timeoutMs);
        });

        const result = await Promise.race([circuitBreaker.execute(operation), timeoutPromise]);

        // Record success
        this.recordSuccess(apiName, Date.now() - startTime);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          this.recordFailure(apiName, Date.now() - startTime);
          throw error;
        }

        // If not last attempt, wait before retry
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Record failure and throw
    this.recordFailure(apiName, Date.now() - startTime);
    throw lastError!;
  }

  private isNonRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || "";
    return (
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("not found") ||
      message.includes("bad request") ||
      message.includes("validation")
    );
  }

  private recordSuccess(apiName: string, responseTime: number) {
    const api = this.apis.get(apiName);
    if (api) {
      api.successCount++;
      api.responseTime = responseTime;
      api.status = "healthy";
      api.circuitBreakerState = this.circuitBreakers.get(apiName)?.getState() || "CLOSED";
    }
  }

  private recordFailure(apiName: string, responseTime: number) {
    const api = this.apis.get(apiName);
    if (api) {
      api.errorCount++;
      api.failures++;
      api.lastFailure = Date.now();
      api.responseTime = responseTime;
      api.circuitBreakerState = this.circuitBreakers.get(apiName)?.getState() || "CLOSED";

      // Update status based on circuit breaker state
      if (api.circuitBreakerState === "OPEN") {
        api.status = "unhealthy";
      } else if (api.failures > 2) {
        api.status = "degraded";
      }
    }
  }

  getApiStatus(): Record<string, ApiStatus> {
    const status: Record<string, ApiStatus> = {};
    for (const [name, api] of this.apis) {
      status[name] = { ...api };
    }
    return status;
  }

  getApiHealth(apiName: string): ApiStatus | undefined {
    return this.apis.get(apiName);
  }
}

// Resilient implementations for external services
export class ResilientStripeService {
  private apiManager = ExternalApiManager.getInstance();

  async createPaymentIntent(amount: number, currency = "gbp") {
    return this.apiManager.executeWithRetry("stripe", async () => {
      const { createSecureStripeInstance } = await import("../stripe-config");
      // SECURITY: Use secure Stripe configuration
      const stripe = createSecureStripeInstance({
        apiVersion: "2024-12-18.acacia",
      });

      return stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });
    });
  }

  async createCustomer(email: string, name?: string) {
    return this.apiManager.executeWithRetry("stripe", async () => {
      const { createSecureStripeInstance } = await import("../stripe-config");
      // SECURITY: Use secure Stripe configuration
      const stripe = createSecureStripeInstance({
        apiVersion: "2024-12-18.acacia",
      });

      return stripe.customers.create({
        email,
        name,
      });
    });
  }
}

export class ResilientSendGridService {
  private apiManager = ExternalApiManager.getInstance();

  async sendEmail(to: string, subject: string, content: string) {
    return this.apiManager.executeWithRetry("sendgrid", async () => {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      return sgMail.send({
        to,
        from: "noreply@hivewellness.com",
        subject,
        html: content,
      });
    });
  }
}

// Middleware to add resilient services to request
export const externalApiMiddleware = (req: Request, res: Response, next: NextFunction) => {
  (req as any).resilientServices = {
    stripe: new ResilientStripeService(),
    sendgrid: new ResilientSendGridService(),
  };
  next();
};

// API status endpoint
export const apiStatusEndpoint = (req: Request, res: Response) => {
  const apiManager = ExternalApiManager.getInstance();
  const apis = apiManager.getApiStatus();

  res.json({ apis });
};
