# Hive Wellness - Unified Therapy Platform

**Production-Ready Therapy Management System**

Hive Wellness is a comprehensive therapy platform offering therapist matching, appointment scheduling, payment processing, real-time video sessions, and AI-powered tools. The platform serves clients, therapists, administrators, and institutions through a unified portal system.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- PostgreSQL 14+ database (we use Neon Database)
- SendGrid account for emails
- Stripe account for payments
- Daily.co account for video sessions
- Twilio account for SMS/WhatsApp
- OpenAI API key for AI features
- Google Workspace account for Calendar integration

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd hive-wellness
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the root directory (see Environment Variables section below)

4. **Set up the database**
```bash
npm run db:push
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

---

## 🔐 Environment Variables

Create a `.env` file with the following variables:

### Database
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### Authentication
```env
REPL_ID=your-replit-id
REPLIT_DOMAINS=your-domain.replit.dev
```

### Email Services
```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Payment Processing
```env
STRIPE_SECRET_KEY=your-stripe-secret-key
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
STRIPE_CONNECT_CLIENT_ID=your-stripe-connect-client-id
```

### SMS & WhatsApp
```env
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
TWILIO_MESSAGING_SERVICE_SID=your-messaging-service-sid
```

### Video Sessions
```env
DAILY_API_KEY=your-daily-api-key
```

### AI Services
```env
OPENAI_API_KEY=your-openai-api-key
```

