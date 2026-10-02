import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { ActionButton, AppScreen, Field, PageHeader, Pill, SectionHeading, Surface } from '@/components/ui';
import { openGoogleAuth } from '@/lib/auth';
import { getProfile, saveRevisionIntervals } from '@/lib/revision-data';
import {
  areRevisionRemindersSupported,
  getReminderPermissionStatus,
  getReminderPreferences,
  REMINDER_TIME_OPTIONS,
  requestRevisionReminderPermission,
  saveReminderPreferences,
  syncRevisionReminders,
  type ReminderPermissionStatus,
  type ReminderPreferences,
} from '@/lib/revision-reminders';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme';
import { REVISION_CYCLE_PRESETS, REVISION_INTERVALS, type Profile } from '@/types';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [intervalDraft, setIntervalDraft] = useState(REVISION_INTERVALS.join(', '));
  const [reminderPreferences, setReminderPreferences] = useState<ReminderPreferences>({ enabled: false, hour: 9 });
  const [reminderPermission, setReminderPermission] = useState<ReminderPermissionStatus>('unavailable');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [nextProfile, nextReminderPreferences, nextPermissionStatus] = await Promise.all([
        getProfile(user.id),
        getReminderPreferences(user.id),
        getReminderPermissionStatus(),
      ]);
      setProfile(nextProfile);
      setIntervalDraft((nextProfile?.revision_intervals?.length ? nextProfile.revision_intervals : REVISION_INTERVALS).join(', '));
      setReminderPreferences(nextReminderPreferences);
      setReminderPermission(nextPermissionStatus);
    } catch (error) {
      Alert.alert('Could not load settings', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  function choosePreset(intervals: number[]) {
    setIntervalDraft(intervals.join(', '));
  }

  async function saveIntervals() {
    if (!user) return;
    const intervals = [...new Set(intervalDraft.split(/[\s,]+/).map(Number).filter(Number.isFinite))].sort((left, right) => left - right);
    if (!intervals.length || intervals.length > 12 || intervals.some((days) => days < 1 || days > 365)) {
      Alert.alert('Check your intervals', 'Enter 1–12 whole numbers between 1 and 365, separated by commas.');
      return;
    }

    setSaving(true);
    try {
      await saveRevisionIntervals(user.id, intervals);
      await refresh();
      Alert.alert('Schedule saved', `New topics will use ${intervals.join(', ')} day intervals.`);
    } catch (error) {
      Alert.alert('Could not save schedule', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function updateReminderPreferences(nextPreferences: ReminderPreferences) {
    if (!user || !areRevisionRemindersSupported()) return;

    setSavingReminders(true);
    try {
      if (nextPreferences.enabled) {
        const permissionGranted = await requestRevisionReminderPermission();
        const nextPermissionStatus = await getReminderPermissionStatus();
        setReminderPermission(nextPermissionStatus);
        if (!permissionGranted) {
          Alert.alert(
            'Notifications are off',
            nextPermissionStatus === 'blocked'
              ? 'Allow notifications for ReviseFlow in your phone settings, then try again.'
              : 'Allow notifications when your phone asks so revision reminders can arrive.'
          );
          return;
        }
      }

      await saveReminderPreferences(user.id, nextPreferences);
      setReminderPreferences(nextPreferences);
      const scheduledCount = await syncRevisionReminders(user.id);

      if (nextPreferences.enabled) {
        const timeLabel = REMINDER_TIME_OPTIONS.find((option) => option.hour === nextPreferences.hour)?.label ?? '9 AM';
        Alert.alert('Reminders enabled', `${scheduledCount} upcoming revision dates are set for ${timeLabel}.`);
      } else {
        Alert.alert('Reminders paused', 'This phone will no longer send revision reminders.');
      }
    } catch (error) {
      Alert.alert('Could not update reminders', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSavingReminders(false);
    }
  }

  async function connectCalendar() {
    setConnecting(true);
    try {
      const result = await openGoogleAuth('calendar-link');
      if (result === 'success') {
        await refresh();
        Alert.alert('Google connected', 'Calendar access is ready for future revision syncs.');
      }
    } catch (error) {
      Alert.alert('Could not connect Google', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setConnecting(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out of ReviseFlow?', 'Your saved subjects and progress will remain in your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut().catch((error) => Alert.alert('Could not sign out', error.message)) },
    ]);
  }

  return (
    <AppScreen>
      <PageHeader eyebrow="Your account" title="Settings" subtitle="Tune your revision plan and connections." />

      <Surface style={styles.accountCard}>
        <View style={styles.accountAvatar}><Ionicons name="person" size={19} color={colors.primary} /></View>
        <View style={styles.accountCopy}>
          <Text style={styles.accountName}>{String(user?.user_metadata?.full_name ?? 'ReviseFlow student')}</Text>
          <Text style={styles.accountEmail}>{user?.email ?? 'Signed-in account'}</Text>
        </View>
        <View style={styles.secureTag}><Ionicons name="shield-checkmark" size={12} color={colors.success} /><Text style={styles.secureText}>Secure</Text></View>
      </Surface>

      <View>
        <SectionHeading title="Study reminders" />
        <Surface style={styles.settingsCard}>
          <View style={styles.reminderToggle}>
            <View style={styles.reminderCopy}>
              <Text style={styles.reminderTitle}>Revision alerts</Text>
              <Text style={styles.body}>Get one phone notification on days when a review is scheduled.</Text>
            </View>
            <Switch
              accessibilityLabel="Revision reminders"
              accessibilityRole="switch"
              disabled={!areRevisionRemindersSupported() || savingReminders || loading}
              onValueChange={(enabled) => void updateReminderPreferences({ ...reminderPreferences, enabled })}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#D8DDE8', true: colors.primary }}
              value={reminderPreferences.enabled}
            />
          </View>
          <Text style={styles.formLabel}>Reminder time</Text>
          <View style={styles.reminderTimeRow}>
            {REMINDER_TIME_OPTIONS.map((option) => (
              <Pill
                key={option.hour}
                label={option.label}
                selected={reminderPreferences.hour === option.hour}
                onPress={areRevisionRemindersSupported() && !savingReminders
                  ? () => void updateReminderPreferences({ ...reminderPreferences, hour: option.hour })
                  : undefined}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            {Platform.OS === 'web'
              ? 'On-device reminders are available in the iOS and Android apps.'
              : reminderPermission === 'blocked'
                ? 'Notifications are blocked in your phone settings; allow them there to receive reminders.'
                : reminderPermission === 'not-granted'
                  ? 'Your phone will ask permission the first time you turn reminders on.'
                  : 'Reminders are scheduled on this phone and refreshed when you open the app.'}
          </Text>
        </Surface>
      </View>

      <View>
        <SectionHeading title="Revision cycle" />
        <Surface style={styles.settingsCard}>
          <Text style={styles.body}>Choose how many days after studying each review should happen. This affects new schedules.</Text>
          <Field
            label="Days between first study and reviews"
            keyboardType="numbers-and-punctuation"
            onChangeText={setIntervalDraft}
            placeholder="1, 4, 7, 21"
            value={intervalDraft}
          />
          <Text style={styles.hint}>Use commas. For example: 1, 4, 7, 21.</Text>
          <Text style={styles.formLabel}>Quick picks</Text>
          <ScrollView horizontal contentContainerStyle={styles.presetRow} showsHorizontalScrollIndicator={false}>
            {REVISION_CYCLE_PRESETS.map((preset) => (
              <Pill key={preset.name} label={preset.name} selected={intervalDraft === preset.intervals.join(', ')} onPress={() => choosePreset(preset.intervals)} />
            ))}
          </ScrollView>
          <ActionButton label="Save revision cycle" onPress={() => void saveIntervals()} busy={saving || loading} />
        </Surface>
      </View>

      <View>
        <SectionHeading title="Calendar connection" />
        <Surface style={styles.settingsCard}>
          <View style={styles.connectionRow}>
            <View style={styles.calendarIcon}><Ionicons name="calendar-outline" size={18} color={colors.primary} /></View>
            <View style={styles.connectionCopy}>
              <Text style={styles.connectionTitle}>Google Calendar</Text>
              <Text style={styles.body}>{profile?.google_access_token ? 'Connected to your Google account.' : 'Connect your account to sync upcoming reviews.'}</Text>
            </View>
            <View style={[styles.statusDot, profile?.google_access_token && styles.statusDotConnected]} />
          </View>
          {!profile?.google_access_token ? (
            <ActionButton label="Connect Google Calendar" tone="secondary" icon={<Ionicons name="link-outline" size={16} color={colors.primary} />} onPress={() => void connectCalendar()} busy={connecting} />
          ) : (
            <Text style={styles.connectedNote}>Sync is available from the Calendar tab. Google tokens stay on the server-backed profile.</Text>
          )}
        </Surface>
      </View>

      <Surface style={styles.aboutCard}>
        <View style={styles.aboutIcon}><Ionicons name="flash" size={18} color={colors.primary} /></View>
        <View style={styles.aboutCopy}>
          <Text style={styles.aboutTitle}>ReviseFlow Mobile</Text>
          <Text style={styles.aboutBody}>Your web and mobile plans share the same account and revision history.</Text>
        </View>
      </Surface>

      <ActionButton label="Sign out" tone="secondary" icon={<Ionicons name="log-out-outline" size={17} color={colors.ink} />} onPress={confirmSignOut} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  accountAvatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primarySoft },
  accountCopy: { flex: 1 },
  accountName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  accountEmail: { marginTop: 3, color: colors.muted, fontSize: 10 },
  secureTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secureText: { color: colors.success, fontSize: 9, fontWeight: '700' },
  settingsCard: { gap: 13 },
  reminderToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderCopy: { flex: 1, gap: 4 },
  reminderTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  reminderTimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  body: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  hint: { marginTop: -7, color: colors.muted, fontSize: 9 },
  formLabel: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  presetRow: { gap: 8, paddingRight: 6 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendarIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft },
  connectionCopy: { flex: 1, gap: 3 },
  connectionTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  statusDot: { width: 9, height: 9, borderRadius: 999, backgroundColor: '#E4A256' },
  statusDotConnected: { backgroundColor: '#38A56B' },
  connectedNote: { color: colors.success, fontSize: 10, lineHeight: 15 },
  aboutCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  aboutIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft },
  aboutCopy: { flex: 1 },
  aboutTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  aboutBody: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 15 },
});
