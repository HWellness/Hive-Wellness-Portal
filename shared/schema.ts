import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  boolean,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with unified role management
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"), // For email/password authentication
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ['client', 'therapist', 'admin', 'institution'] }).notNull(),
  serviceAccess: jsonb("service_access"), // Which services user can access
  profileData: jsonb("profile_data"), // Role-specific profile information
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  assignedTherapist: varchar("assigned_therapist").references(() => users.id), // For client-therapist assignments
  therapyCategories: varchar("therapy_categories").array(), // For therapists: assigned categories
  isActive: boolean("is_active").default(true),
  profileComplete: boolean("profile_complete").default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  forcePasswordChange: boolean("force_password_change").default(false), // Force password change on next login
  resetToken: varchar("reset_token"), // Password reset token
  resetExpires: timestamp("reset_expires"), // Password reset expiry
  lastPasswordReset: timestamp("last_password_reset"), // Last password reset timestamp
  lastLoginAt: timestamp("last_login_at"),
  profileDeactivated: boolean("profile_deactivated").default(false), // For therapist profile deactivation
  deactivationReason: varchar("deactivation_reason"), // Reason for deactivation
  deactivatedAt: timestamp("deactivated_at"),
  isDeleted: boolean("is_deleted").default(false), // GDPR-compliant soft delete
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by"), // Admin who deleted the record
  deletionReason: varchar("deletion_reason"), // Reason for deletion
  dataRetentionExpiry: timestamp("data_retention_expiry"), // GDPR retention period
  showWellnessMetrics: boolean("show_wellness_metrics").default(true), // User preference for wellness metrics display
  // Multi-Factor Authentication fields
  mfaEnabled: boolean("mfa_enabled").default(false), // Whether MFA is enabled for this user
  mfaMethods: varchar("mfa_methods").array().default(['totp']), // Enabled MFA methods: totp, sms, email
  totpSecret: varchar("totp_secret"), // Base32 encoded TOTP secret
  backupCodes: varchar("backup_codes").array(), // Array of hashed backup recovery codes (SHA-256)
  phoneNumber: varchar("phone_number"), // Phone number for SMS MFA (E.164 format)
  phoneVerified: boolean("phone_verified").default(false), // Whether phone number is verified
  smsVerificationCode: varchar("sms_verification_code"), // Temporary SMS verification code (hashed)
  smsCodeExpires: timestamp("sms_code_expires"), // SMS code expiration time
  emailVerificationCode: varchar("email_verification_code"), // Temporary email verification code (hashed)
  emailCodeExpires: timestamp("email_code_expires"), // Email code expiration time
  emailMfaVerified: boolean("email_mfa_verified").default(false), // Whether email MFA is verified
  mfaVerifiedAt: timestamp("mfa_verified_at"), // When MFA was last successfully verified
  mfaSetupAt: timestamp("mfa_setup_at"), // When MFA was initially set up
  // Free first session tracking (for client role)
  freeSessionUsed: boolean("free_session_used").default(false), // Whether client has used their free first session
  freeSessionUsedAt: timestamp("free_session_used_at"), // When free session was used
  freeSessionAppointmentId: varchar("free_session_appointment_id"), // Reference to the free session appointment
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GDPR Consent Management - Production-ready Article 7 compliance
export const consentLogs = pgTable("consent_logs", {
  id: varchar("id").primaryKey().notNull(),
  userIdentifier: varchar("user_identifier").notNull(), // Session ID, email, or user ID
  userId: varchar("user_id").references(() => users.id), // If logged in
  consentGiven: boolean("consent_given").notNull(),
  consentCategories: jsonb("consent_categories").notNull(), // {necessary: true, analytics: false, marketing: false}
  ipAddress: varchar("ip_address"), // For audit trail
  userAgent: text("user_agent"), // For audit trail
  consentVersion: varchar("consent_version").default("1.0"), // Track policy version
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_consent_user_identifier").on(table.userIdentifier),
  index("idx_consent_user_id").on(table.userId),
]);

