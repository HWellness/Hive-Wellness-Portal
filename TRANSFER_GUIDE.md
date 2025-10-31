# Hive Wellness Platform Transfer Guide

This guide provides step-by-step instructions for transferring the Hive Wellness platform to the support team's GitHub and Railway accounts.

---

## Prerequisites

Before starting the transfer, ensure you have:
- [ ] New GitHub account for Hive Wellness Support Team
- [ ] New Railway account for Hive Wellness Support Team
- [ ] Access to all external service accounts (Stripe, SendGrid, Twilio, etc.)
- [ ] Administrative access to current GitHub and Railway deployments

---

## Part 1: GitHub Repository Transfer

### Option A: Transfer Existing Repository (Recommended)

1. **Navigate to Repository Settings**
   - Go to the current repository on GitHub
   - Click **Settings** tab
   - Scroll to bottom → **Danger Zone**

2. **Transfer Repository**
   - Click **Transfer**
   - Enter new owner's GitHub username/organization
   - Confirm transfer

3. **Update Team Access**
   - In new account, add support team members
   - Go to **Settings** → **Collaborators & teams**
   - Add team members with appropriate roles

### Option B: Push to New Repository

1. **Create New Repository**
   - Login to new GitHub account
   - Create new repository: `hive-wellness-platform`
   - **Do NOT** initialize with README

2. **Update Remote on Local Machine**
   ```bash
   # View current remotes
   git remote -v
   
   # Add new remote (or update origin)
   git remote set-url origin https://github.com/NEW-ACCOUNT/hive-wellness-platform.git
   
   # Or add as new remote
   git remote add hive-support https://github.com/NEW-ACCOUNT/hive-wellness-platform.git
   
   # Push to new repository
   git push origin main --force
   ```

3. **Verify Transfer**
   - Check all files are present in new repository
   - Verify all branches transferred
   - Check commit history is intact

### Configure Repository Settings

1. **Branch Protection**
   - Go to **Settings** → **Branches**
   - Add rule for `main` branch
   - Enable:
     - ✅ Require pull request reviews before merging
     - ✅ Require status checks to pass
     - ✅ Do not allow bypassing

2. **Repository Topics** (optional)
   - Add tags: `therapy`, `healthcare`, `typescript`, `react`, `nodejs`

3. **Repository Description**
   - Set to: "Comprehensive therapy platform with therapist matching, scheduling, payments, and video sessions"

---

## Part 2: Railway Deployment Transfer

### Step 1: Prepare New Railway Account

1. **Create Railway Account**
   - Visit https://railway.app
   - Sign up with Hive Wellness Support email
   - Verify email address

2. **Install Railway CLI** (optional but helpful)
   ```bash
   npm install -g @railway/cli
   railway login
   ```

### Step 2: Create New Project

1. **Create Project from GitHub**
   - In Railway dashboard, click **New Project**
   - Select **Deploy from GitHub repo**
   - Authorize GitHub access
   - Select the transferred repository

2. **Or Deploy Manually**
   ```bash
   railway login
   railway init
   railway link [project-id]
   ```

### Step 3: Add Database

1. **Add Neon PostgreSQL**
   - In Railway project, click **+ New**
   - Select **Database** → **PostgreSQL**
   - Railway will create a PostgreSQL instance

2. **Or Connect External Neon Database**
   - Use existing Neon database URL
   - Add as environment variable `DATABASE_URL`

### Step 4: Configure Environment Variables

Add all environment variables from `.env` file:

1. **In Railway Dashboard**
   - Click your service
   - Go to **Variables** tab
   - Click **+ New Variable**
   - Add each variable one by one

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Authentication
SESSION_SECRET=your-session-secret-here-generate-with-openssl
CLIENT_URL=https://api.hive-wellness.co.uk

# Email
SENDGRID_API_KEY=SG.xxxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+44xxxxxxxxxx
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx

