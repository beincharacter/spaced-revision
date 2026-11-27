import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton, AppScreen, EmptyState, Field, PageHeader, Pill, Sheet, Surface, TextAction } from '@/components/ui';
import { formatStudyDate, getSubjectWorkspace, startTopicSchedule, createSubject, createTopic, deleteSubjects, deleteTopics } from '@/lib/revision-data';
import { syncRevisionReminders } from '@/lib/revision-reminders';
import { useAuth } from '@/providers/auth-provider';
import { colors, shadows } from '@/theme';
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
  const [subtopicsText, setSubtopicsText] = useState('');
  const [busyTopicId, setBusyTopicId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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
    setSubtopicsText('');
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
      const subtopics = subtopicsText.split('\n').map((s) => s.trim()).filter(Boolean);
      await createTopic(user.id, topicSubjectId, name, difficulty, subtopics);
      setTopicName('');
      setSubtopicsText('');
      setTopicSheetOpen(false);
      await refresh();
    } catch (error) {
      Alert.alert('Could not add topic', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) {
        setSelectedSubjectIds(new Set());
        setSelectedTopicIds(new Set());
      }
      return !prev;
    });
  }

  function toggleSubjectSelected(subjectId: string) {
    const subjectTopicIds = workspace.topics.filter((topic) => topic.subject_id === subjectId).map((topic) => topic.id);
    setSelectedSubjectIds((prevSubjects) => {
      const next = new Set(prevSubjects);
      const selecting = !next.has(subjectId);
      if (selecting) next.add(subjectId);
      else next.delete(subjectId);

      setSelectedTopicIds((prevTopics) => {
        const nextTopics = new Set(prevTopics);
        subjectTopicIds.forEach((topicId) => {
          if (selecting) nextTopics.add(topicId);
          else nextTopics.delete(topicId);
        });
        return nextTopics;
      });

      return next;
    });
  }

  function toggleTopicSelected(topicId: string, subjectId: string) {
    const subjectTopicIds = workspace.topics.filter((topic) => topic.subject_id === subjectId).map((topic) => topic.id);
    setSelectedTopicIds((prevTopics) => {
      const nextTopics = new Set(prevTopics);
      const selecting = !nextTopics.has(topicId);
      if (selecting) nextTopics.add(topicId);
      else nextTopics.delete(topicId);

      const allTopicsSelected = subjectTopicIds.length > 0 && subjectTopicIds.every((id) => nextTopics.has(id));
      setSelectedSubjectIds((prevSubjects) => {
        const nextSubjects = new Set(prevSubjects);
        if (allTopicsSelected) nextSubjects.add(subjectId);
        else nextSubjects.delete(subjectId);
        return nextSubjects;
      });

      return nextTopics;
    });
  }

  function confirmDeleteSubject(subject: WorkspaceState['subjects'][number]) {
    Alert.alert(
      `Delete “${subject.name}”?`,
      'This also deletes all of its topics and scheduled revisions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void runDelete(() => deleteSubjects(user!.id, [subject.id])) },
      ],
    );
  }

  function confirmDeleteTopic(topic: Topic) {
    Alert.alert(
      `Delete “${topic.name}”?`,
      'This also deletes its scheduled revisions.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void runDelete(() => deleteTopics(user!.id, [topic.id])) },
      ],
    );
  }

  async function runDelete(action: () => Promise<void>) {
    setDeleting(true);
    try {
      await action();
      await refresh();
    } catch (error) {
      Alert.alert('Could not delete', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function handleBulkDelete() {
    const subjectIds = Array.from(selectedSubjectIds);
    // Topics belonging to a selected subject are already covered by the subject's cascade delete.
    const topicIds = Array.from(selectedTopicIds).filter((topicId) => {
      const topic = workspace.topics.find((t) => t.id === topicId);
      return !topic || !selectedSubjectIds.has(topic.subject_id);
    });
    const subjectCount = subjectIds.length;
    const topicCount = topicIds.length;
    if (!subjectCount && !topicCount) return;
    const parts = [subjectCount ? `${subjectCount} subject${subjectCount === 1 ? '' : 's'}` : null, topicCount ? `${topicCount} topic${topicCount === 1 ? '' : 's'}` : null].filter(Boolean);
    Alert.alert(
      `Delete ${parts.join(' and ')}?`,
      'This also deletes any topics and scheduled revisions that belong to them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void runDelete(async () => {
            if (subjectCount) await deleteSubjects(user!.id, subjectIds);
            if (topicCount) await deleteTopics(user!.id, topicIds);
            setSelectedSubjectIds(new Set());
            setSelectedTopicIds(new Set());
            setSelectMode(false);
          }),
        },
      ],
    );
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
          right={
            <View style={styles.headerActions}>
              {workspace.subjects.length ? (
                <TextAction label={selectMode ? 'Cancel' : 'Select'} onPress={toggleSelectMode} color={colors.muted} />
              ) : null}
              {!selectMode ? (
                <ActionButton compact label="Add subject" icon={<Ionicons name="add" size={17} color="#FFFFFF" />} onPress={() => setSubjectSheetOpen(true)} />
              ) : null}
            </View>
          }
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
            const subjectSelected = selectedSubjectIds.has(subject.id);
            return (
              <Surface key={subject.id} style={styles.subjectCard}>
                <Pressable
                  onLongPress={() => !selectMode && confirmDeleteSubject(subject)}
                  onPress={() => selectMode && toggleSubjectSelected(subject.id)}
                  style={styles.subjectHead}
                >
                  {selectMode ? (
                    <View style={[styles.checkbox, subjectSelected && styles.checkboxSelected]}>
                      {subjectSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                    </View>
                  ) : (
                    <View style={[styles.subjectSwatch, { backgroundColor: subject.color || colors.primary }]} />
                  )}
                  <View style={styles.subjectCopy}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectMeta}>{subjectTopics.length} topic{subjectTopics.length === 1 ? '' : 's'}</Text>
                  </View>
                  {!selectMode ? <TextAction label="＋ Topic" onPress={() => openTopicSheet(subject.id)} /> : null}
                </Pressable>

                {subjectTopics.length ? (
                  <View style={styles.topicList}>
                    {subjectTopics.map((topic) => {
                      const nextDate = latestRevisionByTopic.get(topic.id);
                      const hasStarted = Boolean(topic.first_studied_at);
                      const topicSelected = selectedTopicIds.has(topic.id);
                      return (
                        <Pressable
                          key={topic.id}
                          onLongPress={() => !selectMode && confirmDeleteTopic(topic)}
                          onPress={() => selectMode && toggleTopicSelected(topic.id, subject.id)}
                          style={styles.topicRow}
                        >
                          {selectMode ? (
                            <View style={[styles.checkbox, topicSelected && styles.checkboxSelected]}>
                              {topicSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                            </View>
                          ) : (
                            <View style={styles.topicMark}><Ionicons name="bookmark-outline" size={14} color={colors.primary} /></View>
                          )}
                          <View style={styles.topicCopy}>
                            <Text style={styles.topicName} numberOfLines={1}>{topic.name}</Text>
                            <Text style={styles.topicMeta} numberOfLines={1}>
                              {nextDate ? `Next review · ${formatStudyDate(nextDate)}` : hasStarted ? 'Cycle complete' : 'Ready to schedule'}
                              {topic.subtopics?.length ? ` · ${topic.subtopics.length} subtopic${topic.subtopics.length === 1 ? '' : 's'}` : ''}
                            </Text>
                          </View>
                          {!selectMode && !hasStarted ? (
                            <ActionButton
                              compact
                              label="Start"
                              onPress={() => void handleStartPlan(topic)}
                              busy={busyTopicId === topic.id}
                            />
                          ) : null}
                        </Pressable>
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

      {selectMode && (selectedSubjectIds.size || selectedTopicIds.size) ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkBarText}>
            {selectedSubjectIds.size + selectedTopicIds.size} selected
          </Text>
          <ActionButton tone="danger" compact label="Delete" onPress={handleBulkDelete} busy={deleting} />
        </View>
      ) : null}

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
        <Field
          label="Subtopics (optional)"
          onChangeText={setSubtopicsText}
          placeholder={'One subtopic per line'}
          value={subtopicsText}
          multiline
          numberOfLines={4}
        />
        <ActionButton label="Save topic" onPress={() => void saveTopic()} busy={saving} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  bulkBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.ink,
    ...shadows.card,
  },
  bulkBarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  subjectList: { gap: 13 },
  subjectCard: { padding: 15, gap: 13 },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  subjectSwatch: { width: 12, height: 36, borderRadius: 8 },
  subjectCopy: { flex: 1 },
  subjectName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  subjectMeta: { marginTop: 3, color: colors.muted, fontSize: 10 },
  topicList: { borderTopWidth: 1, borderTopColor: colors.line },
  topicRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 18, borderLeftWidth: 2, borderLeftColor: colors.line, borderBottomWidth: 1, borderBottomColor: colors.line },
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
