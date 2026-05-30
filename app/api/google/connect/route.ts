import { createClient } from '@/lib/supabase/server'
import { getGoogleAuthUrl } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  // Guard: must be signed in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/', origin))
  }

  // Guard: env vars must be present
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL('/settings?gcal=missing_config', origin)
    )
  }

  const redirectUri = `${origin}/api/google/callback`
  const authUrl = getGoogleAuthUrl(redirectUri)
  return NextResponse.redirect(authUrl)
}
