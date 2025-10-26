-- Add email_mfa_verified column to users table for multi-method MFA support
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_mfa_verified boolean DEFAULT false;