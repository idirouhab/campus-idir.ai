/**
 * Course utility functions
 */

/**
 * Generate a URL-friendly slug from a course title
 * @param title - The course title
 * @returns A URL-friendly slug
 */
export function generateCourseSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Validate a course slug
 * @param slug - The slug to validate
 * @returns True if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

// ==========================================
// Language-Agnostic Logistics Formatting
// ==========================================

import { CourseDuration, DayOfWeek } from '@/types/database';

/**
 * Format duration with proper pluralization
 * @param duration - Duration object with value and unit
 * @param t - Translation function from useLanguage hook
 * @returns Formatted duration string (e.g., "4 weeks", "4 semanas")
 */
export function formatDuration(
  duration: CourseDuration,
  t: (key: string) => string
): string {
  const { value, unit } = duration;

  if (value === 1) {
    return `${value} ${t(`units.${unit.slice(0, -1)}`)}`;
  } else {
    return `${value} ${t(`units.${unit}`)}`;
  }
}

/**
 * Format days of week array to localized string
 * @param days - Array of day indices (0 = Sunday, 6 = Saturday)
 * @param locale - Locale string ('en' or 'es')
 * @param format - 'long' or 'short' format
 * @returns Formatted days string (e.g., "Monday, Wednesday, Friday" or "Lun, Mié, Vie")
 */
export function formatDaysOfWeek(
  days: DayOfWeek[],
  locale: 'en' | 'es',
  format: 'long' | 'short' = 'long'
): string {
  // Sort days in order
  const sortedDays = [...days].sort((a, b) => a - b);

  // Use Intl.DateTimeFormat to get localized day names
  const formatter = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    weekday: format,
  });

  // Get a reference date for each day of the week
  // Jan 1, 2023 was a Sunday
  const referenceSunday = new Date(2023, 0, 1);

  const dayNames = sortedDays.map((dayIndex) => {
    const date = new Date(referenceSunday);
    date.setDate(referenceSunday.getDate() + dayIndex);
    const dayName = formatter.format(date);
    // Capitalize first letter
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  });

  return dayNames.join(', ');
}

/**
 * Format start date from ISO string to localized format
 * @param isoDate - ISO 8601 date string (YYYY-MM-DD)
 * @param locale - Locale string ('en' or 'es')
 * @returns Formatted date string
 */
export function formatStartDate(
  isoDate: string,
  locale: 'en' | 'es'
): string {
  const date = new Date(isoDate);

  // Format using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return formatter.format(date);
}

/**
 * Format schedule display combining days and time
 * @param daysOfWeek - Array of day indices
 * @param timeDetail - Time detail string (e.g., "7:00 PM - 8:00 PM CET")
 * @param locale - Locale string
 * @returns Formatted schedule string
 */
export function formatSchedule(
  daysOfWeek: DayOfWeek[],
  timeDetail: string | undefined,
  locale: 'en' | 'es'
): string {
  const days = formatDaysOfWeek(daysOfWeek, locale, 'long');

  if (timeDetail) {
    return `${days} • ${timeDetail}`;
  }

  return days;
}

/**
 * Calculate total hours from schedule, duration, and session duration
 * @param daysOfWeek - Array of day indices
 * @param duration - Duration object
 * @param sessionDurationHours - Hours per session
 * @returns Total hours (only works with weeks unit)
 */
export function calculateTotalHours(
  daysOfWeek: DayOfWeek[],
  duration: CourseDuration,
  sessionDurationHours: number
): number | null {
  // Only works with weeks unit
  if (duration.unit !== 'weeks') {
    return null;
  }

  // Calculate: days per week × number of weeks × hours per session
  return daysOfWeek.length * duration.value * sessionDurationHours;
}
