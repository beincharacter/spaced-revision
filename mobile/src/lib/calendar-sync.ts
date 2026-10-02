const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL?.replace(/\/+$/, '');

export async function syncGoogleCalendar(accessToken: string) {
  if (!webAppUrl) throw new Error('Set EXPO_PUBLIC_WEB_APP_URL before syncing Google Calendar.');

  const response = await fetch(`${webAppUrl}/api/calendar/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reminderMinutes: 9 * 60,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string; message?: string; synced?: number };
  if (!response.ok) throw new Error(payload.error ?? 'Google Calendar sync failed.');
  return payload;
}
