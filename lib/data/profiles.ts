import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export async function signInWithGoogle(redirectTo: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  return { error }
}

export async function signInWithMagicLink(email: string, emailRedirectTo: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  })
  return { error }
}

export async function getProfile() {
  const supabase = createClient()
  const { data } = await supabase.from('profiles').select('*').single()
  return data as (Profile & { google_access_token?: string | null; google_refresh_token?: string | null }) | null
}

export async function getProfileCalendarInfo() {
  const supabase = createClient()
  const { data } = await supabase.from('profiles').select('google_access_token, created_at').single()
  return data as { google_access_token: string | null; created_at: string } | null
}

export async function getProfileRevisionIntervals() {
  const supabase = createClient()
  const { data } = await supabase.from('profiles').select('revision_intervals').single()
  return (data as { revision_intervals: number[] | null } | null)?.revision_intervals || null
}

export async function updateProfile(userId: string, patch: Partial<Profile>) {
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  return { error }
}

export async function disconnectGoogleCalendar(userId: string) {
  return updateProfile(userId, {
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
  } as Partial<Profile>)
}

export async function deleteAllUserData(userId: string) {
  const supabase = createClient()
  await Promise.all([
    supabase.from('revisions').delete().eq('user_id', userId),
    supabase.from('topics').delete().eq('user_id', userId),
    supabase.from('subjects').delete().eq('user_id', userId),
  ])
}
