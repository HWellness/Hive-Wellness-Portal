import express from 'express';
import { db } from '../db.js';
import { notificationTemplates, notifications, userCommunicationPreferences } from '../../shared/schema.js';
import { eq, desc, and, count } from 'drizzle-orm';
import { twilioService } from '../services/twilio-service.js';
import { twilioWorkflowIntegration } from '../twilio-workflow-integration.js';
import { nanoid } from 'nanoid';

const router = express.Router();

/**
 * Admin Routes for Twilio SMS/WhatsApp Template Management
 * RBAC: Admin-only access required for all routes
 */

// Middleware to ensure admin access
const requireAdmin = (req: any, res: any, next: any) => {
  const user = (req.session as any)?.emailAuthUser || (req.session as any)?.user;
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Get all notification templates with usage statistics
router.get('/templates', requireAdmin, async (req, res) => {
  try {
    const { channel, type, active } = req.query;
    
    let whereConditions = [];
    if (channel) whereConditions.push(eq(notificationTemplates.channel, channel as string));
    if (type) whereConditions.push(eq(notificationTemplates.type, type as string));
    if (active !== undefined) whereConditions.push(eq(notificationTemplates.isActive, active === 'true'));
    
    const templates = await db.select().from(notificationTemplates)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(notificationTemplates.updatedAt));

    // Get usage statistics for each template
    const templatesWithStats = await Promise.all(templates.map(async (template) => {
      const [usageCount] = await db.select({ count: count() })
        .from(notifications)
        .where(eq(notifications.templateId, template.id));

      return {
        ...template,
        usageCount: usageCount.count || 0,
      };
    }));

    res.json({
      success: true,
      templates: templatesWithStats,
      totalCount: templates.length,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch templates' 
    });
  }
});

// Create new notification template
router.post('/templates', requireAdmin, async (req, res) => {
  try {
    const { name, channel, type, subject, body, placeholders, isActive } = req.body;
    const user = (req.session as any)?.emailAuthUser || (req.session as any)?.user;

    if (!name || !channel || !type || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, channel, type, body'
      });
    }

    // Validate channel and type
    const validChannels = ['email', 'sms', 'whatsapp', 'push'];
    const validTypes = ['appointment_confirmation', 'appointment_reminder', 'session_followup', 'welcome', 'therapist_connection', 'payment_confirmation', 'custom'];
    
    if (!validChannels.includes(channel)) {
      return res.status(400).json({
        success: false,
        error: `Invalid channel. Must be one of: ${validChannels.join(', ')}`
      });
    }
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Check for duplicate name and channel combination
    const existing = await db.select().from(notificationTemplates)
      .where(and(
        eq(notificationTemplates.name, name),
        eq(notificationTemplates.channel, channel)
      ));

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Template with this name and channel already exists'
      });
    }

    // GDPR compliance check for SMS/WhatsApp
    if ((channel === 'sms' || channel === 'whatsapp') && !body.toLowerCase().includes('stop')) {
      return res.status(400).json({
        success: false,
        error: 'SMS and WhatsApp templates must include opt-out instructions (e.g., "Reply STOP to opt out")'
      });
    }

    const template = await db.insert(notificationTemplates).values({
      id: nanoid(),
      name,
      channel,
      type,
      subject: subject || null,
      body,
      placeholders: placeholders || [],
      isActive: isActive !== false,
      lastUpdatedBy: user.id,
      usage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.json({
      success: true,
      template: template[0],
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create template' 
    });
  }
});

// Update existing template
router.put('/templates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, channel, type, subject, body, placeholders, isActive } = req.body;
    const user = (req.session as any)?.emailAuthUser || (req.session as any)?.user;

    // Check if template exists
    const existing = await db.select().from(notificationTemplates)
      .where(eq(notificationTemplates.id, id));

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // GDPR compliance check
    if (body && (channel === 'sms' || channel === 'whatsapp') && !body.toLowerCase().includes('stop')) {
      return res.status(400).json({
        success: false,
        error: 'SMS and WhatsApp templates must include opt-out instructions'
      });
    }

    const [updated] = await db.update(notificationTemplates)
      .set({
        name: name || existing[0].name,
        channel: channel || existing[0].channel,
        type: type || existing[0].type,
        subject: subject !== undefined ? subject : existing[0].subject,
        body: body || existing[0].body,
        placeholders: placeholders || existing[0].placeholders,
        isActive: isActive !== undefined ? isActive : existing[0].isActive,
        lastUpdatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(notificationTemplates.id, id))
      .returning();

    res.json({
      success: true,
      template: updated,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update template' 
    });
  }
});

