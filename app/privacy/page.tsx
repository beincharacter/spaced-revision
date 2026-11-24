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
              ReviseFlow (&quot;we&quot;, &quot;us&quot;) is a spaced-repetition study planner. This policy explains
              what information we collect, how we use it, and the choices you have.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">2. Information we collect</h2>
            <ul className="list-disc list-inside text-sm text-slate-600 leading-relaxed space-y-1">
              <li>Account details you provide — email address and name — when you sign in with Google or a magic link.</li>
              <li>Study data you create — subjects, topics, subtopics, revision schedules, and custom calendar events.</li>
              <li>If you connect Google Calendar, a Google access/refresh token used only to create and remove revision events on your calendar.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">3. How we use your information</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We use your data solely to operate ReviseFlow: scheduling revisions, displaying your progress,
              and syncing events to Google Calendar when you choose to connect it. We do not sell your data
              or share it with third parties for advertising.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">4. Data storage</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your data is stored in our Supabase-hosted database. Access is restricted to your own account
              through row-level security — other users cannot see your subjects, topics, or revisions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">5. Google user data</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              If you connect Google Calendar, ReviseFlow only requests the minimum scopes needed to create,
              update, and delete calendar events it created on your behalf. We do not read your existing
              calendar events or other Google account data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">6. Your choices</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You can disconnect Google Calendar at any time from Settings. You can delete subjects, topics,
              or your account entirely by contacting us, which removes your data from our systems.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">7. Contact</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Questions about this policy? Reach out at{' '}
              <a href="mailto:support@reviseflow.app" className="text-indigo-600 hover:underline">support@reviseflow.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
