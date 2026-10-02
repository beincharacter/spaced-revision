import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { completeAuthCallback } from '@/lib/auth';
import { cancelRevisionReminders, syncRevisionReminders } from '@/lib/revision-reminders';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.warn('Unable to restore the Supabase session:', error.message);
      setSession(data.session);
      setLoading(false);
    });

    const handleUrl = (url: string) => {
      completeAuthCallback(url).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unable to finish sign-in.';
        console.warn(message);
      });
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const syncReminders = () => {
      void syncRevisionReminders(userId).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unable to refresh revision reminders.';
        console.warn(message);
      });
    };

    syncReminders();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') syncReminders();
    });

    return () => appStateSubscription.remove();
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      void cancelRevisionReminders().catch((reminderError: unknown) => {
        const message = reminderError instanceof Error ? reminderError.message : 'Unable to clear revision reminders.';
        console.warn(message);
      });
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