// Delete template
router.delete('/templates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if template is in use
    const usageCheck = await db.select({ count: count() })
      .from(notifications)
      .where(eq(notifications.templateId, id));

    if (usageCheck[0]?.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete template that has been used in notifications. Consider deactivating instead.'
      });
    }

    await db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete template' 
    });
  }
});

// Test template with sample data
router.post('/templates/:id/test', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { testPhoneNumber, sampleData } = req.body;

    if (!testPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Test phone number is required'
      });
    }

    // Get template
    const template = await db.select().from(notificationTemplates)
      .where(eq(notificationTemplates.id, id));

    if (template.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const templateData = template[0];

    // Apply sample data to template
    let testMessage = templateData.body;
    const defaultSampleData = {
      client_name: 'John Doe',
      therapist_name: 'Dr. Sarah Smith',
      appointment_date: 'Monday, 23 September 2025',
      appointment_time: '14:30',
      meeting_link: 'https://meet.google.com/sample-link',
      portal_link: 'https://hive-wellness.co.uk/portal',
      amount: '80.00',
      receipt_url: 'https://hive-wellness.co.uk/receipt/sample',
      settings_link: 'https://hive-wellness.co.uk/settings',
    };

    const mergedData = { ...defaultSampleData, ...sampleData };

    // Replace placeholders
    for (const [key, value] of Object.entries(mergedData)) {
      testMessage = testMessage.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }

    // Add test message identifier
    testMessage = `[TEST MESSAGE] ${testMessage}`;

    // Send test message
    if (templateData.channel === 'sms' || templateData.channel === 'whatsapp') {
      const result = await twilioService.sendMessage({
        to: testPhoneNumber,
        body: testMessage,
        channel: templateData.channel,
        userId: 'admin-test',
      });

      res.json({
        success: result.success,
        message: result.success ? 'Test message sent successfully' : 'Failed to send test message',
        messageSid: result.messageSid,
        error: result.error,
        testData: {
          originalTemplate: templateData.body,
          processedMessage: testMessage,
          sampleDataUsed: mergedData,
        },
      });
    } else {
      res.json({
        success: false,
        error: 'Test sending only supported for SMS and WhatsApp templates',
      });
    }
  } catch (error) {
    console.error('Error testing template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test template' 
    });
  }
});

// Get notification statistics and delivery reports
router.get('/notifications/stats', requireAdmin, async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = new Date();
    
    switch (period) {
      case '24h':
        dateFilter.setDate(dateFilter.getDate() - 1);
        break;
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    // Get delivery statistics
    const stats = await db.select({
      channel: notifications.channel,
      status: notifications.status,
      count: count(),
    })
    .from(notifications)
    .where(and(
      desc(notifications.createdAt), // Recent notifications
    ))
    .groupBy(notifications.channel, notifications.status);

    // Get recent failed notifications for admin review
    const failedNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.status, 'failed'))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    res.json({
      success: true,
      stats,
      failedNotifications,
      period: period || '7d',
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

// Bulk send appointment reminders (manual trigger)
router.post('/notifications/bulk-reminders', requireAdmin, async (req, res) => {
  try {
    const result = await twilioWorkflowIntegration.sendBulkAppointmentReminders();

    res.json({
      success: result.success,
      message: `Bulk reminder process completed. ${result.processed} appointments processed.`,
      processed: result.processed,
      results: result.results,
    });
  } catch (error) {
    console.error('Error sending bulk reminders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send bulk reminders' 
    });
  }
});

// Get Twilio service status and configuration
router.get('/twilio/status', requireAdmin, async (req, res) => {
  try {
    const isInitialized = twilioService.isInitialized();
    
    const config = {
      initialized: isInitialized,
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Missing',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'Configured' : 'Missing',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Using SMS number fallback',
      webhookUrl: `${process.env.BASE_URL || 'Not configured'}/api/twilio/webhook`,
    };

    res.json({
      success: true,
      config,
      message: isInitialized ? 'Twilio service is operational' : 'Twilio service not initialized'
    });
  } catch (error) {
    console.error('Error checking Twilio status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check Twilio status' 
    });
  }
});

export default router;