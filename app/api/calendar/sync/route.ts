import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createCalendarEvent, refreshAccessToken } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'
import { addSeconds, isPast, parseISO } from 'date-fns'

async function getRequestClient(request: Request) {
  const bearerToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (bearerToken) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${bearerToken}` } },
      }
    )
    const { data: { user } } = await supabase.auth.getUser(bearerToken)
    return { supabase, user }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

async function getValidAccessToken(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single()

  if (!profile?.google_access_token) return null

  let accessToken = profile.google_access_token
  if (profile.google_token_expiry && isPast(parseISO(profile.google_token_expiry))) {
    if (!profile.google_refresh_token) return null
    const refreshed = await refreshAccessToken(profile.google_refresh_token)
    if (refreshed.error) return null
    accessToken = refreshed.access_token
    await supabase.from('profiles').update({
      google_access_token: accessToken,
      google_token_expiry: addSeconds(new Date(), refreshed.expires_in || 3600).toISOString(),
    }).eq('id', userId)
  }

  return accessToken
}

export async function POST(request: Request) {
  const { supabase, user } = await getRequestClient(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  // reminderMinutes: -1 = no reminder; otherwise minutes from midnight (e.g. 9*60 = 9:00 AM)
  const reminderMinutes: number = body.reminderMinutes ?? 9 * 60
  // IANA timezone sent by the browser so events fire at the right local time
  const timeZone: string | undefined = body.timeZone || undefined

  const accessToken = await getValidAccessToken(supabase, user.id)
  if (!accessToken) {
    return NextResponse.json({ error: 'Google Calendar not connected or token expired — please reconnect' }, { status: 400 })
  }

  const { data: revisions } = await supabase
    .from('revisions')
    .select('*, topic:topics(name, subject:subjects(name))')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .is('google_event_id', null)
    .order('scheduled_date')
    .limit(250)

  if (!revisions || revisions.length === 0) {
    return NextResponse.json({ synced: 0, message: 'All revisions are already synced' })
  }

  let synced = 0
  let failed = 0

  for (const rev of revisions) {
    const topicName = (rev.topic as { name: string })?.name || 'Unknown Topic'
    const subjectName = (rev.topic as { subject?: { name: string } })?.subject?.name

    const event = await createCalendarEvent(accessToken, {
      title: `Revise — ${topicName}`,
      date: rev.scheduled_date,
      description: [
        subjectName ? `Subject: ${subjectName}` : '',
        `Revision #${rev.revision_number}`,
        '',
        'ofcourse ILOVEYOU <3',
      ].filter(Boolean).join('\n'),
      reminderMinutes,
      timeZone,
    })

    if (event.id) {
      await supabase.from('revisions').update({ google_event_id: event.id }).eq('id', rev.id)
      synced++
    } else {
      failed++
    }
  }

  return NextResponse.json({
    synced,
    failed,
    message: `${synced} revision${synced !== 1 ? 's' : ''} synced to Google Calendar`,
  })
}

export { getValidAccessToken }
