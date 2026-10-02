import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton, AppScreen, EmptyState, Field, PageHeader, Pill, Sheet, Surface, TextAction } from '@/components/ui';
import { formatStudyDate, getSubjectWorkspace, startTopicSchedule, createSubject, createTopic } from '@/lib/revision-data';
import { syncRevisionReminders } from '@/lib/revision-reminders';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme';
import { SUBJECT_COLORS, type Topic } from '@/types';

type WorkspaceState = Awaited<ReturnType<typeof getSubjectWorkspace>>;

export default function SubjectsScreen() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceState>({ subjects: [], topics: [], revisions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjectSheetOpen, setSubjectSheetOpen] = useState(false);
  const [topicSheetOpen, setTopicSheetOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [topicName, setTopicName] = useState('');
  const [topicSubjectId, setTopicSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState<Topic['difficulty']>('medium');
  const [busyTopicId, setBusyTopicId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setWorkspace(await getSubjectWorkspace(user.id));
    } catch (error) {
      Alert.alert('Could not load subjects', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const topicCount = workspace.topics.length;
  const latestRevisionByTopic = useMemo(() => {
    const map = new Map<string, string>();
    workspace.revisions.forEach((revision) => {
      if (!map.has(revision.topic_id)) map.set(revision.topic_id, revision.scheduled_date);
    });
    return map;
  }, [workspace.revisions]);

  function openTopicSheet(subjectId: string) {
    setTopicSubjectId(subjectId);
    setTopicName('');
    setDifficulty('medium');
    setTopicSheetOpen(true);
  }

  async function saveSubject() {
    const name = subjectName.trim();
    if (!user || !name) {
      Alert.alert('Add a subject name', 'Give this subject a short name to continue.');
      return;
    }
    setSaving(true);
    try {
      await createSubject(user.id, name, subjectColor);
      setSubjectName('');
      setSubjectSheetOpen(false);
      await refresh();
    } catch (error) {
      Alert.alert('Could not add subject', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveTopic() {
    const name = topicName.trim();
    if (!user || !topicSubjectId || !name) {
      Alert.alert('Complete the topic details', 'Choose a subject and add a topic name.');
      return;
    }
    setSaving(true);
    try {
      await createTopic(user.id, topicSubjectId, name, difficulty);
      setTopicName('');
      setTopicSheetOpen(false);
      await refresh();
    } catch (error) {
      Alert.alert('Could not add topic', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStartPlan(topic: Topic) {
    if (!user) return;
    setBusyTopicId(topic.id);
    try {
      await startTopicSchedule(user.id, topic);
      void syncRevisionReminders(user.id).catch((reminderError: unknown) => {
        const message = reminderError instanceof Error ? reminderError.message : 'Unable to refresh revision reminders.';
        console.warn(message);
      });
      await refresh();
      Alert.alert('Revision plan started', `Your reviews for “${topic.name}” are on the schedule.`);
    } catch (error) {
      Alert.alert('Could not start this plan', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyTopicId(null);
    }
  }

  return (
    <>
      <AppScreen>
        <PageHeader
          eyebrow="Build your study space"
          title="Subjects & topics"
          subtitle={`${workspace.subjects.length} subject${workspace.subjects.length === 1 ? '' : 's'} · ${topicCount} topic${topicCount === 1 ? '' : 's'}`}
          right={<ActionButton compact label="Add subject" icon={<Ionicons name="add" size={17} color="#FFFFFF" />} onPress={() => setSubjectSheetOpen(true)} />}
        />

        {loading && workspace.subjects.length === 0 ? <View style={styles.loading}><Text style={styles.loadingText}>Loading your subjects…</Text></View> : null}

        {!loading && workspace.subjects.length === 0 ? (
          <Surface style={styles.emptySurface}>
            <EmptyState
              icon={<Ionicons name="library-outline" size={22} color={colors.primary} />}
              title="Start with a subject"
              body="Create a subject, add a topic, then start its first revision cycle."
              action={<ActionButton label="Add your first subject" onPress={() => setSubjectSheetOpen(true)} />}
            />
          </Surface>
        ) : null}

        <View style={styles.subjectList}>
          {workspace.subjects.map((subject) => {
            const subjectTopics = workspace.topics.filter((topic) => topic.subject_id === subject.id);
            return (
              <Surface key={subject.id} style={styles.subjectCard}>
                <View style={styles.subjectHead}>
                  <View style={[styles.subjectSwatch, { backgroundColor: subject.color || colors.primary }]} />
                  <View style={styles.subjectCopy}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectMeta}>{subjectTopics.length} topic{subjectTopics.length === 1 ? '' : 's'}</Text>
                  </View>
                  <TextAction label="＋ Topic" onPress={() => openTopicSheet(subject.id)} />
                </View>

                {subjectTopics.length ? (
                  <View style={styles.topicList}>
                    {subjectTopics.map((topic) => {
                      const nextDate = latestRevisionByTopic.get(topic.id);
                      const hasStarted = Boolean(topic.first_studied_at);
                      return (
                        <View key={topic.id} style={styles.topicRow}>
                          <View style={styles.topicMark}><Ionicons name="bookmark-outline" size={14} color={colors.primary} /></View>
                          <View style={styles.topicCopy}>
                            <Text style={styles.topicName} numberOfLines={1}>{topic.name}</Text>
                            <Text style={styles.topicMeta} numberOfLines={1}>
                              {nextDate ? `Next review · ${formatStudyDate(nextDate)}` : hasStarted ? 'Cycle complete' : 'Ready to schedule'}
                            </Text>
                          </View>
                          {!hasStarted ? (
                            <ActionButton
                              compact
                              label="Start"
                              onPress={() => void handleStartPlan(topic)}
                              busy={busyTopicId === topic.id}
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noTopics}><Text style={styles.noTopicsText}>No topics yet</Text><TextAction label="Add one" onPress={() => openTopicSheet(subject.id)} /></View>
                )}
              </Surface>
            );
          })}
        </View>
      </AppScreen>

      <Sheet visible={subjectSheetOpen} title="Add a subject" onClose={() => setSubjectSheetOpen(false)}>
        <Field label="Subject name" onChangeText={setSubjectName} placeholder="e.g. Biology" value={subjectName} maxLength={60} returnKeyType="done" />
        <View style={styles.colorField}>
          <Text style={styles.formLabel}>Choose a color</Text>
          <View style={styles.colorRow}>
            {SUBJECT_COLORS.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="button"
                accessibilityLabel={`Choose ${color}`}
                onPress={() => setSubjectColor(color)}
                style={[styles.colorChoice, { backgroundColor: color }, subjectColor === color && styles.colorChoiceSelected]}
              />
            ))}
          </View>
        </View>
        <ActionButton label="Save subject" onPress={() => void saveSubject()} busy={saving} />
      </Sheet>

      <Sheet visible={topicSheetOpen} title="Add a topic" onClose={() => setTopicSheetOpen(false)}>
        <Field label="Topic name" onChangeText={setTopicName} placeholder="e.g. Cell structure" value={topicName} maxLength={80} returnKeyType="done" />
        <View style={styles.colorField}>
          <Text style={styles.formLabel}>Difficulty</Text>
          <View style={styles.pillRow}>
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <Pill key={level} label={level.charAt(0).toUpperCase() + level.slice(1)} selected={difficulty === level} onPress={() => setDifficulty(level)} />
            ))}
          </View>
        </View>
        <ActionButton label="Save topic" onPress={() => void saveTopic()} busy={saving} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  subjectList: { gap: 13 },
  subjectCard: { padding: 15, gap: 13 },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  subjectSwatch: { width: 12, height: 36, borderRadius: 8 },
  subjectCopy: { flex: 1 },
  subjectName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  subjectMeta: { marginTop: 3, color: colors.muted, fontSize: 10 },
  topicList: { borderTopWidth: 1, borderTopColor: colors.line },
  topicRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  topicMark: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primarySoft },
  topicCopy: { flex: 1 },
  topicName: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  topicMeta: { marginTop: 4, color: colors.muted, fontSize: 9 },
  noTopics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  noTopicsText: { color: colors.muted, fontSize: 11 },
  loading: { padding: 22, alignItems: 'center' },
  loadingText: { color: colors.muted, fontSize: 12 },
  emptySurface: { paddingVertical: 0 },
  colorField: { gap: 9 },
  formLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  colorChoice: { width: 25, height: 25, borderRadius: 999 },
  colorChoiceSelected: { borderWidth: 3, borderColor: colors.ink },
  pillRow: { flexDirection: 'row', gap: 8 },
});
