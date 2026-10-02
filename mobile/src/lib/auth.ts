import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { EmailOtpType, Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const authRedirectUrl = Linking.createURL('/auth/callback');

const googleScopes = 'openid email profile https://www.googleapis.com/auth/calendar.events';
const handledCallbacks = new Set<string>();

async function saveCalendarGrant(session: Session | null) {
  if (!session?.provider_token) return;

  const update: Record<string, string> = {
    google_access_token: session.provider_token,
    google_token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  if (session.provider_refresh_token) {
    update.google_refresh_token = session.provider_refresh_token;
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', session.user.id);
  if (error) throw error;
}

export async function completeAuthCallback(url: string) {
  const parsedUrl = new URL(url);
  const query = parsedUrl.searchParams;
  const fragment = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
  const code = query.get('code');

  if (code) {
    if (handledCallbacks.has(code)) return;
    handledCallbacks.add(code);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      handledCallbacks.delete(code);
      throw error;
    }
    await saveCalendarGrant(data.session);
    return;
  }

  const tokenHash = query.get('token_hash') ?? fragment.get('token_hash');
  if (tokenHash) {
    if (handledCallbacks.has(tokenHash)) return;
    handledCallbacks.add(tokenHash);
    const otpType = (query.get('type') ?? fragment.get('type') ?? 'magiclink') as EmailOtpType;
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error) {
      handledCallbacks.delete(tokenHash);
      throw error;
    }
    await saveCalendarGrant(data.session);
    return;
  }

  const accessToken = fragment.get('access_token') ?? query.get('access_token');
  const refreshToken = fragment.get('refresh_token') ?? query.get('refresh_token');
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    await saveCalendarGrant(data.session);
  }

  const authError = query.get('error_description') ?? query.get('error');
  if (authError) throw new Error(decodeURIComponent(authError.replace(/\+/g, ' ')));
}

type GoogleAuthMode = 'sign-in' | 'calendar-link';

export async function openGoogleAuth(mode: GoogleAuthMode) {
  const options = {
    redirectTo: authRedirectUrl,
    scopes: googleScopes,
    skipBrowserRedirect: true,
    queryParams: { access_type: 'offline', prompt: 'consent' },
  };

  const result = mode === 'sign-in'
    ? await supabase.auth.signInWithOAuth({ provider: 'google', options })
    : await supabase.auth.linkIdentity({ provider: 'google', options });

  if (result.error) throw result.error;
  if (!result.data.url) throw new Error('Google did not return a sign-in URL.');

  const browserResult = await WebBrowser.openAuthSessionAsync(result.data.url, authRedirectUrl);
  if (browserResult.type === 'success' && browserResult.url) {
    await completeAuthCallback(browserResult.url);
    return 'success' as const;
  }

  return browserResult.type;
}

export async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: authRedirectUrl },
  });

  if (error) throw error;
}
