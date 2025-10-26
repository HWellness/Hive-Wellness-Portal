/**
 * Calendar Channel Manager
 * Manages webhook channel lifecycle, renewal, and monitoring
 */

import { calendarService } from './calendar-service';
import { storage } from '../storage';
import { calendarWebhookHandler } from './calendar-webhook-handler';
import cron from 'node-cron';

export interface ChannelStats {
  totalChannels: number;
  activeChannels: number;
  expiringChannels: number;
  errorChannels: number;
  nextRenewalCheck: Date;
}

export class CalendarChannelManager {
  private isInitialized = false;
  private cronJob: any = null;
  private readonly stats: ChannelStats = {
    totalChannels: 0,
    activeChannels: 0,
    expiringChannels: 0,
    errorChannels: 0,
    nextRenewalCheck: new Date()
  };

  /**
   * Initialize the channel manager with automatic renewal
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📋 CalendarChannelManager already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing CalendarChannelManager...');

      // Initial channel health check
      await this.checkChannelHealth();

      // Set up automatic channel renewal (every 6 hours)
      this.cronJob = cron.schedule('0 */6 * * *', async () => {
        console.log('⏰ Running scheduled channel renewal check...');
        await this.processChannelRenewals();
      });

      // Start the cron job
      this.cronJob.start();

      this.isInitialized = true;
      console.log('✅ CalendarChannelManager initialized successfully');

    } catch (error: any) {
      console.error('❌ Failed to initialize CalendarChannelManager:', error);
      throw error;
    }
  }

  /**
   * Check health of all webhook channels
   */
  async checkChannelHealth(): Promise<ChannelStats> {
    try {
      console.log('🔍 Checking webhook channel health...');
      
      const calendars = await storage.listTherapistCalendars();
      const now = new Date();
      const expiryWarningTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      let totalChannels = 0;
      let activeChannels = 0;
      let expiringChannels = 0;
      let errorChannels = 0;

      for (const calendar of calendars) {
        if (calendar.channelId) {
          totalChannels++;

          if (calendar.integrationStatus === 'error') {
            errorChannels++;
            continue;
          }

          if (calendar.channelExpiresAt) {
            if (calendar.channelExpiresAt > now) {
              activeChannels++;
              
              if (calendar.channelExpiresAt <= expiryWarningTime) {
                expiringChannels++;
              }
            }
          }
        }
      }

      // Update stats
      this.stats.totalChannels = totalChannels;
      this.stats.activeChannels = activeChannels;
      this.stats.expiringChannels = expiringChannels;
      this.stats.errorChannels = errorChannels;
      this.stats.nextRenewalCheck = new Date(now.getTime() + 6 * 60 * 60 * 1000); // Next 6 hours

      console.log('📊 Channel health check complete:', this.stats);
      return { ...this.stats };

    } catch (error: any) {
      console.error('❌ Error checking channel health:', error);
      throw error;
    }
  }

  /**
   * Process channel renewals for expiring channels
   */
  async processChannelRenewals(): Promise<{ renewed: number; failed: number; errors: string[] }> {
    const result = {
      renewed: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get channels expiring in the next 24 hours
      const expiryBuffer = new Date();
      expiryBuffer.setHours(expiryBuffer.getHours() + 24);

      const calendarsToRenew = await storage.getCalendarsNeedingChannelRenewal(expiryBuffer);
      
      if (calendarsToRenew.length === 0) {
        console.log('✅ No channels need renewal at this time');
        return result;
      }

      console.log(`🔄 Processing renewal for ${calendarsToRenew.length} channels...`);

      for (const calendar of calendarsToRenew) {
        if (!calendar.channelId || !calendar.googleCalendarId) {
          continue;
        }

        try {
          console.log(`🔄 Renewing channel for therapist ${calendar.therapistId} (${calendar.googleCalendarId})`);
          
          const newChannel = await calendarService.renewChannel(calendar.channelId);
          
          result.renewed++;
          console.log(`✅ Successfully renewed channel: ${calendar.channelId} -> ${newChannel.id}`);

        } catch (error: any) {
          result.failed++;
          const errorMsg = `Failed to renew channel ${calendar.channelId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);

          // Mark calendar as having errors
          try {
            await storage.updateTherapistCalendar(calendar.id, {
              integrationStatus: 'error'
            });
          } catch (updateError) {
            console.error('❌ Failed to update calendar status:', updateError);
          }
        }
      }

      console.log(`📊 Channel renewal complete: ${result.renewed} renewed, ${result.failed} failed`);
      return result;

    } catch (error: any) {
      console.error('❌ Error processing channel renewals:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Setup webhook channel for a new therapist calendar
   */
  async setupChannelForCalendar(calendarId: string, therapistId: string): Promise<boolean> {
    try {
      console.log(`📋 Setting up webhook channel for calendar ${calendarId}`);

      // Create webhook channel
      const channel = await calendarService.watchCalendar(calendarId);

      // Get calendar record
      const calendar = await storage.getTherapistCalendar(therapistId);
      if (!calendar) {
        throw new Error(`Calendar not found for therapist ${therapistId}`);
      }

      // Update database with channel info
      await storage.updateWebhookChannel(calendar.id, {
        channelId: channel.id,
        channelResourceId: channel.resourceId,
        channelExpiresAt: channel.expiration
      });

      console.log(`✅ Webhook channel setup complete for calendar ${calendarId}: ${channel.id}`);
      return true;

    } catch (error: any) {
      console.error(`❌ Failed to setup webhook channel for calendar ${calendarId}:`, error);
      return false;
    }
  }

  /**
   * Remove webhook channel for a calendar
   */
  async removeChannelForCalendar(calendarId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Removing webhook channel for calendar ${calendarId}`);

      // Find calendar record
      const calendars = await storage.listTherapistCalendars();
      const calendar = calendars.find(cal => cal.googleCalendarId === calendarId);

      if (!calendar || !calendar.channelId) {
        console.log(`⚠️ No active channel found for calendar ${calendarId}`);
        return true;
      }

      // Stop the webhook channel
      await calendarService.stopWatch(calendar.channelId);

      // Clear channel info from database
      await storage.updateWebhookChannel(calendar.id, {
        channelId: '',
        channelResourceId: '',
        channelExpiresAt: new Date(0) // Set to epoch
      });

      console.log(`✅ Webhook channel removed for calendar ${calendarId}`);
      return true;

    } catch (error: any) {
      console.error(`❌ Failed to remove webhook channel for calendar ${calendarId}:`, error);
      return false;
    }
  }

  /**
   * Recreate all webhook channels (admin operation)
   */
  async recreateAllChannels(): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      console.log('🔄 Recreating all webhook channels...');

      const calendars = await storage.listTherapistCalendars();
      const activeCalendars = calendars.filter(cal => 
        cal.integrationStatus === 'active' && cal.googleCalendarId
      );

      console.log(`📋 Found ${activeCalendars.length} active calendars to recreate channels for`);

      for (const calendar of activeCalendars) {
        try {
          // Stop existing channel if it exists
          if (calendar.channelId) {
            try {
              await calendarService.stopWatch(calendar.channelId);
            } catch (stopError) {
              console.warn(`⚠️ Could not stop existing channel ${calendar.channelId}:`, stopError);
            }
          }

          // Create new channel
          const success = await this.setupChannelForCalendar(
            calendar.googleCalendarId!,
            calendar.therapistId
          );

          if (success) {
            result.success++;
          } else {
            result.failed++;
            result.errors.push(`Failed to setup channel for ${calendar.googleCalendarId}`);
          }

        } catch (error: any) {
          result.failed++;
          const errorMsg = `Error recreating channel for ${calendar.googleCalendarId}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`📊 Channel recreation complete: ${result.success} success, ${result.failed} failed`);
      return result;

    } catch (error: any) {
      console.error('❌ Error recreating all channels:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Get current channel statistics
   */
  async getStats(): Promise<ChannelStats> {
    await this.checkChannelHealth();
    return { ...this.stats };
  }

  /**
   * Manual trigger for channel renewal check
   */
  async triggerRenewalCheck(): Promise<void> {
    console.log('🔄 Manually triggering channel renewal check...');
    await this.processChannelRenewals();
  }

  /**
   * Shutdown the channel manager
   */
  shutdown(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
    }
    this.isInitialized = false;
    console.log('📋 CalendarChannelManager shutdown complete');
  }

  /**
   * Health check for the channel manager
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const stats = await this.getStats();
      const isHealthy = stats.errorChannels < stats.totalChannels * 0.1; // Less than 10% error rate

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          initialized: this.isInitialized,
          cronRunning: this.cronJob?.running || false,
          stats
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          initialized: this.isInitialized
        }
      };
    }
  }
}

// Singleton instance
export const calendarChannelManager = new CalendarChannelManager();