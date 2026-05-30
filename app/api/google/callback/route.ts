import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'
import { addSeconds } from 'date-fns'

function errorRedirect(origin: string, reason: string) {
  const url = new URL('/settings', origin)
  url.searchParams.set('gcal', 'error')
  url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const googleError = searchParams.get('error')

  // Google denied access (user cancelled or misconfigured scope)
  if (googleError) {
    return errorRedirect(origin, googleError)
  }

  if (!code) {
    return errorRedirect(origin, 'no_code')
  }

  // Exchange auth code → tokens
  const redirectUri = `${origin}/api/google/callback`
  const tokens = await exchangeCodeForTokens(code, redirectUri)

  if (tokens.error) {
    // Common errors: invalid_client (wrong secret), redirect_uri_mismatch
    console.error('[Google OAuth] token exchange failed:', tokens.error, tokens.error_description)
    return errorRedirect(origin, tokens.error)
  }

  // Persist tokens on the user's profile
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/', origin))
  }

  const expiry = addSeconds(new Date(), tokens.expires_in || 3600).toISOString()
  const { error: dbError } = await supabase.from('profiles').update({
    google_access_token: tokens.access_token,
    google_refresh_token: tokens.refresh_token,
    google_token_expiry: expiry,
  }).eq('id', user.id)

  if (dbError) {
    console.error('[Google OAuth] profile update failed:', dbError.message)
    return errorRedirect(origin, 'db_error')
  }

  return NextResponse.redirect(new URL('/settings?gcal=connected', origin))
}
