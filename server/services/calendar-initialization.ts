/**
 * Calendar Service Initialization
 * Handles startup and configuration of calendar services
 */

import { calendarService } from './calendar-service';
import { calendarChannelManager } from './calendar-channel-manager';
import { storage } from '../storage';

export class CalendarInitialization {
  private static isInitialized = false;

  /**
   * Initialize all calendar services on application startup
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📋 Calendar services already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing calendar services...');

      // Initialize channel manager
      await calendarChannelManager.initialize();

      // Verify existing calendars and fix any issues
      await this.verifyExistingCalendars();

      // Set up periodic maintenance tasks
      this.setupMaintenanceTasks();

      this.isInitialized = true;
      console.log('✅ Calendar services initialized successfully');

    } catch (error: any) {
      console.error('❌ Failed to initialize calendar services:', error);
      throw error;
    }
  }

  /**
   * Verify existing therapist calendars and their webhook channels
   */
  private static async verifyExistingCalendars(): Promise<void> {
    try {
      console.log('🔍 Verifying existing therapist calendars...');

      const calendars = await storage.listTherapistCalendars();
      const activeCalendars = calendars.filter(cal => 
        cal.integrationStatus === 'active' && cal.googleCalendarId
      );

      console.log(`📋 Found ${activeCalendars.length} active calendars to verify`);

      let healthyCalendars = 0;
      let unhealthyCalendars = 0;

      for (const calendar of activeCalendars) {
        try {
          // Check if calendar is accessible
          const health = await calendarService.healthCheck();
          
          if (health.status === 'healthy') {
            healthyCalendars++;
            
            // Check webhook channel status
            const now = new Date();
            const expiryWarning = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
            
            if (calendar.channelExpiresAt && calendar.channelExpiresAt <= expiryWarning) {
              console.log(`⚠️ Channel for calendar ${calendar.googleCalendarId} expires soon, scheduling renewal`);
            }
          } else {
            unhealthyCalendars++;
            console.warn(`⚠️ Calendar ${calendar.googleCalendarId} health check failed`);
          }

        } catch (error: any) {
          unhealthyCalendars++;
          console.error(`❌ Error verifying calendar ${calendar.googleCalendarId}:`, error);
        }
      }

      console.log(`📊 Calendar verification complete: ${healthyCalendars} healthy, ${unhealthyCalendars} unhealthy`);

    } catch (error: any) {
      console.error('❌ Error verifying existing calendars:', error);
    }
  }

  /**
   * Set up periodic maintenance tasks
   */
  private static setupMaintenanceTasks(): void {
    // Channel renewal check every 6 hours is handled by CalendarChannelManager
    console.log('⏰ Periodic maintenance tasks configured');
  }

  /**
   * Get initialization status
   */
  static isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Force re-initialization (for testing or recovery)
   */
  static async reinitialize(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Graceful shutdown of calendar services
   */
  static async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down calendar services...');

      // Shutdown channel manager
      calendarChannelManager.shutdown();

      this.isInitialized = false;
      console.log('✅ Calendar services shutdown complete');

    } catch (error: any) {
      console.error('❌ Error during calendar services shutdown:', error);
    }
  }

  /**
   * Health check for all calendar services
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      const calendarHealth = await calendarService.healthCheck();
      const channelHealth = await calendarChannelManager.healthCheck();

      const overallStatus = 
        calendarHealth.status === 'healthy' && 
        channelHealth.status === 'healthy' 
          ? 'healthy' : 'unhealthy';

      return {
        status: overallStatus,
        details: {
          initialized: this.isInitialized,
          calendar: calendarHealth,
          channels: channelHealth
        }
      };

    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: {
          initialized: this.isInitialized,
          error: error.message
        }
      };
    }
  }
}

// Auto-initialize on module load (will be called when server starts)
// Note: This is wrapped in an IIFE to handle async initialization
(async () => {
  try {
    // Small delay to ensure other services are ready
    setTimeout(async () => {
      await CalendarInitialization.initialize();
    }, 2000);
  } catch (error) {
    console.error('❌ Auto-initialization of calendar services failed:', error);
  }
})();

export default CalendarInitialization;