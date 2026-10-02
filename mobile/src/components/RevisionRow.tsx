import { Ionicons } from '@expo/vector-icons';
import { Text, View, StyleSheet } from 'react-native';

import { ActionButton, Surface } from '@/components/ui';
import { formatStudyDate, getTodayString } from '@/lib/revision-data';
import { colors } from '@/theme';
import type { Revision } from '@/types';

export function RevisionRow({
  revision,
  onWell,
  onPractice,
  onSkip,
  busy = false,
}: {
  revision: Revision;
  onWell: () => void;
  onPractice: () => void;
  onSkip: () => void;
  busy?: boolean;
}) {
  const today = getTodayString();
  const isOverdue = revision.scheduled_date < today;
  const isToday = revision.scheduled_date === today;

  return (
    <Surface style={styles.card}>
      <View style={styles.rowTop}>
        <View style={[styles.dateBadge, isOverdue && styles.overdueBadge, isToday && styles.todayBadge]}>
          <Text style={[styles.dateDay, (isOverdue || isToday) && styles.urgentText]}>{formatStudyDate(revision.scheduled_date, { day: 'numeric' })}</Text>
          <Text style={[styles.dateMonth, (isOverdue || isToday) && styles.urgentText]}>{formatStudyDate(revision.scheduled_date, { month: 'short' })}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.topic} numberOfLines={1}>{revision.topic?.name ?? 'Revision topic'}</Text>
          <Text style={styles.subject} numberOfLines={1}>{revision.topic?.subject?.name ?? 'Subject'} · Review {revision.revision_number}</Text>
          <Text style={[styles.when, isOverdue && styles.overdueText]}>{isOverdue ? 'Overdue' : isToday ? 'Due today' : 'Upcoming'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color={colors.faint} />
      </View>
      <View style={styles.actions}>
        <ActionButton compact label="Revised well" tone="success" icon={<Ionicons name="checkmark" size={14} color={colors.success} />} onPress={onWell} busy={busy} />
        <ActionButton compact label="Needs practice" tone="warning" icon={<Ionicons name="refresh" size={13} color={colors.warning} />} onPress={onPractice} busy={busy} />
        <ActionButton compact label="Tomorrow" tone="quiet" onPress={onSkip} busy={busy} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 13, gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  dateBadge: { width: 42, height: 47, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.slateSoft },
  todayBadge: { backgroundColor: colors.primarySoft },
  overdueBadge: { backgroundColor: colors.warningSoft },
  dateDay: { color: colors.ink, fontSize: 15, fontWeight: '800', lineHeight: 18 },
  dateMonth: { color: colors.muted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  urgentText: { color: colors.primaryDark },
  copy: { flex: 1 },
  topic: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  subject: { marginTop: 3, color: colors.muted, fontSize: 10 },
  when: { marginTop: 5, color: colors.primary, fontSize: 10, fontWeight: '700' },
  overdueText: { color: colors.warning },
  actions: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
});
