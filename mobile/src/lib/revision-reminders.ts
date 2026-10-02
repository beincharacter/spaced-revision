import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getTodayString } from '@/lib/revision-data';
import { supabase } from '@/lib/supabase';

export type ReminderPreferences = {
  enabled: boolean;
  hour: number;
};

export type ReminderPermissionStatus = 'granted' | 'not-granted' | 'blocked' | 'unavailable';

export const REMINDER_TIME_OPTIONS = [
  { hour: 8, label: '8 AM' },
  { hour: 9, label: '9 AM' },
  { hour: 19, label: '7 PM' },
] as const;

const DEFAULT_PREFERENCES: ReminderPreferences = { enabled: false, hour: 9 };
const REMINDER_KIND = 'revision-reminder';
const ANDROID_CHANNEL_ID = 'revision-reminders';
const MAX_SCHEDULED_REMINDER_DATES = 60;
const REVISION_QUERY_PAGE_SIZE = 1000;
const preferenceKey = (userId: string) => `reviseflow.revision-reminders.${userId}`;
const syncsInProgress = new Map<string, Promise<number>>();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export function areRevisionRemindersSupported() {
  return Platform.OS !== 'web';
}

export async function getReminderPermissionStatus(): Promise<ReminderPermissionStatus> {
  if (!areRevisionRemindersSupported()) return 'unavailable';

  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'not-granted' : 'blocked';
}

export async function getReminderPreferences(userId: string): Promise<ReminderPreferences> {
  if (!areRevisionRemindersSupported()) return DEFAULT_PREFERENCES;

  const stored = await SecureStore.getItemAsync(preferenceKey(userId));
  if (!stored) return DEFAULT_PREFERENCES;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFERENCES;

    const { enabled, hour } = parsed as Partial<ReminderPreferences>;
    const allowedHour = REMINDER_TIME_OPTIONS.some((option) => option.hour === hour);
    if (typeof enabled !== 'boolean' || typeof hour !== 'number' || !allowedHour) return DEFAULT_PREFERENCES;

    return { enabled, hour };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function saveReminderPreferences(userId: string, preferences: ReminderPreferences) {
  if (!areRevisionRemindersSupported()) return;
  await SecureStore.setItemAsync(preferenceKey(userId), JSON.stringify(preferences));
}

export async function requestRevisionReminderPermission() {
  if (!areRevisionRemindersSupported()) return false;
  await configureAndroidChannel();

  const currentPermission = await Notifications.getPermissionsAsync();
  if (currentPermission.granted) return true;

  const requestedPermission = await Notifications.requestPermissionsAsync();
  return requestedPermission.granted;
}

export async function cancelRevisionReminders() {
  if (!areRevisionRemindersSupported()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminderIds = scheduled
    .filter((notification) => notification.content.data?.kind === REMINDER_KIND)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier));

  await Promise.all(reminderIds);
}

export function syncRevisionReminders(userId: string) {
  if (!areRevisionRemindersSupported()) return Promise.resolve(0);

  const previousSync = syncsInProgress.get(userId) ?? Promise.resolve(0);
  const sync = previousSync
    .catch(() => 0)
    .then(() => syncRevisionRemindersForUser(userId));

  syncsInProgress.set(userId, sync);
  const clearSync = () => {
    if (syncsInProgress.get(userId) === sync) syncsInProgress.delete(userId);
  };
  void sync.then(clearSync, clearSync);

  return sync;
}

async function syncRevisionRemindersForUser(userId: string) {
  const preferences = await getReminderPreferences(userId);
  const permissionStatus = await getReminderPermissionStatus();

  if (!preferences.enabled || permissionStatus !== 'granted') {
    await cancelRevisionReminders();
    return 0;
  }

  await configureAndroidChannel();
  const revisionsByDate = new Map<string, number>();
  const today = getTodayString();
  let offset = 0;
  let reachedEnd = false;
  let reachedDateLimit = false;

  while (!reachedEnd && !reachedDateLimit) {
    const { data, error } = await supabase
      .from('revisions')
      .select('scheduled_date')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('scheduled_date', today)
      .order('scheduled_date')
      .range(offset, offset + REVISION_QUERY_PAGE_SIZE - 1);

    if (error) throw error;

    for (const revision of data ?? []) {
      if (!revisionsByDate.has(revision.scheduled_date) && revisionsByDate.size >= MAX_SCHEDULED_REMINDER_DATES) {
        reachedDateLimit = true;
        break;
      }
      revisionsByDate.set(revision.scheduled_date, (revisionsByDate.get(revision.scheduled_date) ?? 0) + 1);
    }

    offset += data?.length ?? 0;
    reachedEnd = (data?.length ?? 0) < REVISION_QUERY_PAGE_SIZE;
  }

  const now = new Date();
  const reminders = [...revisionsByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([scheduledDate, count]) => {
      const [year, month, day] = scheduledDate.split('-').map(Number);
      const reminderDate = new Date(year, month - 1, day, preferences.hour, 0, 0, 0);
      if (Number.isNaN(reminderDate.getTime()) || reminderDate <= now) return [];

      const dateLabel = new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(reminderDate);

      return [{ count, dateLabel, reminderDate }];
    });

  await cancelRevisionReminders();

  for (const reminder of reminders) {
    const reviewLabel = reminder.count === 1 ? '1 revision is' : `${reminder.count} revisions are`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'ReviseFlow study reminder',
        body: `${reviewLabel} scheduled for ${reminder.dateLabel}. Tap to open your plan.`,
        data: { kind: REMINDER_KIND, route: '/(tabs)' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.reminderDate,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  }

  return reminders.length;
}

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Revision reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5145CD',
  });
}
