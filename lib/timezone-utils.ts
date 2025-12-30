import { Instructor } from '@/types/database';

/**
 * Format session date in specific timezone
 * @param isoDate ISO 8601 date string (UTC)
 * @param timezone IANA timezone (e.g., 'America/New_York')
 * @param locale Locale string (e.g., 'en-US', 'es-ES') - defaults to 'en-US'
 * @param options Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string
 */
export function formatSessionDate(
  isoDate: string,
  timezone: string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = new Date(isoDate);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      ...options,
    };

    return new Intl.DateTimeFormat(locale, {
      ...defaultOptions,
      timeZone: timezone,
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return isoDate;
  }
}

/**
 * Format session date for display (e.g., "Jan 15, 2025 at 7:00 PM EST")
 */
export function formatSessionDateLong(isoDate: string, timezone: string, locale: string = 'en-US'): string {
  return formatSessionDate(isoDate, timezone, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format session date for short display (e.g., "Jan 15, 7:00 PM")
 */
export function formatSessionDateShort(isoDate: string, timezone: string, locale: string = 'en-US'): string {
  return formatSessionDate(isoDate, timezone, locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format session time only (e.g., "7:00 PM EST")
 */
export function formatSessionTime(isoDate: string, timezone: string, locale: string = 'en-US'): string {
  return formatSessionDate(isoDate, timezone, locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted string (e.g., "2 hours", "90 minutes", "1 hour 30 minutes")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Get instructor's timezone from user profile
 * @param instructor Instructor object
 * @returns IANA timezone string
 */
export function getInstructorTimezone(instructor: Instructor): string {
  // Check if instructor has timezone set in their user profile
  if (instructor.timezone) {
    return instructor.timezone;
  }

  // Fallback to Europe/Berlin (CET/CEST)
  return 'Europe/Berlin';
}

/**
 * Convert local date and time inputs to UTC ISO string
 * @param dateString Date string from input (YYYY-MM-DD)
 * @param timeString Time string from input (HH:MM)
 * @param timezone IANA timezone
 * @returns ISO 8601 UTC string
 */
export function localToUTC(
  dateString: string,
  timeString: string,
  timezone: string
): string {
  try {
    // Combine date and time
    const dateTimeString = `${dateString}T${timeString}:00`;

    // Create date object with timezone consideration
    // Using a library-agnostic approach with Intl API
    const localDate = new Date(dateTimeString);

    // Get timezone offset using Intl
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(localDate);
    const getValue = (type: string) => parts.find((p) => p.type === type)?.value || '0';

    const year = getValue('year');
    const month = getValue('month');
    const day = getValue('day');
    const hour = getValue('hour');
    const minute = getValue('minute');
    const second = getValue('second');

    // Create a date in the target timezone
    const targetDateString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const targetDate = new Date(targetDateString);

    // Calculate offset
    const offset = localDate.getTime() - targetDate.getTime();

    // Apply offset to get UTC
    const utcDate = new Date(localDate.getTime() - offset);

    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting to UTC:', error);
    // Fallback: assume input is already in UTC
    return new Date(`${dateString}T${timeString}:00Z`).toISOString();
  }
}

/**
 * Convert UTC ISO string to local date and time
 * @param isoDate ISO 8601 UTC string
 * @param timezone IANA timezone
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM) strings
 */
export function utcToLocal(
  isoDate: string,
  timezone: string
): { date: string; time: string } {
  try {
    const date = new Date(isoDate);

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getValue = (type: string) => parts.find((p) => p.type === type)?.value || '00';

    const year = getValue('year');
    const month = getValue('month');
    const day = getValue('day');
    const hour = getValue('hour');
    const minute = getValue('minute');

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
    };
  } catch (error) {
    console.error('Error converting from UTC:', error);
    const date = new Date(isoDate);
    return {
      date: date.toISOString().split('T')[0],
      time: date.toISOString().split('T')[1].substring(0, 5),
    };
  }
}

/**
 * List of common timezones for dropdown
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
];

/**
 * Get timezone abbreviation (e.g., "EST", "PDT")
 */
export function getTimezoneAbbr(timezone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');

    return tzPart?.value || timezone;
  } catch (error) {
    return timezone;
  }
}
