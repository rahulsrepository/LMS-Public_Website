import { useState } from 'react'
import { Badge, Button, Empty, Field, PageTitle, TextArea, TextInput, statusTone } from '../../components/ui'
import { runJavaScriptTests } from '../../lib/codeRunner'
import { formatDate, inr } from '../../lib/format'
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

export function StudentMaterials() {
  const lms = useLookups()
  useTitle('Study materials')
  const rows = lms.materials()
  return (
    <div>
      <PageTitle eyebrow="Learning" title="Study materials" text="Notes and slides shared for your batch." />
      {rows.length ? rows.map((item) => (
        <article key={item.id} className="mb-3 rounded-3xl bg-white p-4 soft-shadow">
          <p className="font-semibold">{item.title}</p>
          <p className="text-sm text-muted">{item.kind} · {item.fileName} · {lms.subjectName(item.subjectId)}</p>
        </article>
      )) : <Empty title="No materials yet" text="Your faculty will add notes here." />}
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
        return (
          <article key={assignment.id} className="mb-4 rounded-3xl bg-white p-5 soft-shadow">
            <h2 className="font-display text-xl">{assignment.title}</h2>
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

export function StudentExams() {
  const lms = useLookups()
  const student = lms.myStudent()
  const [active, setActive] = useState(null)
  const [answers, setAnswers] = useState({})
  const [code, setCode] = useState({})
  const [checks, setChecks] = useState({})
  useTitle('Examinations')
  const exam = lms.exams().find((item) => item.id === active)
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
                    <Button type="button" variant="outline" onClick={() => setChecks({ ...checks, [question.id]: runJavaScriptTests(code[question.id] ?? question.starter, question.testcases) })}>Run sample tests</Button>
                  ) : <p className="text-xs text-muted">This language is evaluated by your faculty. Hidden tests stay on the question.</p>}
                  {(checks[question.id] || []).filter((item) => !item.hidden).map((item) => (
                    <p key={item.id} className="text-sm">{item.pass ? 'Sample passed' : `Sample failed${item.error ? `: ${item.error}` : ''}`}</p>
                  ))}
                  {(checks[question.id] || []).some((item) => item.hidden) ? <p className="text-xs text-muted">Hidden tests were also run. Expected values stay hidden.</p> : null}
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
      <PageTitle eyebrow="Learning" title="Examinations" text="Published exams for your batch. You can submit each exam once." />
      {lms.exams().map((item) => {
        const attempt = lms.state.attempts.find((row) => row.examId === item.id && row.studentId === student?.id)
        return (
          <article key={item.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 soft-shadow">
            <div>
              <h2 className="font-semibold">{item.title}</h2>
              <p className="text-sm text-muted">{item.kind.toUpperCase()} · {item.durationMin} min</p>
              {attempt ? <p className="text-sm">{attempt.published ? `Score ${attempt.score}/${attempt.total}` : 'Submitted. Results are not published yet.'}</p> : null}
            </div>
            {attempt ? <Badge tone={attempt.published ? 'green' : 'gold'}>{attempt.published ? 'Result published' : 'Submitted'}</Badge> : <Button onClick={() => { setActive(item.id); setAnswers({}); setCode({}); setChecks({}) }}>Start</Button>}
          </article>
        )
      })}
      {!lms.exams().length ? <Empty title="No published exams" /> : null}
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
