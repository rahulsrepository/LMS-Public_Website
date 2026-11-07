import { Link } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, MapPin, ShieldCheck, Users } from 'lucide-react'
import { PublicLayout } from '../../components/PublicLayout'
import { Logo } from '../../components/Logo'
import { FAQS, PARTNERS, TESTIMONIALS, WHY_POINTS } from '../../lib/catalog'
import { inr } from '../../lib/format'
import { useLms } from '../../lib/store'
import { useTitle } from '../useTitle'

export default function HomePage() {
  const { state } = useLms()
  useTitle('')
  const courses = state.courses.slice(0, 6)

  return (
    <PublicLayout>
      <section className="relative min-h-[640px]">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-[1.05fr_0.8fr] lg:py-20">
          <div className="rise rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Campus to Corporate
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.05] text-brand-800 sm:text-6xl">Build Your Future in Technology</h1>
            <p className="mt-3 font-display text-2xl text-ink">C2C Academy</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              A classroom for Java, Python, web, data and testing. Train on live labs, finish a project you can explain, and prepare for interviews with faculty who stay for the doubts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/courses" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md">Explore Courses</Link>
              <Link to="/enroll" className="rounded-full bg-gold-400 px-5 py-3 text-sm font-semibold text-brand-900 shadow-md">Enroll Now</Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-5">
              {[
                ['C2C', 'Campus to Corporate'],
                ['11', 'Career tracks'],
                ['Lab-first', 'Every batch'],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-xl text-brand-800">{value}</p>
                  <p className="text-xs text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto hidden h-80 w-80 items-center justify-center lg:flex">
            <div className="absolute h-56 w-56 rounded-full bg-white/70 blur-2xl" />
            <div className="relative grid place-items-center rounded-full bg-white/80 p-6 shadow-2xl backdrop-blur">
              <Logo className="h-36 w-36" />
              <p className="mt-2 text-center font-display text-lg text-brand-800">C2C</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Academy</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-3 rounded-[28px] bg-gradient-to-r from-brand-800 to-brand-600 p-4 text-white sm:grid-cols-4">
          {[
            [Users, 'Classroom batches', 'Small labs, named faculty'],
            [BookOpen, 'Project reviews', 'Work you can demo'],
            [ShieldCheck, 'Language labs', 'Code, query and present'],
            [Award, 'Placement desk', 'Mocks, resume, referrals'],
          ].map(([Icon, title, text]) => (
            <div key={title} className="rounded-2xl bg-white/10 p-4">
              <Icon size={18} />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="text-sm text-white/75">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" id="courses">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Courses</p>
            <h2 className="mt-1 font-display text-3xl">Choose a track. Learn it properly.</h2>
          </div>
          <Link to="/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">View all courses <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.slug}`} className="rounded-[28px] border border-line bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
              <span className="rounded-full bg-gold-200 px-2.5 py-1 text-xs font-bold text-amber-900">{course.accent}</span>
              <h3 className="mt-4 font-display text-xl">{course.name}</h3>
              <p className="mt-2 text-sm text-muted">{course.summary}</p>
              <p className="mt-4 text-sm font-semibold text-brand-800">{course.duration} · {inr(course.fee)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-brand-50/70 py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Why students stay</p>
            <h2 className="mt-2 font-display text-3xl">Training that respects your time</h2>
            <p className="mt-3 text-muted">Six things families usually ask about before they enroll. We would rather be specific than sound grand.</p>
            <Link to="/why" className="mt-5 inline-flex rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Why choose us</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {WHY_POINTS.slice(0, 4).map((point) => (
              <article key={point.title} className="rounded-3xl bg-white p-4 soft-shadow">
                <h3 className="font-semibold">{point.title}</h3>
                <p className="mt-1 text-sm text-muted">{point.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Placements</p>
        <h2 className="mt-2 font-display text-3xl">Practice the interview before you attend one</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {PARTNERS.map((name) => (
            <span key={name} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold tracking-wide text-slate-600">{name}</span>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((story) => (
            <blockquote key={story.name} className="rounded-[28px] bg-brand-800 p-5 text-white">
              <p className="text-sm leading-relaxed text-white/90">“{story.quote}”</p>
              <footer className="mt-4 text-sm font-semibold">{story.name} · {story.role}</footer>
            </blockquote>
          ))}
        </div>
        <Link to="/placements" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">Placement stories <ArrowRight size={16} /></Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-6 rounded-[32px] bg-white p-6 soft-shadow lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl">Questions families ask</h2>
            <div className="mt-4 divide-y divide-line">
              {FAQS.slice(0, 4).map((item) => (
                <details key={item.q} className="py-3">
                  <summary className="cursor-pointer font-semibold">{item.q}</summary>
                  <p className="pt-2 text-sm text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white">
            <MapPin />
            <h3 className="mt-4 font-display text-3xl">Visit the campus</h3>
            <p className="mt-2 text-sm text-white/80">Talk to a counsellor about timing, fees and whether the course matches what you want to do next.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/contact" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-brand-800">Contact</Link>
              <Link to="/enroll" className="rounded-full bg-gold-400 px-4 py-2.5 text-sm font-semibold text-brand-900">Enroll Now</Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
