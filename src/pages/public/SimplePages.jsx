import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PublicLayout, PageHero } from '../../components/PublicLayout'
import { Button, Field, Select, TextArea, TextInput } from '../../components/ui'
import { contactLinks, FAQS, PARTNERS, TESTIMONIALS, WHY_POINTS } from '../../lib/catalog'
import { useLms } from '../../lib/store'
import { useTitle } from '../useTitle'

export function WhyPage() {
  useTitle('Why Choose Us')
  return (
    <PublicLayout>
      <PageHero eyebrow="Why choose us" title="Practical training, with the placement work done in the open." text="We don’t promise a job letter on day one. We promise labs, reviews and an honest counselling conversation." />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-2 lg:grid-cols-3">
        {WHY_POINTS.map((point) => (
          <article key={point.title} className="rounded-[28px] border border-line bg-white p-5">
            <h2 className="font-display text-xl text-brand-800">{point.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{point.text}</p>
          </article>
        ))}
      </section>
    </PublicLayout>
  )
}

export function PlacementsPage() {
  useTitle('Placements')
  return (
    <PublicLayout>
      <PageHero eyebrow="Placements" title="Interview preparation is part of the batch, not a poster on the wall." text="Students who keep attendance and finish their project get mock interviews, a resume review and introductions where a role matches their track." />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Mock interviews', 'Technical and HR rounds with written feedback.'],
            ['Resume desk', 'Project bullets that match what you actually built.'],
            ['Hiring partners', 'Roles change every season. We introduce students who are ready.'],
          ].map(([title, text]) => (
            <article key={title} className="rounded-3xl bg-brand-800 p-5 text-white">
              <h2 className="font-display text-2xl">{title}</h2>
              <p className="mt-2 text-sm text-white/75">{text}</p>
            </article>
          ))}
        </div>
        <h2 className="mt-10 font-display text-2xl">Companies our students prepare for</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {PARTNERS.map((name) => <span key={name} className="rounded-2xl border border-line px-4 py-3 text-sm font-bold text-slate-600">{name}</span>)}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((story) => (
            <blockquote key={story.name} className="rounded-[28px] bg-brand-50 p-5">
              <p className="text-sm text-ink">“{story.quote}”</p>
              <footer className="mt-3 text-sm font-semibold text-brand-800">{story.name} · {story.role}</footer>
            </blockquote>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}

export function WorkshopsPage() {
  const { submitPublicEnquiry, state } = useLms()
  const workshops = (state.workshops || []).filter((item) => item.status !== 'closed')
  const [active, setActive] = useState(workshops[0]?.id || '')
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  useTitle('Workshops')
  const workshop = workshops.find((item) => item.id === active) || workshops[0]
  return (
    <PublicLayout>
      <PageHero eyebrow="Workshops" title="Short rooms for people who are still deciding." text="Hackathons, weekend sprints and interview labs. Registration reaches the counsellor desk as an enquiry." />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {workshops.map((item) => (
            <button key={item.id} onClick={() => setActive(item.id)} className="w-full rounded-[28px] border border-line bg-white p-5 text-left">
              <p className="text-xs font-semibold text-brand-700">{item.date} · {item.mode} · {item.seats} seats</p>
              <h2 className="mt-1 font-display text-2xl">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.blurb}</p>
            </button>
          ))}
        </div>
        {workshop ? <form className="h-fit space-y-3 rounded-[28px] bg-brand-50 p-5" onSubmit={(event) => {
          event.preventDefault()
          const ok = submitPublicEnquiry({ ...form, source: 'Social Media', courseId: state.courses[0]?.id, remarks: `Workshop registration: ${workshop.title}` })
          if (ok) setForm({ name: '', phone: '', email: '' })
        }}>
          <h2 className="font-display text-2xl">Register for {workshop.title}</h2>
          <Field label="Name"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="Mobile"><TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Button type="submit">Register</Button>
        </form> : <p className="rounded-[28px] bg-white p-5 text-sm text-muted">No workshops are open right now.</p>}
      </section>
    </PublicLayout>
  )
}

export function CareersPage() {
  const { submitPublicEnquiry, state } = useLms()
  const jobs = (state.jobs || []).filter((job) => job.open !== false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', role: jobs[0]?.title || '', note: '' })
  useTitle('Careers')
  return (
    <PublicLayout>
      <PageHero eyebrow="Careers" title="Teach, train, or help a student choose well." text="Open roles added by the academy. Applications are logged for the admin team." />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 lg:grid-cols-2">
        <div className="space-y-3">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-[28px] border border-line p-5">
              <p className="text-xs font-semibold text-brand-700">{job.type} · {job.place}</p>
              <h2 className="mt-1 font-display text-2xl">{job.title}</h2>
              <p className="mt-2 text-sm text-muted">{job.blurb}</p>
            </article>
          ))}
        </div>
        <form className="space-y-3 rounded-[28px] bg-white p-5 soft-shadow" onSubmit={(event) => {
          event.preventDefault()
          const ok = submitPublicEnquiry({ name: form.name, phone: form.phone, email: form.email, source: 'Referral', remarks: `Career application: ${form.role}. ${form.note}` })
          if (ok) setForm({ name: '', phone: '', email: '', role: jobs[0]?.title || '', note: '' })
        }}>
          <h2 className="font-display text-2xl">Apply</h2>
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Mobile"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {jobs.map((job) => <option key={job.id}>{job.title}</option>)}
            </Select>
          </Field>
          <Field label="Note"><TextArea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <Button type="submit">Submit application</Button>
        </form>
      </section>
    </PublicLayout>
  )
}

