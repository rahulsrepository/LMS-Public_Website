import { Link, useParams } from 'react-router-dom'
import { PublicLayout, PageHero } from '../../components/PublicLayout'
import { useLms } from '../../lib/store'
import { useTitle } from '../useTitle'

export default function CourseDetailPage() {
  const { slug } = useParams()
  const { state } = useLms()
  const course = state.courses.find((item) => item.slug === slug)
  useTitle(course?.name || 'Course')
  if (!course) {
    return (
      <PublicLayout>
        <PageHero eyebrow="Courses" title="This course is not on the current list." text="It may have been renamed. Browse the catalogue or talk to the front desk." />
        <div className="px-4 py-8"><Link to="/courses" className="font-semibold text-brand-700">Back to courses</Link></div>
      </PublicLayout>
    )
  }
  const batches = state.batches.filter((batch) => batch.courseId === course.id)
  return (
    <PublicLayout>
      <PageHero eyebrow={course.level} title={course.name} text={course.summary} />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <article className="rounded-[28px] border border-line p-6">
            <h2 className="font-display text-2xl">What you will practice</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {(course.outcomes || []).map((item) => <li key={item} className="rounded-2xl bg-brand-50 px-3 py-2 text-sm">{item}</li>)}
              {!course.outcomes?.length ? <li className="text-sm text-muted">Syllabus will be shared in counselling.</li> : null}
            </ul>
          </article>
          <article className="rounded-[28px] border border-line p-6">
            <h2 className="font-display text-2xl">Modules</h2>
            <ol className="mt-4 space-y-2">
              {(course.modules || []).map((item, index) => (
                <li key={item} className="flex gap-3 text-sm"><span className="font-display text-brand-700">{index + 1}</span>{item}</li>
              ))}
            </ol>
          </article>
        </div>
        <aside className="h-fit rounded-[28px] bg-brand-800 p-6 text-white">
          <p className="text-sm text-white/80">{course.mode}</p>
          <p className="mt-4 text-sm text-white/80">{batches.length ? `${batches.length} batch${batches.length > 1 ? 'es' : ''} currently listed` : 'Next batch dates are shared at counselling.'}</p>
          <Link to={`/enroll?course=${course.id}`} className="mt-6 block rounded-full bg-gold-400 px-4 py-3 text-center text-sm font-semibold text-brand-950">Enroll Now</Link>
          <Link to="/contact" className="mt-3 block text-center text-sm font-semibold text-white">Ask a counsellor</Link>
        </aside>
      </section>
    </PublicLayout>
  )
}
