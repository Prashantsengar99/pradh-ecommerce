// ============================================================
// 🎨 FESTIVAL DETECTOR — Auto-detects active festival
// Based on Indian calendar (Asia/Kolkata timezone)
// ============================================================
import { FESTIVAL_CALENDAR, FESTIVAL_THEMES } from './festivalConfig';

/**
 * Get current date in Indian timezone (Asia/Kolkata)
 * Returns YYYY-MM-DD format string
 */
export const getIndiaDateString = () => {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (330 * 60000));
  return istTime.toISOString().split('T')[0]; // YYYY-MM-DD
};

/**
 * Get current year in Indian timezone
 */
export const getIndiaYear = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (330 * 60000));
  return istTime.getFullYear();
};

/**
 * Check if a date string (YYYY-MM-DD) falls within a range (inclusive)
 */
const isDateInRange = (dateStr, startStr, endStr) => {
  return dateStr >= startStr && dateStr <= endStr;
};

/**
 * Detect which festival is currently active based on Indian calendar
 * @returns {string|null} Festival key (e.g., 'diwali') or null if no festival active
 */
export const detectActiveFestival = () => {
  const today = getIndiaDateString();
  const year = getIndiaYear();

  // Check current year and next year calendars
  const calendars = [FESTIVAL_CALENDAR[year], FESTIVAL_CALENDAR[year + 1]].filter(Boolean);

  for (const calendar of calendars) {
    for (const [festivalKey, dateRange] of Object.entries(calendar)) {
      if (isDateInRange(today, dateRange.start, dateRange.end)) {
        // Verify this festival exists in our themes
        if (FESTIVAL_THEMES[festivalKey] && FESTIVAL_THEMES[festivalKey].isFestival) {
          return festivalKey;
        }
      }
    }
  }

  return null; // No festival active
};

/**
 * Get the detected festival theme object (or default if none active)
 * @returns {object} Theme object from FESTIVAL_THEMES
 */
export const getDetectedFestivalTheme = () => {
  const activeKey = detectActiveFestival();
  if (activeKey && FESTIVAL_THEMES[activeKey]) {
    return FESTIVAL_THEMES[activeKey];
  }
  return FESTIVAL_THEMES.default;
};

/**
 * Get upcoming festival (next one in the calendar)
 * Useful for showing "Coming soon" banners
 * @returns {object|null} { key, theme, daysUntil }
 */
export const getUpcomingFestival = () => {
  const today = getIndiaDateString();
  const year = getIndiaYear();
  const calendars = [FESTIVAL_CALENDAR[year], FESTIVAL_CALENDAR[year + 1]].filter(Boolean);

  let upcoming = null;
  let minDays = Infinity;

  for (const calendar of calendars) {
    for (const [festivalKey, dateRange] of Object.entries(calendar)) {
      if (!FESTIVAL_THEMES[festivalKey]) continue;

      const startDate = new Date(dateRange.start);
      const todayDate = new Date(today);
      const diffDays = Math.ceil((startDate - todayDate) / (1000 * 60 * 60 * 24));

      // Only future festivals (diff > 0 means not yet started)
      if (diffDays > 0 && diffDays < minDays) {
        minDays = diffDays;
        upcoming = {
          key: festivalKey,
          theme: FESTIVAL_THEMES[festivalKey],
          daysUntil: diffDays,
          startDate: dateRange.start,
        };
      }
    }
  }

  return upcoming;
};
