import { Link } from 'react-router-dom'
import { BadgeCheck, BookOpen, CalendarCheck, Clock, GraduationCap, IndianRupee, Layers, UserPlus, Users, Wallet } from 'lucide-react'
import { Stat } from '../../components/ui'
import { formatLongDate, inr, todayISO } from '../../lib/format'
import { useLookups, monthSeries } from './lookups'
import { useTitle } from '../useTitle'

function Bars({ rows }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <div className="flex h-40 items-end gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end">
            <div className="w-full rounded-t-xl bg-brand-600" style={{ height: `${Math.max(8, (row.value / max) * 100)}%` }} title={inr(row.value)} />
          </div>
          <span className="text-[11px] text-muted">{row.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const lms = useLookups()
  const { session, state } = lms
  useTitle('Dashboard')
  const today = todayISO()
  const role = session.role

  if (role === 'faculty') return <FacultyDash lms={lms} today={today} />
  if (role === 'counsellor') return <CounsellorDash lms={lms} today={today} />
  if (role === 'accountant') return <AccountantDash lms={lms} today={today} />
  if (role === 'receptionist') return <ReceptionDash lms={lms} today={today} />
  return <AdminDash lms={lms} today={today} />
}

function Welcome({ name, text }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-brand-800 via-brand-600 to-emerald-500 p-6 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{formatLongDate()}</p>
      <h1 className="mt-2 font-display text-3xl">Welcome back, {name.split(' ')[0]}!</h1>
      <p className="mt-1 text-sm text-white/85">{text}</p>
    </section>
  )
}

