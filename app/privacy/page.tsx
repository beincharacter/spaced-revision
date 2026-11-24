import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — ReviseFlow',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">ReviseFlow</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-slate-400 text-sm mt-1">Last updated: November 24, 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">1. Overview</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              ReviseFlow (&quot;ReviseFlow&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a spaced-repetition study
              planner available on the web and as a mobile app. This Privacy Policy explains what
              information we collect when you use ReviseFlow, why we collect it, how it is stored and
              used, who it is shared with (no one, except where stated below), and the controls you have
              over it. By creating an account or using ReviseFlow, you agree to the practices described here.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">2. Information we collect</h2>
            <p className="text-sm text-slate-600 leading-relaxed">We collect only what is needed to run the service:</p>
            <ul className="list-disc list-inside text-sm text-slate-600 leading-relaxed space-y-1.5">
              <li>
                <span className="font-medium text-slate-700">Account information:</span> your email address,
                and your name and profile photo if you sign in with Google. If you sign in with a magic link,
                we only collect the email address you provide.
              </li>
              <li>
                <span className="font-medium text-slate-700">Study content you create:</span> the subjects,
                topics, subtopics, difficulty levels, revision history, and custom calendar events you add
                while using ReviseFlow.
              </li>
              <li>
                <span className="font-medium text-slate-700">Exam preferences:</span> an optional exam name,
                target exam date, and your chosen revision interval presets.
              </li>
              <li>
                <span className="font-medium text-slate-700">Google Calendar data (optional):</span> if you
                choose to connect Google Calendar, we store a Google OAuth access token and refresh token so
                we can create, update, and delete calendar events on your behalf. We do not request or store
                any other data from your Google account.
              </li>
              <li>
                <span className="font-medium text-slate-700">Basic technical data:</span> timestamps of when
                records are created or updated, used only for scheduling and sorting your own data.
              </li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed">
              We do not collect payment information, government ID numbers, health records, or any sensitive
              personal data beyond what is listed above.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">3. How we use your information</h2>
            <p className="text-sm text-slate-600 leading-relaxed">We use the information above only to:</p>
            <ul className="list-disc list-inside text-sm text-slate-600 leading-relaxed space-y-1.5">
              <li>Create and schedule your spaced-revision plan for each topic you add.</li>
              <li>Display your subjects, topics, progress, streaks, and upcoming revisions back to you.</li>
              <li>Create, update, and delete corresponding events in your Google Calendar, if you connect it, and keep that sync up to date.</li>
              <li>Authenticate you and keep your account secure.</li>
              <li>Respond to support requests you send us.</li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed">
              We do <span className="font-medium text-slate-700">not</span> use your data for advertising, do
              not sell or rent your data to anyone, and do not share it with third parties except the
              infrastructure providers described in Section 4, who process it only on our behalf.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">4. Where your data is stored</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your account and study data are stored in a Supabase-hosted PostgreSQL database. Supabase acts
              as our infrastructure provider and does not use your data for its own purposes. Access to your
              records is restricted to your own account through row-level security policies — no other
              ReviseFlow user, and no ReviseFlow staff member outside of resolving a support request you
              initiate, can read your subjects, topics, or revisions in the normal course of operating the
              service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">5. Google user data &amp; the Limited Use policy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you choose to connect Google Calendar, ReviseFlow requests the narrowest possible scope —
              access to create, read, update, and delete calendar events that ReviseFlow itself created. We
              do not read your existing calendar, contacts, email, drive files, or any other Google product
              data, and we never request broader access than this single scope.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              ReviseFlow&apos;s use and transfer of information received from Google APIs to any other app will
              adhere to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Specifically:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 leading-relaxed space-y-1.5">
              <li>We only use Google Calendar data to provide and improve the revision-sync feature you have directly enabled.</li>
              <li>We do not use Google user data for serving advertisements.</li>
              <li>We do not allow humans to read Google user data unless you give us explicit consent for a specific support request, it is required to comply with applicable law, or it is limited to internal operations and has been aggregated and anonymised.</li>
              <li>We do not sell or transfer Google user data to any third party.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">6. Data retention</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We retain your account and study data for as long as your account is active. If you disconnect
              Google Calendar, your Google access and refresh tokens are deleted immediately and are no
              longer used to access your calendar. If you delete your account, we delete your personal data
              and study data from our active database; a copy may persist briefly in routine database
              backups before being purged on our standard backup-rotation schedule.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">7. Your choices and rights</h2>
            <ul className="list-disc list-inside text-sm text-slate-600 leading-relaxed space-y-1.5">
              <li>You can disconnect Google Calendar at any time from Settings, which immediately revokes our stored access and refresh tokens.</li>
              <li>You can delete individual subjects, topics, or custom events at any time directly within the app.</li>
              <li>You can request a full export or deletion of your account and all associated data by emailing us at the address below; we will act on deletion requests within 30 days.</li>
              <li>You can also revoke ReviseFlow&apos;s access to your Google account at any time from your{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Google Account permissions page
                </a>.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">8. Children&apos;s privacy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              ReviseFlow is intended for students preparing for exams such as NEET, JEE, and UPSC, and is not
              directed at children under 13. We do not knowingly collect personal data from children under 13.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">9. Changes to this policy</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will update the &quot;Last updated&quot; date
              above when we do, and material changes will be communicated within the app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">10. Contact us</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Questions about this policy, or requests to access or delete your data? Reach out at{' '}
              <a href="mailto:support@reviseflow.app" className="text-indigo-600 hover:underline">support@reviseflow.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
