import { useState } from 'react'
import { Badge, Button, DateInput, Empty, Field, Modal, PageTitle, Select, TextArea, TextInput, statusTone } from '../../components/ui'
import { ENQUIRY_STATUSES, inr, statusLabel, todayISO } from '../../lib/format'
import { useLookups } from './lookups'
import { useTitle } from '../useTitle'

const SOURCES = ['Website', 'Walk-in', 'Referral', 'Social Media']
const blank = { name: '', phone: '', email: '', courseId: '', source: 'Walk-in', status: 'new', followUpDate: todayISO(), remarks: '', note: '' }

export function EnquiriesPage({ createOnly = false }) {
  const lms = useLookups()
  const [open, setOpen] = useState(createOnly)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  useTitle(createOnly ? 'Add enquiry' : 'Enquiries')
  const canDelete = lms.can('enquiries.full')
  const rows = lms.enquiries()
  return (
    <div>
      <PageTitle eyebrow="Admissions" title={createOnly ? 'Add new enquiry' : 'Enquiries'} text="Capture name, phone, course, source and the next follow-up." action={createOnly ? null : <Button onClick={() => { setEditing(null); setForm(blank); setOpen(true) }}>Add enquiry</Button>} />
      {createOnly ? <EnquiryForm lms={lms} form={form} setForm={setForm} onDone={() => setForm(blank)} /> : null}
      {!createOnly && rows.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Student', 'Course', 'Source', 'Status', 'Follow-up', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((enquiry) => (
                <tr key={enquiry.id} className="border-t border-line">
                  <td className="px-4 py-3"><span className="font-semibold">{enquiry.name}</span><span className="block text-xs text-muted">{enquiry.phone}</span></td>
                  <td className="px-4 py-3">{lms.courseName(enquiry.courseId)}</td>
                  <td className="px-4 py-3">{enquiry.source}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(enquiry.status)}>{statusLabel(enquiry.status)}</Badge></td>
                  <td className="px-4 py-3">{enquiry.followUpDate || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="mr-3 font-semibold text-brand-700" onClick={() => { setEditing(enquiry); setForm({ ...enquiry, note: '' }); setOpen(true) }}>Update</button>
                    {canDelete ? <button className="font-semibold text-rose-700" onClick={() => lms.deleteEnquiry(enquiry.id)}>Delete</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!createOnly && !rows.length ? <Empty title="No enquiries" /> : null}
      {!createOnly ? (
        <Modal open={open} title={editing ? 'Update enquiry' : 'Add enquiry'} onClose={() => setOpen(false)} wide>
          <EnquiryForm lms={lms} form={form} setForm={setForm} editing={editing} onDone={() => setOpen(false)} />
        </Modal>
      ) : null}
    </div>
  )
}

function EnquiryForm({ lms, form, setForm, editing, onDone }) {
  const alreadyEnrolled = editing && lms.state.admissions.some((item) => item.enquiryId === editing.id && item.status === 'enrolled')
  const needsEnrollment = form.status === 'converted' && editing && !alreadyEnrolled
  const availableBatches = lms.state.batches.filter((batch) => (
    ['running', 'waiting'].includes(batch.status)
    && (!form.courseId || batch.courseId === form.courseId)
  ))
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault()
      if (needsEnrollment) {
        const ok = lms.enrollEnquiry(editing.id, { courseId: form.courseId, batchId: form.batchId, enquiry: form })
        if (ok) onDone()
        return
      }
      const ok = lms.saveEnquiry(editing ? { ...form, id: editing.id } : form)
      if (ok) onDone()
    }}>
      <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
      <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
      <Field label="Email"><TextInput value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Source">
        <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{SOURCES.map((source) => <option key={source}>{source}</option>)}</Select>
      </Field>
      <Field label="Course">
        <Select value={form.courseId || ''} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
          <option value="">Undecided</option>
          {lms.state.courses.map((course) => <option key={course.id} value={course.id}>{course.name} · {inr(course.fee)}</option>)}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value, batchId: '' })}>
          {ENQUIRY_STATUSES.filter((status) => editing || status.id !== 'converted').map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
        </Select>
      </Field>
      {needsEnrollment ? (
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold">Choose a running or waiting batch to complete this conversion.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableBatches.map((batch) => (
              <button key={batch.id} type="button" onClick={() => setForm({ ...form, courseId: batch.courseId, batchId: batch.id })} className={`rounded-2xl border p-3 text-left ${form.batchId === batch.id ? 'border-brand-500 bg-brand-50' : 'border-line bg-white'}`}>
                <span className="block font-semibold">{batch.name}</span>
                <span className="text-xs text-muted">{lms.courseName(batch.courseId)} · {batch.status}</span>
              </button>
            ))}
            {!availableBatches.length ? <p className="text-sm text-muted">No running or waiting batches are available for this course.</p> : null}
          </div>
        </div>
      ) : null}
      <Field label="Follow-up date"><DateInput value={form.followUpDate || ''} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></Field>
      <Field label="Remarks"><TextInput value={form.remarks || ''} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
      <div className="sm:col-span-2"><Field label="History note"><TextArea value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field></div>
      {editing?.history?.length ? (
        <div className="sm:col-span-2 rounded-2xl bg-brand-50 p-3 text-sm">
          {editing.history.map((item, index) => <p key={index} className="py-1"><span className="font-semibold">{item.by}:</span> {item.note}</p>)}
        </div>
      ) : null}
      <div className="sm:col-span-2"><Button type="submit" disabled={needsEnrollment && !form.batchId}>{needsEnrollment ? 'Convert and enroll' : 'Save enquiry'}</Button></div>
    </form>
  )
}

