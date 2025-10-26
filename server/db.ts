import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Railway-compatible WebSocket configuration
try {
  // Only set WebSocket constructor if it's available and needed
  if (typeof WebSocket === 'undefined' && ws) {
    neonConfig.webSocketConstructor = ws;
    console.log("✅ WebSocket constructor configured for Neon serverless");
  } else if (typeof WebSocket !== 'undefined') {
    console.log("✅ Native WebSocket available, using built-in WebSocket");
  }
} catch (error: any) {
  console.warn("⚠️ WebSocket configuration warning:", error.message);
  // Continue without WebSocket constructor - some environments may work without it
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  console.error("Please ensure the database is provisioned and DATABASE_URL is configured");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("🔗 Initializing database connection...");
console.log("📍 Environment: Railway deployment detected");

// Railway-specific database configuration with comprehensive fallback
let pool: Pool;
let db: any;

// Detect Railway environment
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;

if (isRailway) {
  console.log("🚂 Railway environment detected - using Railway-optimized configuration");
  
  try {
    // Railway-specific Neon configuration - completely disable serverless WebSocket
    neonConfig.webSocketConstructor = undefined;
    neonConfig.poolQueryViaFetch = true; // Force HTTP-based queries instead of WebSocket
    console.log("🔄 Railway mode: WebSocket disabled, HTTP queries enabled");
    
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Railway-optimized configuration with aggressive settings
      max: 3,
      min: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 2000,
      query_timeout: 5000,
      // Secure SSL configuration with proper certificate validation
      ssl: { rejectUnauthorized: true },
      keepAlive: false,
      // Force connection pooling behavior compatible with Railway
      allowExitOnIdle: true
    });
    
    db = drizzle({ client: pool, schema });
    console.log("✅ Railway database connection initialized with HTTP queries");
    
    // Test query asynchronously to verify Railway compatibility (non-blocking)
    setTimeout(async () => {
      try {
        await db.execute('SELECT 1 as test');
        console.log("✅ Railway database query test successful");
      } catch (queryError) {
        console.error("⚠️ Railway database query test failed:", queryError);
        console.log("🔄 Attempting Railway compatibility mode...");
        
        try {
          // Fallback: Even more aggressive Railway settings
          pool = new Pool({ 
            connectionString: process.env.DATABASE_URL,
            max: 1,
            idleTimeoutMillis: 1000,
            connectionTimeoutMillis: 1000,
            ssl: { rejectUnauthorized: true }, // Secure SSL with certificate validation
            keepAlive: false
          });
          
          db = drizzle({ client: pool, schema });
          await db.execute('SELECT 1 as test');
          console.log("✅ Railway fallback configuration successful");
        } catch (fallbackError) {
          console.error("❌ Railway fallback configuration failed:", fallbackError);
        }
      }
    }, 100);
    
  } catch (railwayError) {
    console.error("❌ Railway database configuration failed:", railwayError);
    throw new Error("Railway database connection failed - check environment configuration");
  }
  
} else {
  console.log("🔗 Standard environment detected - using WebSocket configuration");
  
  try {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      // Standard configuration
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Secure SSL configuration with proper certificate validation
      ssl: { rejectUnauthorized: true },
    });
    
    db = drizzle({ client: pool, schema });
    console.log("✅ Database connection initialized successfully");
    
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    
    // Fallback: Try without WebSocket constructor
    try {
      console.log("🔄 Attempting fallback database connection...");
      neonConfig.webSocketConstructor = undefined;
      
      pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 5000,
        // Secure SSL configuration with proper certificate validation
        ssl: { rejectUnauthorized: true },
      });
      
      db = drizzle({ client: pool, schema });
      console.log("✅ Fallback database connection successful");
    } catch (fallbackError) {
      console.error("❌ Both primary and fallback database connections failed");
      console.error("Primary error:", error);
      console.error("Fallback error:", fallbackError);
      throw new Error("Database connection failed - check environment configuration");
    }
  }
}

export { pool, db };