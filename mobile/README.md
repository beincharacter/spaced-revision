# ReviseFlow Mobile

Expo / React Native companion app for the existing ReviseFlow Next.js project. It uses the same Supabase project, tables, per-user revision intervals, and server-side Google Calendar sync route.

## Requirements

- Node.js 22 or newer
- Xcode and an iOS Simulator for local iOS builds, or Android Studio with an Android SDK/emulator for Android
- The existing Supabase project and Google OAuth provider configured for the web app

## Local setup

From this folder:

```sh
npm install
cp .env.example .env.local
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the same public Supabase URL and anon key used by the web app. Never put a service-role key or Google client secret in this app. `EXPO_PUBLIC_WEB_APP_URL` should point at the deployed or locally running Next.js app; it is used only for the authenticated Google Calendar sync endpoint.

In Supabase Auth URL Configuration, allow the mobile redirect URI:

```text
reviseflow://auth/callback
```

The Google provider also needs the Calendar Events scope enabled. Google sign-in requests this scope so the app can save the provider token to the signed-in user's own profile row; the existing Next.js route refreshes tokens and creates calendar events server-side.

## Run

Start the Expo development server:

```sh
npm start
```

Press `i` for the iOS Simulator or `a` for an Android emulator. For native OAuth/deep-link testing, create a development build after installing the platform toolchain:

```sh
npx expo run:ios
npx expo run:android
```

Expo Go is useful for the screens, but full Google and email-link sign-in depends on the app's `reviseflow://` scheme and is best tested in a development build.

## Revision reminders

The app schedules on-device notifications for up to the next 60 distinct pending revision dates, grouped into one alert per day. Choose 8 AM, 9 AM, or 7 PM in Settings; reminders are refreshed when you sign in, start a topic plan, open Today, or return to the app. Notification permission is requested only when you turn reminders on. The preference is stored securely on this device.

These are local scheduled notifications, so they do not need APNs/FCM credentials or a push server. To apply the native notification configuration, rebuild after installing dependencies with `npx expo run:ios` or `npx expo run:android`. Remote server-pushed alerts for changes made while the app is closed are not configured.

## Shared project code

The mobile Metro config watches the repository root so the app can import the existing `types/` and `lib/spaced-repetition.ts` modules. Supabase row-level security remains the data access boundary. The Next.js `/api/calendar/sync` route accepts either its existing cookie session or a validated Supabase bearer token from the mobile app.
