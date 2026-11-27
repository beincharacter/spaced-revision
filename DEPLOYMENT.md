# ReviseFlow — Deployment

This covers deploying the web app and distributing the mobile app for testing.

## Web app (Next.js)

Deployed on Vercel from the `main` branch — pushing to `main` triggers an automatic deploy.

Required environment variables (Vercel project settings → Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Any Google OAuth / Calendar API server-side credentials used by `app/api/calendar/*`

### Supabase Auth URL configuration

Authentication → URL Configuration, in the Supabase dashboard:

- **Site URL**: the production web app URL (`https://spacedrevision.beincharacter.online`)
- **Redirect URLs** (allow-list, supports wildcards):
  - `reviseflow://**` — mobile app custom scheme (standalone/dev-client builds)
  - `exp://**` — mobile app running inside Expo Go (dev/testing sessions)

If a redirect URL isn't matched here, Supabase silently falls back to the Site URL — this is the cause if sign-in ever redirects somewhere unexpected instead of back into the app.

### Google OAuth consent screen

Configured in Google Cloud Console → APIs & Services → OAuth consent screen:

- App name must match the name shown on the live homepage ("ReviseFlow")
- App domain fields (home page, privacy policy, terms of service) must point at the live, publicly-viewable pages:
  - `https://spacedrevision.beincharacter.online/`
  - `https://spacedrevision.beincharacter.online/privacy`
  - `https://spacedrevision.beincharacter.online/terms`
- Authorized domains must include `beincharacter.online`
- Google site verification: the meta tag lives in `app/layout.tsx` (`metadata.verification.google`)

## Mobile app (Expo)

The mobile app (`mobile/`) is distributed to testers via **EAS Update**, which lets anyone with Expo Go open the app from a permanent link — no App Store/Play Store account or paid developer membership required for this stage.

### One-time setup (already done)

- EAS project linked: `@beincharacter/reviseflow-mobile` (project ID in `mobile/app.json` under `expo.extra.eas.projectId`)
- `expo-updates` installed and configured (`expo.updates.url` in `app.json`)
- An EAS Update channel named `preview`, connected to the `preview` branch
- `EXPO_PUBLIC_*` env vars set on EAS's own cloud environment-variable store for the `preview` environment (`eas env:set preview --name ... --value ... --visibility plaintext`) — **these are separate from `mobile/.env.local`**. `eas update` reads env vars from this cloud store, not from the local `.env.local` file, so if Supabase sign-in ever shows "Add Supabase values to `mobile/.env.local`" on a published update, check `eas env:list preview` first before assuming the local file is wrong.

### Publishing an update

From `mobile/`:

```bash
npx eas-cli update --branch preview --message "describe what changed" --environment preview
```

Anyone who has already opened the permanent link below gets the new version automatically the next time they launch the app in Expo Go — no new link needs to be shared.

### Permanent link for testers

Opening the bare `u.expo.dev` manifest URL in a phone browser fails with a "runtime-version/platform required" error — a plain browser request doesn't send the headers Expo Go normally injects automatically, so `runtime-version` (pinned to the `app.json` version) and `platform` must be passed as query params instead:

**iOS:**
```
https://u.expo.dev/5db52354-9d4c-4ea9-88cd-a7e1fe98d983?channel-name=preview&runtime-version=1.0.0&platform=ios
```

**Android:**
```
https://u.expo.dev/5db52354-9d4c-4ea9-88cd-a7e1fe98d983?channel-name=preview&runtime-version=1.0.0&platform=android
```

These always serve the *latest* update published to the `preview` channel (unlike a per-update EAS Dashboard URL, which is frozen to one specific publish). If `app.json`'s `expo.version` is ever bumped, update `runtime-version` in these links to match (runtime version policy is `appVersion`).

Testers need:
1. The **Expo Go** app installed, matching the project's current SDK version (currently SDK 58):
   - iOS: `https://expo.dev/go?sdkVersion=58&platform=ios&device=true`
   - Android: `https://expo.dev/go?sdkVersion=58&platform=android&device=true`
2. Open the matching link above (iOS or Android) in their phone's browser — it redirects into Expo Go.

### Moving beyond Expo Go later

- **Android**: a standalone installable `.apk` can be built for free via `eas build --platform android --profile preview` (no Google Play account needed to just sideload the file).
- **iOS**: distributing to other people's iPhones outside Expo Go (TestFlight or ad-hoc) requires a paid Apple Developer Program membership ($99/year) — there's no free route on Apple's side for this.
- Either kind of build should set `channel: "preview"` (or a dedicated channel) so it keeps receiving `eas update` pushes the same way Expo Go does now.