// Unified session tracking across all services
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id),
  serviceUsed: varchar("service_used"), // Which of the 14 services
  serviceId: varchar("service_id"), // Service identifier
  activityData: jsonb("activity_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Therapy Categories
export const therapyCategories = pgTable("therapy_categories", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  pricePerSession: decimal("price_per_session", { precision: 10, scale: 2 }).notNull(),
  availableTherapistTypes: varchar("available_therapist_types").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Therapist Calendars - Enterprise-grade per-therapist calendar management
export const therapistCalendars = pgTable("therapist_calendars", {
  id: varchar("id").primaryKey().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  mode: varchar("mode", { enum: ['managed', 'oauth', 'external'] }).notNull(),
  ownerAccountEmail: varchar("owner_account_email").notNull(), // e.g., 'support@hive-wellness.co.uk'
  therapistSharedEmail: varchar("therapist_shared_email"), // Therapist's personal email for sharing
  googleCalendarId: varchar("google_calendar_id").unique(), // Unique Google calendar identifier
  aclRole: varchar("acl_role", { enum: ['writer', 'reader'] }).default('writer'),
  integrationStatus: varchar("integration_status", { 
    enum: ['pending', 'active', 'error'] 
  }).default('pending'),
  syncToken: varchar("sync_token"), // For efficient Google API syncing
  channelId: varchar("channel_id"), // For Google webhook notifications
  channelResourceId: varchar("channel_resource_id"), // Google webhook resource
  channelExpiresAt: timestamp("channel_expires_at"), // Webhook channel expiration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure one calendar type per therapist
  uniqueIndex("unique_therapist_mode").on(table.therapistId, table.mode),
  // Performance indexes
  index("idx_therapist_calendars_therapist_id").on(table.therapistId),
  index("idx_therapist_calendars_status").on(table.integrationStatus),
  index("idx_therapist_calendars_google_id").on(table.googleCalendarId),
  index("idx_therapist_calendars_channel_expires").on(table.channelExpiresAt),
]);

// Therapist profiles
export const therapistProfiles = pgTable("therapist_profiles", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id),
  specializations: jsonb("specializations"),
  experience: integer("experience"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  availability: jsonb("availability"),
  credentials: jsonb("credentials"),
  bio: text("bio"),
  isVerified: boolean("is_verified").default(false),
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  therapyCategories: varchar("therapy_categories").array(), // Categories this therapist can provide
  adminAssignedCategories: varchar("admin_assigned_categories").array(), // Manual admin assignments
  therapistTier: varchar("therapist_tier", { 
    enum: ['counsellor', 'psychotherapist', 'psychologist', 'specialist'] 
  }), // Step 50: Therapist tier for pricing defaults
  // Google Workspace Integration Fields
  googleWorkspaceEmail: varchar("google_workspace_email"),
  googleCalendarId: varchar("google_calendar_id"),
  workspaceAccountCreated: boolean("workspace_account_created").default(false),
  workspaceCreatedAt: timestamp("workspace_created_at"),
  workspaceAccountStatus: varchar("workspace_account_status", { 
    enum: ['pending', 'active', 'suspended', 'deleted'] 
  }).default('pending'),
  workspaceTempPassword: varchar("workspace_temp_password"), // Encrypted temporary password
  workspaceLastLogin: timestamp("workspace_last_login"),
  calendarPermissionsConfigured: boolean("calendar_permissions_configured").default(false),
  primaryCalendarId: varchar("primary_calendar_id").references(() => therapistCalendars.id), // Foreign key to therapist_calendars
  workspaceAccountNotes: text("workspace_account_notes"), // Admin notes about account
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Appointments/Sessions with multi-participant support  
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().notNull(),
  clientId: varchar("client_id").references(() => users.id),
  primaryTherapistId: varchar("primary_therapist_id").references(() => users.id).notNull(), // Made NOT NULL for exclusion constraint
  userId: varchar("user_id").references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  endTime: timestamp("end_time").notNull(), // For conflict detection
  duration: integer("duration").default(50), // minutes
  status: varchar("status", { enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'] }).default('scheduled'),
  sessionType: varchar("session_type", { enum: ['consultation', 'therapy', 'follow_up', 'assessment'] }).default('therapy'),
  type: varchar("type", { enum: ['consultation', 'therapy', 'check-in'] }).default('therapy'),
  therapyCategory: varchar("therapy_category"), // Selected therapy category
  notes: text("notes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  paymentStatus: varchar("payment_status", { enum: ['pending', 'paid', 'refunded'] }).default('pending'),
  videoRoomId: varchar("video_room_id"),
  dailyRoomName: varchar("daily_room_name"), // Daily.co room identifier
  dailyRoomUrl: varchar("daily_room_url"), // Daily.co room URL
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern", { enum: ['weekly', 'biweekly', 'monthly'] }),
  recurringEndDate: timestamp("recurring_end_date"),
  parentAppointmentId: varchar("parent_appointment_id"), // For recurring sessions
  cancellationReason: text("cancellation_reason"),
  reminderSent: boolean("reminder_sent").default(false),
  calendarEventId: varchar("calendar_event_id"), // External calendar integration
  googleEventId: varchar("google_event_id"), // Google Calendar event ID
  therapistCalendarId: varchar("therapist_calendar_id").references(() => therapistCalendars.id).notNull(), // Made NOT NULL with FK
  googleMeetLink: varchar("google_meet_link"), // Google Meet conference URL
  conflictChecked: boolean("conflict_checked").default(false),
  backdated: boolean("backdated").default(false), // Indicates if appointment was scheduled for past date
  backdatedReason: text("backdated_reason"), // Audit trail for backdated bookings
  idempotencyKey: varchar("idempotency_key").unique(), // CRITICAL: Prevent duplicate bookings
  // Archive functionality for managing past/completed sessions
  isArchived: boolean("is_archived").default(false), // Hide from default appointment lists
  archivedAt: timestamp("archived_at"), // When session was archived
  archivedBy: varchar("archived_by").references(() => users.id), // Who archived the session
  archivedReason: varchar("archived_reason"), // Reason for archiving (manual/auto/cleanup)
  // Reschedule tracking
  rescheduledAt: timestamp("rescheduled_at"), // When appointment was last rescheduled
  rescheduleCount: integer("reschedule_count").default(0), // Number of times rescheduled
  originalAppointmentId: varchar("original_appointment_id"), // Reference to original appointment if rescheduled
  deletedAt: timestamp("deleted_at"), // Soft delete support for data retention
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // CRITICAL: Exclusion constraint to prevent overlapping appointments
  // This prevents any two appointments for the same therapist from overlapping in time
  // Uses GIST index with temporal range overlap (&&) operator
  // Note: In Drizzle, we'll add this constraint via raw SQL migration
  index("idx_appointments_therapist_time").on(table.primaryTherapistId, table.scheduledAt, table.endTime),
  index("idx_appointments_therapist_calendar").on(table.therapistCalendarId),
  index("idx_appointments_conflict_check").on(table.primaryTherapistId, table.conflictChecked),
  index("idx_appointments_status_date").on(table.status, table.scheduledAt),
  index("idx_appointments_archived").on(table.isArchived), // Performance for filtering archived
  index("idx_appointments_client_archived").on(table.clientId, table.isArchived), // Client view filtering
  index("idx_appointments_therapist_archived").on(table.primaryTherapistId, table.isArchived), // Therapist view filtering
  uniqueIndex("idx_appointments_idempotency").on(table.idempotencyKey),
]);

// Removed multi-participant session support - enforcing 1:1 therapist-client relationship

// Therapist availability for conflict detection
export const therapistAvailability = pgTable("therapist_availability", {
  id: varchar("id").primaryKey().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  dayOfWeek: integer("day_of_week"), // 0-6 (Sunday-Saturday)
  startTime: varchar("start_time"), // HH:MM format
  endTime: varchar("end_time"), // HH:MM format
  isAvailable: boolean("is_available").default(true),
  timezone: varchar("timezone").default('Europe/London'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Calendar conflict tracking
export const calendarConflicts = pgTable("calendar_conflicts", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  conflictType: varchar("conflict_type", { enum: ['overlap', 'double_booking', 'unavailable', 'blocked_time'] }).notNull(),
  conflictWith: varchar("conflict_with"), // ID of conflicting appointment or event
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isResolved: boolean("is_resolved").default(false),
  resolutionAction: text("resolution_action"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin calendar management for blocking times and managing availability
export const adminCalendarBlocks = pgTable("admin_calendar_blocks", {
  id: varchar("id").primaryKey().notNull(),
  title: varchar("title").notNull(), // "Meeting", "Blocked", "Holiday", etc.
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  blockType: varchar("block_type", { 
    enum: ['meeting', 'blocked', 'holiday', 'training', 'personal', 'maintenance'] 
  }).notNull(),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern"), // "weekly", "daily", "monthly"
  recurringUntil: timestamp("recurring_until"),
  createdBy: varchar("created_by").references(() => users.id),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Therapist Applications
export const therapistApplications = pgTable("therapist_applications", {
  id: varchar("id").primaryKey().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phoneNumber: varchar("phone_number"),
  location: varchar("location"),
  qualifications: jsonb("qualifications"), // Array of qualification strings
  yearsOfExperience: integer("years_of_experience"),
  specializations: jsonb("specializations"), // Array of specialization strings
  aboutYou: text("about_you"),
  motivation: text("motivation"),
  availability: jsonb("availability"), // Days and hours availability
  profileImageUrl: varchar("profile_image_url"), // Profile photo
  status: varchar("status", { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for therapist applications
export type TherapistApplication = typeof therapistApplications.$inferSelect;
export type InsertTherapistApplication = typeof therapistApplications.$inferInsert;

// Type exports for therapist calendars
export type TherapistCalendar = typeof therapistCalendars.$inferSelect;
export type InsertTherapistCalendar = typeof therapistCalendars.$inferInsert;

// Introduction calls (admin booking requests from website)
export const introductionCalls = pgTable("introduction_calls", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  message: text("message"),
  preferredDate: timestamp("preferred_date"),  // Optional to accept string conversion
  preferredTime: varchar("preferred_time").notNull(),
  status: varchar("status", { 
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'] 
  }).default('pending'),
  adminNotes: text("admin_notes"),
  // Daily.co integration fields (for therapy sessions)
  dailyRoomName: varchar("daily_room_name"), // Daily.co room identifier
  dailyRoomUrl: varchar("daily_room_url"), // Daily.co room URL
  // Google Meet integration fields (for introduction calls)
  meetingLink: varchar("meeting_link"), // Primary meeting link (Google Meet for intro calls, Daily.co for therapy)
  googleEventId: varchar("google_event_id"), // Google Calendar event ID
  googleMeetLink: varchar("google_meet_link"), // Google Meet URL
  actualDateTime: timestamp("actual_date_time", { withTimezone: true }), // Confirmed meeting time (stored as UTC)
  completedAt: timestamp("completed_at"),
  reminderSent: boolean("reminder_sent").default(false),
  confirmationEmailSent: boolean("confirmation_email_sent").default(false),
  followUpRequired: boolean("follow_up_required").default(false),
  source: varchar("source").default('website'), // 'website', 'referral', 'social'
  userType: varchar("user_type", { enum: ['client', 'therapist'] }).default('client'), // Type of user booking the call
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default('gbp'),
  status: varchar("status", { enum: ['pending', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'] }).default('pending'),
  paymentMethod: varchar("payment_method"),
  therapistEarnings: decimal("therapist_earnings", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  clientId: varchar("client_id").references(() => users.id),
  therapistId: varchar("therapist_id").references(() => users.id),
  stripeProcessingFee: decimal("stripe_processing_fee", { precision: 10, scale: 2 }).default('0.00'),
  payoutMethod: varchar("payout_method", { 
    enum: ['charge_split', 'post_transfer', 'pending'] 
  }).default('pending'), // Financial safety: track which payout method was used
  payoutCompleted: boolean("payout_completed").default(false), // Double-payment guard
  payoutTransferId: varchar("payout_transfer_id"), // Track associated transfer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ELEMENT #5: Therapist Payouts - Production-ready payout tracking and management
export const therapistPayouts = pgTable("therapist_payouts", {
  id: varchar("id").primaryKey().notNull(),
  sessionId: varchar("session_id").references(() => appointments.id).notNull(),
  paymentId: varchar("payment_id").references(() => payments.id).notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Exact 85% amount
  fee: decimal("fee", { precision: 10, scale: 2 }).default('0.00'), // Fee for instant payouts (1%)
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(), // Amount after fees
  payoutType: varchar("payout_type", { 
    enum: ['standard', 'instant'] 
  }).default('standard'),
  payoutMethod: varchar("payout_method", { 
    enum: ['transfer', 'payout'] 
  }).default('transfer'), // transfer = standard transfers, payout = Stripe payouts API
  status: varchar("status", { 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'] 
  }).default('pending'),
  stripeTransferId: varchar("stripe_transfer_id"), // Stripe transfer ID when completed
  stripePayoutId: varchar("stripe_payout_id"), // Stripe payout ID for instant payouts
  stripeAccountId: varchar("stripe_account_id").notNull(), // Therapist's connected account
  originalPaymentIntentId: varchar("original_payment_intent_id"), // Source payment
  triggerSource: varchar("trigger_source", { 
    enum: ['payment_confirmation', 'session_completion', 'manual', 'retry', 'webhook'] 
  }).notNull(),
  idempotencyKey: varchar("idempotency_key").notNull(),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(5),
  nextRetryAt: timestamp("next_retry_at"),
  lastRetryAt: timestamp("last_retry_at"),
  error: text("error"), // Last error message if failed
  auditTrail: jsonb("audit_trail"), // Complete audit trail of all actions
  metadata: jsonb("metadata"), // Additional payout metadata
  completedAt: timestamp("completed_at"), // When payout was successfully completed
  cancelledAt: timestamp("cancelled_at"), // When payout was cancelled
  cancelledBy: varchar("cancelled_by"), // User who cancelled the payout
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // CRITICAL FINANCIAL SAFETY: Prevent duplicate payout records for same session/payment
  // This database constraint is the foundation of our race condition protection
  uniqueIndex("unique_session_payment_payout").on(table.sessionId, table.paymentId),
  // Additional performance indexes
  index("idx_therapist_payouts_therapist_id").on(table.therapistId),
  index("idx_therapist_payouts_status").on(table.status),
  uniqueIndex("idx_therapist_payouts_idempotency").on(table.idempotencyKey),
]);

// Refunds tracking table
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().notNull(),
  paymentId: varchar("payment_id").references(() => payments.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id).notNull(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull(),
  therapistCompensation: decimal("therapist_compensation", { precision: 10, scale: 2 }).default('0.00'),
  stripeProcessingFeeRetained: decimal("stripe_processing_fee_retained", { precision: 10, scale: 2 }).default('0.00'),
  refundPercentage: integer("refund_percentage").notNull(), // 0, 50, or 100
  refundReason: varchar("refund_reason", { 
    enum: ['client_cancelled_48h+', 'client_cancelled_24-48h', 'client_cancelled_24h-', 'therapist_cancelled', 'system_cancelled', 'admin_cancelled'] 
  }).notNull(),
  cancellationTime: timestamp("cancellation_time").notNull(), // When cancellation was requested
  sessionTime: timestamp("session_time").notNull(), // Original session time
  hoursBeforeSession: decimal("hours_before_session", { precision: 5, scale: 2 }).notNull(), // Calculated hours difference
  stripeRefundId: varchar("stripe_refund_id"), // Stripe refund transaction ID
  status: varchar("status", { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  refundPolicy: varchar("refund_policy").notNull(), // Description of applied policy
  processedBy: varchar("processed_by").references(() => users.id), // Admin who processed refund
  notes: text("notes"), // Additional notes about the refund
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type definitions for therapist payouts
export type TherapistPayout = typeof therapistPayouts.$inferSelect;
export type InsertTherapistPayout = typeof therapistPayouts.$inferInsert;
export const insertTherapistPayoutSchema = createInsertSchema(therapistPayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTherapistPayoutType = z.infer<typeof insertTherapistPayoutSchema>;

// Institution profiles
export const institutionProfiles = pgTable("institution_profiles", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id),
  organisationName: varchar("organisation_name").notNull(),
  organisationType: varchar("organisation_type"), // university, corporate, etc.
  contactPerson: varchar("contact_person"),
  memberCount: integer("member_count"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Therapist notifications
export const therapistNotifications = pgTable("therapist_notifications", {
  id: varchar("id").primaryKey().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  type: varchar("type", { enum: ['new_message', 'new_client_connection', 'appointment_reminder', 'system_alert'] }).notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  senderId: varchar("sender_id").references(() => users.id),
  clientId: varchar("client_id").references(() => users.id),
  isRead: boolean("is_read").default(false),
  requiresAction: boolean("requires_action").default(false),
  actionData: jsonb("action_data"),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
});

// Client connection requests
export const clientConnectionRequests = pgTable("client_connection_requests", {
  id: varchar("id").primaryKey().notNull(),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  status: varchar("status", { enum: ['pending', 'accepted', 'declined'] }).default('pending'),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Unified Forms System
export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey().notNull(),
  formId: varchar("form_id").notNull(), // therapy-matching, therapist-onboarding, etc.
  userId: varchar("user_id").references(() => users.id),
  submissionData: jsonb("submission_data").notNull(),
  status: varchar("status", { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  automatedTriggers: jsonb("automated_triggers"), // Trigger configuration
  triggerResults: jsonb("trigger_results"), // Results of automated processing
  deletedAt: timestamp("deleted_at"), // Soft delete support for data retention
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const automatedWorkflows = pgTable("automated_workflows", {
  id: varchar("id").primaryKey().notNull(),
  workflowType: varchar("workflow_type").notNull(), // therapist-matching, onboarding, etc.
  triggerFormId: varchar("trigger_form_id").references(() => formSubmissions.id),
  status: varchar("status", { enum: ['initiated', 'processing', 'completed', 'failed'] }).default('initiated'),
  workflowData: jsonb("workflow_data").notNull(),
  results: jsonb("results"),
  priority: varchar("priority", { enum: ['low', 'standard', 'high', 'urgent'] }).default('standard'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form submission types
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = typeof formSubmissions.$inferInsert;
export type AutomatedWorkflow = typeof automatedWorkflows.$inferSelect;
export type InsertAutomatedWorkflow = typeof automatedWorkflows.$inferInsert;
export type InsertTherapistProfile = typeof therapistProfiles.$inferInsert;
export type TherapistProfile = typeof therapistProfiles.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertRefund = typeof refunds.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type InsertInstitutionProfile = typeof institutionProfiles.$inferInsert;
export type InstitutionProfile = typeof institutionProfiles.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertTherapyCategory = typeof therapyCategories.$inferInsert;
export type TherapyCategory = typeof therapyCategories.$inferSelect;
export type InsertTherapistNotification = typeof therapistNotifications.$inferInsert;
export type TherapistNotification = typeof therapistNotifications.$inferSelect;
export type InsertClientConnectionRequest = typeof clientConnectionRequests.$inferInsert;
export type ClientConnectionRequest = typeof clientConnectionRequests.$inferSelect;

// Legacy form submissions table (keeping for backward compatibility)
export const legacyFormSubmissions = pgTable("form_submissions_legacy", {
  id: varchar("id").primaryKey(),
  formType: varchar("form_type").notNull(),
  formData: jsonb("form_data").notNull(),
  userEmail: varchar("user_email"),
  userId: varchar("user_id"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
});

export type InsertLegacyFormSubmission = typeof legacyFormSubmissions.$inferInsert;
export type LegacyFormSubmission = typeof legacyFormSubmissions.$inferSelect;

// Therapist matching questionnaires table
export const therapistMatchingQuestionnaires = pgTable("therapist_matching_questionnaires", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  step1Age: varchar("step1_age"),
  step2FirstName: varchar("step2_first_name"),
  step2LastName: varchar("step2_last_name"),
  step2Email: varchar("step2_email"),
  step3AgeRange: varchar("step3_age_range"),
  step4Gender: varchar("step4_gender"),
  step5Pronouns: varchar("step5_pronouns"),
  step6WellbeingRating: integer("step6_wellbeing_rating"),
  step7MentalHealthSymptoms: jsonb("step7_mental_health_symptoms"),
  step8SupportAreas: jsonb("step8_support_areas"),
  step9TherapyTypes: jsonb("step9_therapy_types"),
  step10PreviousTherapy: varchar("step10_previous_therapy"),
  
  // Enhanced matching preferences
  step11ReligionPreference: varchar("step11_religion_preference"), // Client's own religion or preference
  step12TherapistGenderPreference: varchar("step12_therapist_gender_preference", { 
    enum: ['male', 'female', 'no_preference'] 
  }).default('no_preference'),
  step13ReligionMatching: varchar("step13_religion_matching", { 
    enum: ['same_religion', 'no_preference', 'non_religious'] 
  }).default('no_preference'),
  
  status: varchar("status").default("pending"),
  completedAt: timestamp("completed_at").defaultNow(),
  aiMatchingScore: integer("ai_matching_score"),
  adminReviewed: boolean("admin_reviewed").default(false),
  adminNotes: text("admin_notes"),
  assignedTherapistId: varchar("assigned_therapist_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertTherapistMatchingQuestionnaire = typeof therapistMatchingQuestionnaires.$inferInsert;
export type TherapistMatchingQuestionnaire = typeof therapistMatchingQuestionnaires.$inferSelect;

// Therapist enquiries table for onboarding workflow
export const therapistEnquiries = pgTable("therapist_enquiries", {
  id: varchar("id").primaryKey().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phoneNumber: varchar("phone_number"),
  phone: varchar("phone"),
  location: varchar("location"),
  religion: varchar("religion"),
  gender: varchar("gender", { enum: ['male', 'female', 'non_binary', 'prefer_not_to_say'] }),
  hasLimitedCompany: varchar("has_limited_company", { enum: ['yes', 'no'] }),
  highestQualification: varchar("highest_qualification"),
  professionalBody: varchar("professional_body"),
  therapySpecialisations: varchar("therapy_specialisations").array(),
  personalityDescription: text("personality_description"),
  qualifications: text("qualifications"),
  experience: text("experience"),
  professionalBio: text("professional_bio"),
  specializations: varchar("specializations").array(),
  availability: text("availability"),
  motivation: text("motivation"),
  status: varchar("status", { enum: ['enquiry_received', 'call_scheduled', 'call_completed', 'onboarding_sent', 'onboarding_completed', 'approved', 'rejected'] }).default('enquiry_received'),
  account_created: boolean("account_created").default(false),
  adminNotes: text("admin_notes"),
  therapistTier: varchar("therapist_tier", { 
    enum: ['counsellor', 'psychotherapist', 'psychologist', 'specialist'] 
  }),
  callScheduledAt: timestamp("call_scheduled_at"),
  callCompletedAt: timestamp("call_completed_at"),
  onboardingSentAt: timestamp("onboarding_sent_at"),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertTherapistEnquiry = typeof therapistEnquiries.$inferInsert;
export type TherapistEnquiry = typeof therapistEnquiries.$inferSelect;

// Therapist onboarding applications table
export const therapistOnboardingApplications = pgTable("therapist_onboarding_applications", {
  id: varchar("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  dateOfBirth: varchar("date_of_birth").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  profilePhoto: varchar("profile_photo"),
  streetAddress: varchar("street_address").notNull(),
  postCode: varchar("post_code").notNull(),
  
  // Emergency contact
  emergencyFirstName: varchar("emergency_first_name").notNull(),
  emergencyLastName: varchar("emergency_last_name").notNull(),
  emergencyRelationship: varchar("emergency_relationship").notNull(),
  emergencyPhoneNumber: varchar("emergency_phone_number").notNull(),
  
  // Professional details
  jobTitle: varchar("job_title").notNull(),
  qualifications: jsonb("qualifications").notNull(),
  yearsOfExperience: integer("years_of_experience").notNull(),
  registrationNumber: varchar("registration_number"),
  enhancedDbsCertificate: varchar("enhanced_dbs_certificate").notNull(),
  workingWithOtherPlatforms: varchar("working_with_other_platforms").notNull(),
  
  // Availability
  availability: jsonb("availability").notNull(),
  sessionsPerWeek: varchar("sessions_per_week").notNull(),
  
  // Legal compliance
  selfEmploymentAcknowledgment: boolean("self_employment_acknowledgment").notNull(),
  taxResponsibilityAcknowledgment: boolean("tax_responsibility_acknowledgment").notNull(),
  
  // Document uploads
  cvDocument: varchar("cv_document"),
  dbsCertificate: varchar("dbs_certificate"),
  professionalInsurance: varchar("professional_insurance"),
  membershipProof: varchar("membership_proof"),
  rightToWorkProof: varchar("right_to_work_proof"),
  
  // Legal agreements
  policiesAgreement: boolean("policies_agreement").notNull(),
  signature: varchar("signature").notNull(),
  stripeConnectConsent: boolean("stripe_connect_consent").notNull(),
  
  // Application status
  status: varchar("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertTherapistOnboardingApplication = typeof therapistOnboardingApplications.$inferInsert;
export type TherapistOnboardingApplication = typeof therapistOnboardingApplications.$inferSelect;

// Therapist Onboarding Progress (Step 3) - CRITICAL LAUNCH REQUIREMENT
export const therapistOnboardingProgress = pgTable("therapist_onboarding_progress", {
  id: varchar("id").primaryKey().notNull(),
  therapistEnquiryId: varchar("therapist_enquiry_id").references(() => therapistEnquiries.id),
  userId: varchar("user_id").references(() => users.id),
  currentStep: integer("current_step").default(1), // 1: Enquiry, 2: Admin Call, 3: Personalised Form
  stepData: jsonb("step_data"), // Data collected at each step
  personalizedFormData: jsonb("personalized_form_data"), // Step 3 specific data
  onboardingToken: varchar("onboarding_token").unique(), // Secure token for form access
  tokenExpiry: timestamp("token_expiry"),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  adminNotes: text("admin_notes"),
  nextAction: varchar("next_action"), // Next required action
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WordPress Booking Widget Integration - CRITICAL LAUNCH REQUIREMENT
export const wordpressBookingIntegration = pgTable("wordpress_booking_integration", {
  id: varchar("id").primaryKey().notNull(),
  widgetId: varchar("widget_id").unique().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id),
  bookingUrl: varchar("booking_url"),
  embedCode: text("embed_code"),
  widgetSettings: jsonb("widget_settings"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PDF Document Storage - CRITICAL LAUNCH REQUIREMENT
export const documentStorage = pgTable("document_storage", {
  id: varchar("id").primaryKey().notNull(),
  documentType: varchar("document_type", { 
    enum: ['therapist_info_pack', 'therapist_safeguarding_pack', 'client_info_pack'] 
  }).notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  accessLevel: varchar("access_level", { enum: ['public', 'therapist_only', 'client_only', 'admin_only'] }).default('public'),
  downloadCount: integer("download_count").default(0),
  lastDownloadAt: timestamp("last_download_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertTherapistOnboardingProgress = typeof therapistOnboardingProgress.$inferInsert;
export type TherapistOnboardingProgress = typeof therapistOnboardingProgress.$inferSelect;
export type InsertWordpressBookingIntegration = typeof wordpressBookingIntegration.$inferInsert;
export type WordpressBookingIntegration = typeof wordpressBookingIntegration.$inferSelect;
export type InsertDocumentStorage = typeof documentStorage.$inferInsert;
export type DocumentStorage = typeof documentStorage.$inferSelect;

// Document & Session Tracking Module
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  type: varchar("type").notNull(), // 'session_notes', 'therapy_plan', 'assessment', 'consent_form', 'homework', 'insurance'
  title: varchar("title").notNull(),
  content: text("content"),
  fileUrl: varchar("file_url"),
  mimeType: varchar("mime_type"),
  fileSize: integer("file_size"),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  confidentialityLevel: varchar("confidentiality_level").default("high").notNull(), // 'low', 'medium', 'high', 'restricted'
  tags: text("tags").array(),
  
  // HIPAA compliance fields
  lastAccessedAt: timestamp("last_accessed_at"),
  lastAccessedBy: varchar("last_accessed_by"),
  retentionUntil: timestamp("retention_until"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessionRecordings = pgTable("session_recordings", {
  id: varchar("id").primaryKey().notNull(),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id),
  recordingUrl: varchar("recording_url"),
  transcriptUrl: varchar("transcript_url"),
  duration: integer("duration"), // in seconds
  fileSize: integer("file_size"), // in bytes
  recordingStatus: varchar("recording_status").default("processing").notNull(), // 'processing', 'ready', 'failed', 'deleted'
  
  // Consent and compliance
  consentObtained: boolean("consent_obtained").default(false).notNull(),
  consentTimestamp: timestamp("consent_timestamp"),
  retentionUntil: timestamp("retention_until"),
  
  // Quality metrics
  audioQuality: varchar("audio_quality"), // 'poor', 'fair', 'good', 'excellent'
  videoQuality: varchar("video_quality"), // 'poor', 'fair', 'good', 'excellent'
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessionNotes = pgTable("session_notes", {
  id: varchar("id").primaryKey().notNull(),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id),
  therapistId: varchar("therapist_id").notNull(),
  
  // Note content
  subjectiveFeedback: text("subjective_feedback"), // Client's reported experience
  objectiveObservations: text("objective_observations"), // Therapist's clinical observations
  assessment: text("assessment"), // Clinical assessment
  planAndGoals: text("plan_and_goals"), // Therapy plan and session goals
  
  // Session details
  sessionFocus: varchar("session_focus").array(), // ['anxiety', 'depression', 'relationships', etc.]
  interventionsUsed: varchar("interventions_used").array(), // ['CBT', 'mindfulness', 'exposure therapy', etc.]
  homeworkAssigned: text("homework_assigned"),
  nextSessionGoals: text("next_session_goals"),
  
  // Progress tracking
  progressScore: integer("progress_score"), // 1-10 scale
  clientEngagement: varchar("client_engagement"), // 'low', 'moderate', 'high'
  therapistNotes: text("therapist_notes"),
  
  // Risk assessment
  riskLevel: varchar("risk_level").default("low").notNull(), // 'low', 'moderate', 'high', 'critical'
  riskFactors: varchar("risk_factors").array(),
  safetyPlan: text("safety_plan"),
  
  isConfidential: boolean("is_confidential").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().notNull(),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  version: integer("version").notNull(),
  content: text("content"),
  fileUrl: varchar("file_url"),
  changeNote: text("change_note"),
  modifiedBy: varchar("modified_by").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Document access audit trail
export const documentAccessLog = pgTable("document_access_log", {
  id: varchar("id").primaryKey().notNull(),
  documentId: varchar("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(), // 'view', 'edit', 'download', 'share', 'delete'
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Email Campaign Automation Tables
export const emailCampaigns = pgTable("email_campaigns", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  templateId: varchar("template_id").notNull(),
  templateName: varchar("template_name").notNull(),
  targetAudience: varchar("target_audience").array(),
  status: varchar("status", { enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'] }).default('draft'),
  scheduledDate: timestamp("scheduled_date"),
  sentDate: timestamp("sent_date"),
  recipients: integer("recipients").default(0),
  opened: integer("opened").default(0),
  clicked: integer("clicked").default(0),
  bounced: integer("bounced").default(0),
  isRecurring: boolean("is_recurring").default(false),
  recurringType: varchar("recurring_type", { enum: ['daily', 'weekly', 'monthly', 'quarterly'] }),
  recurringInterval: integer("recurring_interval").default(1),
  nextRun: timestamp("next_run"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  type: varchar("type", { 
    enum: [
      'therapist_assignment', 
      'welcome', 
      'therapist_welcome', 
      'therapist_onboarding', 
      'client_onboarding', 
      'appointment_reminder', 
      'session_reminder', 
      'session_confirmation', 
      'payment_confirmation', 
      'system_notification', 
      'marketing', 
      'custom'
    ] 
  }).notNull(),
  variables: jsonb("variables"), // Available template variables
  isActive: boolean("is_active").default(true),
  usage: integer("usage").default(0),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailAutomationRules = pgTable("email_automation_rules", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  trigger: varchar("trigger", { 
    enum: ['user_registration', 'appointment_booked', 'appointment_reminder', 'session_completed', 
           'payment_received', 'therapist_assigned', 'profile_incomplete', 'inactivity_detected',
           'form_submission', 'subscription_started', 'subscription_ended', 'custom_event'] 
  }).notNull(),
  templateId: varchar("template_id").references(() => emailTemplates.id),
  conditions: jsonb("conditions"), // Trigger conditions
  delay: integer("delay").default(0), // Minutes to wait before sending
  isActive: boolean("is_active").default(true),
  triggerCount: integer("trigger_count").default(0),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailAutomationHistory = pgTable("email_automation_history", {
  id: varchar("id").primaryKey().notNull(),
  ruleId: varchar("rule_id").references(() => emailAutomationRules.id),
  userId: varchar("user_id").references(() => users.id),
  templateId: varchar("template_id").references(() => emailTemplates.id),
  status: varchar("status", { enum: ['pending', 'sent', 'failed', 'skipped'] }).default('pending'),
  triggerData: jsonb("trigger_data"), // Data that triggered the automation
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Retention Policies
export const documentRetentionPolicies = pgTable("document_retention_policies", {
  id: varchar("id").primaryKey().notNull(),
  documentType: varchar("document_type").notNull(),
  retentionPeriod: integer("retention_period").notNull(), // Days to retain
  archiveAfter: integer("archive_after"), // Days before archiving
  autoDelete: boolean("auto_delete").default(false),
  complianceRequirement: varchar("compliance_requirement"), // HIPAA, GDPR, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Institution Onboarding
export const institutionOnboarding = pgTable("institution_onboarding", {
  id: varchar("id").primaryKey().notNull(),
  institutionId: varchar("institution_id").references(() => users.id),
  onboardingStep: integer("onboarding_step").default(1),
  completedSteps: integer("completed_steps").array().default([]),
  setupData: jsonb("setup_data"),
  adminUsers: varchar("admin_users").array().default([]),
  departments: jsonb("departments"),
  billingSetup: jsonb("billing_setup"),
  complianceSettings: jsonb("compliance_settings"),
  integrationSettings: jsonb("integration_settings"),
  status: varchar("status", { enum: ['pending', 'in_progress', 'completed', 'on_hold'] }).default('pending'),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stripe Connect Automation
export const stripeConnectApplications = pgTable("stripe_connect_applications", {
  id: varchar("id").primaryKey().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id),
  applicationData: jsonb("application_data"), // Pre-filled application data
  stripeAccountId: varchar("stripe_account_id"),
  accountStatus: varchar("account_status", { 
    enum: ['pending', 'submitted', 'under_review', 'approved', 'rejected', 'restricted'] 
  }).default('pending'),
  onboardingUrl: varchar("onboarding_url"),
  requirementsNeeded: jsonb("requirements_needed"),
  payoutsEnabled: boolean("payouts_enabled").default(false),
  chargesEnabled: boolean("charges_enabled").default(false),
  lastStatusCheck: timestamp("last_status_check"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messaging system tables
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().notNull(),
  participant1Id: varchar("participant1_id").notNull().references(() => users.id),
  participant2Id: varchar("participant2_id").notNull().references(() => users.id),
  lastMessageId: varchar("last_message_id"),
  status: varchar("status", { enum: ['active', 'archived'] }).default('active'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().notNull(),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: varchar("message_type", { enum: ['text', 'image', 'file', 'system'] }).default('text'),
  read: boolean("read").default(false),
  attachments: jsonb("attachments"), // Array of attachment URLs/metadata
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email queue system for automated communications
export const emailQueue = pgTable("email_queue", {
  id: varchar("id").primaryKey().notNull(),
  type: varchar("type").notNull(), // 'welcome', 'appointmentReminder', 'sessionComplete', etc.
  to: varchar("to").notNull(),
  subject: varchar("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  data: jsonb("data"), // Original data used to generate email
  priority: varchar("priority", { enum: ['high', 'normal', 'low'] }).default('normal'),
  status: varchar("status", { enum: ['queued', 'processing', 'sent', 'failed'] }).default('queued'),
  attempts: integer("attempts").default(0),
  error: text("error"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  lastAttempt: timestamp("last_attempt"),
  sentAt: timestamp("sent_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Reminder Configuration System
export const reminderConfigurations = pgTable("reminder_configurations", {
  id: varchar("id").primaryKey().notNull(),
  reminderType: varchar("reminder_type").notNull(), // 'email', 'sms'
  eventType: varchar("event_type").notNull(), // 'session_reminder', 'follow_up', 'appointment_confirmation'
  recipientRole: varchar("recipient_role", { enum: ['client', 'therapist', 'both'] }).notNull().default('both'), // Who receives this reminder
  isEnabled: boolean("is_enabled").default(true),
  timeBefore: integer("time_before").notNull(), // Minutes before event
  templateId: varchar("template_id"),
  subject: varchar("subject"),
  message: text("message").notNull(),
  phoneNumber: varchar("phone_number"), // Phone number for SMS reminders
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reminder Queue for scheduled reminders
export const reminderQueue = pgTable("reminder_queue", {
  id: varchar("id").primaryKey().notNull(),
  configurationId: varchar("configuration_id").notNull().references(() => reminderConfigurations.id),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id),
  userId: varchar("user_id").notNull(),
  reminderType: varchar("reminder_type").notNull(), // 'email', 'sms'
  recipientEmail: varchar("recipient_email"),
  recipientPhone: varchar("recipient_phone"),
  subject: varchar("subject"),
  message: text("message").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sentAt: timestamp("sent_at"),
  status: varchar("status").notNull().default('pending'), // 'pending', 'sent', 'failed', 'cancelled'
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comprehensive messaging and notifications system

// User communication preferences and consent
export const userCommunicationPreferences = pgTable("user_communication_preferences", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  emailEnabled: boolean("email_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  whatsappEnabled: boolean("whatsapp_enabled").default(false),
  emailOptOut: boolean("email_opt_out").default(false),
  smsOptOut: boolean("sms_opt_out").default(false),
  whatsappOptOut: boolean("whatsapp_opt_out").default(false),
  phoneNumber: varchar("phone_number"),
  whatsappNumber: varchar("whatsapp_number"),
  countryCode: varchar("country_code").default("+44"),
  consentGiven: boolean("consent_given").default(false),
  consentDate: timestamp("consent_date"),
  consentMethod: varchar("consent_method"), // 'signup', 'settings', 'sms_reply', 'whatsapp_reply'
  lastOptOutDate: timestamp("last_opt_out_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multi-channel notification templates
export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  channel: varchar("channel", { enum: ['email', 'sms', 'whatsapp', 'push'] }).notNull(),
  type: varchar("type", { enum: ['appointment_confirmation', 'appointment_reminder', 'session_followup', 'welcome', 'therapist_connection', 'payment_confirmation', 'custom'] }).notNull(),
  subject: varchar("subject"), // For email and push notifications
  body: text("body").notNull(),
  placeholders: jsonb("placeholders"), // Available variables like {client_name}, {therapist_name}, {date}, {time}
  isActive: boolean("is_active").default(true),
  lastUpdatedBy: varchar("last_updated_by").notNull(),
  usage: integer("usage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified notifications table for all channels
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  channel: varchar("channel", { enum: ['email', 'sms', 'whatsapp', 'push'] }).notNull(),
  type: varchar("type", { enum: ['appointment_confirmation', 'appointment_reminder', 'session_followup', 'welcome', 'therapist_connection', 'payment_confirmation', 'custom'] }).notNull(),
  templateId: varchar("template_id").references(() => notificationTemplates.id),
  recipient: varchar("recipient").notNull(), // email, phone number, or user ID
  subject: varchar("subject"),
  message: text("message").notNull(),
  status: varchar("status", { enum: ['pending', 'sent', 'delivered', 'failed', 'read'] }).default('pending'),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  metadata: jsonb("metadata"), // Twilio message SID, SendGrid message ID, etc.
  sentBy: varchar("sent_by", { enum: ['system', 'automated', 'admin'] }).default('system'),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Twilio webhook delivery tracking
export const twilioWebhooks = pgTable("twilio_webhooks", {
  id: varchar("id").primaryKey().notNull(),
  notificationId: varchar("notification_id").references(() => notifications.id),
  messageSid: varchar("message_sid").notNull(),
  accountSid: varchar("account_sid").notNull(),
  from: varchar("from").notNull(),
  to: varchar("to").notNull(),
  body: text("body"),
  numSegments: integer("num_segments"),
  status: varchar("status").notNull(), // 'queued', 'sent', 'received', 'delivered', 'undelivered', 'failed'
  errorCode: varchar("error_code"),
  errorMessage: text("error_message"),
  price: decimal("price", { precision: 10, scale: 4 }),
  priceUnit: varchar("price_unit"),
  direction: varchar("direction"), // 'inbound', 'outbound-api', 'outbound-call', 'outbound-reply'
  webhookData: jsonb("webhook_data"), // Full webhook payload
  createdAt: timestamp("created_at").defaultNow(),
});

// SendGrid webhook tracking
export const sendgridWebhooks = pgTable("sendgrid_webhooks", {
  id: varchar("id").primaryKey().notNull(),
  notificationId: varchar("notification_id").references(() => notifications.id),
  messageId: varchar("message_id").notNull(),
  email: varchar("email").notNull(),
  event: varchar("event").notNull(), // 'processed', 'delivered', 'open', 'click', 'bounce', 'dropped', 'spamreport', 'unsubscribe', 'group_unsubscribe', 'group_resubscribe'
  timestamp: timestamp("timestamp").notNull(),
  smtpId: varchar("smtp_id"),
  category: varchar("category").array(),
  sg_event_id: varchar("sg_event_id"),
  sg_message_id: varchar("sg_message_id"),
  reason: text("reason"),
  status: varchar("status"),
  response: text("response"),
  url: text("url"), // For click events
  urlOffset: jsonb("url_offset"), // For click events
  useragent: text("useragent"), // For open/click events
  ip: varchar("ip"), // For open/click events
  webhookData: jsonb("webhook_data"), // Full webhook payload
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification automation rules
export const notificationAutomationRules = pgTable("notification_automation_rules", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  trigger: varchar("trigger", { 
    enum: ['appointment_created', 'appointment_updated', 'user_registered', 'therapist_assigned', 
           'session_completed', 'payment_received', 'profile_incomplete', 'reminder_24h', 
           'reminder_1h', 'reminder_15min', 'custom_event'] 
  }).notNull(),
  channels: varchar("channels").array(), // ['email', 'sms', 'whatsapp']
  templateIds: jsonb("template_ids"), // Map of channel to template ID
  conditions: jsonb("conditions"), // Trigger conditions
  delay: integer("delay").default(0), // Minutes to wait before sending
  fallbackChannels: varchar("fallback_channels").array(), // Fallback order if primary fails
  isActive: boolean("is_active").default(true),
  priority: varchar("priority", { enum: ['low', 'normal', 'high', 'urgent'] }).default('normal'),
  triggerCount: integer("trigger_count").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastTriggered: timestamp("last_triggered"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification logs for admin monitoring
export const notificationLogs = pgTable("notification_logs", {
  id: varchar("id").primaryKey().notNull(),
  notificationId: varchar("notification_id").references(() => notifications.id),
  userId: varchar("user_id").references(() => users.id),
  channel: varchar("channel").notNull(),
  type: varchar("type").notNull(),
  status: varchar("status").notNull(),
  message: text("message"),
  errorDetails: text("error_details"),
  metadata: jsonb("metadata"),
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Opt-out tracking for compliance
export const optOutLogs = pgTable("opt_out_logs", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id),
  channel: varchar("channel", { enum: ['email', 'sms', 'whatsapp', 'all'] }).notNull(),
  action: varchar("action", { enum: ['opt_out', 'opt_in'] }).notNull(),
  method: varchar("method", { enum: ['sms_reply', 'whatsapp_reply', 'email_link', 'settings_page', 'admin_action'] }).notNull(),
  originalMessage: text("original_message"), // The message that triggered the opt-out
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Introduction calls booking table removed - using enhanced version above

// Chatbot conversations for admin monitoring and quality assurance
export const chatbotConversations = pgTable('chatbot_conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id), // null for anonymous users
  sessionId: text('session_id'), // For grouping conversation messages
  userMessage: text('user_message').notNull(),
  botResponse: text('bot_response').notNull(),
  responseSource: text('response_source').notNull(), // 'faq', 'ai', 'privacy_warning', 'error'
  confidence: text('confidence'), // 0.00-1.00 as text for simplicity
  wasRedacted: boolean('was_redacted').default(false),
  redactedItems: text('redacted_items'), // JSON string of what was redacted
  messageLength: integer('message_length'),
  responseLength: integer('response_length'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  source: text('source').default('landing-page'), // 'landing-page', 'portal', 'wordpress', 'external'
  feedback: text('feedback'), // 'positive', 'negative', null
  createdAt: timestamp('created_at').defaultNow(),
});

export type InsertDocument = typeof documents.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertSessionRecording = typeof sessionRecordings.$inferInsert;
export type SessionRecording = typeof sessionRecordings.$inferSelect;
export type InsertSessionNotes = typeof sessionNotes.$inferInsert;
export type SessionNotes = typeof sessionNotes.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentAccessLog = typeof documentAccessLog.$inferInsert;
export type DocumentAccessLog = typeof documentAccessLog.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertEmailQueue = typeof emailQueue.$inferInsert;
export type EmailQueue = typeof emailQueue.$inferSelect;
export type InsertReminderConfiguration = typeof reminderConfigurations.$inferInsert;
export type ReminderConfiguration = typeof reminderConfigurations.$inferSelect;
export type InsertReminderQueue = typeof reminderQueue.$inferInsert;
export type ReminderQueue = typeof reminderQueue.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailAutomationRule = typeof emailAutomationRules.$inferInsert;
export type EmailAutomationRule = typeof emailAutomationRules.$inferSelect;
export type InsertEmailAutomationHistory = typeof emailAutomationHistory.$inferInsert;
export type EmailAutomationHistory = typeof emailAutomationHistory.$inferSelect;
export type InsertDocumentRetentionPolicy = typeof documentRetentionPolicies.$inferInsert;
export type DocumentRetentionPolicy = typeof documentRetentionPolicies.$inferSelect;
export type InsertInstitutionOnboarding = typeof institutionOnboarding.$inferInsert;
export type InstitutionOnboarding = typeof institutionOnboarding.$inferSelect;
export type InsertStripeConnectApplication = typeof stripeConnectApplications.$inferInsert;
export type StripeConnectApplication = typeof stripeConnectApplications.$inferSelect;
export type InsertUserCommunicationPreferences = typeof userCommunicationPreferences.$inferInsert;
export type UserCommunicationPreferences = typeof userCommunicationPreferences.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertTwilioWebhook = typeof twilioWebhooks.$inferInsert;
export type TwilioWebhook = typeof twilioWebhooks.$inferSelect;
export type InsertSendgridWebhook = typeof sendgridWebhooks.$inferInsert;
export type SendgridWebhook = typeof sendgridWebhooks.$inferSelect;
export type InsertNotificationAutomationRule = typeof notificationAutomationRules.$inferInsert;
export type NotificationAutomationRule = typeof notificationAutomationRules.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertOptOutLog = typeof optOutLogs.$inferInsert;
export type OptOutLog = typeof optOutLogs.$inferSelect;
export type InsertIntroductionCall = typeof introductionCalls.$inferInsert;
export type IntroductionCall = typeof introductionCalls.$inferSelect;
export type InsertAdminCalendarBlock = typeof adminCalendarBlocks.$inferInsert;
export type AdminCalendarBlock = typeof adminCalendarBlocks.$inferSelect;

// Admin availability settings for configurable working hours
export const adminAvailabilitySettings = pgTable("admin_availability_settings", {
  id: varchar("id").primaryKey().notNull(),
  adminId: varchar("admin_id").references(() => users.id).notNull(),
  timeZone: varchar("time_zone").default("Europe/London").notNull(),
  workingDays: varchar("working_days").array().default(['1', '2', '3', '4', '5']).notNull(), // 0=Sunday, 1=Monday, etc. - Expanded to Mon-Fri
  dailyStartTime: varchar("daily_start_time").default("09:00").notNull(),
  dailyEndTime: varchar("daily_end_time").default("17:00").notNull(),
  lunchBreakStart: varchar("lunch_break_start").default("12:00"),
  lunchBreakEnd: varchar("lunch_break_end").default("13:00"),
  includeLunchBreak: boolean("include_lunch_break").default(true).notNull(),
  sessionDuration: integer("session_duration").default(30).notNull(), // minutes
  bufferTimeBetweenSessions: integer("buffer_time_between_sessions").default(0).notNull(), // minutes
  maxSessionsPerDay: integer("max_sessions_per_day").default(8),
  advanceBookingDays: integer("advance_booking_days").default(30).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  autoBlockWeekends: boolean("auto_block_weekends").default(true).notNull(),
  customTimeSlots: jsonb("custom_time_slots"), // Override default slots for specific days
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertAdminAvailabilitySettings = typeof adminAvailabilitySettings.$inferInsert;
export type AdminAvailabilitySettings = typeof adminAvailabilitySettings.$inferSelect;
export type InsertChatbotConversation = typeof chatbotConversations.$inferInsert;
export type ChatbotConversation = typeof chatbotConversations.$inferSelect;

// Client Progress Tracking Tables

// Wellness metrics tracking table
export const wellnessMetrics = pgTable("wellness_metrics", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  moodScore: decimal("mood_score", { precision: 3, scale: 1 }), // 0.0 to 10.0
  sleepQuality: decimal("sleep_quality", { precision: 3, scale: 1 }), // 0.0 to 10.0
  stressLevel: decimal("stress_level", { precision: 3, scale: 1 }), // 0.0 to 10.0
  anxietyLevel: decimal("anxiety_level", { precision: 3, scale: 1 }), // 0.0 to 10.0
  energyLevel: decimal("energy_level", { precision: 3, scale: 1 }), // 0.0 to 10.0
  socialConnection: decimal("social_connection", { precision: 3, scale: 1 }), // 0.0 to 10.0
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
  sessionId: varchar("session_id"), // Link to therapy session if recorded during session
  createdAt: timestamp("created_at").defaultNow(),
});

// Therapy goals tracking table
export const therapyGoals = pgTable("therapy_goals", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category", { 
    enum: ['anxiety', 'depression', 'stress', 'sleep', 'relationships', 'coping', 'trauma', 'grief', 'addiction', 'self-esteem'] 
  }).notNull(),
  targetDate: timestamp("target_date"),
  progress: integer("progress").default(0), // 0-100 percentage
  status: varchar("status", { enum: ['active', 'completed', 'paused', 'cancelled'] }).default('active'),
  priority: varchar("priority", { enum: ['low', 'medium', 'high', 'critical'] }).default('medium'),
  therapistId: varchar("therapist_id").references(() => users.id),
  milestones: jsonb("milestones"), // Array of milestone objects
  progressNotes: text("progress_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session progress tracking table  
export const sessionProgressTable = pgTable("session_progress", {
  id: varchar("id").primaryKey().notNull(),
  sessionId: varchar("session_id").references(() => appointments.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  moodBefore: decimal("mood_before", { precision: 3, scale: 1 }),
  moodAfter: decimal("mood_after", { precision: 3, scale: 1 }),
  sessionRating: integer("session_rating"), // 1-5 stars
  progressMade: integer("progress_made"), // 1-10 scale
  homeworkAssigned: text("homework_assigned"),
  homeworkCompleted: boolean("homework_completed").default(false),
  nextSessionGoals: text("next_session_goals"),
  therapistNotes: text("therapist_notes"),
  clientFeedback: text("client_feedback"),
  keyTopicsDiscussed: varchar("key_topics_discussed").array(),
  breakthroughMoments: text("breakthrough_moments"),
  challengesIdentified: text("challenges_identified"),
  copingStrategiesLearned: text("coping_strategies_learned"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Overall progress summary table
export const clientProgressSummary = pgTable("client_progress_summary", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  overallProgress: integer("overall_progress").default(0), // 0-100 percentage
  weeklyImprovement: decimal("weekly_improvement", { precision: 5, scale: 2 }), // percentage change
  monthlyImprovement: decimal("monthly_improvement", { precision: 5, scale: 2 }), // percentage change
  goalsAchieved: integer("goals_achieved").default(0),
  totalGoals: integer("total_goals").default(0),
  sessionsAttended: integer("sessions_attended").default(0),
  sessionsScheduled: integer("sessions_scheduled").default(0),
  avgMoodScore: decimal("avg_mood_score", { precision: 3, scale: 1 }),
  avgStressLevel: decimal("avg_stress_level", { precision: 3, scale: 1 }),
  avgSleepQuality: decimal("avg_sleep_quality", { precision: 3, scale: 1 }),
  lastCalculated: timestamp("last_calculated").defaultNow(),
  therapistId: varchar("therapist_id").references(() => users.id),
  treatmentStartDate: timestamp("treatment_start_date"),
  riskLevel: varchar("risk_level", { enum: ['low', 'medium', 'high', 'critical'] }).default('low'),
  needsAttention: boolean("needs_attention").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Progress tracking types
export type WellnessMetric = typeof wellnessMetrics.$inferSelect;
export type InsertWellnessMetric = typeof wellnessMetrics.$inferInsert;
export type TherapyGoal = typeof therapyGoals.$inferSelect;
export type InsertTherapyGoal = typeof therapyGoals.$inferInsert;
export type SessionProgress = typeof sessionProgressTable.$inferSelect;
export type InsertSessionProgress = typeof sessionProgressTable.$inferInsert;
export type ClientProgressSummary = typeof clientProgressSummary.$inferSelect;
export type InsertClientProgressSummary = typeof clientProgressSummary.$inferInsert;

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTherapistCalendarSchema = createInsertSchema(therapistCalendars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectTherapistCalendarSchema = createSelectSchema(therapistCalendars);
export const insertAppointmentSchema = createInsertSchema(appointments);
export const selectAppointmentSchema = createSelectSchema(appointments);
export const insertIntroductionCallSchema = createInsertSchema(introductionCalls).omit({
  id: true,
  createdAt: true,
}).extend({
  // Support both old format (preferredDate/preferredTime) and new format (date/time/timeZone)
  preferredDate: z.string().optional(), // Legacy: Accept date string (DD-MM-YYYY or YYYY-MM-DD)
  preferredTime: z.string().optional(), // Legacy: Display time
  date: z.string().optional(), // New: Separate date field (DD-MM-YYYY or YYYY-MM-DD)
  time: z.string().optional(), // New: Separate time field (HH:mm)
  timeZone: z.string().optional(), // New: Explicit timezone
  // Support both name OR (firstName + lastName)
  name: z.string().optional(), // Single name field
  firstName: z.string().optional(), // Split name fields
  lastName: z.string().optional(),
});

// Widget-specific schema that accepts string dates (DD-MM-YYYY or YYYY-MM-DD)
export const insertIntroductionCallWidgetSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
  preferredDate: z.string().optional(), // Accept date string  
  preferredTime: z.string().optional(),
  date: z.string().optional(), // New format
  time: z.string().optional(),
  timeZone: z.string().optional(),
  userType: z.string().optional(),
  source: z.string().optional(),
  therapistId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
export const selectIntroductionCallSchema = createSelectSchema(introductionCalls);
export const insertPaymentSchema = createInsertSchema(payments);
export const selectPaymentSchema = createSelectSchema(payments);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertSessionNotesSchema = createInsertSchema(sessionNotes);
export const selectSessionNotesSchema = createSelectSchema(sessionNotes);
export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertEmailQueueSchema = createInsertSchema(emailQueue);
export const selectEmailQueueSchema = createSelectSchema(emailQueue);
export const insertUserCommunicationPreferencesSchema = createInsertSchema(userCommunicationPreferences);
export const selectUserCommunicationPreferencesSchema = createSelectSchema(userCommunicationPreferences);
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates);
export const selectNotificationTemplateSchema = createSelectSchema(notificationTemplates);
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
export const insertNotificationAutomationRuleSchema = createInsertSchema(notificationAutomationRules);
export const selectNotificationAutomationRuleSchema = createSelectSchema(notificationAutomationRules);

// GDPR Consent Schemas
export const insertConsentLogSchema = createInsertSchema(consentLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectConsentLogSchema = createSelectSchema(consentLogs);
export type InsertConsentLog = z.infer<typeof insertConsentLogSchema>;
export type ConsentLog = typeof consentLogs.$inferSelect;

// Therapist Availability Audit table - for tracking all availability changes
export const therapistAvailabilityAudit = pgTable("therapist_availability_audit", {
  id: varchar("id").primaryKey().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  changeType: varchar("change_type", { enum: ['create', 'update', 'delete'] }).notNull(),
  previousData: jsonb("previous_data"), // JSON snapshot of previous availability
  newData: jsonb("new_data"), // JSON snapshot of new availability
  changedBy: varchar("changed_by").references(() => users.id),
  changeReason: text("change_reason"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertTherapistAvailabilityAudit = typeof therapistAvailabilityAudit.$inferInsert;
export type TherapistAvailabilityAudit = typeof therapistAvailabilityAudit.$inferSelect;

// Google Workspace Cost Monitoring Tables

// Workspace Accounts - tracks Google Workspace accounts per therapist
export const workspaceAccounts = pgTable("workspace_accounts", {
  id: varchar("id").primaryKey().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  workspaceEmail: varchar("workspace_email").notNull().unique(),
  planType: varchar("plan_type", { 
    enum: ['business-starter', 'business-standard', 'business-plus'] 
  }).notNull().default('business-standard'),
  monthlyCost: decimal("monthly_cost", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { enum: ['GBP', 'USD'] }).notNull().default('GBP'),
  monthlyCostGBP: decimal("monthly_cost_gbp", { precision: 10, scale: 2 }),
  monthlyCostUSD: decimal("monthly_cost_usd", { precision: 10, scale: 2 }),
  billingCycle: varchar("billing_cycle", { enum: ['monthly', 'annual'] }).default('monthly'),
  accountCreatedAt: timestamp("account_created_at").notNull(),
  accountStatus: varchar("account_status", { 
    enum: ['active', 'suspended', 'deleted'] 
  }).default('active'),
  lastBillingDate: timestamp("last_billing_date"),
  nextBillingDate: timestamp("next_billing_date"),
  storageQuotaGB: integer("storage_quota_gb").default(30), // Business Standard default
  currentStorageUsedGB: decimal("current_storage_used_gb", { precision: 10, scale: 2 }).default('0'),
  licenseAssignedAt: timestamp("license_assigned_at"),
  licenseRevokedAt: timestamp("license_revoked_at"),
  costCenter: varchar("cost_center"), // For accounting/budgeting
  notes: text("notes"), // Admin notes about the account
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usage Metrics - monthly usage tracking per therapist
export const usageMetrics = pgTable("usage_metrics", {
  id: varchar("id").primaryKey().notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  workspaceAccountId: varchar("workspace_account_id").references(() => workspaceAccounts.id),
  month: varchar("month").notNull(), // YYYY-MM format
  appointmentsScheduled: integer("appointments_scheduled").default(0),
  calendarEventsCreated: integer("calendar_events_created").default(0),
  googleMeetSessionsGenerated: integer("google_meet_sessions").default(0),
  storageUsedGB: decimal("storage_used_gb", { precision: 10, scale: 2 }).default('0'),
  emailsSent: integer("emails_sent").default(0),
  collaboratorsAdded: integer("collaborators_added").default(0),
  apiCallsUsed: integer("api_calls_used").default(0),
  documentsCreated: integer("documents_created").default(0),
  videosRecorded: integer("videos_recorded").default(0),
  sharedDriveUsageGB: decimal("shared_drive_usage_gb", { precision: 10, scale: 2 }).default('0'),
  adminAPIRequests: integer("admin_api_requests").default(0),
  calendarAPIRequests: integer("calendar_api_requests").default(0),
  meetAPIRequests: integer("meet_api_requests").default(0),
  lastActiveDate: timestamp("last_active_date"),
  utilizationScore: decimal("utilization_score", { precision: 5, scale: 2 }), // 0-100 efficiency score
  recordedAt: timestamp("recorded_at").defaultNow(),
  collectedBy: varchar("collected_by").default('automated'), // automated|manual
  dataSource: varchar("data_source").default('api'), // api|manual|estimated
}, (table) => [
  uniqueIndex("unique_therapist_month").on(table.therapistId, table.month),
]);

// Cost Reports - monthly cost summaries and analytics
export const costReports = pgTable("cost_reports", {
  id: varchar("id").primaryKey().notNull(),
  month: varchar("month").notNull(), // YYYY-MM format
  currency: varchar("currency", { enum: ['GBP', 'USD'] }).notNull().default('GBP'),
  totalWorkspaceCost: decimal("total_workspace_cost", { precision: 10, scale: 2 }).notNull(),
  totalWorkspaceCostGBP: decimal("total_workspace_cost_gbp", { precision: 10, scale: 2 }),
  totalWorkspaceCostUSD: decimal("total_workspace_cost_usd", { precision: 10, scale: 2 }),
  totalStorageOverageCost: decimal("total_storage_overage_cost", { precision: 10, scale: 2 }).default('0'),
  totalStorageOverageCostGBP: decimal("total_storage_overage_cost_gbp", { precision: 10, scale: 2 }).default('0'),
  totalAPIOverageCost: decimal("total_api_overage_cost", { precision: 10, scale: 2 }).default('0'),
  totalAPIOverageCostGBP: decimal("total_api_overage_cost_gbp", { precision: 10, scale: 2 }).default('0'),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  totalCostGBP: decimal("total_cost_gbp", { precision: 10, scale: 2 }),
  totalCostUSD: decimal("total_cost_usd", { precision: 10, scale: 2 }),
  activeTherapistAccounts: integer("active_therapist_accounts").notNull(),
  totalAppointments: integer("total_appointments").notNull(),
  totalCalendarEvents: integer("total_calendar_events").default(0),
  totalGoogleMeetSessions: integer("total_google_meet_sessions").default(0),
  averageCostPerTherapist: decimal("average_cost_per_therapist", { precision: 10, scale: 2 }),
  averageCostPerTherapistGBP: decimal("average_cost_per_therapist_gbp", { precision: 10, scale: 2 }),
  costPerAppointment: decimal("cost_per_appointment", { precision: 10, scale: 2 }),
  costPerAppointmentGBP: decimal("cost_per_appointment_gbp", { precision: 10, scale: 2 }),
  costPerCalendarEvent: decimal("cost_per_calendar_event", { precision: 10, scale: 2 }),
  costPerCalendarEventGBP: decimal("cost_per_calendar_event_gbp", { precision: 10, scale: 2 }),
  monthOverMonthChange: decimal("month_over_month_change", { precision: 10, scale: 2 }), // Percentage change
  yearOverYearChange: decimal("year_over_year_change", { precision: 10, scale: 2 }), // Percentage change
  projectedNextMonthCost: decimal("projected_next_month_cost", { precision: 10, scale: 2 }),
  projectedNextMonthCostGBP: decimal("projected_next_month_cost_gbp", { precision: 10, scale: 2 }),
  utilizationRate: decimal("utilization_rate", { precision: 5, scale: 2 }), // Overall system utilization
  efficiencyScore: decimal("efficiency_score", { precision: 5, scale: 2 }), // Cost efficiency rating
  topCostDrivers: jsonb("top_cost_drivers"), // Array of cost analysis insights
  optimizationRecommendations: jsonb("optimization_recommendations"), // Array of cost-saving suggestions
  budgetVariance: decimal("budget_variance", { precision: 10, scale: 2 }), // Actual vs budgeted cost
  budgetVarianceGBP: decimal("budget_variance_gbp", { precision: 10, scale: 2 }), // Actual vs budgeted cost in GBP
  budgetUtilization: decimal("budget_utilization", { precision: 5, scale: 2 }), // Percentage of budget used
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: varchar("generated_by").default('automated'),
  reportVersion: varchar("report_version").default('1.0'),
  dataQualityScore: decimal("data_quality_score", { precision: 5, scale: 2 }).default('100'), // Data completeness score
}, (table) => [
  uniqueIndex("unique_cost_report_month").on(table.month),
]);

// Cost Budget and Alerts
export const costBudgets = pgTable("cost_budgets", {
  id: varchar("id").primaryKey().notNull(),
  budgetName: varchar("budget_name").notNull(),
  budgetType: varchar("budget_type", { 
    enum: ['monthly', 'quarterly', 'annual', 'per-therapist'] 
  }).notNull(),
  budgetAmount: decimal("budget_amount", { precision: 10, scale: 2 }).notNull(),
  currentSpend: decimal("current_spend", { precision: 10, scale: 2 }).default('0'),
  budgetPeriod: varchar("budget_period"), // YYYY-MM or YYYY-Q1, etc.
  alertThresholds: jsonb("alert_thresholds"), // Array of percentage thresholds (50%, 75%, 90%, 100%)
  alertRecipients: varchar("alert_recipients").array(), // Email addresses
  isActive: boolean("is_active").default(true),
  lastAlertSent: timestamp("last_alert_sent"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost Optimization Recommendations History
export const costOptimizations = pgTable("cost_optimizations", {
  id: varchar("id").primaryKey().notNull(),
  recommendationType: varchar("recommendation_type", {
    enum: ['low-utilization', 'plan-downgrade', 'storage-cleanup', 'api-optimization', 'license-consolidation']
  }).notNull(),
  therapistId: varchar("therapist_id").references(() => users.id),
  workspaceAccountId: varchar("workspace_account_id").references(() => workspaceAccounts.id),
  description: text("description").notNull(),
  potentialMonthlySavings: decimal("potential_monthly_savings", { precision: 10, scale: 2 }),
  implementationEffort: varchar("implementation_effort", { 
    enum: ['low', 'medium', 'high'] 
  }).default('medium'),
  priority: varchar("priority", { enum: ['low', 'medium', 'high', 'critical'] }).default('medium'),
  status: varchar("status", { 
    enum: ['pending', 'approved', 'implemented', 'rejected', 'expired'] 
  }).default('pending'),
  implementedAt: timestamp("implemented_at"),
  actualSavings: decimal("actual_savings", { precision: 10, scale: 2 }),
  validUntil: timestamp("valid_until"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  automatedGeneration: boolean("automated_generation").default(true),
  generatedAt: timestamp("generated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Events - Durable idempotency tracking for production reliability
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().notNull(),
  eventId: varchar("event_id").notNull().unique(), // Stripe event ID for idempotency
  eventType: varchar("event_type").notNull(), // payment_intent.succeeded, etc.
  webhookSource: varchar("webhook_source").notNull().default('stripe'),
  eventData: jsonb("event_data").notNull(), // Full webhook payload
  processingStatus: varchar("processing_status", {
    enum: ['processing', 'completed', 'failed', 'retrying']
  }).notNull().default('processing'),
  attemptCount: integer("attempt_count").notNull().default(1),
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  createdAppointmentId: varchar("created_appointment_id").references(() => appointments.id),
  createdPaymentId: varchar("created_payment_id"),
  downstreamOperations: jsonb("downstream_operations"), // Track what operations were completed
  processingNotes: text("processing_notes"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  processedBy: varchar("processed_by").notNull().default('webhook-handler'),
}, (table) => [
  uniqueIndex("unique_webhook_event_id").on(table.eventId),
  index("webhook_events_status_idx").on(table.processingStatus),
  index("webhook_events_type_idx").on(table.eventType),
  index("webhook_events_received_idx").on(table.receivedAt),
]);

// Webhook Processing Queue - Outbox pattern for atomic operations
export const webhookProcessingQueue = pgTable("webhook_processing_queue", {
  id: varchar("id").primaryKey().notNull(),
  webhookEventId: varchar("webhook_event_id").references(() => webhookEvents.id).notNull(),
  operationType: varchar("operation_type", {
    enum: ['create_appointment', 'create_calendar_event', 'send_email', 'update_payment', 'process_payout']
  }).notNull(),
  operationData: jsonb("operation_data").notNull(),
  status: varchar("status", {
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled']
  }).notNull().default('pending'),
  priority: integer("priority").notNull().default(0), // Higher number = higher priority
  maxRetries: integer("max_retries").notNull().default(3),
  currentRetries: integer("current_retries").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  dependsOn: varchar("depends_on").array(), // IDs of operations this depends on
  scheduledFor: timestamp("scheduled_for").defaultNow(), // When to process
  lockUntil: timestamp("lock_until"), // Distributed locking for workers
  lockedBy: varchar("locked_by"), // Worker instance ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("webhook_queue_status_idx").on(table.status),
  index("webhook_queue_scheduled_idx").on(table.scheduledFor),
  index("webhook_queue_priority_idx").on(table.priority),
  index("webhook_queue_webhook_event_idx").on(table.webhookEventId),
]);

// Client Activation Tokens - Step 16: Gated client signup
export const clientActivationTokens = pgTable("client_activation_tokens", {
  id: varchar("id").primaryKey().notNull(),
  clientEmail: varchar("client_email").notNull(),
  activationToken: varchar("activation_token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  usedAt: timestamp("used_at"),
  createdBy: varchar("created_by").references(() => users.id), // Admin who created the activation
  matchedTherapistId: varchar("matched_therapist_id").references(() => users.id), // Therapist matched to this client
  notes: text("notes"), // Admin notes about the activation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_activation_email").on(table.clientEmail),
  index("idx_activation_token").on(table.activationToken),
  index("idx_activation_expiry").on(table.expiresAt),
]);

// Subscription Packages - Different therapy session packages
export const subscriptionPackages = pgTable("subscription_packages", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(), // e.g., "4 Sessions Package", "8 Sessions Package"
  description: text("description"),
  sessionCount: integer("session_count").notNull(), // Number of sessions included
  pricePerSession: decimal("price_per_session", { precision: 10, scale: 2 }).notNull(), // Regular price per session
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }), // Discount percentage
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(), // Total package price after discount
  billingInterval: varchar("billing_interval", { enum: ['one_time', 'monthly', 'quarterly', 'annual'] }).notNull(),
  stripeProductId: varchar("stripe_product_id"), // Stripe product ID
  stripePriceId: varchar("stripe_price_id"), // Stripe price ID
  isActive: boolean("is_active").default(true),
  features: jsonb("features"), // Additional features (priority booking, etc.)
  validityDays: integer("validity_days"), // How many days the package is valid for (null = unlimited)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscription_packages_active").on(table.isActive),
]);

// User Subscriptions - Track client subscriptions
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  packageId: varchar("package_id").references(() => subscriptionPackages.id).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id").unique(), // Stripe subscription ID
  status: varchar("status", { 
    enum: ['active', 'paused', 'cancelled', 'expired', 'pending'] 
  }).notNull(),
  sessionsTotal: integer("sessions_total").notNull(), // Total sessions in subscription
  sessionsUsed: integer("sessions_used").default(0).notNull(), // Sessions already used
  sessionsRemaining: integer("sessions_remaining").notNull(), // Sessions remaining
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelledAt: timestamp("cancelled_at"),
  expiresAt: timestamp("expires_at"), // When the subscription expires
  autoRenew: boolean("auto_renew").default(false), // Auto-renew subscription
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_subscriptions_user_id").on(table.userId),
  index("idx_user_subscriptions_status").on(table.status),
  index("idx_user_subscriptions_stripe_id").on(table.stripeSubscriptionId),
]);

// Bulk Booking Discounts - Configuration for bulk booking discounts
export const bulkBookingDiscounts = pgTable("bulk_booking_discounts", {
  id: varchar("id").primaryKey().notNull(),
  minSessions: integer("min_sessions").notNull(), // Minimum sessions for this discount tier
  maxSessions: integer("max_sessions"), // Maximum sessions (null = unlimited)
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull(),
  discountType: varchar("discount_type", { enum: ['percentage', 'fixed'] }).notNull(),
  fixedDiscountAmount: decimal("fixed_discount_amount", { precision: 10, scale: 2 }), // Fixed discount amount
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bulk_booking_discounts_active").on(table.isActive),
  index("idx_bulk_booking_discounts_sessions").on(table.minSessions, table.maxSessions),
]);

// Bulk Bookings - Track bulk booking purchases
export const bulkBookings = pgTable("bulk_bookings", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  therapistId: varchar("therapist_id").references(() => users.id).notNull(),
  totalSessions: integer("total_sessions").notNull(),
  sessionsCompleted: integer("sessions_completed").default(0).notNull(),
  sessionsRemaining: integer("sessions_remaining").notNull(),
  bookingPattern: varchar("booking_pattern", { enum: ['weekly', 'biweekly', 'monthly', 'custom'] }),
  recurringDay: integer("recurring_day"), // Day of week for weekly bookings (1-7)
  recurringTime: varchar("recurring_time"), // Preferred time (HH:mm format)
  startDate: timestamp("start_date"),
  pricePerSession: decimal("price_per_session", { precision: 10, scale: 2 }).notNull(),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).default('0'),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  status: varchar("status", { enum: ['pending', 'active', 'completed', 'cancelled'] }).notNull(),
  appointmentIds: varchar("appointment_ids").array(), // Array of created appointment IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bulk_bookings_user_id").on(table.userId),
  index("idx_bulk_bookings_therapist_id").on(table.therapistId),
  index("idx_bulk_bookings_status").on(table.status),
]);

// Type definitions for cost monitoring tables
export type WorkspaceAccount = typeof workspaceAccounts.$inferSelect;
export type InsertWorkspaceAccount = typeof workspaceAccounts.$inferInsert;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;
export type CostReport = typeof costReports.$inferSelect;
export type InsertCostReport = typeof costReports.$inferInsert;
export type CostBudget = typeof costBudgets.$inferSelect;
export type InsertCostBudget = typeof costBudgets.$inferInsert;
export type CostOptimization = typeof costOptimizations.$inferSelect;
export type InsertCostOptimization = typeof costOptimizations.$inferInsert;

// Type definitions for webhook system
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;
export type WebhookProcessingQueue = typeof webhookProcessingQueue.$inferSelect;
export type InsertWebhookProcessingQueue = typeof webhookProcessingQueue.$inferInsert;

// Client Activation Tokens Types
export type ClientActivationToken = typeof clientActivationTokens.$inferSelect;
export type InsertClientActivationToken = typeof clientActivationTokens.$inferInsert;

// Subscription Packages Types
export type SubscriptionPackage = typeof subscriptionPackages.$inferSelect;
export type InsertSubscriptionPackage = typeof subscriptionPackages.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

// Bulk Booking Types
export type BulkBookingDiscount = typeof bulkBookingDiscounts.$inferSelect;
export type InsertBulkBookingDiscount = typeof bulkBookingDiscounts.$inferInsert;
export type BulkBooking = typeof bulkBookings.$inferSelect;
export type InsertBulkBooking = typeof bulkBookings.$inferInsert;

// Email Templates Types (consolidated to avoid duplicates)

// Data Retention System Tables
export const retentionPolicies = pgTable("retention_policies", {
  id: varchar("id").primaryKey().notNull(),
  name: varchar("name").notNull(),
  dataType: varchar("data_type", { 
    enum: ['users', 'sessions', 'form_submissions', 'appointments'] 
  }).notNull(),
  retentionDays: integer("retention_days").notNull(),
  enabled: boolean("enabled").default(true),
  softDeleteFirst: boolean("soft_delete_first").default(true),
  gracePeriodDays: integer("grace_period_days").default(30),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const retentionAuditLogs = pgTable("retention_audit_logs", {
  id: varchar("id").primaryKey().notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  dataType: varchar("data_type").notNull(),
  recordId: varchar("record_id").notNull(),
  action: varchar("action", { 
    enum: ['soft_delete', 'hard_delete', 'skip'] 
  }).notNull(),
  reason: text("reason").notNull(),
  dryRun: boolean("dry_run").default(false),
  policyId: varchar("policy_id").references(() => retentionPolicies.id),
  executedBy: varchar("executed_by"), // 'system' or admin user ID
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_retention_logs_timestamp").on(table.timestamp),
  index("idx_retention_logs_data_type").on(table.dataType),
  index("idx_retention_logs_action").on(table.action),
]);

// GDPR Data Requests (Export & Deletion)
export const dataRequests = pgTable("data_requests", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  requestType: varchar("request_type", { 
    enum: ['export', 'deletion'] 
  }).notNull(),
  status: varchar("status", { 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] 
  }).default('pending').notNull(),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // For exports - auto-delete after 7 days
  scheduledDeletionAt: timestamp("scheduled_deletion_at"), // For deletion requests - 30 day grace period
  filePath: varchar("file_path"), // For exports - where JSON file is stored
  cancellationToken: varchar("cancellation_token"), // For deletion requests - unique token to cancel
  errorMessage: text("error_message"), // If status is 'failed'
  processedBy: varchar("processed_by"), // 'system' or admin user ID
  metadata: jsonb("metadata"), // Additional context (file size, record counts, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_data_requests_user_id").on(table.userId),
  index("idx_data_requests_type").on(table.requestType),
  index("idx_data_requests_status").on(table.status),
  index("idx_data_requests_scheduled_deletion").on(table.scheduledDeletionAt),
  index("idx_data_requests_expires_at").on(table.expiresAt),
]);

// Type definitions for retention system
export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type InsertRetentionPolicy = typeof retentionPolicies.$inferInsert;
export type RetentionAuditLog = typeof retentionAuditLogs.$inferSelect;
export type InsertRetentionAuditLog = typeof retentionAuditLogs.$inferInsert;

// Type definitions for GDPR data requests
export type DataRequest = typeof dataRequests.$inferSelect;
export type InsertDataRequest = typeof dataRequests.$inferInsert;

// GDPR Consent Tracking - Article 7 (Lawful Consent)
export const userConsents = pgTable("user_consents", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  consentType: varchar("consent_type", {
    enum: ['essential', 'functional', 'analytics', 'marketing', 'medical_data_processing']
  }).notNull(),
  granted: boolean("granted").notNull(),
  grantedAt: timestamp("granted_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  ipAddress: varchar("ip_address"), // IP when consent was given/withdrawn
  userAgent: varchar("user_agent"), // Browser info when consent was given/withdrawn
  consentVersion: varchar("consent_version").default('1.0'), // Track consent text version
  metadata: jsonb("metadata"), // Additional context (e.g., which page, referrer)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("unique_user_consent_type").on(table.userId, table.consentType),
  index("idx_user_consents_user_id").on(table.userId),
  index("idx_user_consents_type").on(table.consentType),
  index("idx_user_consents_granted").on(table.granted),
]);

// GDPR Consent Audit Log - Complete history for compliance
export const consentAuditLog = pgTable("consent_audit_log", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  consentType: varchar("consent_type", {
    enum: ['essential', 'functional', 'analytics', 'marketing', 'medical_data_processing']
  }).notNull(),
  action: varchar("action", {
    enum: ['granted', 'withdrawn', 'updated']
  }).notNull(),
  previousValue: boolean("previous_value"), // Previous consent state
  newValue: boolean("new_value").notNull(), // New consent state
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  consentVersion: varchar("consent_version").default('1.0'),
  triggeredBy: varchar("triggered_by"), // 'user' or admin user ID
  metadata: jsonb("metadata"), // Context: page URL, referrer, etc.
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("idx_consent_audit_user_id").on(table.userId),
  index("idx_consent_audit_type").on(table.consentType),
  index("idx_consent_audit_timestamp").on(table.timestamp),
]);

// Type definitions for GDPR consent
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = typeof userConsents.$inferInsert;
export type ConsentAuditLog = typeof consentAuditLog.$inferSelect;
export type InsertConsentAuditLog = typeof consentAuditLog.$inferInsert;

// OpenAI Usage Logs - Track all AI API calls for cost control and compliance
export const openaiUsageLogs = pgTable("openai_usage_logs", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").references(() => users.id), // null for anonymous chatbot users
  sessionId: varchar("session_id"), // Optional session tracking
  featureType: varchar("feature_type", {
    enum: ['chatbot', 'therapist_matching', 'therapist_assistant', 'other']
  }).notNull(),
  model: varchar("model").notNull(), // gpt-4o, gpt-4-turbo, etc.
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }), // In USD
  requestMetadata: jsonb("request_metadata"), // Additional context (client ID, therapist ID, etc.)
  responseTime: integer("response_time"), // Response time in milliseconds
  success: boolean("success").default(true).notNull(),
  errorMessage: text("error_message"), // If success is false
  ipAddress: varchar("ip_address"), // For anonymous usage tracking
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_openai_usage_user_id").on(table.userId),
  index("idx_openai_usage_feature_type").on(table.featureType),
  index("idx_openai_usage_created_at").on(table.createdAt),
  index("idx_openai_usage_model").on(table.model),
]);

// OpenAI Usage Alerts - Track and configure usage anomaly detection
export const openaiUsageAlerts = pgTable("openai_usage_alerts", {
  id: varchar("id").primaryKey().notNull(),
  alertType: varchar("alert_type", {
    enum: ['daily_threshold', 'user_spike', 'cost_limit', 'error_rate', 'manual']
  }).notNull(),
  severity: varchar("severity", {
    enum: ['low', 'medium', 'high', 'critical']
  }).notNull(),
  triggerValue: decimal("trigger_value", { precision: 10, scale: 2 }), // The value that triggered alert
  thresholdValue: decimal("threshold_value", { precision: 10, scale: 2 }), // The configured threshold
  userId: varchar("user_id").references(() => users.id), // If alert is user-specific
  featureType: varchar("feature_type"), // If alert is feature-specific
  message: text("message").notNull(),
  notificationSent: boolean("notification_sent").default(false),
  notifiedAt: timestamp("notified_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  metadata: jsonb("metadata"), // Additional alert context
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_openai_alerts_type").on(table.alertType),
  index("idx_openai_alerts_severity").on(table.severity),
  index("idx_openai_alerts_created_at").on(table.createdAt),
  index("idx_openai_alerts_resolved").on(table.resolvedAt),
]);

// OpenAI Usage Thresholds - Configurable limits for anomaly detection
export const openaiUsageThresholds = pgTable("openai_usage_thresholds", {
  id: varchar("id").primaryKey().notNull(),
  thresholdType: varchar("threshold_type", {
    enum: ['daily_tokens', 'daily_cost', 'hourly_requests', 'user_daily_tokens', 'user_daily_cost', 'error_rate']
  }).notNull().unique(),
  limitValue: decimal("limit_value", { precision: 10, scale: 2 }).notNull(),
  warningValue: decimal("warning_value", { precision: 10, scale: 2 }), // Warn before hitting limit
  isActive: boolean("is_active").default(true).notNull(),
  notifyEmails: varchar("notify_emails").array(), // Email addresses to notify
  notifySms: varchar("notify_sms").array(), // Phone numbers for SMS alerts
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type definitions for OpenAI tracking
export type OpenAIUsageLog = typeof openaiUsageLogs.$inferSelect;
export type InsertOpenAIUsageLog = typeof openaiUsageLogs.$inferInsert;
export type OpenAIUsageAlert = typeof openaiUsageAlerts.$inferSelect;
export type InsertOpenAIUsageAlert = typeof openaiUsageAlerts.$inferInsert;
export type OpenAIUsageThreshold = typeof openaiUsageThresholds.$inferSelect;
export type InsertOpenAIUsageThreshold = typeof openaiUsageThresholds.$inferInsert;

// =============================================================================
// STANDARDIZED VALIDATION SCHEMAS FOR API ROUTES
// =============================================================================
// These schemas provide uniform validation for common query params, path params,
// and request bodies across all API endpoints

// Path Parameter Schemas
export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const therapistIdParamSchema = z.object({
  therapistId: z.string().min(1, "Therapist ID is required"),
});

export const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export const emailParamSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const templateIdParamSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
});

export const filenameParamSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
});

export const categoryIdParamSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
});

export const requestIdParamSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
});

export const clientIdParamSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
});

export const documentIdParamSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required"),
});

export const actionParamSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

// Query Parameter Schemas
export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
});

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
});

export const timeRangeQuerySchema = z.object({
  timeRange: z.enum(['1M', '3M', '6M', '1Y', 'all']).optional(),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const formatQuerySchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']).optional(),
});

export const statusQuerySchema = z.object({
  status: z.string().optional(),
});

export const roleQuerySchema = z.object({
  role: z.enum(['client', 'therapist', 'admin', 'institution']).optional(),
});

export const colorQuerySchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color").optional(),
});

export const compactModeQuerySchema = z.object({
  compact: z.enum(['true', 'false']).optional(),
});

export const brandingQuerySchema = z.object({
  branding: z.enum(['true', 'false']).optional(),
  showBranding: z.boolean().optional(),
});

export const positionQuerySchema = z.object({
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
});

// Combined common query schemas
export const dateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").optional(),
});

export const chatbotWidgetQuerySchema = z.object({
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color").optional(),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
  compact: z.enum(['true', 'false']).optional(),
  branding: z.enum(['true', 'false']).optional(),
});

export const analyticsQuerySchema = z.object({
  timeRange: z.enum(['1M', '3M', '6M', '1Y', 'all']).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  therapistCount: z.coerce.number().int().min(1).optional(),
  months: z.coerce.number().int().min(1).max(24).optional(),
  planType: z.string().optional(),
});

// Request Body Schemas (Common patterns)
export const emailBodySchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const statusUpdateSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

export const idBodySchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const categoryAssignmentSchema = z.object({
  categoryIds: z.array(z.string()).min(1, "At least one category must be selected"),
});

// Messaging schemas
export const messageBodySchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  content: z.string().min(1, "Message content is required"),
});

export const conversationBodySchema = z.object({
  participantIds: z.array(z.string()).min(2, "At least two participants required"),
  initialMessage: z.string().optional(),
});

// Chatbot schemas
export const feedbackBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().optional(),
  sessionId: z.string().optional(),
});

export const chatMessageBodySchema = z.object({
  message: z.string().min(1, "Message is required"),
  sessionId: z.string().optional(),
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const registrationSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(['client', 'therapist', 'admin', 'institution']),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  uid: z.string().min(1, "User ID is required"),
});

// Dry run schema for admin operations
export const dryRunQuerySchema = z.object({
  dryRun: z.enum(['true', 'false']).optional(),
});

// Payment validation schemas
export const paymentIntentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  therapistId: z.string().min(1, "Therapist ID required"),
  userId: z.string().optional(),
  appointmentId: z.string().optional(),
  description: z.string().optional(),
});

export const paymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, "Payment method ID required"),
});

export const subscriptionPackageSchema = z.object({
  name: z.string().min(1, "Package name required"),
  price: z.number().positive("Price must be positive"),
  sessionCount: z.number().int().positive("Session count must be positive"),
  description: z.string().optional(),
  stripePriceId: z.string().optional(),
});

export const createSubscriptionSchema = z.object({
  packageId: z.string().min(1, "Package ID required"),
  paymentMethodId: z.string().min(1, "Payment method ID required"),
});

export const stripeConnectSchema = z.object({
  businessName: z.string().min(1, "Business name required"),
  accountType: z.enum(['individual', 'company']).optional(),
  email: z.string().email("Invalid email").optional(),
});

// Retention policy update schema
export const updateRetentionPolicySchema = z.object({
  retentionDays: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  gracePeriodDays: z.number().int().min(0).optional(),
  softDeleteFirst: z.boolean().optional(),
  description: z.string().optional(),
});

// Calendar block schema
export const calendarBlockSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string(), // ISO 8601 timestamp string
  endTime: z.string(),   // ISO 8601 timestamp string
  blockType: z.enum(['meeting', 'blocked', 'holiday', 'training', 'personal', 'maintenance']),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.string().optional(),
  recurringUntil: z.string().optional(),
  notes: z.string().optional(),
});

// Bulk operations schema
export const bulkOperationSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID required"),
  reason: z.string().optional(),
});

// Block ID param schema
export const blockIdParamSchema = z.object({
  blockId: z.string().min(1, "Block ID is required"),
});

// Event ID param schema
export const eventIdParamSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

// Profile ID param schema  
export const profileIdParamSchema = z.object({
  profileId: z.string().min(1, "Profile ID is required"),
});

// Application ID param schema
export const applicationIdParamSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
});

// Appointment IDs body schema for bulk operations
export const appointmentIdsBodySchema = z.object({
  appointmentIds: z.array(z.string()).min(1, "At least one appointment ID is required"),
  reason: z.string().optional(),
});

// Email template test body schema
export const emailTemplateTestSchema = z.object({
  recipientEmail: z.string().email("Invalid email format"),
  testData: z.record(z.any()).optional(),
});

// ============================================================================
// AVAILABILITY & BOOKING TYPE SAFETY
// Shared types to prevent frontend-backend property name mismatches
// ============================================================================

// Time slot with availability status - used by all booking APIs
export const availabilitySlotSchema = z.object({
  time: z.string(), // HH:mm format (e.g., "09:00")
  display: z.string(), // Display format (e.g., "09:00")
  start: z.string(), // ISO timestamp
  end: z.string(), // ISO timestamp
  isAvailable: z.boolean(), // CRITICAL: Must be isAvailable (not "available")
});

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

// API response for available time slots endpoint
export const availableTimeSlotsResponseSchema = z.object({
  success: z.boolean(),
  availableSlots: z.array(availabilitySlotSchema),
  totalSlots: z.number().optional(),
  date: z.string().optional(),
  therapistId: z.string().optional(),
  source: z.string().optional(), // e.g., "google-calendar", "database"
});

export type AvailableTimeSlotsResponse = z.infer<typeof availableTimeSlotsResponseSchema>;

// Weekly availability schedule (for therapist settings)
export const weeklyAvailabilityDaySchema = z.object({
  day: z.string(), // e.g., "Monday"
  dayNumber: z.number().min(0).max(6), // 0 = Sunday
  isAvailable: z.boolean(), // CRITICAL: Must be isAvailable (not "available")
  timeSlots: z.array(z.object({
    start: z.string(), // HH:mm format
    end: z.string(), // HH:mm format
  })),
});

export type WeeklyAvailabilityDay = z.infer<typeof weeklyAvailabilityDaySchema>;
