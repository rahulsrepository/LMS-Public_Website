import { PublicLayout, PageHero } from '../../components/PublicLayout'
import { WHY_POINTS } from '../../lib/catalog'
import { useTitle } from '../useTitle'

export default function AboutPage() {
  useTitle('About Us')
  return (
    <PublicLayout>
      <PageHero eyebrow="About us" title="Campus to Corporate, taught in the classroom." text="C2C Academy trains students for a technology job: labs, a project they can explain, and a counsellor who will say when a course is the wrong fit." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        {[
          ['Our work', 'We run IT batches for students and graduates who want a practical start: Java, Python, MERN, testing, data, cloud and DSA.'],
          ['Vision', 'A campus where a student can prepare for a technology job with real labs, not only slides.'],
          ['Mission', 'Teach with labs, review real projects, and support interviews only after the student can explain their own work.'],
        ].map(([title, text]) => (
          <article key={title} className="rounded-[28px] border border-line bg-white p-6">
            <h2 className="font-display text-2xl text-brand-800">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
          </article>
        ))}
      </section>
      <section className="bg-brand-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl">The journey</h2>
          <ol className="mt-6 space-y-4">
            {[
              ['Classroom', 'Batches in Java, Python, web, data, testing and cloud, taught with named faculty.'],
              ['Projects', 'Every track ends with work the student can open, explain and demo.'],
              ['Interviews', 'Mocks, resumes and applications start after the project is ready.'],
              ['Today', 'Full-stack, data and testing batches, plus a staff portal for faculty, counsellors and accounts.'],
            ].map(([year, text]) => (
              <li key={year} className="grid gap-2 rounded-3xl bg-white p-4 sm:grid-cols-[120px_1fr]">
                <p className="font-display text-brand-700">{year}</p>
                <p className="text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl">How a batch feels</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {WHY_POINTS.slice(0, 3).map((point) => (
            <article key={point.title} className="rounded-3xl border border-line p-5">
              <h3 className="font-semibold">{point.title}</h3>
              <p className="mt-2 text-sm text-muted">{point.text}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}
