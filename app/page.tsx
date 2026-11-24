import Link from 'next/link'
import {
  Zap, CheckCircle2, Calendar, BarChart3, Flame,
  BookOpen, ListChecks, ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: CheckCircle2,
    title: 'Spaced Repetition',
    desc: 'Every topic you add gets a science-backed revision schedule — Day 1, 3, 7, 15, 30, 60, and beyond — so you review right before you would otherwise forget.',
  },
  {
    icon: BookOpen,
    title: 'Subjects, Topics & Subtopics',
    desc: 'Organise everything you study into subjects and topics, with optional subtopic checklists for deeper breakdowns.',
  },
  {
    icon: Calendar,
    title: 'Calendar Integration',
    desc: 'Connect Google Calendar and your revisions sync automatically, with reminders, so your study plan lives where your day already does.',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    desc: 'Heatmaps, subject-by-subject completion rates, and streaks show you exactly how consistent you have been.',
  },
  {
    icon: Flame,
    title: 'Streaks',
    desc: 'Stay motivated with a daily revision streak that keeps you coming back.',
  },
  {
    icon: ListChecks,
    title: 'Bulk Import',
    desc: 'Already have a topic list? Import it in bulk instead of adding everything one by one.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">ReviseFlow</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded-lg px-4 py-2"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28 text-center">
        <p className="text-indigo-600 text-sm font-semibold tracking-wide uppercase mb-4">
          A spaced-revision planner for students
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
          Never miss a revision again
        </h1>
        <p className="text-slate-500 text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
          ReviseFlow is a study planner built around spaced repetition. Add the topics you study,
          and it automatically schedules your revisions at the intervals proven to help you remember
          — then syncs them to your calendar so you never fall behind.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-medium rounded-xl px-6 py-3"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-slate-400 text-sm mt-5">
          Built for NEET PG · MBBS · JEE · UPSC · and more
        </p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Everything you need to actually remember</h2>
          <p className="text-slate-500 mt-3">A simple workflow: add what you study, review on schedule, track your progress.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border border-slate-200 rounded-2xl p-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Ready to build a revision habit that sticks?</h2>
          <p className="text-slate-500 mt-2">Sign in with Google or your email — no credit card required.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 mt-6 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-medium rounded-xl px-6 py-3"
          >
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">ReviseFlow</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
