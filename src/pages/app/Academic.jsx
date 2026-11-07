import { useState } from 'react'
import { Badge, Button, Empty, Field, Modal, PageTitle, Select, TextArea, TextInput, statusTone } from '../../components/ui'
import { inr, todayISO } from '../../lib/format'
import { useLookups } from './lookups'
import { useTitle } from '../useTitle'

export function CoursesPage() {
  const lms = useLookups()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', fee: '', duration: '', level: 'Beginner', summary: '' })
  const manage = lms.can('courses.manage')
  useTitle('Courses')
  return (
    <div>
      <PageTitle eyebrow="Academics" title={manage ? 'Course management' : 'Course information'} text="Duration and fees shown to counsellors, reception and accounts." action={manage ? <Button onClick={() => { setForm({ id: '', name: '', fee: '', duration: '3 months', level: 'Beginner', summary: '' }); setOpen(true) }}>Add course</Button> : null} />
      <div className="grid gap-4 md:grid-cols-2">
        {lms.state.courses.map((course) => (
          <article key={course.id} className="rounded-3xl bg-white p-5 soft-shadow">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl">{course.name}</h2>
              <Badge tone="gold">{inr(course.fee)}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{course.summary}</p>
            <p className="mt-3 text-sm font-semibold">{course.duration} · {course.level}</p>
            {manage ? <button className="mt-3 text-sm font-semibold text-brand-700" onClick={() => { setForm({ id: course.id, name: course.name, fee: course.fee, duration: course.duration, level: course.level, summary: course.summary }); setOpen(true) }}>Edit</button> : null}
          </article>
        ))}
      </div>
      <Modal open={open} title={form.id ? 'Edit course' : 'Add course'} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); if (await lms.saveCourse(form)) setOpen(false) }}>
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fee (₹)"><TextInput type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} required /></Field>
            <Field label="Duration"><TextInput value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></Field>
          </div>
          <Field label="Level"><TextInput value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} /></Field>
          <Field label="Summary"><TextArea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
          <Button type="submit">Save course</Button>
        </form>
      </Modal>
    </div>
  )
}

export function SubjectsPage({ mine = false }) {
  const lms = useLookups()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', code: '', courseId: '' })
  const manage = lms.can('subjects.manage')
  const rows = mine ? lms.subjects() : lms.state.subjects
  useTitle(mine ? 'My subjects' : 'Subjects')
  return (
    <div>
      <PageTitle eyebrow="Academics" title={mine ? 'My subjects' : 'Subject management'} text={mine ? 'Subjects assigned to you. Add notes from Study Materials.' : 'Subjects belong to a course and can be assigned to faculty.'} action={manage ? <Button onClick={() => { setForm({ id: '', name: '', code: '', courseId: lms.state.courses[0]?.id || '' }); setOpen(true) }}>Add subject</Button> : null} />
      {rows.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Code', 'Subject', 'Course', ''].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead>
            <tbody>
              {rows.map((subject) => (
                <tr key={subject.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{subject.code}</td>
                  <td className="px-4 py-3">{subject.name}</td>
                  <td className="px-4 py-3">{lms.courseName(subject.courseId)}</td>
                  <td className="px-4 py-3 text-right">{manage ? <button className="font-semibold text-brand-700" onClick={() => { setForm(subject); setOpen(true) }}>Edit</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="No subjects assigned" text="Ask admin or reception to assign your subjects." />}
      <Modal open={open} title={form.id ? 'Edit subject' : 'Add subject'} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (lms.saveSubject(form)) setOpen(false) }}>
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Code"><TextInput value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Course">
            <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              {lms.state.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </Select>
          </Field>
          <Button type="submit">Save subject</Button>
        </form>
      </Modal>
    </div>
  )
}

const emptyBatch = { id: '', name: '', courseId: '', facultyId: '', schedule: '', seats: 25, status: 'running', startDate: todayISO(), endDate: '' }

export function BatchesPage({ mine = false }) {
  const lms = useLookups()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyBatch)
  const manage = lms.can('batches.manage')
  const rows = mine ? lms.batches() : (lms.session.role === 'faculty' ? lms.batches() : lms.state.batches)
  useTitle(mine ? 'My batches' : 'Batches')

  function openBatch(batch) {
    setForm(batch ? {
      id: batch.id,
      name: batch.name,
      courseId: batch.courseId,
      facultyId: batch.facultyId || '',
      schedule: batch.schedule || '',
      seats: batch.seats,
      status: batch.status || 'running',
      startDate: batch.startDate || todayISO(),
      endDate: batch.endDate || '',
    } : emptyBatch)
    setOpen(true)
  }

  return (
    <div>
      <PageTitle eyebrow="Academics" title={mine ? 'My batches' : manage ? 'Batch management' : 'Batch information'} text="Schedules, seats and the faculty member responsible for the lab." action={manage ? <Button onClick={() => openBatch(null)}>Add batch</Button> : null} />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((batch) => {
          const count = lms.state.students.filter((student) => student.batchId === batch.id && student.status !== 'inactive').length
          const faculty = lms.state.faculty.find((item) => item.id === batch.facultyId)
          return (
            <article key={batch.id} className="rounded-3xl bg-white p-5 soft-shadow">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl">{batch.name}</h2>
                <Badge tone={statusTone(batch.status)}>{batch.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{lms.courseName(batch.courseId)}</p>
              <p className="mt-1 text-sm">{batch.schedule}</p>
              <p className="mt-2 text-sm">Faculty: {faculty ? lms.profileName(faculty.userId) : 'Unassigned'}</p>
              <p className="text-sm text-muted">{count} / {batch.seats} seats</p>
              {manage ? <button className="mt-3 text-sm font-semibold text-brand-700" onClick={() => openBatch(batch)}>Edit</button> : null}
            </article>
          )
        })}
      </div>
      {!rows.length ? <Empty title="No batches to show" /> : null}
      <Modal open={open} title={form.id ? 'Edit batch' : 'Add batch'} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); if (await lms.saveBatch(form)) setOpen(false) }}>
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Course">
            <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
              <option value="">Select</option>
              {lms.state.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="running">Running</option>
              <option value="waiting">Waiting</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
          <Field label="Faculty">
            <Select value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
              <option value="">Assign later</option>
              {lms.state.faculty.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{lms.profileName(item.userId)}</option>)}
            </Select>
          </Field>
          <Field label="Schedule"><TextInput value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Mon–Sat · 8:00–10:00" /></Field>
          <Field label="Seats"><TextInput type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} /></Field>
          <Button type="submit">{form.id ? 'Save changes' : 'Create batch'}</Button>
        </form>
      </Modal>
    </div>
  )
}

