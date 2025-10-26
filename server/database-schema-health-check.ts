/**
 * Database Schema Health Check System
 * Verifies that the database schema matches the Drizzle schema at startup
 * Prevents SQL errors due to missing columns and schema drift
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

export interface SchemaHealthCheckResult {
  isHealthy: boolean;
  errors: string[];
  warnings: string[];
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  summary: string;
}

/**
 * Critical tables and their required columns that must exist
 * This prevents SQL errors from missing columns
 */
const CRITICAL_SCHEMA_REQUIREMENTS = {
  // Core user management
  users: [
    'id', 'email', 'first_name', 'last_name', 'role', 'service_access',
    'profile_data', 'stripe_customer_id', 'stripe_subscription_id',
    'assigned_therapist', 'therapy_categories', 'is_active', 'profile_complete',
    'is_email_verified', 'force_password_change', 'reset_token', 'reset_expires',
    'last_login_at', 'profile_deactivated', 'deactivation_reason', 'deactivated_at',
    'is_deleted', 'deleted_at', 'deleted_by', 'deletion_reason', 
    'data_retention_expiry', 'show_wellness_metrics', 'created_at', 'updated_at'
  ],
  
  // Therapist profiles with Google Workspace integration
  therapist_profiles: [
    'id', 'user_id', 'specializations', 'experience', 'hourly_rate',
    'availability', 'credentials', 'bio', 'is_verified', 'stripe_connect_account_id',
    'therapy_categories', 'admin_assigned_categories', 'google_workspace_email',
    'google_calendar_id', 'workspace_account_created', 'workspace_created_at',
    'workspace_account_status', 'workspace_temp_password', 'workspace_last_login',
    'calendar_permissions_configured', 'workspace_account_notes', 'created_at', 'updated_at'
  ],

  // Enhanced appointments system
  appointments: [
    'id', 'client_id', 'primary_therapist_id', 'user_id', 'scheduled_at',
    'end_time', 'duration', 'status', 'session_type', 'type', 'therapy_category',
    'notes', 'price', 'payment_status', 'video_room_id', 'is_recurring',
    'recurring_pattern', 'recurring_end_date', 'parent_appointment_id',
    'cancellation_reason', 'reminder_sent', 'calendar_event_id',
    'google_event_id', 'google_meet_link', 'conflict_checked', 'created_at', 'updated_at'
  ],

  // Calendar conflict detection
  calendar_conflicts: [
    'id', 'user_id', 'appointment_id', 'conflict_type', 'conflict_with',
    'start_time', 'end_time', 'is_resolved', 'resolution_action', 'created_at'
  ],

  // Payment system with revenue split
  payments: [
    'id', 'user_id', 'appointment_id', 'stripe_payment_intent_id', 'amount',
    'currency', 'status', 'payment_method', 'therapist_earnings', 'platform_fee',
    'client_id', 'therapist_id', 'stripe_processing_fee', 'payout_method',
    'payout_completed', 'payout_transfer_id', 'created_at', 'updated_at'
  ],

  // Financial safety: Therapist payouts
  therapist_payouts: [
    'id', 'session_id', 'payment_id', 'therapist_id', 'amount', 'status',
    'stripe_transfer_id', 'stripe_account_id', 'original_payment_intent_id',
    'trigger_source', 'idempotency_key', 'retry_count', 'max_retries',
    'next_retry_at', 'last_retry_at', 'error', 'audit_trail', 'metadata',
    'completed_at', 'cancelled_at', 'cancelled_by', 'cancellation_reason',
    'created_at', 'updated_at'
  ],

  // Refund management
  refunds: [
    'id', 'payment_id', 'appointment_id', 'client_id', 'therapist_id',
    'original_amount', 'refund_amount', 'therapist_compensation',
    'stripe_processing_fee_retained', 'refund_percentage', 'refund_reason',
    'cancellation_time', 'session_time', 'hours_before_session',
    'stripe_refund_id', 'status', 'refund_policy', 'processed_by',
    'notes', 'created_at', 'updated_at'
  ],

  // Document management
  documents: [
    'id', 'user_id', 'appointment_id', 'type', 'title', 'content',
    'file_url', 'mime_type', 'file_size', 'version', 'is_active',
    'confidentiality_level', 'tags', 'last_accessed_at', 'last_accessed_by',
    'retention_until', 'created_at', 'updated_at'
  ],

  // Email automation
  email_templates: [
    'id', 'name', 'subject', 'content', 'type', 'variables', 'is_active',
    'usage', 'last_used', 'created_at', 'updated_at'
  ]
};

/**
 * Tables that must exist but can have flexible columns
 */
