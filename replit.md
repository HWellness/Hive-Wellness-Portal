# Hive Wellness - Technical Architecture Reference

> **Note for Support Team**: This document provides detailed technical architecture and implementation details. For quick start and deployment instructions, see README.md. This file serves as a comprehensive reference for understanding system design decisions, integrations, and troubleshooting.

## Overview
Hive Wellness is a comprehensive therapy platform offering human-led therapist matching with technological support. This full-stack web application serves clients, therapists, administrators, and institutions through a unified portal. Key capabilities include therapist matching, appointment scheduling, payment processing, real-time video sessions, and advanced AI-powered tools. The platform aims to streamline the therapy process, enhance accessibility, and improve the effectiveness of therapy, positioning itself for significant market potential.

**Platform Status**: PRODUCTION-READY (as of October 21, 2025)
- All critical features tested and verified working end-to-end
- Calendar timezone handling fixed and tested
- PII protection verified in all AI services
- Access control enforced correctly
- Mobile responsiveness confirmed
- Password reset system verified: immediate SendGrid email delivery with secure token generation

## User Preferences
Preferred communication style: Simple, everyday language.
Admin interface preference: Minimal, essential features only - avoid placeholder functionality that isn't fully implemented to prevent client expectations. Focus on actual working calendar sync with support@hive-wellness.co.uk rather not complex Google Workspace duplications.

## System Architecture

### UI/UX Decisions
- **Brand Compliance** (Updated October 22, 2025): Complete alignment with Hive Wellness Brand Guidelines 2025 across all touchpoints:
  - **Typography**: Palatino Linotype (with Book Antiqua, Palatino, Georgia serif fallbacks) for headings, Open Sans for body text - implemented in Tailwind config (font-primary, font-century, font-display) and consistent across web UI and email templates
  - **Colors**: Hive Purple #9306B1 / rgb(147, 6, 177) (primary, exact color via inline styles), Hive Blue #97A5D0, Light backgrounds #F2F3FB/#E5E7F5
  - **Email Templates**: All automated emails (therapist onboarding, client communications, booking confirmations, admin notifications) redesigned with simple "Hive Wellness" branding, purple personalized headings with horizontal dividers, light grey rounded content boxes, and warm/clear/grounded tone in British English
  - **UI Consistency**: Purple call-to-action buttons, white-on-purple for important information, professional layout with proper spacing and hierarchy, exact brand colors verified via E2E testing
  - **ARIA Accessibility**: Success dialogs use proper DialogDescription components from Radix UI for compliant accessible descriptions
- Responsive, mobile-first, and ARIA compliant design with keyboard navigation.
- Reusable component library for UI consistency.
- Localization standardized to British English, including spelling and currency (£).

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Wouter for routing, TanStack Query for state management, Radix UI primitives with shadcn/ui for components, Tailwind CSS for styling, and Vite for building.
- **Backend**: Node.js with Express.js, TypeScript with ES modules, PostgreSQL with Drizzle ORM, WebSocket support, and Stripe for payments.
- **Authentication**: Replit Auth, PostgreSQL-backed session storage, and role-based access control (client, therapist, admin, institution).
- **Service Registry**: Microservice architecture supporting 14 integrated services dynamically loaded based on user permissions.
- **AI Integration**: AI-powered chatbot, therapy matching, and therapist assistant tools. Includes OpenAI token tracking, cost calculation, anomaly detection, smart alerting, and an admin dashboard for analytics.
- **Video Sessions**: Utilizes Daily.co for therapy sessions and Google Meet for introductory calls.
- **Messaging**: In-app messaging, notification systems, and SMS/WhatsApp via Twilio.
- **Client & Therapist Management**: Comprehensive records, profiles, and automated onboarding.
- **Booking & Scheduling**: Google Calendar integration with intelligent availability filtering, refactored for correct UK timezone handling (BST/GMT) and UTC conversion. Introduction call booking uses timezone-aware timestamps with separate `date`, `time`, and `timeZone` fields to prevent timezone drift. Unified `InternalCalendarService` ensures consistent availability logic across GET and POST endpoints. Backend validation schema supports both legacy (`preferredDate`/`preferredTime`) and new (`date`/`time`/`timeZone`) formats for backward compatibility. Introduction call booking enforces admin-configured working days and hours.
- **Email & Forms**: Enhanced Gmail templates, HubSpot integration for forms, and automated confirmation emails for questionnaires and introduction calls.
- **Subscription & Bulk Bookings**: Implemented one-time and recurring session packages with tiered discounts, integrated with Stripe Connect for revenue splitting, and webhook-based payment integrity. Payment-confirmed appointment creation endpoint (/api/create-appointment-from-payment) handles post-payment appointment creation with automatic data transformation, multi-auth support (session, OIDC, demo, email), and backdated flag for timezone-safe scheduling.
- **Automated Data Retention**: HIPAA-compliant lifecycle management with configurable retention policies, soft delete system, audit trails, automated cron jobs, and user notifications.
- **GDPR Data Rights**: Compliance with Right to Access (data export) and Right to Erasure (account deletion), featuring async processing, secure downloads, and admin oversight.
- **GDPR Consent Management**: Production-ready Article 7 compliance with a non-dismissible consent banner, cross-device tracking, granular consent categories, and a comprehensive audit trail.

### Security Configuration
- CSRF Protection, request validation (XSS, SQL injection), AES-256-GCM encryption, fresh session requirements for sensitive operations, and IP-based rate limiting.
- Clickjacking protection via strict CSP frame-ancestors policy and X-Frame-Options, with selective whitelisting for WordPress and chatbot embedding.
- Comprehensive Content Security Policy (CSP) directives for external services and script/style security.
- Standard security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Cache-Control.
- **PII Detection & Protection**: Production-ready PII detection service with robust regex-based detection for UK-specific PII (emails with validation, NHS numbers with modulus-11 verification, phone numbers, UK postcodes, National Insurance numbers, credit cards with Luhn algorithm validation, addresses, dates of birth) and AI-powered contextual detection using GPT-4o-mini for entity extraction. All AI service calls (chatbot, therapist matching with all three OpenAI calls protected) are automatically protected with PII masking before data reaches OpenAI APIs. Token-based positional masking system maintains conversation context while protecting sensitive data. Chat logging uses PII sanitizer for compliance. Admin dashboard endpoints available at /api/admin/pii-detection/stats for monitoring and compliance auditing.
- PII Log Sanitization: HIPAA-compliant automatic sanitization of all application logs, detecting and hashing PII, redacting medical content, and protecting sensitive fields.
- HIPAA Compliance: Encryption, access controls, audit logging (6+ years retention), secure session management, data integrity, PII-protected AI calls, and PII-sanitized logs.
- **Database SSL Security**: Production-ready TLS certificate validation enforced on all PostgreSQL connections (Railway, Railway fallback, Standard, Standard fallback) with `ssl: { rejectUnauthorized: true }`. Prevents man-in-the-middle attacks by requiring valid CA-signed certificates from Neon Database. Verified working with consistent database health checks.

## External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Replit Auth, connect-pg-simple
- **Payment Processing**: Stripe
- **Email Services**: Gmail API, SendGrid
- **SMS & WhatsApp**: Twilio
- **Real-time Communication**: Daily.co
- **AI/ML**: OpenAI (GPT-4o)
- **ORM**: Drizzle ORM, Drizzle Kit
- **UI Libraries**: Radix UI, shadcn/ui
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS
- **Server**: Express.js
- **Build Tools**: Vite, esbuild
- **External Forms**: HubSpot, WordPress Gravity Forms
- **Google Integration**: Google Workspace (Calendar, Google Meet, Gmail)