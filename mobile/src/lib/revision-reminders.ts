import { differenceInCalendarDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getTodayString } from '@/lib/revision-data';
import { supabase } from '@/lib/supabase';

export type ReminderPreferences = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ReminderPermissionStatus = 'granted' | 'not-granted' | 'blocked' | 'unavailable';

export function formatReminderTime(hour: number, minute: number) {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

const DEFAULT_PREFERENCES: ReminderPreferences = { enabled: false, hour: 9, minute: 0 };
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

    const { enabled, hour, minute } = parsed as Partial<ReminderPreferences>;
    const validHour = typeof hour === 'number' && hour >= 0 && hour <= 23;
    const validMinute = typeof minute === 'number' && minute >= 0 && minute <= 59;
    if (typeof enabled !== 'boolean' || !validHour) return DEFAULT_PREFERENCES;

    return { enabled, hour, minute: validMinute ? minute : 0 };
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
      const reminderDate = new Date(year, month - 1, day, preferences.hour, preferences.minute, 0, 0);
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

const EXAM_COUNTDOWN_KIND = 'exam-countdown-reminder';
const EXAM_COUNTDOWN_ANDROID_CHANNEL_ID = 'exam-countdown';
const examCountdownPreferenceKey = (userId: string) => `reviseflow.exam-countdown.${userId}`;

export type ExamCountdownPreferences = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT_EXAM_COUNTDOWN_PREFERENCES: ExamCountdownPreferences = { enabled: true, hour: 9, minute: 0 };

export async function getExamCountdownPreferences(userId: string): Promise<ExamCountdownPreferences> {
  if (!areRevisionRemindersSupported()) return DEFAULT_EXAM_COUNTDOWN_PREFERENCES;

  const stored = await SecureStore.getItemAsync(examCountdownPreferenceKey(userId));
  if (!stored) return DEFAULT_EXAM_COUNTDOWN_PREFERENCES;

  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_EXAM_COUNTDOWN_PREFERENCES;

    const { enabled, hour, minute } = parsed as Partial<ExamCountdownPreferences>;
    const validHour = typeof hour === 'number' && hour >= 0 && hour <= 23;
    const validMinute = typeof minute === 'number' && minute >= 0 && minute <= 59;
    if (typeof enabled !== 'boolean' || !validHour) return DEFAULT_EXAM_COUNTDOWN_PREFERENCES;

    return { enabled, hour, minute: validMinute ? minute : 0 };
  } catch {
    return DEFAULT_EXAM_COUNTDOWN_PREFERENCES;
  }
}

export async function saveExamCountdownPreferences(userId: string, preferences: ExamCountdownPreferences) {
  if (!areRevisionRemindersSupported()) return;
  await SecureStore.setItemAsync(examCountdownPreferenceKey(userId), JSON.stringify(preferences));
}

async function cancelExamCountdownReminder() {
  if (!areRevisionRemindersSupported()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const reminderIds = scheduled
    .filter((notification) => notification.content.data?.kind === EXAM_COUNTDOWN_KIND)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier));

  await Promise.all(reminderIds);
}

async function configureExamCountdownAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(EXAM_COUNTDOWN_ANDROID_CHANNEL_ID, {
    name: 'Exam countdown',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#5145CD',
  });
}

const MAX_SCHEDULED_COUNTDOWN_DAYS = 60;

export async function syncExamCountdownReminder(userId: string, examName: string | null, targetExamDate: string | null) {
  if (!areRevisionRemindersSupported()) return 0;

  const preferences = await getExamCountdownPreferences(userId);
  const permissionStatus = await getReminderPermissionStatus();

  await cancelExamCountdownReminder();

  if (!preferences.enabled || permissionStatus !== 'granted' || !targetExamDate) {
    return 0;
  }

  await configureExamCountdownAndroidChannel();

  const [year, month, day] = targetExamDate.split('-').map(Number);
  const examDate = new Date(year, month - 1, day, 12);
  const now = new Date();

  let scheduled = 0;
  for (let offset = 0; offset < MAX_SCHEDULED_COUNTDOWN_DAYS; offset += 1) {
    const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, preferences.hour, preferences.minute, 0, 0);
    if (reminderDate <= now) continue;

    const daysLeft = Math.max(0, differenceInCalendarDays(examDate, reminderDate));
    if (daysLeft <= 0 && offset > 0) break;

    const examLabel = examName ? `your ${examName} exam` : 'your exam';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: daysLeft === 0 ? "It's exam day!" : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
        body: daysLeft === 0 ? `Today is ${examLabel}. Good luck!` : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left for ${examLabel}. Keep going.`,
        data: { kind: EXAM_COUNTDOWN_KIND, route: '/(tabs)' },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        ...(Platform.OS === 'android' ? { channelId: EXAM_COUNTDOWN_ANDROID_CHANNEL_ID } : {}),
      },
    });
    scheduled += 1;

    if (daysLeft <= 0) break;
  }

  return scheduled;
}
