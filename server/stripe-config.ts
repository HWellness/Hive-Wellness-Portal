import Stripe from 'stripe';

/**
 * SECURITY: Centralized Stripe configuration with environment-based validation
 * 
 * Features:
 * - Enforces live keys in production environment
 * - Fails fast on misconfiguration  
 * - Provides secure webhook secret handling
 * - Prevents test key usage in production
 */

const isProduction = process.env.NODE_ENV === 'production';

interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  keyType: 'live' | 'test';
}

/**
 * Get secure Stripe configuration with environment validation
 * SECURITY: Throws errors on invalid configuration to prevent security issues
 */
function getSecureStripeConfig(): StripeConfig {
  if (isProduction) {
    // PRODUCTION: Require live keys only
    const liveSecretKey = process.env.STRIPE_SECRET_KEY;
    const liveWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    
    if (!liveSecretKey || !liveSecretKey.startsWith('sk_live_')) {
      throw new Error('PRODUCTION SECURITY VIOLATION: STRIPE_SECRET_KEY must be a live key (sk_live_...) in production environment');
    }
    
    if (!liveWebhookSecret || !liveWebhookSecret.startsWith('whsec_')) {
      throw new Error('PRODUCTION SECURITY VIOLATION: STRIPE_WEBHOOK_SECRET_LIVE must be configured in production environment');
    }
    
    return { 
      secretKey: liveSecretKey, 
      webhookSecret: liveWebhookSecret, 
      keyType: 'live' 
    };
  } else {
    // DEVELOPMENT: Allow test keys with fallback to live
    const testSecretKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    const testWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEMP || process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    
    if (!testSecretKey) {
      throw new Error('DEVELOPMENT: No Stripe secret key found (STRIPE_TEST_SECRET_KEY or STRIPE_SECRET_KEY)');
    }
    
    // Development fallback: Create a dummy webhook secret if none exists (for testing)
    const fallbackWebhookSecret = testWebhookSecret || 'whsec_development_fallback_for_testing';
    if (!testWebhookSecret) {
      console.warn('⚠️  DEVELOPMENT: Using fallback webhook secret - webhook verification will be disabled');
    }
    
    const keyType = testSecretKey.startsWith('sk_live_') ? 'live' : 'test';
    return { 
      secretKey: testSecretKey, 
      webhookSecret: fallbackWebhookSecret, 
      keyType 
    };
  }
}

/**
 * Create a secure Stripe instance with proper configuration
 * SECURITY: Uses environment-appropriate keys and validates configuration
 */
export function createSecureStripeInstance(options: Stripe.StripeConfig = {}): Stripe {
  try {
    const config = getSecureStripeConfig();
    
    const stripeInstance = new Stripe(config.secretKey, {
      apiVersion: '2025-08-27.basil',
      ...options
    });
    
    console.log(`✅ Secure Stripe instance created with ${config.keyType} key for ${isProduction ? 'production' : 'development'}`);
    
    return stripeInstance;
  } catch (error: any) {
    console.error('❌ CRITICAL STRIPE CONFIGURATION ERROR:', error.message);
    
    if (isProduction) {
      // FAIL FAST in production
      console.error('❌ PRODUCTION SECURITY FAILURE - APPLICATION CANNOT START');
      throw error;
    } else {
      // Allow development to continue with limited functionality
      console.error('❌ Development mode: Stripe configuration invalid - features will be disabled');
      throw error;
    }
  }
}

/**
 * Get the webhook secret for current environment
 * SECURITY: Returns appropriate webhook secret based on environment
 */
export function getWebhookSecret(): string {
  try {
    const config = getSecureStripeConfig();
    return config.webhookSecret;
  } catch (error: any) {
    console.error('❌ Failed to get webhook secret:', error.message);
    throw error;
  }
}

/**
 * Check if current configuration is using live keys
 */
export function isUsingLiveKeys(): boolean {
  try {
    const config = getSecureStripeConfig();
    return config.keyType === 'live';
  } catch {
    return false;
  }
}

export { type StripeConfig };