const REQUIRED_TABLES = [
  'users', 'therapist_profiles', 'appointments', 'calendar_conflicts', 'payments', 
  'therapist_payouts', 'refunds', 'documents', 'email_templates', 'email_campaigns',
  'email_automation_rules', 'email_automation_history', 'therapist_applications',
  'document_storage', 'therapist_onboarding_progress', 'wordpress_booking_integration',
  'document_retention_policies', 'institution_onboarding', 'stripe_connect_applications',
  'cost_optimizations', 'sessions', 'user_sessions', 'therapy_categories',
  'therapist_availability', 'admin_calendar_blocks', 'introduction_calls',
  'form_submissions', 'automated_workflows', 'therapist_matching_questionnaires',
  'therapist_enquiries', 'institution_profiles', 'therapist_notifications',
  'client_connection_requests', 'conversations', 'messages', 'email_queue',
  'reminder_configurations', 'reminder_queue', 'session_notes', 'session_recordings',
  'document_versions', 'document_access_log'
];

export class DatabaseSchemaHealthCheck {
  /**
   * Perform comprehensive schema health check
   */
  static async performHealthCheck(): Promise<SchemaHealthCheckResult> {
    const result: SchemaHealthCheckResult = {
      isHealthy: true,
      errors: [],
      warnings: [],
      missingTables: [],
      missingColumns: [],
      summary: ""
    };

    try {
      // Step 1: Check if critical tables exist
      await this.checkRequiredTables(result);
      
      // Step 2: Check critical columns in key tables
      await this.checkCriticalColumns(result);
      
      // Step 3: Generate summary
      this.generateSummary(result);
      
      // Overall health assessment
      result.isHealthy = result.errors.length === 0 && result.missingTables.length === 0 && result.missingColumns.length === 0;
      
    } catch (error) {
      result.isHealthy = false;
      result.errors.push(`Schema health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Check if required tables exist
   */
  private static async checkRequiredTables(result: SchemaHealthCheckResult): Promise<void> {
    try {
      const tablesQuery = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      const existingTables = tablesQuery.map((row: any) => row.table_name);
      
      for (const requiredTable of REQUIRED_TABLES) {
        if (!existingTables.includes(requiredTable)) {
          result.missingTables.push(requiredTable);
          result.errors.push(`Missing required table: ${requiredTable}`);
        }
      }
      
    } catch (error) {
      result.errors.push(`Failed to check tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check critical columns in key tables
   */
  private static async checkCriticalColumns(result: SchemaHealthCheckResult): Promise<void> {
    for (const [tableName, requiredColumns] of Object.entries(CRITICAL_SCHEMA_REQUIREMENTS)) {
      try {
        const columnsQuery = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${tableName} 
          AND table_schema = 'public'
        `);
        
        const existingColumns = columnsQuery.map((row: any) => row.column_name);
        
        for (const requiredColumn of requiredColumns) {
          if (!existingColumns.includes(requiredColumn)) {
            result.missingColumns.push({ table: tableName, column: requiredColumn });
            result.errors.push(`Missing column: ${tableName}.${requiredColumn}`);
          }
        }
        
      } catch (error) {
        result.warnings.push(`Could not check columns for table ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Generate health check summary
   */
  private static generateSummary(result: SchemaHealthCheckResult): void {
    const totalIssues = result.errors.length + result.missingTables.length + result.missingColumns.length;
    
    if (totalIssues === 0) {
      result.summary = "✅ Database schema is healthy and consistent with Drizzle schema";
    } else {
      result.summary = `❌ Database schema has ${totalIssues} issues: ${result.missingTables.length} missing tables, ${result.missingColumns.length} missing columns, ${result.errors.length} errors`;
    }
  }

  /**
   * Log health check results
   */
  static logHealthCheckResults(result: SchemaHealthCheckResult): void {
    console.log("\n🔍 Database Schema Health Check Results:");
    console.log("=" .repeat(50));
    console.log(result.summary);
    
    if (result.missingTables.length > 0) {
      console.log("\n❌ Missing Tables:");
      result.missingTables.forEach(table => {
        console.log(`  - ${table}`);
      });
    }
    
    if (result.missingColumns.length > 0) {
      console.log("\n❌ Missing Columns:");
      result.missingColumns.forEach(({ table, column }) => {
        console.log(`  - ${table}.${column}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log("\n❌ Errors:");
      result.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log("\n⚠️  Warnings:");
      result.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }
    
    if (result.isHealthy) {
      console.log("\n✅ All schema checks passed successfully!");
    } else {
      console.log("\n💡 Run 'npm run db:push --force' to sync schema changes");
      console.log("💡 Or check server/database-schema-health-check.ts for manual fixes");
    }
    
    console.log("=" .repeat(50));
  }
}