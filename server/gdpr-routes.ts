import { Express } from 'express';
import { gdprService } from './gdpr-service.js';
import { dataRequests } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { createReadStream } from 'fs';
import { logger } from './lib/logger';
import { consentService, type ConsentPreferences } from './services/consent-service.js';
import { z } from 'zod';

// Gmail service for sending emails
let gmailService: any;
async function ensureGmailService() {
  if (!gmailService) {
    const gmailServiceModule = await import('./gmail-service.js');
    gmailService = gmailServiceModule.gmailService;
  }
  return gmailService;
}

export function registerGDPRRoutes(app: Express, getUserInfo: Function, isAuthenticated: Function, sanitizeInput: Function) {
  
  // ========== User Data Export ==========
  
  // Request data export
  app.post('/api/user/export-data', sanitizeInput, isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      logger.info('User requested data export', { userId: userInfo.id });

      // Process export asynchronously
      const requestId = await gdprService.exportUserData(userInfo.id);

      // Send email notification
      try {
        const gmail = await ensureGmailService();
        const emailBody = `
          <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #9306B1;">Your Data Export is Ready</h2>
            <p>Your personal data export has been prepared and is ready for download.</p>
            <p>You can download your data using the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.VITE_REPLIT_DEV_DOMAIN || 'https://your-domain.com'}/api/user/download-export/${requestId}" 
                 style="background-color: #9306B1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Download My Data
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This link will expire in 7 days for security purposes.</p>
            <p>Best regards,<br>Hive Wellness Team</p>
          </div>
        `;
        
        await gmail.sendEmail(userInfo.email, 'Your Data Export is Ready', emailBody);
      } catch (emailError) {
        logger.error('Failed to send export notification email', { userId: userInfo.id, error: emailError });
      }

      res.json({
        success: true,
        message: "Your data export has been prepared. You will receive an email when it's ready for download.",
        requestId
      });
    } catch (error) {
      logger.error('Error processing data export request', { error });
      res.status(500).json({ 
        message: "Failed to process data export request",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Download data export
  app.get('/api/user/download-export/:requestId', isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { requestId } = req.params;

      // Verify request belongs to user
      const request = await db
        .select()
        .from(dataRequests)
        .where(eq(dataRequests.id, requestId))
        .then(r => r[0]);

      if (!request) {
        return res.status(404).json({ message: "Export request not found" });
      }

      if (request.userId !== userInfo.id) {
        logger.warn('Unauthorized export download attempt', { 
          userId: userInfo.id, 
          requestId, 
          requestUserId: request.userId 
        });
        return res.status(403).json({ message: "Access denied" });
      }

      if (request.requestType !== 'export') {
        return res.status(400).json({ message: "Invalid request type" });
      }

      if (request.status !== 'completed') {
        return res.status(400).json({ message: "Export not ready yet" });
      }

      const filePath = await gdprService.getExportFilePath(requestId);
      if (!filePath) {
        return res.status(404).json({ message: "Export file not found or expired" });
      }

      logger.info('User downloading data export', { userId: userInfo.id, requestId });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="my-data-${requestId}.json"`);
      
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('Error downloading export', { error });
      res.status(500).json({ 
        message: "Failed to download export",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Account Deletion ==========

  // Request account deletion
  app.post('/api/user/request-deletion', sanitizeInput, isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      logger.info('User requested account deletion', { userId: userInfo.id });

      const { requestId, cancellationToken } = await gdprService.requestDeletion(userInfo.id);

      // Send confirmation email
      try {
        const gmail = await ensureGmailService();
        const cancellationLink = `${process.env.VITE_REPLIT_DEV_DOMAIN || 'https://your-domain.com'}/cancel-deletion/${requestId}/${cancellationToken}`;
        
        const emailBody = `
          <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #9306B1;">Account Deletion Request Received</h2>
            <p>We have received your request to delete your Hive Wellness account.</p>
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">⚠️ Your account will be permanently deleted in <strong>30 days</strong>.</p>
            </div>
            <p>If you change your mind, you can cancel this deletion request using the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${cancellationLink}" 
                 style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Cancel Deletion
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">After 30 days, all your data will be permanently deleted and cannot be recovered.</p>
            <p>Best regards,<br>Hive Wellness Team</p>
          </div>
        `;
        
        await gmail.sendEmail(userInfo.email, 'Account Deletion Request Received', emailBody);
      } catch (emailError) {
        logger.error('Failed to send deletion confirmation email', { userId: userInfo.id, error: emailError });
      }

      res.json({
        success: true,
        message: "Your account deletion has been scheduled. You will receive a confirmation email.",
        requestId,
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      logger.error('Error processing deletion request', { error });
      res.status(500).json({ 
        message: "Failed to process deletion request",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Cancel account deletion
  app.post('/api/user/cancel-deletion/:requestId/:cancellationToken', sanitizeInput, async (req, res) => {
    try {
      const { requestId, cancellationToken } = req.params;

      logger.info('Processing deletion cancellation request', { requestId });

      const success = await gdprService.cancelDeletion(requestId, cancellationToken);

      if (!success) {
        return res.status(400).json({ 
          message: "Invalid cancellation request or deletion already processed" 
        });
      }

      // Get user info for email
      const request = await db
        .select()
        .from(dataRequests)
        .where(eq(dataRequests.id, requestId))
        .then(r => r[0]);

      if (request) {
        try {
          const { users } = await import('@shared/schema');
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, request.userId))
            .then(r => r[0]);

          if (user && user.email) {
            const gmail = await ensureGmailService();
            const emailBody = `
              <div style="font-family: 'Open Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #9306B1;">Account Deletion Cancelled</h2>
                <p>Your account deletion request has been successfully cancelled.</p>
                <div style="background-color: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #155724;">✓ Your account will remain active and no data will be deleted.</p>
                </div>
                <p>Best regards,<br>Hive Wellness Team</p>
              </div>
            `;
            
            await gmail.sendEmail(user.email, 'Account Deletion Cancelled', emailBody);
          }
        } catch (emailError) {
          logger.error('Failed to send cancellation confirmation email', { requestId, error: emailError });
        }
      }

      res.json({
        success: true,
        message: "Account deletion has been cancelled successfully"
      });
    } catch (error) {
      logger.error('Error cancelling deletion', { error });
      res.status(500).json({ 
        message: "Failed to cancel deletion",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== Admin Endpoints ==========

  // Get all data requests (admin only)
  app.get('/api/admin/data-requests', sanitizeInput, isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo || userInfo.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { type, status } = req.query;

      let query = db.select().from(dataRequests);

      // Fetch all requests and filter in memory for simplicity
      const allRequests = await query;
      
      let filteredRequests = allRequests;
      if (type) filteredRequests = filteredRequests.filter(r => r.requestType === type);
      if (status) filteredRequests = filteredRequests.filter(r => r.status === status);

      res.json({
        count: filteredRequests.length,
        requests: filteredRequests
      });
    } catch (error) {
      logger.error('Error fetching data requests', { error });
      res.status(500).json({ 
        message: "Failed to fetch data requests",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== GDPR Consent Management (Article 7) ==========

  // Consent update schema
  const updateConsentSchema = z.object({
    consents: z.object({
      essential: z.boolean().optional(),
      functional: z.boolean().optional(),
      analytics: z.boolean().optional(),
      marketing: z.boolean().optional(),
      medical_data_processing: z.boolean().optional(),
    })
  });

  // Get current user consent status
  app.get('/api/user/consent', sanitizeInput, isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const consents = await consentService.getUserConsents(userInfo.id);
      const hasResponded = await consentService.hasUserResponded(userInfo.id);
      
      res.json({
        success: true,
        consents,
        hasResponded
      });
    } catch (error) {
      logger.error('Error fetching user consents', { error });
      res.status(500).json({ 
        message: "Failed to fetch consent preferences",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Update user consent preferences
  app.post('/api/user/consent', sanitizeInput, isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validation = updateConsentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid consent data",
          errors: validation.error.errors
        });
      }

      const { consents } = validation.data;

      // Get context from request
      const context = {
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        triggeredBy: 'user',
        metadata: {
          timestamp: new Date().toISOString(),
          requestPath: req.path,
        }
      };

      await consentService.updateUserConsents(userInfo.id, consents as Partial<ConsentPreferences>, context);

      const updatedConsents = await consentService.getUserConsents(userInfo.id);

      logger.info('User consents updated', { userId: userInfo.id });

      res.json({
        success: true,
        message: "Consent preferences updated successfully",
        consents: updatedConsents
      });
    } catch (error) {
      logger.error('Error updating user consents', { error });
      res.status(500).json({ 
        message: "Failed to update consent preferences",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get consent history (audit trail)
  app.get('/api/user/consent/history', sanitizeInput, isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const history = await consentService.getConsentHistory(userInfo.id);

      res.json({
        success: true,
        history
      });
    } catch (error) {
      logger.error('Error fetching consent history', { error });
      res.status(500).json({ 
        message: "Failed to fetch consent history",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin: Get consent statistics
  app.get('/api/admin/consent/statistics', sanitizeInput, isAuthenticated, async (req: any, res) => {
    try {
      const userInfo = getUserInfo(req);
      if (!userInfo || userInfo.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const statistics = await consentService.getConsentStatistics();

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      logger.error('Error fetching consent statistics', { error });
      res.status(500).json({ 
        message: "Failed to fetch consent statistics",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  logger.info('GDPR routes registered successfully');
}
