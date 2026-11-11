import { useState } from 'react'
import { Badge, Button, DateInput, Empty, Field, Modal, PageTitle, Select, TextArea, TextInput, statusTone } from '../../components/ui'
import { runJavaScriptTests } from '../../lib/codeRunner'
import { useLookups } from './lookups'
import { useTitle } from '../useTitle'

function blankQuestion(kind) {
  if (kind === 'coding') {
    return { type: 'coding', prompt: '', language: 'javascript', starter: 'function solution(items) {\n  \n}\n', marks: 10, testcases: [{ input: '[[1,2,3]]', expected: '6', hidden: false }] }
  }
  return { type: 'mcq', prompt: '', options: ['', '', '', ''], answer: 0, marks: 2 }
}

export function ExamDesk({ mode = 'all' }) {
  const lms = useLookups()
  const [open, setOpen] = useState(false)
  const kind = mode === 'coding' ? 'coding' : mode === 'mcq' ? 'mcq' : 'mcq'
  const [form, setForm] = useState({ title: '', batchId: '', subjectId: '', durationMin: 30, kind, status: 'published', questions: [blankQuestion(kind)] })
  useTitle(mode === 'coding' ? 'Coding problems' : mode === 'mcq' ? 'MCQ management' : 'Examinations')
  const exams = lms.exams().filter((exam) => (mode === 'all' ? true : exam.kind === mode))
  const batches = lms.session.role === 'faculty' ? lms.batches() : lms.state.batches
  const subjects = lms.session.role === 'faculty' ? lms.subjects() : lms.state.subjects

  function updateQuestion(index, patch) {
    setForm({ ...form, questions: form.questions.map((question, item) => (item === index ? { ...question, ...patch } : question)) })
  }

  return (
    <div>
      <PageTitle
        eyebrow="Examinations"
        title={mode === 'coding' ? 'Coding problems' : mode === 'mcq' ? 'MCQ management' : 'Examinations'}
        text={mode === 'coding' ? 'Published coding questions become available in students’ Company Questions menu.' : 'New examinations are published to the selected batch. JavaScript answers can be checked against hidden test cases.'}
        action={<Button onClick={() => { setForm({ title: '', batchId: batches[0]?.id || '', subjectId: subjects[0]?.id || '', durationMin: 30, kind, status: 'published', questions: [blankQuestion(kind)] }); setOpen(true) }}>Create {mode === 'coding' ? 'coding exam' : 'exam'}</Button>}
      />
      {exams.length ? (
        <div className="space-y-3">
          {exams.map((exam) => (
            <article key={exam.id} className="rounded-3xl bg-white p-5 soft-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl">{exam.title}</h2>
                  <p className="text-sm text-muted">{lms.batchName(exam.batchId)} · {exam.durationMin} min · {exam.questions.length} question{exam.questions.length > 1 ? 's' : ''}</p>
                </div>
                <Badge tone={statusTone(exam.status)}>{exam.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {exam.status !== 'published' ? <Button onClick={() => lms.setExamStatus(exam.id, 'published')}>Publish</Button> : <Button variant="outline" onClick={() => lms.setExamStatus(exam.id, 'closed')}>Close</Button>}
                <Button variant="subtle" onClick={() => lms.publishResults(exam.id)}>Publish results</Button>
              </div>
            </article>
          ))}
        </div>
      ) : <Empty title="No examinations yet" text="Create a draft, add questions, then publish it to the batch." />}
      <Modal open={open} title="New examination" onClose={() => setOpen(false)} wide>
        <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (await lms.saveExam(form)) setOpen(false) }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
            <Field label="Duration (minutes)"><TextInput type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} /></Field>
            <Field label="Batch">
              <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</Select>
            </Field>
            <Field label="Subject">
              <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select>
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
              <input type="checkbox" checked={form.status === 'published'} onChange={(event) => setForm({ ...form, status: event.target.checked ? 'published' : 'draft' })} />
              Publish to students immediately
            </label>
            {mode === 'all' ? (
              <Field label="Type">
                <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, questions: [blankQuestion(e.target.value)] })}>
                  <option value="mcq">MCQ</option>
                  <option value="coding">Coding</option>
                </Select>
              </Field>
            ) : null}
          </div>
          {form.questions.map((question, index) => (
            <div key={index} className="rounded-2xl border border-line p-3">
              <Field label={`Question ${index + 1}`}><TextArea value={question.prompt} onChange={(e) => updateQuestion(index, { prompt: e.target.value })} /></Field>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label="Marks"><TextInput type="number" value={question.marks} onChange={(e) => updateQuestion(index, { marks: e.target.value })} /></Field>
                {question.type === 'coding' ? (
                  <Field label="Language">
                    <Select value={question.language} onChange={(e) => updateQuestion(index, { language: e.target.value })}>
                      <option value="javascript">JavaScript (auto-checked)</option>
                      <option value="java">Java (faculty evaluates)</option>
                      <option value="python">Python (faculty evaluates)</option>
                    </Select>
                  </Field>
                ) : null}
              </div>
              {question.type === 'mcq' ? (
                <div className="mt-2 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center gap-2 text-sm">
                      <input type="radio" name={`answer-${index}`} checked={Number(question.answer) === optionIndex} onChange={() => updateQuestion(index, { answer: optionIndex })} />
                      <TextInput value={option} placeholder={`Option ${optionIndex + 1}`} onChange={(e) => {
                        const options = [...question.options]
                        options[optionIndex] = e.target.value
                        updateQuestion(index, { options })
                      }} />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <Field label="Starter code"><TextArea value={question.starter} onChange={(e) => updateQuestion(index, { starter: e.target.value })} /></Field>
                  {question.testcases.map((testcase, caseIndex) => (
                    <div key={caseIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <TextInput placeholder='Input JSON e.g. [[1,2]]' value={testcase.input} onChange={(e) => {
                        const testcases = question.testcases.map((item, itemIndex) => itemIndex === caseIndex ? { ...item, input: e.target.value } : item)
                        updateQuestion(index, { testcases })
                      }} />
                      <TextInput placeholder="Expected JSON" value={testcase.expected} onChange={(e) => {
                        const testcases = question.testcases.map((item, itemIndex) => itemIndex === caseIndex ? { ...item, expected: e.target.value } : item)
                        updateQuestion(index, { testcases })
                      }} />
                      <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={testcase.hidden} onChange={(e) => {
                        const testcases = question.testcases.map((item, itemIndex) => itemIndex === caseIndex ? { ...item, hidden: e.target.checked } : item)
                        updateQuestion(index, { testcases })
                      }} /> Hidden</label>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => updateQuestion(index, { testcases: [...question.testcases, { input: '', expected: '', hidden: true }] })}>Add test case</Button>
                </div>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setForm({ ...form, questions: [...form.questions, blankQuestion(form.kind)] })}>Add question</Button>
          <Button type="submit">{form.status === 'published' ? 'Create examination' : 'Save draft'}</Button>
        </form>
      </Modal>
    </div>
  )
}

export function AssignmentDesk() {
  const lms = useLookups()
  const [open, setOpen] = useState(false)
  const batches = lms.session.role === 'faculty' ? lms.batches() : lms.state.batches
  const [form, setForm] = useState({ title: '', batchId: batches[0]?.id || '', subjectId: '', deadline: '', totalMarks: 20, description: '' })
  useTitle('Assignments')
  const rows = lms.assignments()
  return (
    <div>
      <PageTitle eyebrow="Teaching" title="Assignments" text="Set a deadline, then evaluate submissions from the submissions page." action={<Button onClick={() => setOpen(true)}>Create assignment</Button>} />
      {rows.length ? rows.map((item) => (
        <article key={item.id} className="mb-3 rounded-3xl bg-white p-5 soft-shadow">
          <h2 className="font-display text-xl">{item.title}</h2>
          <p className="text-sm text-muted">{lms.batchName(item.batchId)} · due {item.deadline} · {item.totalMarks} marks</p>
          <p className="mt-2 text-sm">{item.description}</p>
        </article>
      )) : <Empty title="No assignments" />}
      <Modal open={open} title="New assignment" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (lms.saveAssignment(form)) setOpen(false) }}>
          <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Batch"><Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</Select></Field>
          <Field label="Deadline"><DateInput value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required /></Field>
          <Field label="Marks"><TextInput type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} /></Field>
          <Field label="Instructions"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Button type="submit">Save assignment</Button>
        </form>
      </Modal>
    </div>
  )
}

export function SubmissionsPage() {
  const lms = useLookups()
  useTitle('Submissions')
  const assignmentIds = new Set(lms.assignments().map((item) => item.id))
  const rows = lms.state.submissions.filter((submission) => assignmentIds.has(submission.assignmentId))
  const [drafts, setDrafts] = useState({})
  return (
    <div>
      <PageTitle eyebrow="Teaching" title="Student submissions" text="Enter marks and a short feedback note. Students see feedback after you save it." />
      {rows.length ? rows.map((submission) => {
        const assignment = lms.state.assignments.find((item) => item.id === submission.assignmentId)
        const draft = drafts[submission.id] || { marks: submission.marks ?? '', feedback: submission.feedback || '' }
        return (
          <article key={submission.id} className="mb-3 rounded-3xl bg-white p-5 soft-shadow">
            <p className="text-xs font-semibold uppercase text-brand-700">{assignment?.title}</p>
            <h2 className="font-display text-lg">{lms.studentName(submission.studentId)}</h2>
            <p className="mt-2 text-sm">{submission.content}</p>
            {submission.fileName ? <p className="text-xs text-muted">{submission.fileName}</p> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
              <TextInput type="number" placeholder="Marks" value={draft.marks} onChange={(e) => setDrafts({ ...drafts, [submission.id]: { ...draft, marks: e.target.value } })} />
              <TextInput placeholder="Feedback" value={draft.feedback} onChange={(e) => setDrafts({ ...drafts, [submission.id]: { ...draft, feedback: e.target.value } })} />
              <Button onClick={() => lms.gradeSubmission(submission.id, draft.marks, draft.feedback)}>Save</Button>
            </div>
          </article>
        )
      }) : <Empty title="No submissions yet" />}
    </div>
  )
}

export function ResultsPage() {
  const lms = useLookups()
  const [drafts, setDrafts] = useState({})
  useTitle('Results')
  const exams = lms.exams()
  const examIds = new Set(exams.map((exam) => exam.id))
  const attempts = lms.state.attempts.filter((attempt) => examIds.has(attempt.examId))
  return (
    <div>
      <PageTitle eyebrow="Teaching" title="Results" text="Publish an exam’s results when marks look right. Students only see a score after it is published." />
      {exams.map((exam) => (
        <section key={exam.id} className="mb-4 rounded-3xl bg-white p-5 soft-shadow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">{exam.title}</h2>
            <Button variant="outline" onClick={() => lms.publishResults(exam.id)}>Publish results</Button>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {attempts.filter((attempt) => attempt.examId === exam.id).map((attempt) => {
              const draft = drafts[attempt.id] || { marks: attempt.score ?? '', feedback: attempt.feedback || '' }
              return (
                <li key={attempt.id} className="py-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold">{lms.studentName(attempt.studentId)}</span>
                    <span>{attempt.score}/{attempt.total} · {attempt.published ? 'published' : 'held'}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {exam.questions.map((question, index) => {
                      const choice = Number(attempt.answers?.[question.id])
                      return (
                        <div key={question.id} className="rounded-2xl bg-brand-50 p-3">
                          <p className="font-semibold">Q{index + 1}. {question.prompt}</p>
                          {question.type === 'mcq' ? (
                            <p className="mt-1 text-muted">Answer: {question.options?.[choice] || 'No answer'}{Number.isInteger(choice) && choice === Number(question.answer) ? ' · Correct' : ''}</p>
                          ) : (
                            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-white">{attempt.code?.[question.id] || 'No code submitted'}</pre>
                          )}
                        </div>
                      )
                    })}
                    <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                      <TextInput type="number" min="0" max={exam.questions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0)} placeholder="Marks" value={draft.marks} onChange={(e) => setDrafts({ ...drafts, [attempt.id]: { ...draft, marks: e.target.value } })} />
                      <TextInput placeholder="Feedback" value={draft.feedback} onChange={(e) => setDrafts({ ...drafts, [attempt.id]: { ...draft, feedback: e.target.value } })} />
                      <Button type="button" onClick={() => lms.gradeAttempt(attempt.id, draft.marks, draft.feedback)}>Save marks</Button>
                    </div>
                  </div>
                </li>
              )
            })}
            {!attempts.some((attempt) => attempt.examId === exam.id) ? <li className="py-2 text-sm text-muted">No submissions.</li> : null}
          </ul>
        </section>
      ))}
      {!exams.length ? <Empty title="No exams in your batches" /> : null}
    </div>
  )
}

export function PerformancePage() {
  const lms = useLookups()
  useTitle('Performance')
  const students = lms.students()
  return (
    <div>
      <PageTitle eyebrow="Teaching" title="Performance reports" text="Attendance, assignment marks and published exam scores for students you teach." />
      <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-muted"><tr>{['Student', 'Batch', 'Attendance', 'Assignments', 'Exams'].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead>
          <tbody>
            {students.map((student) => {
              const rows = lms.attendance().filter((row) => row.studentId === student.id)
              const present = rows.filter((row) => row.status === 'present' || row.status === 'late').length
              const subs = lms.state.submissions.filter((item) => item.studentId === student.id && item.marks != null)
              const attempts = lms.state.attempts.filter((item) => item.studentId === student.id && item.published)
              const avg = subs.length ? Math.round(subs.reduce((sum, item) => sum + item.marks, 0) / subs.length) : '—'
              return (
                <tr key={student.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{student.name}<span className="block text-xs text-muted">{student.rollNo}</span></td>
                  <td className="px-4 py-3">{lms.batchName(student.batchId)}</td>
                  <td className="px-4 py-3">{rows.length ? `${Math.round((present / rows.length) * 100)}%` : '—'}</td>
                  <td className="px-4 py-3">{avg}</td>
                  <td className="px-4 py-3">{attempts.map((item) => `${item.score}/${item.total}`).join(', ') || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function previewTests(question, code) {
  if (question.language !== 'javascript') return []
  return runJavaScriptTests(code, question.testcases)
}