export function FaqPage() {
  useTitle('FAQ')
  return (
    <PublicLayout>
      <PageHero eyebrow="FAQ" title="Straight answers before you visit." text="If your question is about a specific batch, call the front desk — dates move when a lab is full." />
      <section className="mx-auto max-w-3xl space-y-3 px-4 py-12">
        {FAQS.map((item) => (
          <details key={item.q} className="rounded-3xl border border-line bg-white p-5" open>
            <summary className="cursor-pointer font-display text-lg">{item.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </section>
    </PublicLayout>
  )
}

export function ContactPage() {
  const { submitPublicEnquiry, state } = useLms()
  const [form, setForm] = useState({ name: '', phone: '', email: '', courseId: '', remarks: '' })
  useTitle('Contact')
  const contact = contactLinks(state.settings)
  return (
    <PublicLayout>
      <PageHero eyebrow="Contact" title="Call, visit, or send a note." text={`${contact.address}. ${state.settings.hours}. Phone ${contact.phone}.`} />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 lg:grid-cols-2">
        <form className="space-y-3 rounded-[28px] border border-line p-5" onSubmit={(event) => {
          event.preventDefault()
          const ok = submitPublicEnquiry({ ...form, source: 'Website' })
          if (ok) setForm({ name: '', phone: '', email: '', courseId: '', remarks: '' })
        }}>
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Mobile"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Interested course">
            <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Not sure yet</option>
              {state.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </Select>
          </Field>
          <Field label="Message"><TextArea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
          <Button type="submit">Send message</Button>
        </form>
        <div className="overflow-hidden rounded-[28px] border border-line bg-brand-50">
          <div className="relative flex h-80 items-end overflow-hidden bg-gradient-to-br from-brand-50 to-white p-6">
            <div className="absolute inset-0 opacity-70" aria-hidden>
              <svg className="h-full w-full" viewBox="0 0 400 240">
                <path d="M20 40 L120 20 L210 80 L160 180 L40 160 Z" fill="none" stroke="#16803c" strokeOpacity="0.35" />
                <path d="M120 20 L280 50 L330 140 L210 200 L160 180" fill="none" stroke="#16803c" strokeOpacity="0.28" />
                <circle cx="120" cy="20" r="4" fill="#16803c" />
                <circle cx="210" cy="80" r="4" fill="#f5c518" />
                <circle cx="330" cy="140" r="4" fill="#16803c" />
              </svg>
            </div>
            <p className="relative font-display text-3xl text-brand-800">Campus visits by appointment</p>
          </div>
          <div className="space-y-1 p-5 text-sm">
            <p className="font-semibold">{state.settings.name}</p>
            <a href={contact.mail} className="block text-brand-800 hover:underline">{contact.email}</a>
            <a href={contact.tel} className="block text-brand-800 hover:underline">{contact.phone}</a>
            <a href={contact.map} target="_blank" rel="noreferrer" className="block text-brand-800 hover:underline">{contact.address}</a>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

export function EnrollPage() {
  const { submitPublicEnquiry, state } = useLms()
  const [params] = useSearchParams()
  const initial = params.get('course') || ''
  const [form, setForm] = useState({ name: '', phone: '', email: '', courseId: initial, remarks: '' })
  useTitle('Enroll')
  const selected = useMemo(() => state.courses.find((course) => course.id === form.courseId), [state.courses, form.courseId])
  return (
    <PublicLayout>
      <PageHero eyebrow="Enroll" title="Tell us who you are. We’ll confirm the right batch." text="This creates an enquiry for the counsellor. It does not collect a fee." />
      <form className="mx-auto max-w-xl space-y-3 px-4 py-12" onSubmit={(event) => {
        event.preventDefault()
        const ok = submitPublicEnquiry({ ...form, source: 'Website', remarks: form.remarks || `Enrollment interest${selected ? ` for ${selected.name}` : ''}` })
        if (ok) setForm({ name: '', phone: '', email: '', courseId: '', remarks: '' })
      }}>
        <Field label="Full name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Mobile"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
        <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Course">
          <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
            <option value="">Select a course</option>
            {state.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </Select>
        </Field>
        <Field label="Anything we should know?"><TextArea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
        <Button type="submit">Submit enrollment interest</Button>
      </form>
    </PublicLayout>
  )
}