### Google Services
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_CALENDAR_ID=your-calendar-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY="your-private-key"
```

### Application URLs
```env
PRODUCTION_URL=https://api.hive-wellness.co.uk
VITE_API_URL=https://api.hive-wellness.co.uk
```

---

## 🏗️ Project Structure

```
hive-wellness/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and helpers
│   └── public/            # Static assets
├── server/                # Express.js backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database operations
│   ├── emailService.ts   # Email sending logic
│   └── ...               # Other services
├── shared/               # Shared code between client and server
│   └── schema.ts         # Database schema (Drizzle ORM)
├── docs/                 # Documentation
├── public/               # Public assets
└── wordpress-chatbot-plugin/  # WordPress integration
```

---

## 🎯 Key Features

### User Management
- **Multi-role authentication**: Client, Therapist, Admin, Institution
- **Secure login**: Replit Auth integration with session management
- **Password reset**: Automated email-based password recovery
- **MFA support**: Optional two-factor authentication

### Therapist Matching & Onboarding
- **AI-powered matching**: GPT-4o-based therapist recommendations
- **Multi-stage onboarding**: Application, interview scheduling, approval workflow
- **Capacity management**: Track and manage therapist client capacity
- **Google Calendar integration**: Automated availability syncing

### Appointment Management
- **Session booking**: Real-time availability checking
- **Introduction calls**: Separate booking system for initial consultations
- **Subscription packages**: One-time and recurring session bundles with tiered discounts
- **Timezone handling**: UK timezone (BST/GMT) aware scheduling

### Payment Processing
- **Stripe Connect integration**: Direct therapist payouts (85/15 revenue split)
- **Automated transfers**: 1-3 business day standard payouts
- **Subscription billing**: Recurring payment support
- **Payment webhooks**: Automated appointment creation after successful payment

### Video Sessions
- **Daily.co integration**: High-quality video therapy sessions
- **Google Meet**: For introduction calls
- **Session recordings**: Optional with consent
- **Waiting rooms**: Pre-session lobby functionality

### Communication
- **In-app messaging**: Secure client-therapist communication
- **Email automation**: SendGrid-powered email templates
- **SMS/WhatsApp**: Twilio integration for appointment reminders
- **Notification system**: Multi-channel notification delivery

### AI-Powered Tools
- **Chatbot**: 24/7 AI assistant for platform navigation
- **Therapist matching**: Intelligent recommendation engine
- **Therapist assistant**: Session notes and insights
- **PII protection**: Automatic masking of sensitive information
- **Token tracking**: Usage analytics and cost monitoring

### Admin Dashboard
- **Therapist management**: Approve applications, manage capacity
- **Client oversight**: View client records and progress
- **Calendar sync**: Google Calendar integration dashboard
- **Analytics**: Usage statistics and revenue reports
- **AI monitoring**: Token usage and cost tracking

### Data Protection & Compliance
- **HIPAA compliance**: Encryption, access controls, audit logging
- **GDPR compliance**: Data export, deletion, consent management
- **PII detection**: Automatic identification and protection of sensitive data
- **SSL/TLS**: Encrypted database connections
- **Data retention**: Automated lifecycle management with configurable policies

### WordPress Integration
- **Booking widget**: Embeddable appointment booking
- **Chatbot plugin**: AI assistant for WordPress sites
- **HubSpot forms**: Contact form integration

---

## 📊 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for state management
- **Radix UI** primitives with **shadcn/ui** components
- **Tailwind CSS** for styling
- **Vite** for building

### Backend
- **Node.js** with **Express.js**
- **TypeScript** with ES modules
- **PostgreSQL** with **Drizzle ORM**
- **WebSocket** support for real-time features
- **Stripe** for payments

### External Services
- **Neon Database**: PostgreSQL hosting
- **SendGrid**: Transactional emails
- **Twilio**: SMS and WhatsApp
- **Daily.co**: Video conferencing
- **OpenAI**: GPT-4o for AI features
- **Google Workspace**: Calendar and Gmail integration
- **Stripe Connect**: Payment processing and payouts

---

## 🚢 Deployment

### GitHub Setup

1. **Create a new repository** in the Hive Wellness GitHub account
2. **Add the remote**:
```bash
git remote add origin https://github.com/hive-wellness/platform.git
```

3. **Push the code**:
```bash
git push -u origin main
```

### Railway Deployment

1. **Create a Railway account** for Hive Wellness
2. **Create a new project** from GitHub repository
3. **Add Neon PostgreSQL** database service
4. **Configure environment variables** in Railway dashboard (all variables from .env)
5. **Deploy**:
   - Railway will automatically detect the Node.js app
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

6. **Set up custom domain**:
   - Add `api.hive-wellness.co.uk` in Railway settings
   - Update DNS records to point to Railway

### Post-Deployment Checklist
- [ ] Verify all environment variables are set
- [ ] Test database connectivity
- [ ] Run database migrations: `npm run db:push --force`
- [ ] Verify SendGrid email sending
- [ ] Test Stripe payment webhooks
- [ ] Check Google Calendar integration
- [ ] Verify Daily.co video sessions
- [ ] Test Twilio SMS functionality
- [ ] Monitor application logs

---

## 📝 Database Management

### Running Migrations
```bash
npm run db:push
```

If you encounter issues:
```bash
npm run db:push --force
```

### Schema Changes
1. Edit `shared/schema.ts`
2. Run `npm run db:push` to sync changes
3. Never manually write SQL migrations - Drizzle handles this

---

## 🔒 Security Best Practices

1. **Never commit secrets**: Use environment variables for all API keys
2. **Keep dependencies updated**: Run `npm audit` regularly
3. **SSL/TLS enabled**: Database connections require valid certificates
4. **PII protection**: All AI calls automatically mask sensitive data
5. **Rate limiting**: IP-based throttling on sensitive endpoints
6. **CSRF protection**: Enabled on all state-changing operations
7. **Session security**: Fresh sessions required for sensitive actions

---

## 🧪 Testing

### Run all tests
```bash
npm test
```

### End-to-end tests
```bash
npx playwright test
```

---

## 📱 WordPress Integration

The `wordpress-chatbot-plugin/` directory contains a ready-to-use WordPress plugin for embedding:
- AI chatbot
- Booking widget
- Contact forms

See `wordpress-chatbot-plugin/INSTALLATION.md` for setup instructions.

---

## 🎨 Brand Guidelines

### Colors
- **Primary Purple**: #9306B1 (rgb(147, 6, 177))
- **Secondary Blue**: #97A5D0
- **Light Backgrounds**: #F2F3FB / #E5E7F5

### Typography
- **Headings**: Palatino Linotype (fallback: Book Antiqua, Palatino, Georgia)
- **Body Text**: Open Sans

### Email Templates
All automated emails follow the brand guidelines with:
- Purple personalized headings
- Light grey rounded content boxes
- "Therapy Tailored to You" footer
- Warm, clear, professional British English tone

---

## 📖 Additional Documentation

- `replit.md` - Comprehensive system architecture and technical decisions
- `docs/GOOGLE_WORKSPACE_SETUP.md` - Google Calendar integration guide
- `wordpress-chatbot-plugin/README.md` - WordPress plugin documentation

---

## 🆘 Support

For technical support or questions:
- **Email**: support@hive-wellness.co.uk
- **Documentation**: Check `replit.md` for detailed technical information
- **Issue Tracker**: Use GitHub Issues for bug reports and feature requests

---

## 📄 License

Proprietary - © 2025 Hive Wellness. All rights reserved.

---

## 🔄 Transfer Checklist

When transferring this project to a new team:

### GitHub Transfer
- [ ] Transfer repository ownership to Hive Wellness GitHub account
- [ ] Update all team member access permissions
- [ ] Enable branch protection on `main` branch
- [ ] Set up GitHub Actions (if needed)

### Railway Transfer
- [ ] Transfer Railway project to Hive Wellness account
- [ ] Update billing information
- [ ] Verify all environment variables are set
- [ ] Test deployment after transfer
- [ ] Update custom domain settings

### External Services
- [ ] Transfer Stripe account ownership
- [ ] Update SendGrid account settings
- [ ] Transfer Twilio account
- [ ] Update Daily.co ownership
- [ ] Transfer Google Workspace integration
- [ ] Update OpenAI API key billing

### Documentation
- [ ] Update all documentation with new contact information
- [ ] Update repository URLs in code
- [ ] Update deployment URLs
- [ ] Archive or remove development-only files

---

**Last Updated**: October 2025
**Status**: Production Ready
**Version**: 1.0.0
