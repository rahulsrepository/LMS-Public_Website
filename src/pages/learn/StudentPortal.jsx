import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Bookmark, BookmarkCheck, Briefcase, CalendarDays, GraduationCap, Mail, Phone, Plus, Trash2, UserRound } from 'lucide-react'
import { Badge, Button, DateInput, Empty, Field, PageTitle, Select, TextArea, TextInput, statusTone } from '../../components/ui'
import { runJavaScriptTests } from '../../lib/codeRunner'
import { formatDate, inr, safeExternalUrl, uid } from '../../lib/format'
import { useLookups } from '../app/lookups'
import { useTitle } from '../useTitle'

export function StudentHome() {
  const lms = useLookups()
  const student = lms.myStudent()
  const batch = lms.batches()[0]
  const fee = lms.feeRecords()[0]
  useTitle('My learning')
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-gradient-to-r from-brand-800 to-brand-500 p-6 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/70">{student?.rollNo}</p>
        <h1 className="mt-2 font-display text-3xl">Hello, {lms.session.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-white/80">{lms.courseName(student?.courseId)} · {batch?.name || 'Batch to be assigned'}</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-3xl bg-white p-4 soft-shadow"><p className="text-sm text-muted">Materials</p><p className="font-display text-3xl">{lms.materials().length}</p></article>
        <article className="rounded-3xl bg-white p-4 soft-shadow"><p className="text-sm text-muted">Open assignments</p><p className="font-display text-3xl">{lms.assignments().length}</p></article>
        <article className="rounded-3xl bg-white p-4 soft-shadow"><p className="text-sm text-muted">Fee pending</p><p className="font-display text-3xl">{inr(fee?.pending || 0)}</p></article>
      </div>
      <section className="rounded-3xl bg-white p-5 soft-shadow">
        <h2 className="font-display text-lg">Class timing</h2>
        <p className="mt-2 text-sm text-muted">{batch?.schedule || 'Your counsellor will confirm the batch timing.'}</p>
      </section>
    </div>
  )
}

