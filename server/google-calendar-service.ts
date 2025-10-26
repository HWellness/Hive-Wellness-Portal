import { google } from 'googleapis';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { therapistProfiles, users } from '../shared/schema';

interface TherapistCalendarInfo {
  calendarId: string;
  workspaceEmail: string;
  isConfigured: boolean;
  therapistId: string;
  therapistName: string;
}

interface CalendarOperationContext {
  therapistId?: string;
  therapistCalendarId?: string;
  useAdminCalendar?: boolean;
}

export class GoogleCalendarService {
  private calendar: any;
  // Default admin calendar for system-wide events and fallbacks
  private readonly adminCalendarId = 'support@hive-wellness.co.uk';
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second
  
  // Ready state management for initialization
  private isReady: boolean = false;
  private readyPromise: Promise<void> | null = null;
  
  // Cache therapist calendar information to reduce database calls
  private therapistCalendarCache = new Map<string, TherapistCalendarInfo>();
  private cacheExpiry = new Map<string, number>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('🚀 GoogleCalendarService constructor called (Multi-Therapist Architecture)');
    // Don't await initialization in constructor - use ensureReady() instead
    this.initializeCalendar().catch(error => {
      console.error('❌ Calendar initialization failed in constructor:', error);
    });
  }

  private async initializeCalendar() {
    try {
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        
        const auth = new google.auth.JWT({
          email: serviceAccountKey.client_email,
          key: serviceAccountKey.private_key,
          scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
          ],
          // Enable domain-wide delegation to impersonate support@hive-wellness.co.uk
          subject: 'support@hive-wellness.co.uk'
        });

        this.calendar = google.calendar({ version: 'v3', auth });
        console.log('✅ Google Calendar service initialized successfully');
        
        // Mark as ready immediately after auth setup to prevent timeouts
        this.isReady = true;
        console.log('✅ GoogleCalendarService is now ready');
        
        // Run calendar access tests asynchronously without blocking initialization
        this.testCalendarAccess().catch(error => {
          console.warn('⚠️ Calendar access test failed but service is ready:', error?.message || error);
        });
        
      } else {
        console.log('⚠️ Google Calendar service not initialized - no service account key found');
        // Still mark as ready even without service account - fallback behavior
        this.isReady = true;
      }
    } catch (error) {
      console.error('❌ Error initializing Google Calendar service:', error);
      // Mark as ready even with errors to prevent hanging
      this.isReady = true;
    }
  }

  private async testCalendarAccess() {
    try {
      const response = await this.calendar.calendars.get({
        calendarId: this.adminCalendarId
      });
      console.log('✅ Admin calendar access verified:', response.data.summary);
      
      // Test therapist calendar resolution
      await this.testTherapistCalendarAccess();
      
      // Disabled automatic test event creation to allow proper counter testing
      // await this.createTestBlockingEvent();
    } catch (error: any) {
      console.error('❌ Admin calendar access test failed:', error?.message || error);
      console.error('Admin Calendar ID being used:', this.adminCalendarId);
    }
  }

  private async testTherapistCalendarAccess() {
    try {
      console.log('🔍 Testing therapist calendar access...');
      
      // Get first active therapist for testing
      const therapists = await db.select({
        userId: therapistProfiles.userId,
        googleCalendarId: therapistProfiles.googleCalendarId,
        googleWorkspaceEmail: therapistProfiles.googleWorkspaceEmail,
        calendarPermissionsConfigured: therapistProfiles.calendarPermissionsConfigured
      })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id))
      .where(eq(users.isActive, true))
      .limit(3);

      if (therapists.length === 0) {
        console.log('ℹ️ No active therapists found for calendar testing');
        return;
      }

      console.log(`📊 Found ${therapists.length} active therapists for testing`);
      
      for (const therapist of therapists) {
        if (therapist.userId) {
          const calendarId = await this.getTherapistCalendarId(therapist.userId);
          console.log(`🔍 Therapist ${therapist.userId}: Calendar ID resolved to ${calendarId}`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Therapist calendar testing failed:', error?.message || error);
    }
  }

  /**
   * Ensure the calendar service is ready before performing operations
   * Now includes timeout handling to prevent indefinite hangs
   */
  private async ensureReady(): Promise<void> {
    if (this.isReady) return;
    
    if (!this.readyPromise) {
      // Add timeout wrapper around initialization
      const initPromise = this.initializeCalendar();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Google Calendar initialization timeout')), 5000); // 5 second timeout (reduced from 10)
      });

      this.readyPromise = Promise.race([initPromise, timeoutPromise])
        .catch(error => {
          console.error('❌ Calendar initialization failed or timed out:', error);
          // Mark as ready even on failure to prevent indefinite blocking
          this.isReady = true;
          // Reset promise so future attempts can retry
          this.readyPromise = null;
          throw error;
        });
    }
    
    return this.readyPromise;
  }

  // ============================================================================
  // THERAPIST CALENDAR RESOLUTION METHODS
  // ============================================================================

  /**
   * Get the calendar ID for a specific therapist, with caching and fallbacks
   */
  async getTherapistCalendarId(therapistId: string): Promise<string> {
    await this.ensureReady();
    try {
      // Check cache first
      const cached = this.getFromCache(therapistId);
      if (cached) {
        return cached.calendarId;
      }

      // Query database for therapist calendar info
      const therapistCalendarInfo = await this.getTherapistCalendarInfo(therapistId);
      
      if (therapistCalendarInfo.isConfigured && therapistCalendarInfo.calendarId !== this.adminCalendarId) {
        return therapistCalendarInfo.calendarId;
      }

      // Fallback to admin calendar if therapist calendar not configured
      console.log(`⚠️ Therapist ${therapistId} calendar not configured, using admin calendar fallback`);
      return this.adminCalendarId;
      
    } catch (error: any) {
      console.error(`❌ Error resolving calendar for therapist ${therapistId}:`, error?.message || error);
      // Always fallback to admin calendar for reliability
      return this.adminCalendarId;
    }
  }

  /**
   * Get comprehensive calendar information for a therapist with caching
   */
  async getTherapistCalendarInfo(therapistId: string): Promise<TherapistCalendarInfo> {
    await this.ensureReady();
    try {
      // Check cache first
      const cached = this.getFromCache(therapistId);
      if (cached) {
        return cached;
      }

      // Query database for therapist profile
      const therapistData = await db.select({
        userId: therapistProfiles.userId,
        googleCalendarId: therapistProfiles.googleCalendarId,
        googleWorkspaceEmail: therapistProfiles.googleWorkspaceEmail,
        calendarPermissionsConfigured: therapistProfiles.calendarPermissionsConfigured,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id))
      .where(eq(therapistProfiles.userId, therapistId))
      .limit(1);

      if (therapistData.length === 0) {
        throw new Error(`Therapist ${therapistId} not found in database`);
      }

      const therapist = therapistData[0];
      
      // Determine calendar ID to use
      let calendarId = this.adminCalendarId; // Default fallback
      let isConfigured = false;

      if (therapist.googleCalendarId && therapist.calendarPermissionsConfigured) {
        calendarId = therapist.googleCalendarId;
        isConfigured = true;
      } else if (therapist.googleWorkspaceEmail) {
        // Use workspace email as calendar ID if available
        calendarId = therapist.googleWorkspaceEmail;
        isConfigured = Boolean(therapist.calendarPermissionsConfigured);
      }

      const calendarInfo: TherapistCalendarInfo = {
        calendarId,
        workspaceEmail: therapist.googleWorkspaceEmail || '',
        isConfigured,
        therapistId: therapist.userId || therapistId,
        therapistName: `${therapist.firstName || ''} ${therapist.lastName || ''}`.trim()
      };

      // Cache the result
      this.setCache(therapistId, calendarInfo);
      
      return calendarInfo;
      
    } catch (error: any) {
      console.error(`❌ Error getting calendar info for therapist ${therapistId}:`, error?.message || error);
      
      // Return fallback info using admin calendar
      return {
        calendarId: this.adminCalendarId,
        workspaceEmail: '',
        isConfigured: false,
        therapistId,
        therapistName: 'Unknown Therapist'
      };
    }
  }

  /**
   * Validate that we can access a therapist's calendar
   */
  async validateTherapistCalendarAccess(therapistId: string): Promise<boolean> {
    await this.ensureReady();
    try {
      const calendarId = await this.getTherapistCalendarId(therapistId);
      
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, cannot validate access');
        return false;
      }

      // Try to get calendar info to verify access
      await this.calendar.calendars.get({ calendarId });
      
      console.log(`✅ Calendar access validated for therapist ${therapistId} (${calendarId})`);
      return true;
      
    } catch (error: any) {
      console.error(`❌ Calendar access validation failed for therapist ${therapistId}:`, error?.message || error);
      return false;
    }
  }

  /**
   * Get all therapist calendars configured in the system
   */
  async listTherapistCalendars(): Promise<TherapistCalendarInfo[]> {
    try {
      const therapists = await db.select({
        userId: therapistProfiles.userId,
        googleCalendarId: therapistProfiles.googleCalendarId,
        googleWorkspaceEmail: therapistProfiles.googleWorkspaceEmail,
        calendarPermissionsConfigured: therapistProfiles.calendarPermissionsConfigured,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(therapistProfiles)
      .innerJoin(users, eq(therapistProfiles.userId, users.id))
      .where(eq(users.isActive, true));

      const calendarInfos: TherapistCalendarInfo[] = [];

      for (const therapist of therapists) {
        let calendarId = this.adminCalendarId;
        let isConfigured = false;

        if (therapist.googleCalendarId && therapist.calendarPermissionsConfigured) {
          calendarId = therapist.googleCalendarId;
          isConfigured = true;
        } else if (therapist.googleWorkspaceEmail) {
          calendarId = therapist.googleWorkspaceEmail;
          isConfigured = Boolean(therapist.calendarPermissionsConfigured);
        }

        const calendarInfo: TherapistCalendarInfo = {
          calendarId,
          workspaceEmail: therapist.googleWorkspaceEmail || '',
          isConfigured,
          therapistId: therapist.userId || '',
          therapistName: `${therapist.firstName || ''} ${therapist.lastName || ''}`.trim()
        };

        calendarInfos.push(calendarInfo);
      }

      console.log(`📊 Found ${calendarInfos.length} therapist calendars`);
      return calendarInfos;
      
    } catch (error: any) {
      console.error('❌ Error listing therapist calendars:', error?.message || error);
      return [];
    }
  }

  /**
   * Get therapist-specific busy times for conflict checking
   * CRITICAL: This method provides the core functionality for preventing double-bookings
   */
  async getTherapistBusyTimes(
    therapistId: string, 
    timeRange: { startTime: Date; endTime: Date }
  ): Promise<{ start: Date; end: Date; summary?: string }[]> {
    await this.ensureReady();
    try {
      console.log(`🔍 Getting busy times for therapist ${therapistId}: ${timeRange.startTime.toISOString()} - ${timeRange.endTime.toISOString()}`);
      
      const calendarId = await this.getTherapistCalendarId(therapistId);
      
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, falling back to database only');
        return [];
      }

      // Get events from therapist's specific calendar
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeRange.startTime.toISOString(),
        timeMax: timeRange.endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        showDeleted: false
      });

      const events = response.data.items || [];
      const busyTimes: { start: Date; end: Date; summary?: string }[] = [];

      for (const event of events) {
        // Skip transparent/available events
        if (event.transparency === 'transparent') {
          continue;
        }
        
        // Skip declined events
        if (event.status === 'cancelled') {
          continue;
        }
        
        // Handle both all-day and timed events
        let startTime: Date;
        let endTime: Date;
        
        if (event.start?.dateTime) {
          startTime = new Date(event.start.dateTime);
        } else if (event.start?.date) {
          // All-day event - consider it busy for the entire day
          startTime = new Date(event.start.date + 'T00:00:00.000Z');
        } else {
          continue; // Skip events without valid start time
        }
        
        if (event.end?.dateTime) {
          endTime = new Date(event.end.dateTime);
        } else if (event.end?.date) {
          // All-day event - ends at midnight of the end date
          endTime = new Date(event.end.date + 'T23:59:59.999Z');
        } else {
          // Default to 1 hour if no end time
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        }
        
        busyTimes.push({
          start: startTime,
          end: endTime,
          summary: event.summary || 'Busy'
        });
      }
      
      console.log(`📅 Found ${busyTimes.length} busy times for therapist ${therapistId}:`, 
        busyTimes.map(bt => ({
          start: bt.start.toISOString(),
          end: bt.end.toISOString(),
          summary: bt.summary
        }))
      );
      
      return busyTimes;
      
    } catch (error: any) {
      console.error(`❌ Error getting busy times for therapist ${therapistId}:`, error?.message || error);
      
      // Don't throw error - return empty array to allow fallback to database checks
      return [];
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT METHODS  
  // ============================================================================

  /**
   * Get cached therapist calendar info if valid
   */
  private getFromCache(therapistId: string): TherapistCalendarInfo | null {
    const cached = this.therapistCalendarCache.get(therapistId);
    const expiry = this.cacheExpiry.get(therapistId);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clean up expired cache entries
    if (cached) {
      this.therapistCalendarCache.delete(therapistId);
      this.cacheExpiry.delete(therapistId);
    }
    
    return null;
  }

  /**
   * Cache therapist calendar info with expiry
   */
  private setCache(therapistId: string, info: TherapistCalendarInfo): void {
    this.therapistCalendarCache.set(therapistId, info);
    this.cacheExpiry.set(therapistId, Date.now() + this.cacheTimeout);
  }

  /**
   * Clear cache for a specific therapist
   */
  clearTherapistCache(therapistId: string): void {
    this.therapistCalendarCache.delete(therapistId);
    this.cacheExpiry.delete(therapistId);
  }

  /**
   * Clear all therapist calendar cache
   */
  clearAllCache(): void {
    this.therapistCalendarCache.clear();
    this.cacheExpiry.clear();
  }

  private async createTestBlockingEvent() {
    try {
      // Create a test blocking event for next Monday 00:00-09:00 (morning block for 09:00-17:00 availability)
      const today = new Date();
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
      
      const morningStart = new Date(nextMonday);
      morningStart.setHours(0, 0, 0, 0);
      const morningEnd = new Date(nextMonday);
      morningEnd.setHours(9, 0, 0, 0);
      
      const success = await this.createBlockingEvent({
        title: '🚫 Unavailable (Admin Block) - TEST',
        description: 'Test blocking event - Available hours: 09:00-17:00 on Mondays',
        startTime: morningStart,
        endTime: morningEnd,
      });
      
      if (success) {
        console.log('✅ Test blocking event created successfully');
      } else {
        console.log('❌ Test blocking event creation failed');
      }
    } catch (error) {
      console.error('❌ Error creating test blocking event:', error);
    }
  }

  async createBlockingEvent(eventData: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    summary?: string;
    therapistId?: string;
    useAdminCalendar?: boolean;
  }): Promise<boolean> {
    await this.ensureReady();
    try {
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, skipping event creation');
        return false;
      }

      // Determine which calendar to use
      let targetCalendarId: string;
      if (eventData.useAdminCalendar || !eventData.therapistId) {
        targetCalendarId = this.adminCalendarId;
      } else {
        targetCalendarId = await this.getTherapistCalendarId(eventData.therapistId);
      }

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'Europe/London',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'Europe/London',
        },
        transparency: 'opaque', // Shows as busy
        visibility: 'private',
      };

      const response = await this.calendar.events.insert({
        calendarId: targetCalendarId,
        resource: event,
      });

      console.log(`✅ Created blocking event: ${eventData.title} on calendar ${targetCalendarId} (${eventData.startTime.toISOString()} - ${eventData.endTime.toISOString()})`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating blocking event: ${eventData.title}`, error);
      return false;
    }
  }

  async createAvailabilityBlockingEvents(dayOfWeek: number, startTime: string, endTime: string, weeksAhead: number = 12, therapistId?: string): Promise<number> {
    try {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      let createdEvents = 0;
      const today = new Date();
      
      // Determine which calendar to use
      let targetCalendarId: string;
      if (therapistId) {
        targetCalendarId = await this.getTherapistCalendarId(therapistId);
        console.log(`📅 Creating availability blocks for therapist ${therapistId} on calendar ${targetCalendarId}`);
      } else {
        targetCalendarId = this.adminCalendarId;
        console.log(`📅 Creating availability blocks on admin calendar ${targetCalendarId}`);
      }
      
      for (let week = 0; week < weeksAhead; week++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + (week * 7) + ((dayOfWeek - today.getDay() + 7) % 7));
        
        // Block morning hours (00:00 to start of availability)
        if (startHour > 0) {
          const morningStart = new Date(targetDate);
          morningStart.setHours(0, 0, 0, 0);
          const morningEnd = new Date(targetDate);
          morningEnd.setHours(startHour, startMin, 0, 0);
          
          const success = await this.createBlockingEvent({
            title: `🚫 Unavailable (${therapistId ? 'Therapist' : 'Admin'} Block)`,
            description: `Blocked time - Available hours: ${startTime}-${endTime} on ${dayName}s`,
            startTime: morningStart,
            endTime: morningEnd,
            therapistId,
          });
          
          if (success) createdEvents++;
        }
        
        // Block evening hours (end of availability to 23:59)
        if (endHour < 24) {
          const eveningStart = new Date(targetDate);
          eveningStart.setHours(endHour, endMin, 0, 0);
          const eveningEnd = new Date(targetDate);
          eveningEnd.setHours(23, 59, 59, 999);
          
          const success = await this.createBlockingEvent({
            title: `🚫 Unavailable (${therapistId ? 'Therapist' : 'Admin'} Block)`,
            description: `Blocked time - Available hours: ${startTime}-${endTime} on ${dayName}s`,
            startTime: eveningStart,
            endTime: eveningEnd,
            therapistId,
          });
          
          if (success) createdEvents++;
        }
      }
      
      console.log(`✅ Created ${createdEvents} blocking events for ${dayName} availability (${startTime}-${endTime})`);
      return createdEvents;
    } catch (error) {
      console.error('❌ Error creating availability blocking events:', error);
      return 0;
    }
  }

  async updateEvent(eventId: string, eventData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    therapistId?: string;
    useAdminCalendar?: boolean;
  }): Promise<boolean> {
    await this.ensureReady();
    try {
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, skipping event update');
        return false;
      }

      // Determine which calendar to use
      let targetCalendarId: string;
      if (eventData.useAdminCalendar || !eventData.therapistId) {
        targetCalendarId = this.adminCalendarId;
      } else {
        targetCalendarId = await this.getTherapistCalendarId(eventData.therapistId);
      }

      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'Europe/London',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'Europe/London',
        },
        location: eventData.location || '',
      };

      await this.calendar.events.update({
        calendarId: targetCalendarId,
        eventId: eventId,
        resource: event,
      });

      console.log(`✅ Updated event ${eventId} on calendar ${targetCalendarId}: ${eventData.title}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating event ${eventId}:`, error);
      return false;
    }
  }

  async deleteEvent(eventId: string, therapistId?: string, useAdminCalendar?: boolean): Promise<boolean> {
    await this.ensureReady();
    try {
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, skipping event deletion');
        return false;
      }

      // Determine which calendar to use
      let targetCalendarId: string;
      if (useAdminCalendar || !therapistId) {
        targetCalendarId = this.adminCalendarId;
      } else {
        targetCalendarId = await this.getTherapistCalendarId(therapistId);
      }

      await this.calendar.events.delete({
        calendarId: targetCalendarId,
        eventId: eventId,
      });

      console.log(`✅ Successfully deleted event ${eventId} from calendar: ${targetCalendarId}`);
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        console.log(`⚠️ Event ${eventId} not found (may already be deleted)`);
      } else {
        console.error(`❌ Error deleting event ${eventId}:`, error.message || error);
      }
      return false;
    }
  }

  async deleteBlockingEvents(titlePattern: string, therapistId?: string, useAdminCalendar?: boolean): Promise<number> {
    try {
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, skipping event deletion');
        return 0;
      }

      // Determine which calendar to use
      let targetCalendarId: string;
      if (useAdminCalendar || !therapistId) {
        targetCalendarId = this.adminCalendarId;
      } else {
        targetCalendarId = await this.getTherapistCalendarId(therapistId);
      }

      // Get events for the next 3 months
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await this.calendar.events.list({
        calendarId: targetCalendarId,
        timeMin,
        timeMax,
        q: titlePattern,
      });

      const events = response.data.items || [];
      let deletedCount = 0;

      for (const event of events) {
        if (event.summary && event.summary.includes(titlePattern)) {
          try {
            await this.calendar.events.delete({
              calendarId: targetCalendarId,
              eventId: event.id,
            });
            deletedCount++;
          } catch (error) {
            console.error(`❌ Error deleting event ${event.id}:`, error);
          }
        }
      }

      console.log(`✅ Deleted ${deletedCount} blocking events matching pattern: ${titlePattern} from calendar ${targetCalendarId}`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error deleting blocking events:', error);
      return 0;
    }
  }

  // ============================================================================
  // ERROR HANDLING & RESILIENCE UTILITIES
  // ============================================================================

  /**
   * Enhanced retry logic with exponential backoff for Google Calendar API calls
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          console.log(`❌ Non-retryable error for ${operationName}:`, error.message || error);
          throw error;
        }
        
        // Log retry attempt
        console.log(`⚠️ ${operationName} attempt ${attempt}/${maxRetries} failed:`, error.message || error);
        
        // Don't wait after the last attempt
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt, error);
          console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, lastError.message || lastError);
    throw lastError;
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const nonRetryableCodes = [
      400, // Bad Request - malformed request
      401, // Unauthorized - invalid credentials
      403, // Forbidden - insufficient permissions
      404, // Not Found - resource doesn't exist
      409, // Conflict - duplicate resource
      422  // Unprocessable Entity - validation errors
    ];
    
    return nonRetryableCodes.includes(error.code) || 
           nonRetryableCodes.includes(error.status) ||
           error.message?.includes('invalid_grant') ||
           error.message?.includes('permission');
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, error: any): number {
    const baseDelay = this.baseRetryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * baseDelay;
    
    // Respect rate limit headers if available
    if (error.status === 429 || error.code === 429) {
      const retryAfter = error.headers?.['retry-after'];
      if (retryAfter) {
        return parseInt(retryAfter) * 1000; // Convert to milliseconds
      }
      // For rate limits, use longer delays
      return exponentialDelay * 2 + jitter;
    }
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Promise-based sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced error logging with context
   */
  private logError(operation: string, error: any, context?: any): void {
    const errorInfo = {
      operation,
      error: error.message || error,
      code: error.code || error.status,
      details: error.details,
      context
    };
    
    console.error(`❌ GoogleCalendarService ${operation} error:`, errorInfo);
    
    // Log additional details for specific error types
    if (error.code === 429 || error.status === 429) {
      console.error('🚫 Rate limit exceeded - backing off');
    } else if (error.code === 401 || error.status === 401) {
      console.error('🔐 Authentication error - check service account credentials');
    } else if (error.code === 403 || error.status === 403) {
      console.error('🚫 Permission error - check calendar access permissions');
    }
  }

  /**
   * Safe calendar operation wrapper with comprehensive error handling
   */
  private async safeCalendarOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue: T,
    context?: any
  ): Promise<T> {
    try {
      if (!this.calendar) {
        console.log(`⚠️ Google Calendar not initialized, skipping ${operationName}`);
        return fallbackValue;
      }

      return await this.withRetry(operation, operationName);
    } catch (error: any) {
      this.logError(operationName, error, context);
      
      // For critical session operations, we want to fail gracefully but still log
      console.log(`🔄 ${operationName} failed gracefully, returning fallback value`);
      return fallbackValue;
    }
  }

  // ============================================================================
  // SESSION EVENT MANAGEMENT METHODS
  // ============================================================================

  /**
   * Determine routing based on session type - enhanced for multi-therapist architecture
   */
  private determineCalendarRouting(sessionType?: string, therapistId?: string, useAdminCalendar?: boolean): {
    useAdmin: boolean;
    reason: string;
  } {
    // Explicit admin calendar override
    if (useAdminCalendar === true) {
      return { useAdmin: true, reason: 'Explicit admin calendar override' };
    }

    // Session type based routing
    if (sessionType) {
      const adminSessionTypes = [
        'Initial Consultation', 'Onboarding', 'Admin Session', 'Assessment', 'Intake',
        'Free Initial Chat', 'Introduction Call', 'System Demo'
      ];

      const lowerSessionType = sessionType.toLowerCase();
      const isAdminSession = adminSessionTypes.some(type => 
        lowerSessionType.includes(type.toLowerCase()) || 
        lowerSessionType.includes('initial') ||
        lowerSessionType.includes('onboarding') ||
        lowerSessionType.includes('admin') ||
        lowerSessionType.includes('assessment') ||
        lowerSessionType.includes('intake') ||
        lowerSessionType.includes('introduction')
      );

      if (isAdminSession) {
        return { useAdmin: true, reason: `Session type "${sessionType}" identified as admin/onboarding session` };
      }
    }

    // Default to therapist calendar for therapy sessions
    if (therapistId) {
      return { useAdmin: false, reason: `Session routed to therapist ${therapistId} calendar` };
    }

    // Fallback to admin calendar if no therapist specified
    return { useAdmin: true, reason: 'No therapist specified, using admin calendar fallback' };
  }

  /**
   * Create a calendar event for a therapy session with attendees and Google Meet
   * Returns both eventId and the generated meetingUrl
   */
  async createSessionEvent(sessionData: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: Array<{email: string; name: string; role: 'client' | 'therapist'}>;
    appointmentId?: string;
    therapistId?: string;
    sessionType?: string;
    useAdminCalendar?: boolean;
  }): Promise<{ eventId: string; meetingUrl: string; meetingId: string } | null> {
    // Ensure calendar is ready before proceeding
    await this.ensureReady();
    
    // CRITICAL: Service Guard - skip calendar event creation for sessions that are fully past
    const now = new Date();
    const startTimeUTC = new Date(sessionData.startTime.toISOString());
    const nowUTC = new Date(now.toISOString());
    // Allow session creation during the session duration (default 50 minutes) + 10 minute buffer
    const sessionDuration = 60; // 50 min session + 10 min buffer
    const sessionEndTime = new Date(startTimeUTC.getTime() + sessionDuration * 60 * 1000);
    const isPastDate = nowUTC > sessionEndTime;
    
    if (isPastDate) {
      console.log('🔙 SERVICE GUARD: Skipping Google Calendar event creation for past date', {
        title: sessionData.title,
        scheduledAt: sessionData.startTime.toISOString(),
        isPastDate,
        therapistId: sessionData.therapistId
      });
      return null; // No event created for past dates
    }

    const context = {
      title: sessionData.title,
      startTime: sessionData.startTime.toISOString(),
      endTime: sessionData.endTime.toISOString(),
      attendeesCount: sessionData.attendees.length
    };

    return await this.safeCalendarOperation(
      async () => {
        // Enhanced: Determine calendar routing based on session type
        const routing = this.determineCalendarRouting(
          sessionData.sessionType, 
          sessionData.therapistId, 
          sessionData.useAdminCalendar
        );
        
        console.log(`🎯 CALENDAR ROUTING: ${routing.reason}`);
        
        // Determine which calendar to use based on routing decision
        let targetCalendarId: string;
        if (routing.useAdmin) {
          targetCalendarId = this.adminCalendarId;
          console.log(`📅 ADMIN CALENDAR: Using support@hive-wellness.co.uk for this session`);
        } else if (sessionData.therapistId) {
          targetCalendarId = await this.getTherapistCalendarId(sessionData.therapistId);
          console.log(`📅 THERAPIST CALENDAR: Resolved therapist ${sessionData.therapistId} calendar to: ${targetCalendarId}`);
          
          // Verify this isn't falling back to admin calendar
          if (targetCalendarId === this.adminCalendarId) {
            console.log(`⚠️ FALLBACK: Therapist calendar not configured, using admin calendar`);
          }
        } else {
          targetCalendarId = this.adminCalendarId;
          console.log(`📅 DEFAULT: No therapist specified, using admin calendar`);
        }
        
        // Log final routing decision
        console.log(`📅 FINAL ROUTING DECISION:`, {
          sessionType: sessionData.sessionType || 'Not specified',
          therapistId: sessionData.therapistId || 'Not specified',
          targetCalendar: targetCalendarId,
          isAdminCalendar: targetCalendarId === this.adminCalendarId,
          routingReason: routing.reason
        });

        // Format attendees for Google Calendar API
        const calendarAttendees = sessionData.attendees
          .filter(attendee => attendee.email && attendee.email.includes('@'))
          .map(attendee => ({
            email: attendee.email,
            displayName: attendee.name,
            responseStatus: 'needsAction'
          }));

        // Include the target calendar as an attendee  
        calendarAttendees.push({
          email: targetCalendarId,
          displayName: targetCalendarId === this.adminCalendarId ? 'Hive Wellness' : 'Therapist',
          responseStatus: 'accepted'
        });

        // Construct detailed event description with join instructions
        const clientAttendee = sessionData.attendees.find(a => a.role === 'client');
        const therapistAttendee = sessionData.attendees.find(a => a.role === 'therapist');
        
        const eventDescription = `
Therapy session scheduled via Hive Wellness

${clientAttendee ? `Client: ${clientAttendee.name} (${clientAttendee.email})` : 'Client: Information not available'}
${therapistAttendee ? `Therapist: ${therapistAttendee.name} (${therapistAttendee.email})` : 'Therapist: Information not available'}
Duration: ${Math.round((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 60000)} minutes

Join the session:
🎥 Google Meet link will be available in this calendar event.

${sessionData.description ? `\nAdditional Details:\n${sessionData.description}` : ''}

Need help? Contact support@hive-wellness.co.uk
        `.trim();

        // Convert UTC times to London local time strings for Google Calendar
        const { formatInTimeZone } = await import('date-fns-tz');
        const londonStartTime = formatInTimeZone(sessionData.startTime, 'Europe/London', "yyyy-MM-dd'T'HH:mm:ss");
        const londonEndTime = formatInTimeZone(sessionData.endTime, 'Europe/London', "yyyy-MM-dd'T'HH:mm:ss");
        
        console.log(`🌍 Converting UTC to London time - Start: ${sessionData.startTime.toISOString()} → ${londonStartTime}, End: ${sessionData.endTime.toISOString()} → ${londonEndTime}`);

        const event = {
          summary: sessionData.title,
          description: eventDescription,
          start: {
            dateTime: londonStartTime,
            timeZone: 'Europe/London',
          },
          end: {
            dateTime: londonEndTime,
            timeZone: 'Europe/London',
          },
          location: 'Google Meet (see calendar event for link)',
          attendees: calendarAttendees,
          conferenceData: {
            createRequest: {
              requestId: sessionData.appointmentId || `meeting-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 24 hours before
              { method: 'email', minutes: 60 },      // 1 hour before
              { method: 'popup', minutes: 15 }       // 15 minutes before
            ]
          },
          transparency: 'opaque', // Shows as busy
          visibility: 'private',
          guestsCanModify: false,
          guestsCanInviteOthers: false,
          guestsCanSeeOtherGuests: true
        };

        console.log(`📅 Creating session calendar event: ${sessionData.title}`);
        console.log(`📅 Attendees: ${calendarAttendees.map(a => a.email).join(', ')}`);
        console.log(`📅 Time: ${sessionData.startTime.toISOString()} - ${sessionData.endTime.toISOString()}`);

        const response = await this.calendar.events.insert({
          calendarId: targetCalendarId,
          resource: event,
          conferenceDataVersion: 1,
          sendUpdates: 'all' // Send calendar invites to all attendees
        });

        const eventId = response.data.id;
        const meetingUrl = response.data.conferenceData?.entryPoints?.[0]?.uri || '';
        const meetingId = response.data.conferenceData?.conferenceId || '';
        
        console.log(`✅ Session calendar event created successfully: ${eventId} on calendar ${targetCalendarId}`);
        console.log(`📅 Event URL: https://calendar.google.com/calendar/event?eid=${response.data.id}`);
        console.log(`🎥 Meeting URL: ${meetingUrl}`);
        console.log(`🎥 Meeting ID: ${meetingId}`);

        return { 
          eventId: eventId, 
          meetingUrl: meetingUrl, 
          meetingId: meetingId 
        };
      },
      'createSessionEvent',
      null, // fallback value if operation fails
      context
    );
  }

  /**
   * Update an existing session calendar event
   */
  async updateSessionEvent(eventId: string, updates: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    meetingUrl?: string;
    attendees?: Array<{email: string; name: string; role: 'client' | 'therapist'}>;
    therapistId?: string;
    useAdminCalendar?: boolean;
  }): Promise<boolean> {
    try {
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, cannot update session event');
        return false;
      }

      // Determine which calendar to use
      let targetCalendarId: string;
      if (updates.useAdminCalendar || !updates.therapistId) {
        targetCalendarId = this.adminCalendarId;
      } else {
        targetCalendarId = await this.getTherapistCalendarId(updates.therapistId);
      }

      console.log(`📅 Updating session calendar event: ${eventId} on calendar ${targetCalendarId}`);

      // Get the existing event first
      const existingEvent = await this.calendar.events.get({
        calendarId: targetCalendarId,
        eventId: eventId
      });

      if (!existingEvent.data) {
        console.error(`❌ Session event ${eventId} not found on calendar ${targetCalendarId}`);
        return false;
      }

      // Prepare the update object
      const eventUpdate: any = {
        summary: updates.title || existingEvent.data.summary,
        description: updates.description || existingEvent.data.description,
        location: updates.meetingUrl || existingEvent.data.location
      };

      // Update time if provided
      if (updates.startTime) {
        eventUpdate.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'Europe/London'
        };
      }

      if (updates.endTime) {
        eventUpdate.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'Europe/London'
        };
      }

      // Update attendees if provided
      if (updates.attendees) {
        const calendarAttendees = updates.attendees
          .filter(attendee => attendee.email && attendee.email.includes('@'))
          .map(attendee => ({
            email: attendee.email,
            displayName: attendee.name,
            responseStatus: 'needsAction'
          }));

        // Include the target calendar as attendee
        calendarAttendees.push({
          email: targetCalendarId,
          displayName: targetCalendarId === this.adminCalendarId ? 'Hive Wellness' : 'Therapist',
          responseStatus: 'accepted'
        });

        eventUpdate.attendees = calendarAttendees;
      }

      // Perform the update
      await this.calendar.events.update({
        calendarId: targetCalendarId,
        eventId: eventId,
        resource: eventUpdate,
        sendUpdates: 'all' // Notify all attendees of changes
      });

      console.log(`✅ Session calendar event updated successfully: ${eventId} on calendar ${targetCalendarId}`);
      return true;

    } catch (error: any) {
      console.error(`❌ Error updating session calendar event ${eventId}:`, {
        error: error.message || error,
        code: error.code
      });
      return false;
    }
  }

  /**
   * Delete a session calendar event
   */
  async deleteSessionEvent(eventId: string, therapistId?: string, useAdminCalendar?: boolean): Promise<boolean> {
    try {
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized, cannot delete session event');
        return false;
      }

      // Determine which calendar to use
      let targetCalendarId: string;
      if (useAdminCalendar || !therapistId) {
        targetCalendarId = this.adminCalendarId;
      } else {
        targetCalendarId = await this.getTherapistCalendarId(therapistId);
      }

      console.log(`📅 Deleting session calendar event: ${eventId} from calendar ${targetCalendarId}`);

      await this.calendar.events.delete({
        calendarId: targetCalendarId,
        eventId: eventId,
        sendUpdates: 'all' // Notify attendees of cancellation
      });

      console.log(`✅ Session calendar event deleted successfully: ${eventId} from calendar ${targetCalendarId}`);
      return true;

    } catch (error: any) {
      if (error.code === 404) {
        console.log(`⚠️ Session event ${eventId} not found (may already be deleted)`);
        return true; // Consider not found as success
      } else {
        console.error(`❌ Error deleting session calendar event ${eventId}:`, {
          error: error.message || error,
          code: error.code
        });
        return false;
      }
    }
  }

  /**
   * Check if a session event exists and get basic info
   */
  async getSessionEvent(eventId: string, therapistId?: string, useAdminCalendar?: boolean): Promise<{
    exists: boolean;
    title?: string;
    startTime?: Date;
    endTime?: Date;
    attendees?: string[];
    meetingUrl?: string;
    conferenceData?: any;
  }> {
    try {
      if (!this.calendar) {
        console.log('⚠️ Google Calendar not initialized');
        return { exists: false };
      }

      // Determine which calendar to use
      let targetCalendarId: string;
      if (useAdminCalendar || !therapistId) {
        targetCalendarId = this.adminCalendarId;
      } else {
        targetCalendarId = await this.getTherapistCalendarId(therapistId);
      }

      const response = await this.calendar.events.get({
        calendarId: targetCalendarId,
        eventId: eventId
      });

      const event = response.data;
      if (!event) {
        return { exists: false };
      }

      // Extract Google Meet URL from conference data
      let meetingUrl: string | undefined;
      if (event.conferenceData?.entryPoints) {
        const videoEntry = event.conferenceData.entryPoints.find(
          (ep: any) => ep.entryPointType === 'video'
        );
        meetingUrl = videoEntry?.uri;
      }
      // Fallback to hangoutLink if available
      if (!meetingUrl && event.hangoutLink) {
        meetingUrl = event.hangoutLink;
      }

      return {
        exists: true,
        title: event.summary,
        startTime: event.start?.dateTime ? new Date(event.start.dateTime) : undefined,
        endTime: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
        attendees: event.attendees?.map((a: any) => a.email).filter(Boolean) || [],
        meetingUrl,
        conferenceData: event.conferenceData
      };

    } catch (error: any) {
      if (error.code === 404) {
        return { exists: false };
      }
      console.error(`❌ Error getting session event ${eventId}:`, error.message || error);
      return { exists: false };
    }
  }

  // ============================================================================
  // TESTING & VERIFICATION METHODS
  // ============================================================================

  /**
   * Test method to verify calendar integration is working
   * Creates a test session event and verifies it was created successfully
   */
  async testSessionEventCreation(): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
    details?: any;
  }> {
    try {
      console.log('🧪 Testing Google Calendar session event creation...');
      
      if (!this.calendar) {
        return {
          success: false,
          error: 'Google Calendar not initialized'
        };
      }

      // Create test session data for 1 hour from now
      const now = new Date();
      const testStartTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const testEndTime = new Date(testStartTime.getTime() + 50 * 60 * 1000); // 50 minutes later

      const testSessionData = {
        title: '🧪 TEST: Therapy Session - Enhanced Calendar Integration',
        description: 'This is a test session to verify enhanced Google Calendar integration with attendees and Google Meet.',
        startTime: testStartTime,
        endTime: testEndTime,
        meetingUrl: 'https://meet.google.com/test-session-' + Date.now(),
        attendees: [
          {
            email: 'test-client@example.com',
            name: 'Test Client',
            role: 'client' as const
          },
          {
            email: 'test-therapist@example.com', 
            name: 'Test Therapist',
            role: 'therapist' as const
          }
        ],
        appointmentId: `test-${Date.now()}`
      };

      console.log(`🧪 Creating test event: ${testSessionData.title}`);
      console.log(`🧪 Time: ${testStartTime.toISOString()} - ${testEndTime.toISOString()}`);
      console.log(`🧪 Attendees: ${testSessionData.attendees.map(a => `${a.name} (${a.email})`).join(', ')}`);

      const eventResult = await this.createSessionEvent(testSessionData);

      if (eventResult) {
        console.log(`✅ Test session event created successfully: ${eventResult.eventId}`);
        
        // Verify the event exists
        const eventInfo = await this.getSessionEvent(eventResult.eventId);
        
        console.log(`🔍 Verifying test event existence:`, eventInfo);

        return {
          success: true,
          eventId: eventResult.eventId,
          details: {
            eventExists: eventInfo.exists,
            eventTitle: eventInfo.title,
            eventStartTime: eventInfo.startTime,
            eventEndTime: eventInfo.endTime,
            attendeesCount: eventInfo.attendees?.length || 0
          }
        };
      } else {
        return {
          success: false,
          error: 'createSessionEvent returned null - check error logs above'
        };
      }

    } catch (error: any) {
      console.error('❌ Test session event creation failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during test',
        details: error
      };
    }
  }

  // ============================================================================
  // BACKFILL CALENDAR EVENTS FOR EXISTING APPOINTMENTS
  // ============================================================================

  /**
   * Backfill calendar events for existing appointments that don't have them
   */
  async backfillCalendarEvents(): Promise<{
    processed: number;
    successful: number;
    failed: Array<{appointmentId: string; error: string; type: 'appointment' | 'introduction_call'}>;
    summary: string;
  }> {
    try {
      console.log('🔄 Starting calendar events backfill process...');
      
      // Import database modules
      const { db } = await import('./db');
      const { appointments, introductionCalls, users } = await import('@shared/schema');
      const { eq, and, isNull, gte, ne, or } = await import('drizzle-orm');
      
      let processed = 0;
      let successful = 0;
      const failed: Array<{appointmentId: string; error: string; type: 'appointment' | 'introduction_call'}> = [];
      
      const now = new Date();
      
      // Process regular appointments without calendar events
      console.log('📅 Finding appointments without calendar events...');
      
      const appointmentsToProcess = await db
        .select({
          id: appointments.id,
          clientId: appointments.clientId,
          primaryTherapistId: appointments.primaryTherapistId,
          scheduledAt: appointments.scheduledAt,
          endTime: appointments.endTime,
          sessionType: appointments.sessionType,
          therapyCategory: appointments.therapyCategory,
          notes: appointments.notes,
          googleMeetLink: appointments.googleMeetLink,
          calendarEventId: appointments.calendarEventId,
          status: appointments.status
        })
        .from(appointments)
        .where(
          and(
            isNull(appointments.calendarEventId), // No calendar event yet
            gte(appointments.scheduledAt, now), // Future appointments only
            ne(appointments.status, 'cancelled') // Not cancelled
          )
        );
      
      console.log(`📊 Found ${appointmentsToProcess.length} appointments to process`);
      
      // Process each appointment
      for (const appointment of appointmentsToProcess) {
        processed++;
        console.log(`📅 Processing appointment ${processed}/${appointmentsToProcess.length}: ${appointment.id}`);
        
        try {
          // Get client and therapist details
          const [clientDetails, therapistDetails] = await Promise.all([
            appointment.clientId ? 
              db.select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName
              })
              .from(users)
              .where(eq(users.id, appointment.clientId))
              .limit(1) : [],
            appointment.primaryTherapistId ?
              db.select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName
              })
              .from(users)
              .where(eq(users.id, appointment.primaryTherapistId))
              .limit(1) : []
          ]);
          
          const client = clientDetails[0];
          const therapist = therapistDetails[0];
          
          if (!client && !therapist) {
            throw new Error('No client or therapist found for appointment');
          }
          
          // Prepare attendees array
          const attendees: Array<{email: string; name: string; role: 'client' | 'therapist'}> = [];
          
          if (client && client.email) {
            attendees.push({
              email: client.email,
              name: `${client.firstName || 'Client'} ${client.lastName || ''}`.trim(),
              role: 'client'
            });
          }
          
          if (therapist && therapist.email) {
            attendees.push({
              email: therapist.email,
              name: `${therapist.firstName || 'Therapist'} ${therapist.lastName || ''}`.trim(),
              role: 'therapist'
            });
          }
          
          // Generate session title
          const sessionTitle = `${appointment.sessionType === 'consultation' ? 'Consultation' : 'Therapy Session'}${appointment.therapyCategory ? ` - ${appointment.therapyCategory}` : ''}`;
          
          // Generate meet link if not present
          let meetingUrl = appointment.googleMeetLink;
          if (!meetingUrl) {
            meetingUrl = `https://meet.google.com/${appointment.id.substring(0, 10)}-${Date.now()}`;
          }
          
          // Create session event
          const eventResult = await this.createSessionEvent({
            title: sessionTitle,
            description: `Therapy session backfilled from existing appointment.\n\nNotes: ${appointment.notes || 'No additional notes'}`,
            startTime: appointment.scheduledAt,
            endTime: appointment.endTime,
            attendees: attendees,
            appointmentId: appointment.id
          });
          
          const eventId = eventResult?.eventId;
          
          if (eventId) {
            // Update appointment with calendar event ID and meet link
            await db
              .update(appointments)
              .set({ 
                calendarEventId: eventId,
                googleEventId: eventId,
                googleMeetLink: meetingUrl,
                updatedAt: new Date()
              })
              .where(eq(appointments.id, appointment.id));
            
            successful++;
            console.log(`✅ Created calendar event for appointment ${appointment.id}: ${eventId}`);
          } else {
            throw new Error('Calendar event creation returned null');
          }
          
        } catch (error: any) {
          console.error(`❌ Failed to create calendar event for appointment ${appointment.id}:`, error.message);
          failed.push({
            appointmentId: appointment.id,
            error: error.message || 'Unknown error',
            type: 'appointment'
          });
        }
      }
      
      // Note: Introduction calls backfill is not implemented yet as the table 
      // does not have a calendarEventId field. This would need to be added to the schema first.
      console.log('📞 Skipping introduction calls - no calendarEventId field in schema');
      
      const summary = `Backfill completed: ${successful}/${processed} events created successfully. ${failed.length} failures.`;
      console.log(`🎯 ${summary}`);
      
      if (failed.length > 0) {
        console.log('❌ Failed appointments/calls:');
        failed.forEach(fail => {
          console.log(`  - ${fail.type} ${fail.appointmentId}: ${fail.error}`);
        });
      }
      
      return {
        processed,
        successful,
        failed,
        summary
      };
      
    } catch (error: any) {
      console.error('❌ Backfill process failed:', error);
      throw new Error(`Backfill process failed: ${error.message}`);
    }
  }

  /**
   * Clean up test events (for development/testing purposes)
   */
  async cleanupTestEvents(): Promise<number> {
    try {
      console.log('🧹 Cleaning up test calendar events...');
      
      const deletedCount = await this.deleteBlockingEvents('🧪 TEST:');
      
      console.log(`🧹 Cleaned up ${deletedCount} test events`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up test events:', error);
      return 0;
    }
  }
}

console.log('📅 Creating Google Calendar service instance...');
export const googleCalendarService = new GoogleCalendarService();