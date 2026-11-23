import { createClient } from '@/lib/supabase/server'
import { deleteCalendarEvent, refreshAccessToken } from '@/lib/google-calendar'
import { NextResponse } from 'next/server'
import { addSeconds, isPast, parseISO } from 'date-fns'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { revisionId, eventId } = await request.json()
  if (!revisionId && !eventId) return NextResponse.json({ error: 'revisionId or eventId required' }, { status: 400 })

  const table = eventId ? 'events' : 'revisions'
  const recordId = eventId || revisionId

  // Load the record to get google_event_id
  const { data: revision } = await supabase
    .from(table)
    .select('id, google_event_id, user_id')
    .eq('id', recordId)
    .eq('user_id', user.id)
    .single()

  if (!revision) return NextResponse.json({ error: `${eventId ? 'Event' : 'Revision'} not found` }, { status: 404 })

  // Delete from Google Calendar if synced
  if (revision.google_event_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', user.id)
      .single()

    let accessToken = profile?.google_access_token
    if (accessToken && profile?.google_token_expiry && isPast(parseISO(profile.google_token_expiry))) {
      if (profile.google_refresh_token) {
        const refreshed = await refreshAccessToken(profile.google_refresh_token)
        if (!refreshed.error) {
          accessToken = refreshed.access_token
          await supabase.from('profiles').update({
            google_access_token: accessToken,
            google_token_expiry: addSeconds(new Date(), refreshed.expires_in || 3600).toISOString(),
          }).eq('id', user.id)
        }
      }
    }

    if (accessToken) {
      await deleteCalendarEvent(accessToken, revision.google_event_id)
    }
  }

  // Delete record from Supabase
  await supabase.from(table).delete().eq('id', recordId)

  return NextResponse.json({ deleted: true })
}
