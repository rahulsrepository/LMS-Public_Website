import { Link } from 'react-router-dom'
import { PublicLayout, PageHero } from '../../components/PublicLayout'
import { useLms } from '../../lib/store'
import { useTitle } from '../useTitle'

export default function CoursesPage() {
  const { state } = useLms()
  useTitle('Courses')
  return (
    <PublicLayout>
      <PageHero eyebrow="Courses" title="Eleven tracks. One campus." text="Explore our practical training tracks. A counsellor can explain batch timing and the documents you need." />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-2">
        {state.courses.map((course) => (
          <Link key={course.id} to={`/courses/${course.slug}`} className="rounded-[28px] border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{course.level}</p>
                <h2 className="mt-1 font-display text-2xl">{course.name}</h2>
              </div>
              <span className="rounded-2xl bg-gold-200 px-3 py-2 text-xs font-bold">{course.accent}</span>
            </div>
            <p className="mt-3 text-sm text-muted">{course.summary}</p>
            <p className="mt-4 text-sm font-semibold">{course.mode}</p>
          </Link>
        ))}
      </section>
    </PublicLayout>
  )
}