export function AttendancePage() {
  const lms = useLookups()
  const batches = lms.session.role === 'faculty' ? lms.batches() : lms.state.batches
  const [batchId, setBatchId] = useState(batches[0]?.id || '')
  const [date, setDate] = useState(todayISO())
  const students = lms.state.students.filter((student) => student.batchId === batchId && student.status === 'active')
  const canMark = lms.can('attendance.mark')
  const [marks, setMarks] = useState({})
  useTitle('Attendance')
  const existing = lms.attendance().filter((row) => row.batchId === batchId && row.date === date)
  function statusFor(studentId) {
    return marks[studentId] || existing.find((row) => row.studentId === studentId)?.status || 'present'
  }
  return (
    <div>
      <PageTitle eyebrow="Academics" title="Attendance" text={canMark ? 'Mark the batch you teach. Admin can mark any running batch.' : 'View-only attendance for the front desk.'} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Batch">
          <Select value={batchId} onChange={(e) => { setBatchId(e.target.value); setMarks({}) }}>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
          </Select>
        </Field>
        <Field label="Date"><TextInput type="date" value={date} onChange={(e) => { setDate(e.target.value); setMarks({}) }} /></Field>
      </div>
      {students.length ? (
        <div className="rounded-3xl bg-white soft-shadow">
          {students.map((student) => (
            <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-0">
              <span><span className="font-semibold">{student.name}</span> · {student.rollNo}</span>
              <div className="flex gap-2">
                {['present', 'absent', 'late'].map((status) => (
                  <button key={status} disabled={!canMark} onClick={() => setMarks({ ...marks, [student.id]: status })} className={`rounded-full px-3 py-1 text-xs font-semibold ${statusFor(student.id) === status ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-800'}`}>{status}</button>
                ))}
              </div>
            </div>
          ))}
          {canMark ? <div className="p-4"><Button onClick={() => lms.saveAttendance(batchId, date, students.map((student) => ({ studentId: student.id, status: statusFor(student.id) })))}>Save attendance</Button></div> : null}
        </div>
      ) : <Empty title="No active students in this batch" />}
    </div>
  )
}

export function MaterialsPage() {
  const lms = useLookups()
  const [open, setOpen] = useState(false)
  const subjects = lms.session.role === 'faculty' ? lms.subjects() : lms.state.subjects
  const [form, setForm] = useState({ title: '', subjectId: subjects[0]?.id || '', batchId: '', kind: 'PDF', fileName: '' })
  useTitle('Study materials')
  const rows = lms.materials()
  return (
    <div>
      <PageTitle eyebrow="Teaching" title="Study materials" text="Upload notes, PDFs and presentations for an assigned subject." action={<Button onClick={() => setOpen(true)}>Add material</Button>} />
      {rows.length ? (
        <div className="grid gap-3">
          {rows.map((item) => (
            <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-4 py-4 soft-shadow">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-muted">{item.kind} · {item.fileName} · {lms.subjectName(item.subjectId)}</p>
              </div>
              <button className="text-sm font-semibold text-rose-700" onClick={() => lms.deleteMaterial(item.id)}>Remove</button>
            </article>
          ))}
        </div>
      ) : <Empty title="No materials yet" text="Add a PDF or a slide deck for your next class." />}
      <Modal open={open} title="Add study material" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (lms.addMaterial(form)) setOpen(false) }}>
          <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Subject">
            <Select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </Select>
          </Field>
          <Field label="Batch">
            <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
              <option value="">Default batch</option>
              {lms.batches().map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {['PDF', 'Notes', 'Presentation'].map((kind) => <option key={kind}>{kind}</option>)}
            </Select>
          </Field>
          <Field label="File" hint="The file name is stored with the material.">
            <input type="file" className="text-sm" onChange={(e) => setForm({ ...form, fileName: e.target.files?.[0]?.name || '' })} />
          </Field>
          <Button type="submit">Save material</Button>
        </form>
      </Modal>
    </div>
  )
}