# Daily.co
DAILY_API_KEY=your-daily-api-key

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Google Services
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_CALENDAR_ID=your-calendar-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Application URLs
PRODUCTION_URL=https://api.hive-wellness.co.uk
VITE_API_URL=https://api.hive-wellness.co.uk
```

### Step 5: Configure Build Settings

1. **Build Command**
   ```
   npm install && npm run build
   ```

2. **Start Command**
   ```
   npm start
   ```

3. **Watch Paths** (optional)
   - `package.json`
   - `client/**`
   - `server/**`

### Step 6: Set Up Custom Domain

1. **Add Domain in Railway**
   - Go to **Settings** → **Domains**
   - Click **+ Custom Domain**
   - Enter: `api.hive-wellness.co.uk`

2. **Update DNS Records**
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add CNAME record:
     - **Name**: `api`
     - **Value**: `[your-railway-url].railway.app`
     - **TTL**: 3600 (or Auto)

3. **Wait for SSL**
   - Railway automatically provisions SSL certificate
   - Usually takes 5-10 minutes

### Step 7: Deploy & Test

1. **Trigger First Deployment**
   - Push to GitHub or click **Deploy** in Railway
   - Monitor build logs for errors

2. **Run Database Migration**
   - Once deployed, run in Railway console:
   ```bash
   npm run db:push --force
   ```

3. **Test Application**
   - Visit `https://api.hive-wellness.co.uk`
   - Test key features:
     - [ ] Login works
     - [ ] Database connectivity
     - [ ] Email sending
     - [ ] Stripe payments
     - [ ] Video sessions
     - [ ] Calendar integration

---

## Part 3: External Services Transfer

### Stripe Account

1. **Transfer Ownership** (if applicable)
   - Login to Stripe dashboard
   - Go to **Settings** → **Team**
   - Add new owner email
   - Transfer ownership

2. **Or Create New Account**
   - Create new Stripe account
   - Re-configure Stripe Connect
   - Update all connected therapist accounts
   - Update webhook URLs to new domain

### SendGrid Account

1. **Update Contact Information**
   - Login to SendGrid
   - Update account owner details
   - Or create new account and migrate API keys

2. **Update Domain Authentication**
   - Verify `hive-wellness.co.uk` domain
   - Update DNS records if needed

### Twilio Account

1. **Transfer Project**
   - Login to Twilio console
   - Go to project settings
   - Transfer to new account (if supported)

2. **Or Recreate**
   - Create new Twilio account
   - Purchase new number or port existing
   - Update A2P campaign registration
   - Update messaging services

### Daily.co Account

1. **Transfer Video Rooms**
   - Contact Daily.co support for account transfer
   - Or create new account and update API key

### OpenAI Account

1. **Update Billing**
   - Login to OpenAI
   - Update billing information
   - Or create new account with new API key

### Google Workspace

1. **Transfer Calendar Access**
   - In Google Admin console
   - Transfer ownership of service account
   - Or create new service account
   - Update `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`

2. **Update OAuth Consent**
   - Ensure OAuth app is approved for production use
   - Update authorized domains if needed

---

## Part 4: Post-Transfer Verification

### Checklist

#### GitHub
- [ ] Repository transferred and accessible
- [ ] All files present
- [ ] Commit history intact
- [ ] Branch protection enabled
- [ ] Team members have appropriate access

#### Railway
- [ ] Project deployed successfully
- [ ] Custom domain configured and working
- [ ] SSL certificate active
- [ ] All environment variables set
- [ ] Database connected and migrated
- [ ] Application logs show no errors

#### External Services
- [ ] Stripe payments working
- [ ] SendGrid emails sending
- [ ] Twilio SMS/WhatsApp working
- [ ] Daily.co video sessions functional
- [ ] OpenAI API responding
- [ ] Google Calendar syncing

#### Application Features
- [ ] User login works (all roles)
- [ ] Therapist onboarding functional
- [ ] Appointment booking works
- [ ] Payment processing successful
- [ ] Video sessions connect
- [ ] Emails sending correctly
- [ ] SMS notifications working
- [ ] Calendar integration active
- [ ] Admin dashboard accessible
- [ ] AI chatbot responding

---

## Part 5: Cleanup Old Deployment

**⚠️ Only after verifying new deployment works!**

1. **Update DNS**
   - Update all DNS records to point to new Railway deployment
   - Keep old deployment running for 24-48 hours

2. **Monitor Traffic**
   - Check that new deployment is receiving traffic
   - Monitor for any errors or issues

3. **Decommission Old Deployment**
   - After 48 hours of successful operation:
   - Stop old Railway deployment
   - Delete old project (optional)
   - Remove old GitHub repository (optional)

---

## Troubleshooting

### Common Issues

#### Build Failures
```
Error: Module not found
```
**Solution**: Ensure all dependencies in `package.json`, run `npm install`

#### Database Connection Errors
```
Error: Connection refused
```
**Solution**: Verify `DATABASE_URL` is set correctly with SSL mode

#### Email Not Sending
```
Error: SendGrid API error
```
**Solution**: Check `SENDGRID_API_KEY` is valid and not expired

#### Stripe Webhook Failures
```
Error: Webhook signature verification failed
```
**Solution**: Update webhook secret in Stripe dashboard to match new domain

### Getting Help

- **Railway Issues**: Check Railway docs or contact support
- **GitHub Issues**: Use GitHub support
- **Application Issues**: Check application logs in Railway
- **External Service Issues**: Contact respective service providers

---

## Support Contacts

After transfer, update these contacts to new support team:

- **Technical Support**: support@hive-wellness.co.uk
- **Emergency Contact**: [Add emergency contact]
- **Admin Access**: [Add admin credentials storage location]

---

## Timeline Estimate

- **GitHub Transfer**: 30 minutes
- **Railway Setup**: 1-2 hours
- **External Services**: 2-4 hours
- **Testing & Verification**: 2-3 hours
- **Total Estimated Time**: 6-10 hours

---

**Recommended Approach**: Transfer and test in stages over 2-3 days to ensure smooth transition with minimal downtime.

---

**Last Updated**: October 2025
