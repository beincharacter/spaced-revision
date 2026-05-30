// NEXT_PUBLIC_ prefix makes this available on both server and client.
// GOOGLE_CLIENT_SECRET must stay server-only (no NEXT_PUBLIC_).
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export function getGoogleAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    error?: string
    error_description?: string
  }>
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  error?: string
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  return res.json()
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    title: string
    date: string          // YYYY-MM-DD
    description: string
    reminderMinutes?: number   // minutes from midnight, e.g. 9*60 = 9 AM; -1 = no reminder
    timeZone?: string          // IANA timezone, e.g. 'Asia/Kolkata' — required for timed events
  }
): Promise<{ id: string; error?: string }> {
  const wantsReminder = event.reminderMinutes !== undefined && event.reminderMinutes >= 0

  // Google Calendar all-day (date) event reminders fire X minutes BEFORE midnight of the event date.
  // So minutes=540 → 9 hrs before midnight → 3 PM the day before. Wrong.
  //
  // Fix: when the user picks a reminder time, create a TIMED (dateTime) event at that exact hour
  // so the popup fires precisely when they want it on the revision day itself.
  let start: Record<string, string>
  let end: Record<string, string>

  if (wantsReminder && event.timeZone) {
    const h = Math.floor(event.reminderMinutes! / 60)
    const m = event.reminderMinutes! % 60
    // 30-minute event block at the chosen time
    const endMinTotal = event.reminderMinutes! + 30
    const endH = Math.floor(endMinTotal / 60) % 24
    const endM = endMinTotal % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    start = { dateTime: `${event.date}T${pad(h)}:${pad(m)}:00`, timeZone: event.timeZone }
    end   = { dateTime: `${event.date}T${pad(endH)}:${pad(endM)}:00`, timeZone: event.timeZone }
  } else {
    // No reminder chosen → keep as a silent all-day event
    start = { date: event.date }
    end   = { date: event.date }
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start,
      end,
      reminders: {
        useDefault: false,
        // popup fires at event start time (minutes: 0 = at the event, not before)
        overrides: wantsReminder ? [{ method: 'popup', minutes: 0 }] : [],
      },
    }),
  })
  return res.json()
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
