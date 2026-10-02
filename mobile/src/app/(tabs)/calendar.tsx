import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { ActionButton, AppScreen, EmptyState, PageHeader, SectionHeading, Surface } from '@/components/ui';
import { openGoogleAuth } from '@/lib/auth';
import { syncGoogleCalendar } from '@/lib/calendar-sync';
import { formatStudyDate, getCalendarRevisions, getProfile } from '@/lib/revision-data';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme';
import type { Profile, Revision } from '@/types';

export default function CalendarScreen() {
  const { user, session } = useAuth();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [nextRevisions, nextProfile] = await Promise.all([getCalendarRevisions(user.id), getProfile(user.id)]);
      setRevisions(nextRevisions);
      setProfile(nextProfile);
    } catch (error) {
      Alert.alert('Could not load your calendar', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const groups = useMemo(() => {
    const map = new Map<string, Revision[]>();
    revisions.forEach((revision) => map.set(revision.scheduled_date, [...(map.get(revision.scheduled_date) ?? []), revision]));
    return [...map.entries()];
  }, [revisions]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const result = await openGoogleAuth('calendar-link');
      if (result === 'success') {
        await refresh();
        Alert.alert('Google connected', 'Your next revisions can now sync to Google Calendar.');
      }
    } catch (error) {
      Alert.alert('Could not connect Google Calendar', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync() {
    if (!session?.access_token) return;
    setSyncing(true);
    try {
      const result = await syncGoogleCalendar(session.access_token);
      await refresh();
      Alert.alert('Calendar synced', result.message ?? `${result.synced ?? 0} revisions synced.`);
    } catch (error) {
      Alert.alert('Sync did not finish', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppScreen>
      <PageHeader
        eyebrow="Your upcoming plan"
        title="Revision calendar"
        subtitle="A clear look at the next six weeks."
        right={<View style={styles.headerIcon}><Ionicons name="calendar" size={18} color={colors.primary} /></View>}
      />

      <Surface style={styles.syncCard}>
        <View style={styles.syncTop}>
          <View style={styles.googleIcon}><Ionicons name="logo-google" size={19} color={colors.primary} /></View>
          <View style={styles.syncCopy}>
            <Text style={styles.syncTitle}>Google Calendar</Text>
            <Text style={styles.syncBody}>{profile?.google_access_token ? 'Your account is connected.' : 'Connect once to add reminders for your revisions.'}</Text>
          </View>
          <View style={[styles.connectionDot, profile?.google_access_token ? styles.connectedDot : null]} />
        </View>
        <ActionButton
          label={profile?.google_access_token ? 'Sync upcoming revisions' : 'Connect Google Calendar'}
          onPress={() => void (profile?.google_access_token ? handleSync() : handleConnect())}
          busy={syncing || connecting}
          icon={<Ionicons name={profile?.google_access_token ? 'sync-outline' : 'link-outline'} size={16} color="#FFFFFF" />}
        />
        <Text style={styles.syncFootnote}>Sync creates events for pending reviews with a 9:00 AM reminder.</Text>
      </Surface>

      <View>
        <SectionHeading title="Upcoming revisions" />
        {loading && revisions.length === 0 ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!loading && revisions.length === 0 ? (
          <Surface style={styles.emptySurface}>
            <EmptyState
              icon={<Ionicons name="calendar-outline" size={22} color={colors.primary} />}
              title="Your calendar is open"
              body="Start a revision plan from a topic and its dates will appear here."
            />
          </Surface>
        ) : null}
        <View style={styles.groups}>
          {groups.map(([date, dayRevisions]) => (
            <View key={date}>
              <View style={styles.dateHeading}>
                <View style={styles.datePin} />
                <Text style={styles.dateHeadingText}>{formatStudyDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                <Text style={styles.dateCount}>{dayRevisions.length}</Text>
              </View>
              <View style={styles.dayList}>
                {dayRevisions.map((revision) => (
                  <Surface key={revision.id} style={styles.eventRow}>
                    <View style={styles.eventIcon}><Ionicons name={revision.status === 'completed' ? 'checkmark' : 'book-outline'} size={15} color={revision.status === 'completed' ? colors.success : colors.primary} /></View>
                    <View style={styles.eventCopy}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{revision.topic?.name ?? 'Revision topic'}</Text>
                      <Text style={styles.eventSubtitle} numberOfLines={1}>{revision.topic?.subject?.name ?? 'Subject'} · Review {revision.revision_number}</Text>
                    </View>
                    <Text style={[styles.eventStatus, revision.status === 'completed' && styles.completeStatus]}>{revision.status === 'completed' ? 'Done' : revision.google_event_id ? 'Synced' : 'Planned'}</Text>
                  </Surface>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.primarySoft },
  syncCard: { gap: 13, padding: 15 },
  syncTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft },
  syncCopy: { flex: 1 },
  syncTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  syncBody: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 15 },
  connectionDot: { width: 9, height: 9, borderRadius: 999, backgroundColor: '#E4A256' },
  connectedDot: { backgroundColor: '#38A56B' },
  syncFootnote: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  loader: { paddingVertical: 20 },
  emptySurface: { paddingVertical: 0 },
  groups: { gap: 20 },
  dateHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  datePin: { width: 7, height: 7, borderRadius: 999, backgroundColor: colors.primary },
  dateHeadingText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '800' },
  dateCount: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  dayList: { gap: 7 },
  eventRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
  eventIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primarySoft },
  eventCopy: { flex: 1 },
  eventTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  eventSubtitle: { marginTop: 4, color: colors.muted, fontSize: 9 },
  eventStatus: { color: colors.primary, fontSize: 9, fontWeight: '700' },
  completeStatus: { color: colors.success },
});
