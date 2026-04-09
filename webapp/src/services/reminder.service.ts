/**
 * Reminder Service
 * Schedules and manages automatic reminders for interventions
 */

import { showNotification } from './notification.service';

// Store scheduled reminder timeouts
const scheduledReminders: Map<string, ReturnType<typeof setTimeout>> = new Map();

// Default reminder time before intervention (in minutes)
const DEFAULT_REMINDER_MINUTES = 30;

// Storage key for reminder settings
const REMINDER_SETTINGS_KEY = 'interventionReminderSettings';

interface ReminderSettings {
    enabled: boolean;
    minutesBefore: number;
}

interface Intervention {
    id: string;
    numero?: number;
    titre: string;
    datePlanifiee: string;
    client?: {
        nom: string;
        rue?: string;
        ville?: string;
    };
}

// Get reminder settings from localStorage
export const getReminderSettings = (): ReminderSettings => {
    try {
        const stored = localStorage.getItem(REMINDER_SETTINGS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error reading reminder settings:', error);
    }
    return { enabled: true, minutesBefore: DEFAULT_REMINDER_MINUTES };
};

// Save reminder settings to localStorage
export const setReminderSettings = (settings: ReminderSettings): void => {
    try {
        localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving reminder settings:', error);
    }
};

// Calculate time until reminder should fire
const getTimeUntilReminder = (datePlanifiee: string, minutesBefore: number): number => {
    const interventionTime = new Date(datePlanifiee).getTime();
    const reminderTime = interventionTime - (minutesBefore * 60 * 1000);
    const now = Date.now();
    return reminderTime - now;
};

// Show reminder notification
const showReminderNotification = (intervention: Intervention, minutesBefore: number): void => {
    const clientName = intervention.client?.nom || 'Client inconnu';
    const address = intervention.client?.rue
        ? `${intervention.client.rue}, ${intervention.client.ville || ''}`
        : '';

    showNotification(
        `⏰ Rappel: Intervention dans ${minutesBefore} min`,
        {
            body: `${intervention.titre}\n${clientName}${address ? '\n📍 ' + address : ''}`,
            tag: `reminder-${intervention.id}`,
        }
    );
};

// Schedule a reminder for a single intervention
export const scheduleReminder = (intervention: Intervention): void => {
    const settings = getReminderSettings();

    if (!settings.enabled) {
        return;
    }

    // Cancel existing reminder for this intervention
    cancelReminder(intervention.id);

    const timeUntilReminder = getTimeUntilReminder(
        intervention.datePlanifiee,
        settings.minutesBefore
    );

    // Only schedule if reminder time is in the future
    if (timeUntilReminder > 0) {
        const timeout = setTimeout(() => {
            showReminderNotification(intervention, settings.minutesBefore);
            scheduledReminders.delete(intervention.id);
        }, timeUntilReminder);

        scheduledReminders.set(intervention.id, timeout);
    }
};

// Cancel a scheduled reminder
export const cancelReminder = (interventionId: string): void => {
    const timeout = scheduledReminders.get(interventionId);
    if (timeout) {
        clearTimeout(timeout);
        scheduledReminders.delete(interventionId);
    }
};

// Cancel all scheduled reminders
export const cancelAllReminders = (): void => {
    scheduledReminders.forEach((timeout) => {
        clearTimeout(timeout);
    });
    scheduledReminders.clear();
};

// Schedule reminders for multiple interventions (typically today's interventions)
export const scheduleRemindersForInterventions = (interventions: Intervention[]): void => {
    const settings = getReminderSettings();

    if (!settings.enabled) {
        return;
    }

    // Filter to only scheduled (planifiee) interventions for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysInterventions = interventions.filter(intervention => {
        const date = new Date(intervention.datePlanifiee);
        return date >= today && date < tomorrow;
    });

    todaysInterventions.forEach(intervention => {
        scheduleReminder(intervention);
    });
};

// Get count of active reminders
export const getActiveRemindersCount = (): number => {
    return scheduledReminders.size;
};

// Check if reminders are supported
export const areRemindersSupported = (): boolean => {
    return 'Notification' in window && Notification.permission === 'granted';
};