function AdminDash({ lms, today }) {
  const { state } = lms
  const collected = state.payments.filter((payment) => payment.status === 'verified' && payment.kind === 'collection').reduce((sum, payment) => sum + payment.amount, 0)
  const pending = state.feeRecords.reduce((sum, fee) => sum + fee.pending, 0)
  const month = today.slice(0, 7)
  const series = monthSeries().map((item) => ({
    ...item,
    value: state.payments.filter((payment) => payment.status === 'verified' && payment.kind === 'collection' && payment.date.startsWith(item.key)).reduce((sum, payment) => sum + payment.amount, 0),
  }))
  const byCourse = state.courses.map((course) => ({ name: course.name, count: state.students.filter((student) => student.courseId === course.id && student.status === 'active').length })).filter((item) => item.count).slice(0, 6)
  return (
    <div className="space-y-5">
      <Welcome name={lms.session.name} text="Here's what's happening today." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Total students" value={state.students.length} />
        <Stat icon={GraduationCap} label="Total faculty" value={state.faculty.filter((item) => item.status !== 'removed').length} tone="bg-sky-50 text-sky-700" />
        <Stat icon={IndianRupee} label="Collected fees" value={inr(collected)} tone="bg-gold-200 text-amber-800" />
        <Stat icon={Layers} label="Active batches" value={state.batches.filter((batch) => batch.status === 'running').length} tone="bg-violet-50 text-violet-700" />
        <Stat icon={BookOpen} label="Total courses" value={state.courses.length} />
        <Stat icon={Wallet} label="Pending fees" value={inr(pending)} tone="bg-rose-50 text-rose-700" />
        <Stat icon={UserPlus} label="New admissions this month" value={state.students.filter((student) => student.admissionDate?.startsWith(month)).length} />
        <Stat icon={Clock} label="Follow-ups due today" value={state.enquiries.filter((item) => item.followUpDate === today && !['converted', 'not_interested'].includes(item.status)).length} tone="bg-amber-50 text-amber-800" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 soft-shadow">
          <h2 className="font-display text-lg">Revenue analytics</h2>
          <div className="mt-4"><Bars rows={series} /></div>
        </section>
        <section className="rounded-3xl bg-white p-5 soft-shadow">
          <h2 className="font-display text-lg">Enrollment by course</h2>
          <ul className="mt-4 space-y-3">
            {byCourse.map((item) => (
              <li key={item.name}>
                <div className="mb-1 flex justify-between text-sm"><span>{item.name}</span><span className="font-semibold">{item.count}</span></div>
                <div className="h-2 rounded-full bg-brand-50"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(item.count / state.students.length) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Activity logs={state.logs} />
    </div>
  )
}

function ReceptionDash({ lms, today }) {
  const { state } = lms
  const active = state.faculty.filter((item) => item.status === 'active')
  return (
    <div className="space-y-5">
      <Welcome name={lms.session.name} text="Front desk, faculty accounts and today’s enquiries." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={GraduationCap} label="Total faculty" value={state.faculty.filter((item) => item.status !== 'removed').length} />
        <Stat icon={BadgeCheck} label="Active faculty" value={active.length} />
        <Stat icon={UserPlus} label="Faculty added this month" value={state.faculty.filter((item) => item.joinedOn?.startsWith(today.slice(0, 7))).length} tone="bg-gold-200 text-amber-800" />
        <Stat icon={Users} label="Student registrations" value={state.students.filter((student) => student.createdBy === lms.session.id || student.admissionDate === today).length} />
        <Stat icon={Clock} label="Today's enquiries" value={state.enquiries.filter((item) => item.createdAt === today).length} tone="bg-sky-50 text-sky-700" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/app/faculty?new=1" className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Quick add faculty</Link>
        <Link to="/app/register" className="rounded-full bg-gold-400 px-4 py-2.5 text-sm font-semibold text-brand-950">Quick add student</Link>
      </div>
      <Activity logs={state.logs.filter((log) => ['receptionist', 'admin', 'faculty'].includes(log.role))} />
    </div>
  )
}

function FacultyDash({ lms, today }) {
  const faculty = lms.myFaculty()
  const batches = lms.batches()
  const students = lms.students()
  const subjects = lms.subjects()
  const exams = lms.exams().filter((exam) => exam.status === 'published')
  const assignments = lms.assignments()
  const pending = lms.state.submissions.filter((submission) => assignments.some((item) => item.id === submission.assignmentId) && submission.status === 'submitted')
  const todays = lms.attendance().filter((row) => row.date === today)
  const present = todays.filter((row) => row.status === 'present').length
  return (
    <div className="space-y-5">
      <Welcome name={lms.session.name} text={faculty ? `${faculty.specialization} · ${faculty.designation}` : 'Academic workspace'} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label="My subjects" value={subjects.length} />
        <Stat icon={Layers} label="My batches" value={batches.length} />
        <Stat icon={Users} label="Assigned students" value={students.length} />
        <Stat icon={CalendarCheck} label="Marked present today" value={present} tone="bg-gold-200 text-amber-800" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 soft-shadow">
          <h2 className="font-display text-lg">Today’s classes</h2>
          <ul className="mt-3 space-y-2">
            {batches.map((batch) => <li key={batch.id} className="rounded-2xl bg-brand-50 px-3 py-2 text-sm"><span className="font-semibold">{batch.name}</span><span className="block text-muted">{batch.schedule}</span></li>)}
            {!batches.length ? <li className="text-sm text-muted">No batches assigned yet.</li> : null}
          </ul>
        </section>
        <section className="rounded-3xl bg-white p-5 soft-shadow">
          <h2 className="font-display text-lg">Upcoming exams & submissions</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {exams.map((exam) => <li key={exam.id}>{exam.title} · {exam.durationMin} min</li>)}
            <li className="text-muted">{pending.length} assignment submission{pending.length === 1 ? '' : 's'} waiting for marks.</li>
            <li className="text-muted">{assignments.length} live assignment{assignments.length === 1 ? '' : 's'}.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function CounsellorDash({ lms, today }) {
  const { state } = lms
  const items = state.enquiries
  const count = (status) => items.filter((item) => item.status === status).length
  const converted = count('converted')
  const rate = items.length ? Math.round((converted / items.length) * 100) : 0
  return (
    <div className="space-y-5">
      <Welcome name={lms.session.name} text="Enquiries, follow-ups and admissions." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Total enquiries" value={items.length} />
        <Stat icon={UserPlus} label="New enquiries" value={count('new')} />
        <Stat icon={Clock} label="Follow-ups today" value={items.filter((item) => item.followUpDate === today && !['converted', 'not_interested'].includes(item.status)).length} tone="bg-gold-200 text-amber-800" />
        <Stat icon={BadgeCheck} label="Interested students" value={count('interested')} tone="bg-sky-50 text-sky-700" />
        <Stat icon={GraduationCap} label="Converted admissions" value={converted} />
        <Stat icon={Clock} label="Pending follow-ups" value={items.filter((item) => item.status === 'follow_up').length} tone="bg-rose-50 text-rose-700" />
        <Stat icon={Wallet} label="Conversion" value={`${rate}%`} />
      </div>
      <section className="rounded-3xl bg-white p-5 soft-shadow">
        <h2 className="font-display text-lg">Admission conversion</h2>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-50">
          <div className="h-3 rounded-full bg-brand-600" style={{ width: `${rate}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">{converted} of {items.length} enquiries are converted.</p>
      </section>
    </div>
  )
}

function AccountantDash({ lms, today }) {
  const { state } = lms
  const verified = state.payments.filter((payment) => payment.status === 'verified' && payment.kind === 'collection')
  const todaySum = verified.filter((payment) => payment.date === today).reduce((sum, payment) => sum + payment.amount, 0)
  const pendingFees = state.feeRecords.reduce((sum, fee) => sum + fee.pending, 0)
  const outstanding = pendingFees
  const series = monthSeries().map((item) => ({
    ...item,
    value: verified.filter((payment) => payment.date.startsWith(item.key)).reduce((sum, payment) => sum + payment.amount, 0),
  }))
  const recent = [...state.payments].slice(0, 5)
  return (
    <div className="space-y-5">
      <Welcome name={lms.session.name} text="Collections, outstanding fees and receipts." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={IndianRupee} label="Total fee collection" value={inr(verified.reduce((sum, payment) => sum + payment.amount, 0))} />
        <Stat icon={Wallet} label="Today's collection" value={inr(todaySum)} tone="bg-gold-200 text-amber-800" />
        <Stat icon={Clock} label="Pending fees" value={inr(pendingFees)} tone="bg-rose-50 text-rose-700" />
        <Stat icon={BadgeCheck} label="Verified transactions" value={verified.length} tone="bg-sky-50 text-sky-700" />
        <Stat icon={Wallet} label="Outstanding balance" value={inr(outstanding)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 soft-shadow">
          <h2 className="font-display text-lg">Monthly revenue</h2>
          <div className="mt-4"><Bars rows={series} /></div>
        </section>
        <section className="rounded-3xl bg-white p-5 soft-shadow">
          <h2 className="font-display text-lg">Recent payments</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {recent.map((payment) => (
              <li key={payment.id} className="flex justify-between gap-3 border-b border-line py-2">
                <span>{lms.studentName(payment.studentId)} · {payment.method}</span>
                <span className="font-semibold">{inr(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Activity({ logs }) {
  return (
    <section className="rounded-3xl bg-white p-5 soft-shadow">
      <h2 className="font-display text-lg">Recent activity</h2>
      <ul className="mt-3 divide-y divide-line">
        {logs.slice(0, 6).map((log) => (
          <li key={log.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
            <span><span className="font-semibold">{log.actorName}</span> · {log.action}</span>
            <span className="text-muted">{new Date(log.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
