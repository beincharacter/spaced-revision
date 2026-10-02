import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen, EmptyState, PageHeader, SectionHeading, Surface, TextAction } from '@/components/ui';
import { RevisionRow } from '@/components/RevisionRow';
import { getDashboardData, getTodayString, markRevisionNeedsPractice, markRevisionWell, skipRevision } from '@/lib/revision-data';
import { syncRevisionReminders } from '@/lib/revision-reminders';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme';
import type { Revision } from '@/types';

type DashboardState = Awaited<ReturnType<typeof getDashboardData>>;

export default function TodayScreen() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = getTodayString();

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setDashboard(await getDashboardData(user.id));
      void syncRevisionReminders(user.id).catch((reminderError: unknown) => {
        const message = reminderError instanceof Error ? reminderError.message : 'Unable to refresh revision reminders.';
        console.warn(message);
      });
    } catch (error) {
      Alert.alert('Could not load your plan', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const due = useMemo(() => (dashboard?.revisions ?? []).filter((revision) => revision.scheduled_date <= today), [dashboard, today]);
  const upcoming = useMemo(() => (dashboard?.revisions ?? []).filter((revision) => revision.scheduled_date > today).slice(0, 4), [dashboard, today]);

  async function handleRevisionAction(revision: Revision, action: 'well' | 'practice' | 'skip') {
    if (!user) return;
    setBusyId(revision.id);
    try {
      if (action === 'well') await markRevisionWell(user.id, revision);
      if (action === 'practice') await markRevisionNeedsPractice(user.id, revision);
      if (action === 'skip') await skipRevision(user.id, revision.id);
      await refresh();
    } catch (error) {
      Alert.alert('Could not update this revision', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const firstName = String(user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'student').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const progressTotal = due.length + (dashboard?.completedToday ?? 0);
  const progressRatio = progressTotal ? Math.min(1, (dashboard?.completedToday ?? 0) / progressTotal) : 0;

  return (
    <AppScreen>
      <PageHeader
        eyebrow={todayLabel}
        title={`${greeting}, ${firstName}`}
        subtitle="A little progress today adds up."
        right={<View style={styles.headerMark}><Ionicons name="flash" size={18} color={colors.primary} /></View>}
      />

      <Surface style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View style={styles.progressCopy}>
            <Text style={styles.progressEyebrow}>TODAY’S MOMENTUM</Text>
            <Text style={styles.progressTitle}>{dashboard?.completedToday ?? 0} reviewed</Text>
            <Text style={styles.progressCaption}>{due.length ? `${due.length} still due — you’ve got this.` : 'Your plan is clear for today.'}</Text>
          </View>
          <View style={styles.progressNumber}><Text style={styles.progressNumberText}>{Math.round(progressRatio * 100)}%</Text></View>
        </View>
        <View style={styles.track}><View style={[styles.trackFill, { width: `${progressRatio * 100}%` }]} /></View>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{dashboard?.subjectCount ?? 0}</Text><Text style={styles.statLabel}>subjects</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{due.length}</Text><Text style={styles.statLabel}>due now</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{upcoming.length}</Text><Text style={styles.statLabel}>coming up</Text></View>
        </View>
      </Surface>

      <View>
        <SectionHeading title="Due now" action={<TextAction label="See calendar" onPress={() => router.push('/(tabs)/calendar')} />} />
        {loading && !dashboard ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!loading && due.length === 0 ? (
          <Surface style={styles.emptyCard}>
            <EmptyState
              icon={<Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />}
              title="You’re all caught up"
              body="A new review will appear here when it’s time."
              action={<TextAction label="Add a topic" onPress={() => router.push('/(tabs)/subjects')} />}
            />
          </Surface>
        ) : null}
        <View style={styles.list}>
          {due.map((revision) => (
            <RevisionRow
              key={revision.id}
              revision={revision}
              busy={busyId === revision.id}
              onWell={() => void handleRevisionAction(revision, 'well')}
              onPractice={() => void handleRevisionAction(revision, 'practice')}
              onSkip={() => void handleRevisionAction(revision, 'skip')}
            />
          ))}
        </View>
      </View>

      {upcoming.length > 0 ? (
        <View>
          <SectionHeading title="Coming up" action={<TextAction label="View all" onPress={() => router.push('/(tabs)/calendar')} />} />
          <Surface style={styles.upcomingCard}>
            {upcoming.map((revision, index) => (
              <View key={revision.id} style={[styles.upcomingRow, index > 0 && styles.upcomingBorder]}>
                <View style={styles.upcomingDate}><Text style={styles.upcomingDateText}>{new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${revision.scheduled_date}T12:00:00`))}</Text></View>
                <View style={styles.upcomingCopy}>
                  <Text style={styles.upcomingTopic} numberOfLines={1}>{revision.topic?.name ?? 'Revision topic'}</Text>
                  <Text style={styles.upcomingSubject} numberOfLines={1}>{revision.topic?.subject?.name ?? 'Subject'}</Text>
                </View>
                <Text style={styles.upcomingDateLabel}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${revision.scheduled_date}T12:00:00`))}</Text>
              </View>
            ))}
          </Surface>
        </View>
      ) : null}

      {loading && dashboard ? <Pressable onPress={() => void refresh()} style={styles.refreshHint}><Ionicons name="refresh" size={14} color={colors.muted} /><Text style={styles.refreshText}>Refreshing your plan…</Text></Pressable> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primarySoft },
  progressCard: { padding: 18, backgroundColor: colors.ink, borderColor: colors.ink, gap: 16 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  progressCopy: { flex: 1 },
  progressEyebrow: { color: '#B9B5FF', fontSize: 9, fontWeight: '800', letterSpacing: 1.15 },
  progressTitle: { marginTop: 7, color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  progressCaption: { marginTop: 5, color: '#C4CAD7', fontSize: 11 },
  progressNumber: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#7770E5', borderRadius: 18 },
  progressNumberText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  track: { height: 6, overflow: 'hidden', borderRadius: 999, backgroundColor: '#3B455A' },
  trackFill: { height: 6, borderRadius: 999, backgroundColor: '#928BFF' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  statLabel: { marginTop: 3, color: '#AAB4C7', fontSize: 9, fontWeight: '600' },
  statDivider: { width: 1, height: 27, backgroundColor: '#465064' },
  list: { gap: 9 },
  loader: { paddingVertical: 20 },
  emptyCard: { paddingVertical: 0 },
  upcomingCard: { paddingVertical: 3 },
  upcomingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11 },
  upcomingBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  upcomingDate: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primarySoft },
  upcomingDateText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  upcomingCopy: { flex: 1 },
  upcomingTopic: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  upcomingSubject: { marginTop: 3, color: colors.muted, fontSize: 10 },
  upcomingDateLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  refreshHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  refreshText: { color: colors.muted, fontSize: 10 },
});
