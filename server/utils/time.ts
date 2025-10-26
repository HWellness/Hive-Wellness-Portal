import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const UK_TZ = 'Europe/London';

/**
 * Convert UK local date and time to UTC
 * @param dateStr YYYY-MM-DD format
 * @param timeStr HH:mm format  
 */
export function toUtcFromUk(dateStr: string, timeStr: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, UK_TZ);
}

/**
 * Get UTC bounds for a UK date (00:00:00.000 to 23:59:59.999 in UK time)
 * @param dateStr YYYY-MM-DD format
 */
export function ukDayBoundsUtc(dateStr: string): { startUtc: Date; endUtc: Date } {
  return {
    startUtc: fromZonedTime(`${dateStr}T00:00:00.000`, UK_TZ),
    endUtc: fromZonedTime(`${dateStr}T23:59:59.999`, UK_TZ)
  };
}

/**
 * Check if a UK local time is valid (handles DST transitions)
 * @param dateStr YYYY-MM-DD format
 * @param timeStr HH:mm format
 */
export function isValidUkLocalInstant(dateStr: string, timeStr: string): boolean {
  try {
    const utcTime = toUtcFromUk(dateStr, timeStr);
    const roundTrip = toZonedTime(utcTime, UK_TZ);
    
    // Check if the time round-trips correctly
    const expectedTime = `${timeStr}:00`;
    const actualTime = roundTrip.toTimeString().substring(0, 8);
    
    return expectedTime === actualTime;
  } catch {
    return false;
  }
}

/**
 * Convert UTC date to UK local date string (YYYY-MM-DD)
 */
export function utcToUkDateString(utcDate: Date): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: UK_TZ, 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(utcDate);
}

/**
 * Convert UTC date to UK local time string (HH:mm)
 */
export function utcToUkTimeString(utcDate: Date): string {
  return new Intl.DateTimeFormat('en-GB', { 
    timeZone: UK_TZ, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  }).format(utcDate);
}

/**
 * Get current UK date string (YYYY-MM-DD)
 */
export function getCurrentUkDateString(): string {
  return utcToUkDateString(new Date());
}