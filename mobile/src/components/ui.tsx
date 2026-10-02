import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, shadows } from '@/theme';

export function AppScreen({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function ActionButton({
  label,
  onPress,
  tone = 'primary',
  icon,
  busy = false,
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'quiet' | 'success' | 'warning';
  icon?: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const buttonStyle = tone === 'primary'
    ? styles.primaryButton
    : tone === 'success'
      ? styles.successButton
      : tone === 'warning'
        ? styles.warningButton
        : tone === 'secondary'
          ? styles.secondaryButton
          : styles.quietButton;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [buttonStyle, compact && styles.compactButton, (disabled || busy) && styles.disabledButton, pressed && !disabled && styles.pressedButton]}
    >
      {busy ? <ActivityIndicator color={tone === 'primary' ? '#FFFFFF' : colors.primary} size="small" /> : icon}
      <Text style={[styles.buttonText, tone !== 'primary' && tone !== 'success' && tone !== 'warning' && styles.secondaryButtonText, compact && styles.compactButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextAction({ label, onPress, color = colors.primary }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      {({ pressed }) => <Text style={[styles.textAction, { color }, pressed && styles.dimmed]}>{label}</Text>}
    </Pressable>
  );
}

export function Pill({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const content = <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>;
  if (!onPress) return <View style={[styles.pill, selected && styles.pillSelected]}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pill, selected && styles.pillSelected, pressed && styles.dimmed]}>
      {content}
    </Pressable>
  );
}

export function Field({ label, error, ...inputProps }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        style={[styles.input, inputProps.multiline && styles.multilineInput, error && styles.inputError]}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function LoadingState({ label = 'Loading your study plan…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <Text style={styles.sheetClose}>×</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  headerCopy: { flex: 1 },
  eyebrow: { marginBottom: 7, color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.05, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 11 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  surface: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, ...shadows.card },
  primaryButton: { minHeight: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  successButton: { minHeight: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: colors.successSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  warningButton: { minHeight: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: colors.warningSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  quietButton: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.slateSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButtonText: { color: colors.ink },
  compactButton: { minHeight: 35, paddingHorizontal: 10, borderRadius: 10 },
  compactButtonText: { fontSize: 11 },
  disabledButton: { opacity: 0.48 },
  pressedButton: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  textAction: { fontSize: 12, fontWeight: '700' },
  dimmed: { opacity: 0.72 },
  pill: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  pillSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  pillTextSelected: { color: colors.primaryDark },
  fieldWrap: { gap: 7 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 11, backgroundColor: colors.surface, color: colors.ink, fontSize: 14 },
  multilineInput: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 11 },
  emptyState: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 30 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyBody: { maxWidth: 260, marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyAction: { marginTop: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 },
  loadingText: { color: colors.muted, fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14, 20, 37, .38)' },
  sheet: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background, gap: 17 },
  sheetHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 999, backgroundColor: '#D5DAE5' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  sheetClose: { color: colors.muted, fontSize: 27, lineHeight: 30 },
});
