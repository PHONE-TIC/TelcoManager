import { useState, useEffect, useCallback } from "react";
import {
  getReminderSettings,
  setReminderSettings,
  scheduleRemindersForInterventions,
  cancelAllReminders,
  getActiveRemindersCount,
  areRemindersSupported,
} from "../services/reminder.service";

interface ReminderSettings {
  enabled: boolean;
  minutesBefore: number;
}

interface UseRemindersReturn {
  isSupported: boolean;
  settings: ReminderSettings;
  activeRemindersCount: number;
  updateSettings: (settings: ReminderSettings) => void;
  scheduleForInterventions: (
    interventions: {
      id: string;
      datePlanifiee: string;
      technicienId?: string;
      titre: string;
      [key: string]: any;
    }[]
  ) => void;
  cancelAll: () => void;
}

export const useReminders = (): UseRemindersReturn => {
  const [isSupported] = useState(() => areRemindersSupported());
  const [settings, setSettings] = useState<ReminderSettings>(() =>
    getReminderSettings()
  );
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);

  // Update count periodically
  useEffect(() => {
    const updateCount = () => {
      setActiveRemindersCount(getActiveRemindersCount());
    };

    updateCount();
    const interval = setInterval(updateCount, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const updateSettings = useCallback((newSettings: ReminderSettings) => {
    setReminderSettings(newSettings);
    setSettings(newSettings);

    // If disabled, cancel all reminders
    if (!newSettings.enabled) {
      cancelAllReminders();
      setActiveRemindersCount(0);
    }
  }, []);

  const scheduleForInterventions = useCallback(
    (
      interventions: {
        id: string;
        datePlanifiee: string;
        technicienId?: string;
        titre: string;
        [key: string]: any;
      }[]
    ) => {
      if (!isSupported || !settings.enabled) {
        return;
      }

      scheduleRemindersForInterventions(interventions);
      setActiveRemindersCount(getActiveRemindersCount());
    },
    [isSupported, settings.enabled]
  );

  const cancelAll = useCallback(() => {
    cancelAllReminders();
    setActiveRemindersCount(0);
  }, []);

  return {
    isSupported,
    settings,
    activeRemindersCount,
    updateSettings,
    scheduleForInterventions,
    cancelAll,
  };
};
