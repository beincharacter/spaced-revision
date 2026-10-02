import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, Field, Surface } from '@/components/ui';
import { openGoogleAuth, sendMagicLink } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme';

export default function SignInScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [sent, setSent] = useState(false);

  if (session) return <Redirect href="/(tabs)" />;

  async function handleGoogleSignIn() {
    if (!isSupabaseConfigured) return;
    setBusy('google');
    try {
      await openGoogleAuth('sign-in');
    } catch (error) {
      Alert.alert('Google sign-in failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleMagicLink() {
    if (!isSupabaseConfigured) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Add your email', 'Enter the email address for your ReviseFlow account.');
      return;
    }

    setBusy('email');
    try {
      await sendMagicLink(trimmedEmail);
      setSent(true);
    } catch (error) {
      Alert.alert('Could not send the link', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.page}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}><Ionicons name="flash" size={20} color="#FFFFFF" /></View>
            <Text style={styles.brandName}>ReviseFlow</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Make every return count</Text>
            <Text style={styles.headline}>Your next revision is right on time.</Text>
            <Text style={styles.subhead}>Pick up your study plan, see what is due, and keep moving forward.</Text>
          </View>

          <Surface style={styles.signInCard}>
            {sent ? (
              <View style={styles.sentState}>
                <View style={styles.sentIcon}><Ionicons name="mail-open-outline" size={23} color={colors.success} /></View>
                <Text style={styles.cardTitle}>Check your inbox</Text>
                <Text style={styles.cardCopy}>Your sign-in link is on its way to {email.trim()}.</Text>
                <Pressable accessibilityRole="button" onPress={() => setSent(false)}>
                  <Text style={styles.tryAgain}>Use another email</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.cardTitle}>Welcome back</Text>
                <Text style={styles.cardCopy}>Sign in to sync your subjects and revision progress.</Text>
                <ActionButton
                  label="Continue with Google"
                  icon={<Text style={styles.googleG}>G</Text>}
                  onPress={handleGoogleSignIn}
                  busy={busy === 'google'}
                  disabled={!isSupabaseConfigured || busy !== null}
                />
                <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or use email</Text><View style={styles.dividerLine} /></View>
                <Field
                  label="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  value={email}
                />
                <ActionButton
                  label="Send a sign-in link"
                  tone="secondary"
                  onPress={handleMagicLink}
                  busy={busy === 'email'}
                  disabled={!isSupabaseConfigured || busy !== null}
                />
              </>
            )}
            {!isSupabaseConfigured ? <Text style={styles.configNotice}>Add Supabase values to `mobile/.env.local` to enable sign-in.</Text> : null}
          </Surface>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.muted} />
            <Text style={styles.footerText}>Your study data stays in your Supabase account.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  page: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 26 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primary },
  brandName: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  hero: { gap: 9 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  headline: { maxWidth: 340, color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 40 },
  subhead: { maxWidth: 330, color: colors.muted, fontSize: 14, lineHeight: 21 },
  signInCard: { padding: 20, gap: 14 },
  cardTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  cardCopy: { marginTop: -8, marginBottom: 2, color: colors.muted, fontSize: 12, lineHeight: 18 },
  googleG: { color: '#4285F4', fontSize: 17, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.faint, fontSize: 10, fontWeight: '600' },
  configNotice: { color: colors.warning, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  sentState: { alignItems: 'center', gap: 11, paddingVertical: 8 },
  sentIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.successSoft },
  tryAgain: { marginTop: 4, color: colors.primary, fontSize: 12, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  footerText: { color: colors.muted, fontSize: 10 },
});