export function FollowUpsPage() {
  const lms = useLookups()
  const today = todayISO()
  useTitle('Follow-ups')
  const rows = lms.enquiries().filter((item) => !['converted', 'not_interested'].includes(item.status))
  const due = rows.filter((item) => item.followUpDate && item.followUpDate <= today)
  return (
    <div>
      <PageTitle eyebrow="Counselling" title="Follow-ups" text={`${due.length} due now. Update the remark after each call.`} />
      <div className="space-y-3">
        {rows.map((enquiry) => <FollowCard key={enquiry.id} enquiry={enquiry} lms={lms} urgent={enquiry.followUpDate && enquiry.followUpDate <= today} />)}
        {!rows.length ? <Empty title="No open follow-ups" /> : null}
      </div>
    </div>
  )
}

function FollowCard({ enquiry, lms, urgent }) {
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(enquiry.status)
  const [date, setDate] = useState(enquiry.followUpDate || '')
  return (
    <article className="rounded-3xl bg-white p-5 soft-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl">{enquiry.name}</h2>
          <p className="text-sm text-muted">{enquiry.phone} · {lms.courseName(enquiry.courseId)} · {enquiry.source}</p>
        </div>
        {urgent ? <Badge tone="rose">Due</Badge> : <Badge tone={statusTone(enquiry.status)}>{statusLabel(enquiry.status)}</Badge>}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_160px_auto]">
        <TextInput placeholder="Call remark" value={note} onChange={(e) => setNote(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>{ENQUIRY_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select>
        <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        <Button onClick={() => lms.saveEnquiry({ ...enquiry, status, followUpDate: date, note })}>Save</Button>
      </div>
    </article>
  )
}

export function SessionsPage() {
  const lms = useLookups()
  const [form, setForm] = useState({ enquiryId: '', date: todayISO(), time: '11:00', mode: 'Campus', notes: '' })
  useTitle('Counselling sessions')
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={(event) => { event.preventDefault(); if (lms.saveSession(form)) setForm({ ...form, notes: '', enquiryId: '' }) }}>
        <h1 className="font-display text-2xl">Schedule a session</h1>
        <Field label="Enquiry">
          <Select value={form.enquiryId} onChange={(e) => setForm({ ...form, enquiryId: e.target.value })} required>
            <option value="">Select</option>
            {lms.enquiries().filter((item) => item.status !== 'converted').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </Field>
        <Field label="Date"><DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Time"><TextInput type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
        <Field label="Mode">
          <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option>Campus</option><option>Phone</option></Select>
        </Field>
        <Field label="Notes"><TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <Button type="submit">Save session</Button>
      </form>
      <div className="space-y-3">
        {lms.state.sessions.map((session) => {
          const enquiry = lms.state.enquiries.find((item) => item.id === session.enquiryId)
          return (
            <article key={session.id} className="rounded-3xl bg-white p-4 soft-shadow">
              <p className="font-semibold">{enquiry?.name || 'Enquiry'}</p>
              <p className="text-sm text-muted">{session.date} · {session.time} · {session.mode}</p>
              <p className="mt-1 text-sm">{session.notes}</p>
            </article>
          )
        })}
        {!lms.state.sessions.length ? <Empty title="No sessions scheduled" /> : null}
      </div>
    </div>
  )
}

function BatchCard({ lms, batch }) {
  if (!batch) return null
  const faculty = lms.state.faculty.find((item) => item.id === batch.facultyId)
  const filled = lms.state.students.filter((student) => student.batchId === batch.id && student.status !== 'inactive').length
  return (
    <div className="rounded-2xl bg-brand-50 p-4 text-sm">
      <p className="font-semibold">{batch.name}</p>
      <p className="mt-1">Course: {lms.courseName(batch.courseId)}</p>
      <p>Timing: {batch.schedule || 'Not set yet'}</p>
      <p>Dates: {batch.startDate || '—'} to {batch.endDate || '—'}</p>
      <p>Status: {batch.status}</p>
      <p>Faculty: {faculty ? lms.profileName(faculty.userId) : 'Unassigned'}</p>
      <p>Seats: {filled} joined · {Math.max(batch.seats - filled, 0)} free of {batch.seats}</p>
    </div>
  )
}

export function AdmissionsPage() {
  const lms = useLookups()
  const [target, setTarget] = useState(null)
  const [form, setForm] = useState({ courseId: '', batchId: '', documents: '', guardian: '', mode: 'enrolled' })
  const canManage = lms.canAny(['admissions.manage', 'admissions.assist'])
  const viewOnly = !canManage
  useTitle('Admissions')
  const batches = lms.state.batches.filter((batch) => batch.courseId === form.courseId)
  return (
    <div>
      <PageTitle eyebrow="Admissions" title="Admissions" text={viewOnly ? 'Fee context for enrolled students. Academic records stay with faculty.' : 'Convert an enquiry or confirm one that is still processing.'} />
      <div className="space-y-3">
        {lms.state.admissions.map((admission) => (
          <article key={admission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 soft-shadow">
            <div>
              <p className="font-semibold">{lms.studentName(admission.studentId)}</p>
              <p className="text-sm text-muted">{lms.courseName(admission.courseId)} · {lms.batchName(admission.batchId)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(admission.status)}>{admission.status}</Badge>
              {canManage && admission.status === 'processing' ? <Button onClick={() => lms.confirmAdmission(admission.id)}>Confirm</Button> : null}
            </div>
          </article>
        ))}
      </div>
      {canManage ? (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl">Open enquiries</h2>
          <div className="space-y-2">
            {lms.enquiries().filter((item) => item.status !== 'converted' && item.status !== 'not_interested').map((enquiry) => (
              <div key={enquiry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm soft-shadow">
                <span>{enquiry.name} · {lms.courseName(enquiry.courseId)} · {inr(lms.state.courses.find((course) => course.id === enquiry.courseId)?.fee || 0)}</span>
                <Button variant="outline" onClick={() => { setTarget(enquiry); setForm({ courseId: enquiry.courseId, batchId: '', documents: '', guardian: '', mode: 'enrolled' }) }}>Convert</Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <Modal open={!!target} title={`Enroll ${target?.name || ''}`} onClose={() => setTarget(null)}>
        <form className="space-y-3" onSubmit={(event) => {
          event.preventDefault()
          const ok = lms.enrollEnquiry(target.id, { ...form, documents: form.documents.split(',').map((item) => item.trim()).filter(Boolean), mode: form.mode === 'processing' ? 'processing' : 'enrolled' })
          if (ok) setTarget(null)
        }}>
          <Field label="Course">
            <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, batchId: '' })}>
              {lms.state.courses.map((course) => <option key={course.id} value={course.id}>{course.name} · {inr(course.fee)}</option>)}
            </Select>
          </Field>
          <Field label="Batch">
            <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required>
              <option value="">Select</option>
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </Select>
          </Field>
          {form.batchId ? <BatchCard lms={lms} batch={batches.find((batch) => batch.id === form.batchId)} /> : <p className="text-sm text-muted">Choose a batch to see the timing, faculty and seats this student will join.</p>}
          <Field label="Documents"><TextInput value={form.documents} onChange={(e) => setForm({ ...form, documents: e.target.value })} placeholder="Aadhaar, Photo" /></Field>
          <Field label="Next step">
            <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="enrolled">Enroll now</option>
              <option value="processing">Submit for processing</option>
            </Select>
          </Field>
          <Button type="submit">Save admission</Button>
        </form>
      </Modal>
    </div>
  )
}