export function StudentCourses() {
  const lms = useLookups()
  const student = lms.myStudent()
  const course = lms.state.courses.find((item) => item.id === student?.courseId)
  const batch = lms.state.batches.find((item) => item.id === student?.batchId)
  const bookmarked = lms.studentBookmarks().some((item) => item.type === 'course' && item.id === course?.id)
  useTitle('My course')
  if (!course) return <Empty title="Course not assigned yet" text="Contact your counsellor to confirm your course and batch." />
  return (
    <div>
      <PageTitle eyebrow="Learning" title="My course" text="Your course plan, learning outcomes, and batch details." action={
        <Button variant="outline" onClick={() => lms.toggleStudentBookmark('course', course.id)}>
          {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          {bookmarked ? 'Saved' : 'Save course'}
        </Button>
      } />
      <article className="rounded-3xl bg-white p-5 soft-shadow">
        <h2 className="font-display text-2xl">{course.name}</h2>
        <p className="mt-1 text-sm text-muted">{course.duration} · {course.level} · {batch?.name || 'Batch pending'}</p>
        <p className="mt-4 text-sm">{course.summary || 'Your faculty will guide you through this course.'}</p>
        {course.modules?.length ? (
          <div className="mt-5">
            <h3 className="font-semibold">Course modules</h3>
            <ol className="mt-2 grid gap-2 sm:grid-cols-2">
              {course.modules.map((module, index) => <li key={`${module}-${index}`} className="rounded-xl bg-brand-50 px-3 py-2 text-sm"><span className="mr-2 font-semibold text-brand-700">{index + 1}.</span>{module}</li>)}
            </ol>
          </div>
        ) : null}
        {course.outcomes?.length ? (
          <div className="mt-5">
            <h3 className="font-semibold">Learning outcomes</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {course.outcomes.map((outcome) => <li key={outcome}>✓ {outcome}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/learn/materials" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Study materials</Link>
          <Link to="/learn/assignments" className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800">Assignments</Link>
          <Link to="/learn/exams" className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800">Tests</Link>
        </div>
      </article>
    </div>
  )
}

export function StudentMaterials() {
  const lms = useLookups()
  useTitle('Study materials')
  const rows = lms.materials()
  return (
    <div>
      <PageTitle eyebrow="Learning" title="Study materials" text="Notes and slides shared for your batch." />
      {rows.length ? rows.map((item) => {
        const bookmarked = lms.studentBookmarks().some((bookmark) => bookmark.type === 'material' && bookmark.id === item.id)
        return (
          <article key={item.id} className="mb-3 flex items-center justify-between gap-3 rounded-3xl bg-white p-4 soft-shadow">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-muted">{item.kind} · {item.fileName} · {lms.subjectName(item.subjectId)}</p>
            </div>
            <Button variant="outline" onClick={() => lms.toggleStudentBookmark('material', item.id)} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark material'}>
              {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </Button>
          </article>
        )
      }) : <Empty title="No materials yet" text="Your faculty will add notes here." />}
    </div>
  )
}

export function StudentAssignments() {
  const lms = useLookups()
  const student = lms.myStudent()
  const [drafts, setDrafts] = useState({})
  useTitle('Assignments')
  return (
    <div>
      <PageTitle eyebrow="Learning" title="Assignments" text="Submit a note before the deadline. Marks appear after faculty evaluation." />
      {lms.assignments().map((assignment) => {
        const existing = lms.state.submissions.find((item) => item.assignmentId === assignment.id && item.studentId === student?.id)
        const draft = drafts[assignment.id] || { content: existing?.content || '', fileName: existing?.fileName || '' }
        const bookmarked = lms.studentBookmarks().some((item) => item.type === 'assignment' && item.id === assignment.id)
        return (
          <article key={assignment.id} className="mb-4 rounded-3xl bg-white p-5 soft-shadow">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl">{assignment.title}</h2>
              <Button variant="outline" onClick={() => lms.toggleStudentBookmark('assignment', assignment.id)} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark assignment'}>
                {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </Button>
            </div>
            <p className="text-sm text-muted">Due {formatDate(assignment.deadline)} · {assignment.totalMarks} marks</p>
            <p className="mt-2 text-sm">{assignment.description}</p>
            {existing?.marks != null ? <p className="mt-2 text-sm font-semibold text-brand-800">Score {existing.marks}/{assignment.totalMarks}. {existing.feedback}</p> : null}
            <div className="mt-3 space-y-2">
              <TextArea value={draft.content} onChange={(e) => setDrafts({ ...drafts, [assignment.id]: { ...draft, content: e.target.value } })} />
              <input type="file" className="text-sm" onChange={(e) => setDrafts({ ...drafts, [assignment.id]: { ...draft, fileName: e.target.files?.[0]?.name || '' } })} />
              <Button onClick={() => lms.submitAssignment(assignment.id, draft.content, draft.fileName)}>Submit</Button>
            </div>
          </article>
        )
      })}
      {!lms.assignments().length ? <Empty title="No assignments" /> : null}
    </div>
  )
}

export function StudentExams({ codingOnly = false }) {
  const lms = useLookups()
  const student = lms.myStudent()
  const [active, setActive] = useState(null)
  const [answers, setAnswers] = useState({})
  const [code, setCode] = useState({})
  const [checks, setChecks] = useState({})
  const exams = lms.exams().filter((item) => !codingOnly || item.questions?.some((question) => question.type === 'coding'))
  const pageTitle = codingOnly ? 'Company Questions' : 'Tests'
  useTitle(pageTitle)
  const exam = exams.find((item) => item.id === active)
  if (exam) {
    return (
      <div>
        <PageTitle eyebrow="Examination" title={exam.title} text={`${exam.durationMin} minutes · answer every question, then submit once.`} action={<Button variant="outline" onClick={() => setActive(null)}>Back</Button>} />
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (lms.submitAttempt(exam.id, { answers, code })) setActive(null) }}>
          {exam.questions.map((question, index) => (
            <article key={question.id} className="rounded-3xl bg-white p-5 soft-shadow">
              <p className="text-xs font-semibold text-brand-700">Question {index + 1} · {question.marks} {Number(question.marks) === 1 ? 'mark' : 'marks'}</p>
              <p className="mt-1 font-semibold">{question.prompt}</p>
              {question.type === 'mcq' ? (
                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-2 text-sm">
                      <input type="radio" name={question.id} checked={Number(answers[question.id]) === optionIndex} onChange={() => setAnswers({ ...answers, [question.id]: optionIndex })} />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <Field label={question.language === 'javascript' ? 'Write function solution' : 'Write your solution'}>
                    <TextArea className="min-h-40 font-mono" value={code[question.id] ?? question.starter} onChange={(e) => setCode({ ...code, [question.id]: e.target.value })} />
                  </Field>
                  {question.language === 'javascript' ? (
                    <Button type="button" variant="outline" onClick={() => setChecks({ ...checks, [question.id]: runJavaScriptTests(code[question.id] ?? question.starter, question.testcases.filter((testcase) => !testcase.hidden)) })}>Run sample tests</Button>
                  ) : <p className="text-xs text-muted">This language is evaluated by your faculty. Hidden tests stay on the question.</p>}
                  {(checks[question.id] || []).filter((item) => !item.hidden).map((item) => (
                    <p key={item.id} className="text-sm">{item.pass ? 'Sample passed' : `Sample failed${item.error ? `: ${item.error}` : ''}`}</p>
                  ))}
                  {question.testcases?.some((testcase) => testcase.hidden) ? <p className="text-xs text-muted">Hidden test cases are checked when you submit your answer.</p> : null}
                </div>
              )}
            </article>
          ))}
          <Button type="submit">Submit examination</Button>
        </form>
      </div>
    )
  }
  return (
    <div>
      <PageTitle eyebrow="Learning" title={pageTitle} text={codingOnly ? 'Practice coding questions your faculty has published for your batch.' : 'Published tests for your batch. You can submit each test once.'} />
      {exams.map((item) => {
        const attempt = lms.state.attempts.find((row) => row.examId === item.id && row.studentId === student?.id)
        const bookmarked = lms.studentBookmarks().some((bookmark) => bookmark.type === 'exam' && bookmark.id === item.id)
        return (
          <article key={item.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 soft-shadow">
            <div>
              <h2 className="font-semibold">{item.title}</h2>
              <p className="text-sm text-muted">{item.kind.toUpperCase()} · {item.durationMin} min</p>
              {attempt ? <p className="text-sm">{attempt.published ? `Score ${attempt.score}/${attempt.total}` : 'Submitted. Results are not published yet.'}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => lms.toggleStudentBookmark('exam', item.id)} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark test'}>
                {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              </Button>
              {attempt ? <Badge tone={attempt.published ? 'green' : 'gold'}>{attempt.published ? 'Result published' : 'Submitted'}</Badge> : <Button onClick={() => { setActive(item.id); setAnswers({}); setCode({}); setChecks({}) }}>Start</Button>}
            </div>
          </article>
        )
      })}
      {!exams.length ? <Empty title={codingOnly ? 'No company questions yet' : 'No published tests'} text={codingOnly ? 'Your faculty can add coding questions and publish them as a test.' : 'Your faculty will publish tests for your batch here.'} /> : null}
    </div>
  )
}

export function StudentCompanyQuestions() {
  return <StudentExams codingOnly />
}

export function StudentJobs() {
  const lms = useLookups()
  const jobs = (lms.state.jobs || []).filter((job) => job.open !== false)
  useTitle('Jobs')
  return (
    <div>
      <PageTitle eyebrow="Careers" title="Job opportunities" text="Open roles posted by the admin for students and faculty." />
      <div className="grid gap-3 lg:grid-cols-2">
        {jobs.map((job) => (
          <article key={job.id} className="rounded-3xl bg-white p-5 soft-shadow">
            <p className="text-sm font-semibold text-brand-700">{job.company || 'Company'} · {job.type || 'Full-time'} · {job.industry || 'IT'}</p>
            <h2 className="mt-1 font-display text-xl">{job.title}</h2>
            <p className="mt-1 text-sm text-muted">{job.place || 'Location not specified'} · {job.salary || 'Salary not specified'}</p>
            {job.skills ? <p className="mt-3 text-sm"><span className="font-semibold">Skills:</span> {job.skills}</p> : null}
            {job.blurb ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{job.blurb}</p> : null}
            {safeExternalUrl(job.applyUrl) ? <a href={safeExternalUrl(job.applyUrl)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Apply</a> : null}
          </article>
        ))}
      </div>
      {!jobs.length ? <div className="mt-4"><Empty title="No open jobs yet" text="Job postings from the admin will appear here." /></div> : null}
    </div>
  )
}

export function StudentWorkshops() {
  const lms = useLookups()
  const workshops = (lms.state.workshops || []).filter((workshop) => workshop.status !== 'closed')
  useTitle('Workshops')
  return (
    <div>
      <PageTitle eyebrow="Learning" title="Workshops" text="Upcoming and open workshops posted by the academy." />
      <div className="grid gap-3 lg:grid-cols-2">
        {workshops.map((workshop) => (
          <article key={workshop.id} className="rounded-3xl bg-white p-5 soft-shadow">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl">{workshop.title}</h2>
              <Badge tone="green">{workshop.status || 'open'}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{workshop.date ? formatDate(workshop.date) : 'Date to be announced'} · {workshop.mode || 'Campus'} · {workshop.seats} seats</p>
            {workshop.blurb ? <p className="mt-3 whitespace-pre-wrap text-sm">{workshop.blurb}</p> : null}
          </article>
        ))}
      </div>
      {!workshops.length ? <div className="mt-4"><Empty title="No open workshops" text="Workshops posted by the academy will appear here." /></div> : null}
    </div>
  )
}

export function StudentAttendance() {
  const lms = useLookups()
  useTitle('Attendance')
  const rows = lms.attendance()
  const present = rows.filter((row) => row.status === 'present' || row.status === 'late').length
  return (
    <div>
      <PageTitle eyebrow="Learning" title="Attendance" text={rows.length ? `${Math.round((present / rows.length) * 100)}% present or late across ${rows.length} marked days.` : 'Attendance appears after faculty mark the register.'} />
      {rows.length ? rows.map((row) => (
        <div key={row.id} className="mb-2 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm soft-shadow">
          <span>{formatDate(row.date)}</span>
          <Badge tone={statusTone(row.status)}>{row.status}</Badge>
        </div>
      )) : <Empty title="No attendance yet" />}
    </div>
  )
}

export function StudentFees() {
  const lms = useLookups()
  const fee = lms.feeRecords()[0]
  useTitle('Fees')
  return (
    <div>
      <PageTitle eyebrow="Accounts" title="My fees" text="Payments recorded by the accounts desk. For a receipt, visit the office." />
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-3xl bg-white p-4 soft-shadow"><p className="text-sm text-muted">Course fee</p><p className="font-display text-2xl">{inr(fee?.total)}</p></article>
        <article className="rounded-3xl bg-white p-4 soft-shadow"><p className="text-sm text-muted">Paid</p><p className="font-display text-2xl">{inr(fee?.paid)}</p></article>
        <article className="rounded-3xl bg-white p-4 soft-shadow"><p className="text-sm text-muted">Pending</p><p className="font-display text-2xl">{inr(fee?.pending)}</p></article>
      </div>
      <div className="mt-4 space-y-2">
        {lms.payments().map((payment) => (
          <div key={payment.id} className="flex justify-between rounded-2xl bg-white px-4 py-3 text-sm soft-shadow">
            <span>{payment.receiptNo} · {formatDate(payment.date)} · {payment.method}</span>
            <span className="font-semibold">{inr(payment.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StudentNotes() {
  const lms = useLookups()
  useTitle('Notifications')
  useEffect(() => {
    lms.markNotificationsRead()
  }, [lms.session.id, lms.state.notifications])
  const rows = lms.notifications()
  return (
    <div>
      <PageTitle eyebrow="Learning" title="Notifications" />
      {rows.map((item) => (
        <article key={item.id} className="mb-3 rounded-3xl bg-white p-4 soft-shadow">
          <h2 className="font-semibold">{item.title}</h2>
          <p className="text-sm text-muted">{item.body}</p>
        </article>
      ))}
      {!rows.length ? <Empty title="No notifications" /> : null}
    </div>
  )
}

const portfolioSections = {
  education: {
    title: 'Education',
    fields: [
      { key: 'qualification', label: 'Qualification' },
      { key: 'institution', label: 'Institution' },
      { key: 'year', label: 'Year' },
    ],
  },
  projects: {
    title: 'Projects',
    fields: [
      { key: 'title', label: 'Project title' },
      { key: 'description', label: 'Description', multiline: true },
      { key: 'link', label: 'Project link' },
    ],
  },
  experiences: {
    title: 'Experiences',
    fields: [
      { key: 'role', label: 'Role' },
      { key: 'organization', label: 'Organization' },
      { key: 'duration', label: 'Duration' },
      { key: 'description', label: 'Description', multiline: true },
    ],
  },
  certificates: {
    title: 'Certificates',
    fields: [
      { key: 'title', label: 'Certificate name' },
      { key: 'issuer', label: 'Issuer' },
      { key: 'year', label: 'Year' },
    ],
  },
}

function PortfolioSection({ lms, student, section }) {
  const config = portfolioSections[section]
  const entries = student[section] || []
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({})

  function addEntry(event) {
    event.preventDefault()
    const next = [...entries, { id: uid('profile'), ...draft }]
    if (lms.updateStudentPortfolio(section, next)) {
      setDraft({})
      setAdding(false)
    }
  }

  function removeEntry(id) {
    lms.updateStudentPortfolio(section, entries.filter((entry) => entry.id !== id))
  }

  return (
    <section className="rounded-3xl bg-white p-5 soft-shadow">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">{config.title}</h2>
        <Button variant="outline" onClick={() => setAdding((value) => !value)}>
          <Plus size={16} /> {adding ? 'Cancel' : `Add ${config.title.toLowerCase()}`}
        </Button>
      </div>
      {adding ? (
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addEntry}>
          {config.fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.multiline ? (
                <TextArea value={draft[field.key] || ''} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} required={field === config.fields[0]} />
              ) : (
                <TextInput type={field.key === 'link' ? 'url' : 'text'} value={draft[field.key] || ''} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} required={field === config.fields[0]} />
              )}
            </Field>
          ))}
          <div className="sm:col-span-2"><Button type="submit">Save {config.title.toLowerCase()}</Button></div>
        </form>
      ) : null}
      {entries.length ? (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line p-4">
              <div>
                <h3 className="font-semibold">{entry.title || entry.qualification || entry.role}</h3>
                <p className="text-sm text-muted">{[entry.institution, entry.organization, entry.issuer, entry.year, entry.duration].filter(Boolean).join(' · ')}</p>
                {entry.description ? <p className="mt-2 whitespace-pre-wrap text-sm">{entry.description}</p> : null}
                {entry.link ? <a href={entry.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700">{entry.link}</a> : null}
              </div>
              <Button variant="ghost" onClick={() => removeEntry(entry.id)} aria-label={`Remove ${config.title.toLowerCase()} entry`}><Trash2 size={16} /></Button>
            </article>
          ))}
        </div>
      ) : !adding ? <p className="mt-4 text-sm text-muted">Add your {config.title.toLowerCase()} details to your profile.</p> : null}
    </section>
  )
}

export function StudentProfilePage() {
  const lms = useLookups()
  const student = lms.myStudent()
  const [activeTab, setActiveTab] = useState('personal')
  const [form, setForm] = useState({
    name: student?.name || '',
    phone: student?.phone || '',
    guardian: student?.guardian || '',
    gender: student?.gender || '',
    dateOfBirth: student?.dateOfBirth || '',
    whatsapp: student?.whatsapp || student?.phone || '',
  })
  const [busy, setBusy] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const course = lms.state.courses.find((item) => item.id === student?.courseId)
  const batch = lms.state.batches.find((item) => item.id === student?.batchId)
  const tabs = [
    { id: 'personal', label: 'Personal info', icon: UserRound },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'experiences', label: 'Experiences', icon: Briefcase },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ]
  useTitle('My profile')

  if (!student) return <Empty title="Student profile not found" text="Contact the academy office to link your login to a student record." />

  async function savePersonalInfo(event) {
    event.preventDefault()
    setBusy(true)
    const saved = await lms.updateOwnStudentProfile(form)
    setBusy(false)
    if (saved) setForm({ ...form, name: form.name.trim(), guardian: form.guardian.trim() })
  }

  async function savePassword(event) {
    event.preventDefault()
    setPasswordBusy(true)
    const saved = await lms.changeOwnPassword(passwordForm.current, passwordForm.next)
    setPasswordBusy(false)
    if (saved) setPasswordForm({ current: '', next: '' })
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-3xl bg-white soft-shadow">
        <section className="relative min-h-44 bg-gradient-to-r from-blue-700 via-indigo-400 to-amber-300 px-6 pb-5 pt-8 text-white">
          <div className="absolute right-5 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800">{student.rollNo || student.id}</div>
          <div className="mt-14 flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-2xl font-bold text-blue-800 shadow">{student.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div className="pb-2">
              <h1 className="font-display text-2xl font-semibold">{student.name}</h1>
              <p className="text-sm text-white/90">{course?.name || 'Student'} · {batch?.name || 'Batch pending'}</p>
            </div>
          </div>
        </section>
        <nav aria-label="Profile sections" className="flex gap-2 overflow-x-auto px-4 pt-3">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${activeTab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted hover:text-ink'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'personal' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.8fr)]">
          <aside className="space-y-4">
            <section className="rounded-3xl bg-white p-5 soft-shadow">
              <h2 className="font-semibold">Student details</h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Mail size={16} /> <span className="break-all">{student.email}</span></p>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Phone size={16} /> {student.phone || 'Add your phone number'}</p>
              <p className="mt-3 flex items-center gap-2 text-sm text-muted"><CalendarDays size={16} /> Joined {student.admissionDate ? formatDate(student.admissionDate) : '—'}</p>
            </section>
            <section className="rounded-3xl bg-white p-5 soft-shadow">
              <h2 className="font-semibold">Documents</h2>
              {student.documents?.length ? <ul className="mt-2 space-y-1 text-sm text-muted">{student.documents.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No documents listed.</p>}
            </section>
            <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={savePassword}>
              <h2 className="font-semibold">Change password</h2>
              <Field label="Current password"><TextInput type="password" value={passwordForm.current} onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })} required /></Field>
              <Field label="New password" hint="At least 6 characters of any kind.">
                <TextInput type="password" minLength={6} value={passwordForm.next} onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })} required />
              </Field>
              <Button type="submit" disabled={passwordBusy}>{passwordBusy ? 'Saving…' : 'Update password'}</Button>
            </form>
          </aside>
          <form className="space-y-4 rounded-3xl bg-white p-5 soft-shadow" onSubmit={savePersonalInfo}>
            <h2 className="font-display text-xl">About you</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
              <Field label="Gender">
                <Select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                  <option value="">Select</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </Select>
              </Field>
              <Field label="Email"><TextInput type="email" value={student.email || ''} disabled /></Field>
              <Field label="Mobile"><TextInput type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
              <Field label="WhatsApp"><TextInput type="tel" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></Field>
              <Field label="Date of birth"><DateInput value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></Field>
              <Field label="Guardian"><TextInput value={form.guardian} onChange={(event) => setForm({ ...form, guardian: event.target.value })} /></Field>
            </div>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save personal information'}</Button>
          </form>
        </div>
      ) : null}

      {activeTab === 'education' ? (
        <div className="space-y-4">
          <section className="rounded-3xl bg-white p-5 soft-shadow">
            <h2 className="font-display text-xl">Current course</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p><span className="block text-xs text-muted">Course</span><span className="font-semibold">{course?.name || 'Not assigned'}</span></p>
              <p><span className="block text-xs text-muted">Batch</span><span className="font-semibold">{batch?.name || 'Not assigned'}</span></p>
              <p><span className="block text-xs text-muted">Admission date</span><span className="font-semibold">{student.admissionDate ? formatDate(student.admissionDate) : '—'}</span></p>
              <p><span className="block text-xs text-muted">Status</span><span className="font-semibold">{student.status}</span></p>
            </div>
          </section>
          <PortfolioSection lms={lms} student={student} section="education" />
        </div>
      ) : null}
      {['projects', 'experiences', 'certificates'].includes(activeTab) ? <PortfolioSection lms={lms} student={student} section={activeTab} /> : null}
    </div>
  )
}

export function StudentBookmarks() {
  const lms = useLookups()
  const entries = lms.studentBookmarks().flatMap((bookmark) => {
    const sources = {
      course: lms.state.courses,
      material: lms.materials(),
      assignment: lms.assignments(),
      exam: lms.exams(),
    }
    const item = sources[bookmark.type]?.find((source) => source.id === bookmark.id)
    if (!item) return []
    const paths = { course: '/learn/courses', material: '/learn/materials', assignment: '/learn/assignments', exam: '/learn/exams' }
    return [{ ...bookmark, item, path: paths[bookmark.type] }]
  })
  useTitle('Bookmarks')
  return (
    <div>
      <PageTitle eyebrow="Learning" title="Bookmarks" text="Your saved course, materials, assignments, and tests." />
      {entries.length ? entries.map(({ type, item, path, id }) => (
        <article key={`${type}-${id}`} className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 soft-shadow">
          <div>
            <p className="font-semibold">{item.title || item.name}</p>
            <p className="text-sm capitalize text-muted">{type}</p>
          </div>
          <div className="flex gap-2">
            <Link to={path} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800">Open</Link>
            <Button variant="ghost" onClick={() => lms.toggleStudentBookmark(type, id)} aria-label="Remove bookmark"><Trash2 size={16} /></Button>
          </div>
        </article>
      )) : <Empty title="No bookmarks yet" text="Save a course, study material, assignment, or test to find it here." />}
    </div>
  )
}
