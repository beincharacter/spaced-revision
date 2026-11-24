import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — ReviseFlow',
}

export default function TermsPage() {
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
            <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-slate-400 text-sm mt-1">Last updated: November 24, 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">1. Acceptance of terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              By creating an account or using ReviseFlow, you agree to these Terms of Service and our
              Privacy Policy. If you do not agree, please do not use the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">2. The service</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              ReviseFlow helps you organise subjects and topics, schedules spaced revisions, and optionally
              syncs those revisions to Google Calendar. We may add, change, or remove features over time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">3. Your account</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You are responsible for keeping your account credentials secure and for all activity under
              your account. Let us know immediately if you suspect unauthorised access.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">4. Your content</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You retain ownership of the subjects, topics, and notes you create. You grant us permission to
              store and process this content solely to provide the service to you.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">5. Acceptable use</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Do not use ReviseFlow to store unlawful content, attempt to disrupt the service, or access
              accounts that are not yours.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">6. Disclaimer and limitation of liability</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              ReviseFlow is provided &quot;as is&quot; without warranties of any kind. We are not liable for exam
              outcomes, missed revisions, or data loss, to the fullest extent permitted by law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">7. Termination</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              You may stop using ReviseFlow at any time. We may suspend or terminate accounts that violate
              these terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">8. Changes to these terms</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We may update these terms from time to time. Continued use of ReviseFlow after changes means
              you accept the updated terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">9. Contact</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Questions about these terms? Reach out at{' '}
              <a href="mailto:support@reviseflow.app" className="text-indigo-600 hover:underline">support@reviseflow.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
