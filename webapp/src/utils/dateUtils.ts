/**
 * Date/Time utilities for handling timezone-aware date formatting
 */

/**
 * Format a date string for use in datetime-local input fields.
 * Uses local timezone to avoid UTC conversion issues.
 */
export const formatDateTimeLocal = (dateStr: string | Date): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Format a date string for use in time input fields (HH:mm).
 * Uses local timezone.
 */
export const formatTimeLocal = (dateStr: string | Date): string => {
    const date = new Date(dateStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Check if a date is today in local timezone.
 */
export const isToday = (dateStr: string | Date): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    );
};
