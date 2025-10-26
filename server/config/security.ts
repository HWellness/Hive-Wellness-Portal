/**
 * Centralized Security Configuration
 * 
 * Defines trusted domains for iframe embedding and CSP policies
 * to prevent clickjacking while allowing legitimate WordPress integration
 */

export interface SecurityConfig {
  // Trusted domains allowed to embed Hive Wellness in iframes
  allowedFrameAncestors: string[];
  
  // Trusted domains for CORS
  allowedOrigins: string[];
  
  // External services that need CSP whitelisting
  externalServices: {
    stripe: string[];
    google: string[];
    dailyVideo: string[];
    openai: string[];
    replit: string[];
    vite: string[];
  };
}

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Parse custom allowed origins from environment
  const customOrigins = process.env.ALLOWED_FRAME_ANCESTORS 
    ? process.env.ALLOWED_FRAME_ANCESTORS.split(',').map(o => o.trim())
    : [];

  // Core trusted domains for iframe embedding
  const productionDomains = [
    'https://hive-wellness.co.uk',
    'https://www.hive-wellness.co.uk',
  ];

  // Development domains
  const developmentDomains = isDevelopment ? [
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5000',
  ] : [];

  // Replit domains (get actual domain from environment)
  const replitDomains = [];
  if (process.env.REPLIT_DEV_DOMAIN) {
    replitDomains.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPL_SLUG) {
    replitDomains.push(`https://${process.env.REPL_SLUG}.replit.app`);
  }

  const allowedFrameAncestors = [
    "'self'",
    ...productionDomains,
    ...customOrigins,
    ...replitDomains,
    ...developmentDomains,
  ];

  return {
    allowedFrameAncestors,
    allowedOrigins: allowedFrameAncestors.filter(o => o !== "'self'"),
    
    externalServices: {
      stripe: [
        'https://js.stripe.com',
        'https://api.stripe.com',
        'https://checkout.stripe.com',
        'https://connect.stripe.com',
      ],
      google: [
        'https://accounts.google.com',
        'https://www.googleapis.com',
        'https://meet.google.com',
        'https://calendar.google.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
      dailyVideo: [
        'https://*.daily.co',
        'https://daily.co',
      ],
      openai: [
        'https://api.openai.com',
      ],
      replit: [
        'https://*.replit.dev',
        'https://*.replit.app',
      ],
      vite: isDevelopment ? [
        'ws://localhost:*',
        'ws://127.0.0.1:*',
      ] : [],
    },
  };
}

/**
 * Get all whitelisted script sources for CSP
 */
export function getAllowedScriptSources(): string[] {
  const config = getSecurityConfig();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const sources = [
    "'self'",
    ...config.externalServices.stripe,
    ...config.externalServices.google,
    ...config.externalServices.dailyVideo,
  ];
  
  // Only allow unsafe-inline and unsafe-eval in development
  // In production, use nonce-based CSP (to be implemented)
  if (isDevelopment) {
    sources.push("'unsafe-inline'"); // Required for React/Vite HMR
    sources.push("'unsafe-eval'"); // Required for Vite development
  }
  
  return sources;
}

/**
 * Get all whitelisted style sources for CSP
 */
export function getAllowedStyleSources(): string[] {
  const config = getSecurityConfig();
  
  return [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind and styled components
    ...config.externalServices.google, // Google Fonts
    ...config.externalServices.stripe,
  ];
}

/**
 * Get all whitelisted connect sources for CSP (API endpoints, WebSocket, etc.)
 */
export function getAllowedConnectSources(): string[] {
  const config = getSecurityConfig();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return [
    "'self'",
    ...config.externalServices.stripe,
    ...config.externalServices.google,
    ...config.externalServices.dailyVideo,
    ...config.externalServices.openai,
    ...config.externalServices.replit,
    ...(isDevelopment ? config.externalServices.vite : []),
  ];
}

/**
 * Get all whitelisted frame sources (for embedding external content)
 */
export function getAllowedFrameSources(): string[] {
  const config = getSecurityConfig();
  
  return [
    "'self'",
    ...config.externalServices.stripe, // Stripe checkout iframes
    ...config.externalServices.google, // Google Meet embeds
    ...config.externalServices.dailyVideo, // Daily.co video frames
  ];
}

/**
 * Get all whitelisted image sources
 */
export function getAllowedImageSources(): string[] {
  const config = getSecurityConfig();
  
  return [
    "'self'",
    'data:', // For inline images
    'blob:', // For generated images
    'https:', // Allow all HTTPS images (can be tightened if needed)
    ...config.externalServices.stripe,
    ...config.externalServices.google,
  ];
}
