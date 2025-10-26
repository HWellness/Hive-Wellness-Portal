import { Request, Response, NextFunction } from 'express';

// External API circuit breaker and retry logic
export class ExternalApiManager {
  private static instance: ExternalApiManager;
  private apiStatus = new Map<string, ApiStatus>();

  static getInstance(): ExternalApiManager {
    if (!ExternalApiManager.instance) {
      ExternalApiManager.instance = new ExternalApiManager();
    }
    return ExternalApiManager.instance;
  }

  constructor() {
    this.initializeApis();
    this.startHealthChecks();
  }

  private initializeApis() {
    const apis = ['stripe', 'sendgrid'];
    apis.forEach(api => {
      this.apiStatus.set(api, {
        name: api,
        status: 'healthy',
        failures: 0,
        lastFailure: 0,
        circuitBreakerState: 'CLOSED',
        responseTime: 0,
        successCount: 0,
        errorCount: 0
      });
    });
  }

  async executeWithRetry<T>(
    apiName: string,
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      timeoutMs = 30000
    } = options;

    const apiStatus = this.apiStatus.get(apiName);
    if (!apiStatus) {
      throw new Error(`Unknown API: ${apiName}`);
    }

    // Check circuit breaker
    if (apiStatus.circuitBreakerState === 'OPEN') {
      if (Date.now() - apiStatus.lastFailure > 60000) { // 1 minute
        apiStatus.circuitBreakerState = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker OPEN for ${apiName} - API temporarily unavailable`);
      }
    }

    let lastError: any;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
          )
        ]);

        const responseTime = Date.now() - startTime;
        this.recordSuccess(apiName, responseTime);
        return result;

      } catch (error: any) {
        lastError = error;
        this.recordFailure(apiName);

        // Don't retry for certain errors
        if (this.isNonRetryableError(error) || attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private recordSuccess(apiName: string, responseTime: number) {
    const api = this.apiStatus.get(apiName);
    if (!api) return;

    api.successCount++;
    api.responseTime = responseTime;
    api.failures = 0;
    api.status = 'healthy';
    api.circuitBreakerState = 'CLOSED';
  }

  private recordFailure(apiName: string) {
    const api = this.apiStatus.get(apiName);
    if (!api) return;

    api.errorCount++;
    api.failures++;
    api.lastFailure = Date.now();

    // Update status based on failure count
    if (api.failures >= 5) {
      api.circuitBreakerState = 'OPEN';
      api.status = 'unhealthy';
    } else if (api.failures >= 2) {
      api.status = 'degraded';
    }
  }

  private isNonRetryableError(error: any): boolean {
    const nonRetryableStatuses = [400, 401, 403, 404, 422];
    const statusCode = error.response?.status || error.status;
    
    if (nonRetryableStatuses.includes(statusCode)) {
      return true;
    }

    const nonRetryableMessages = [
      'invalid_request',
      'unauthorized',
      'forbidden',
      'not_found',
      'validation_error'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async startHealthChecks() {
    setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // 1 minute
  }

  private async performHealthChecks() {
    for (const [apiName, api] of this.apiStatus) {
      try {
        await this.checkApiHealth(apiName);
      } catch (error) {
        // Health check failed, but don't update circuit breaker
        console.warn(`Health check failed for ${apiName}:`, error);
      }
    }
  }

  private async checkApiHealth(apiName: string): Promise<void> {
    switch (apiName) {
      case 'stripe':
        // Simple Stripe API health check
        if (process.env.STRIPE_SECRET_KEY) {
          // We can't easily test without making actual API calls
          // In production, you might have a dedicated health endpoint
        }
        break;
      case 'sendgrid':
        // SendGrid health check
        if (process.env.SENDGRID_API_KEY) {
          // Similar to Stripe, requires actual API validation
        }
        break;
    }
  }

  getApiStatus(apiName: string): ApiStatus | undefined {
    return this.apiStatus.get(apiName);
  }

  getAllApiStatus(): Record<string, ApiStatus> {
    const status: Record<string, ApiStatus> = {};
    for (const [name, api] of this.apiStatus) {
      status[name] = { ...api };
    }
    return status;
  }
}

interface ApiStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  failures: number;
  lastFailure: number;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  responseTime: number;
  successCount: number;
  errorCount: number;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
}

// Enhanced Stripe wrapper with resilience
export class ResilientStripeService {
  private apiManager = ExternalApiManager.getInstance();

  async createPaymentIntent(amount: number, currency = 'gbp') {
    return this.apiManager.executeWithRetry('stripe', async () => {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16',
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
    return this.apiManager.executeWithRetry('stripe', async () => {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16',
      });

      return stripe.customers.create({
        email,
        name,
      });
    });
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return this.apiManager.executeWithRetry('stripe', async () => {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16',
      });

      return stripe.paymentIntents.retrieve(paymentIntentId);
    });
  }
}

// Enhanced SendGrid wrapper with resilience
export class ResilientEmailService {
  private apiManager = ExternalApiManager.getInstance();

  async sendEmail(to: string, subject: string, content: string, isHtml = false) {
    return this.apiManager.executeWithRetry('sendgrid', async () => {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'noreply@hivewellness.com',
        subject,
        ...(isHtml ? { html: content } : { text: content })
      };

      return sgMail.send(msg);
    });
  }

  async sendTemplateEmail(to: string, templateId: string, dynamicData: any) {
    return this.apiManager.executeWithRetry('sendgrid', async () => {
      const sgMail = (await import('@sendgrid/mail')).default;
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'noreply@hivewellness.com',
        templateId,
        dynamicTemplateData: dynamicData
      };

      return sgMail.send(msg);
    });
  }
}

// Middleware to add resilient services to request
export const externalApiMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.resilientServices = {
    stripe: new ResilientStripeService(),
    email: new ResilientEmailService(),
    apiManager: ExternalApiManager.getInstance()
  };
  next();
};

// API status endpoint
export const apiStatusEndpoint = (req: Request, res: Response) => {
  const apiManager = ExternalApiManager.getInstance();
  const status = apiManager.getAllApiStatus();
  
  const overallHealthy = Object.values(status).every(api => api.status === 'healthy');
  
  res.status(overallHealthy ? 200 : 503).json({
    overall: overallHealthy ? 'healthy' : 'degraded',
    apis: status,
    timestamp: Date.now()
  });
};

// Type augmentation
declare global {
  namespace Express {
    interface Request {
      resilientServices?: {
        stripe: ResilientStripeService;
        email: ResilientEmailService;
        apiManager: ExternalApiManager;
      };
    }
  }
}