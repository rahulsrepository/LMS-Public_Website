import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Empty, Field, Modal, PageTitle, PasswordInput, Select, TextInput, statusTone } from '../../components/ui'
import { ROLE_LABELS } from '../../lib/format'
import { useLookups } from './lookups'
import { useTitle } from '../useTitle'

const emptyStudent = { name: '', email: '', phone: '', password: '', courseId: '', batchId: '', guardian: '', documents: '', notes: '', avatarFile: null }

export function StudentsPage() {
  const lms = useLookups()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyStudent)
  useTitle('Students')
  const rows = lms.students().filter((student) => `${student.name} ${student.rollNo}`.toLowerCase().includes(query.toLowerCase()))
  const canWrite = lms.canAny(['students.write', 'students.register'])
  const facultyView = lms.session.role === 'faculty'
  const batches = form.courseId ? lms.state.batches.filter((batch) => batch.courseId === form.courseId) : lms.batches()

  function openEdit(student) {
    setEditing(student)
    setForm({
      name: student.name,
      email: student.email || '',
      phone: student.phone || '',
      courseId: student.courseId,
      batchId: student.batchId,
      guardian: student.guardian || '',
      documents: (student.documents || []).join(', '),
      notes: student.notes || '',
      avatarFile: null,
    })
  }

  return (
    <div>
      <PageTitle eyebrow="Students" title={facultyView ? 'My students' : 'Student management'} text={facultyView ? 'Only students in your assigned batches are listed.' : 'Admissions, batches and account status live here.'} action={canWrite ? <Button onClick={() => { setEditing('new'); setForm(emptyStudent) }}>Add student</Button> : null} />
      <TextInput placeholder="Search name or roll number" value={query} onChange={(event) => setQuery(event.target.value)} className="mb-4 max-w-sm" />
      {rows.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>{['Roll', 'Student', 'Course', 'Batch', 'Status', ''].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((student) => (
                <tr key={student.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{student.rollNo}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-2">{(lms.state.profiles.find((profile) => profile.id === student.userId)?.avatarUrl || student.avatarUrl) ? <img src={lms.state.profiles.find((profile) => profile.id === student.userId)?.avatarUrl || student.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : null}<span>{student.name}<span className="block text-xs text-muted">{student.phone}</span></span></span></td>
                  <td className="px-4 py-3">{lms.courseName(student.courseId)}</td>
                  <td className="px-4 py-3">{lms.batchName(student.batchId)}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(student.status)}>{student.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {canWrite ? <button className="mr-3 font-semibold text-brand-700" onClick={() => openEdit(student)}>Edit</button> : null}
                    {lms.can('students.status') ? <button className="mr-3 font-semibold" onClick={() => lms.setStudentStatus(student.id, student.status === 'active' ? 'inactive' : 'active')}>{student.status === 'active' ? 'Deactivate' : 'Activate'}</button> : null}
                    {lms.can('students.delete') ? <button className="font-semibold text-rose-700" onClick={() => {
                      if (window.confirm(`Permanently delete ${student.name}'s account and student record? Related student records will also be deleted.`)) lms.deleteStudent(student.id)
                    }}>Delete</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="No students in this view" text="Assigned batches and new admissions will show up here." />}
      <StudentForm lms={lms} open={!!editing} form={form} setForm={setForm} batches={batches} onClose={() => setEditing(null)} editing={editing} />
    </div>
  )
}

function StudentForm({ lms, open, form, setForm, batches, onClose, editing }) {
  return (
    <Modal open={open} title={editing === 'new' ? 'Register student' : 'Edit student'} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (event) => {
        event.preventDefault()
        const payload = { ...form, documents: form.documents.split(',').map((item) => item.trim()).filter(Boolean) }
        const ok = editing === 'new'
          ? await lms.addStudent(payload)
          : lms.session.role === 'admin' && editing.userId
            ? await lms.updatePerson(editing.userId, { ...payload, avatarFile: form.avatarFile })
            : lms.updateStudent(editing.id, payload)
        if (ok) onClose()
      }}>
        <Field label="Full name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} disabled={editing !== 'new' && lms.session.role !== 'admin'} onChange={(e) => setForm({ ...form, email: e.target.value })} required={editing === 'new'} /></Field>
        </div>
        {editing === 'new' ? (
          <Field label="Password" hint="At least 6 characters of any kind.">
            <div className="flex gap-2">
              <PasswordInput minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: `Student@${Math.floor(1000 + Math.random() * 9000)}` })}>Generate</Button>
            </div>
          </Field>
        ) : null}
        <Field label="Course">
          <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, batchId: '' })} required>
            <option value="">Select</option>
            {lms.state.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </Select>
        </Field>
        <Field label="Batch">
          <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required>
            <option value="">Select</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
          </Select>
        </Field>
        <Field label="Guardian"><TextInput value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} /></Field>
        {lms.session.role === 'admin' ? <Field label="Profile picture"><input type="file" accept="image/*" className="w-full text-sm" onChange={(e) => setForm({ ...form, avatarFile: e.target.files?.[0] || null })} /></Field> : null}
        <Field label="Documents" hint="Comma separated, for example Aadhaar, Photo"><TextInput value={form.documents} onChange={(e) => setForm({ ...form, documents: e.target.value })} /></Field>
        {lms.session.role === 'admin' ? <Field label="Notes"><TextInput value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field> : null}
        <Button type="submit">Save student</Button>
      </form>
    </Modal>
  )
}

export function RegisterPage() {
  const lms = useLookups()
  const [form, setForm] = useState(emptyStudent)
  useTitle('Student registration')
  const batches = form.courseId ? lms.state.batches.filter((batch) => batch.courseId === form.courseId) : []
  return (
    <div className="max-w-2xl">
      <PageTitle eyebrow="Admissions" title="Student registration" text="Creates an active student record and a fee account. It does not collect money." />
      <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={async (event) => {
        event.preventDefault()
        const ok = await lms.addStudent({ ...form, documents: form.documents.split(',').map((item) => item.trim()).filter(Boolean) })
        if (ok) setForm(emptyStudent)
      }}>
        <Field label="Full name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
        </div>
        <Field label="Password" hint="At least 6 characters of any kind.">
          <div className="flex gap-2">
            <PasswordInput minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: `Student@${Math.floor(1000 + Math.random() * 9000)}` })}>Generate</Button>
          </div>
        </Field>
        <Field label="Course">
          <Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, batchId: '' })} required>
            <option value="">Select</option>
            {lms.state.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </Select>
        </Field>
        <Field label="Batch">
          <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} required>
            <option value="">Select</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
          </Select>
        </Field>
        <Field label="Documents"><TextInput value={form.documents} onChange={(e) => setForm({ ...form, documents: e.target.value })} placeholder="Aadhaar, Photo" /></Field>
        {lms.session.role === 'admin' ? <Field label="Profile picture"><input type="file" accept="image/*" className="w-full text-sm" onChange={(e) => setForm({ ...form, avatarFile: e.target.files?.[0] || null })} /></Field> : null}
        <Button type="submit">Register student</Button>
      </form>
    </div>
  )
}

const emptyFaculty = { name: '', email: '', phone: '', password: '', designation: 'Trainer', qualification: '', specialization: '', experience: '', avatarFile: null, subjectIds: [], batchIds: [] }

export function FacultyPage() {
  const lms = useLookups()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(params.get('new') === '1')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyFaculty)
  useTitle('Faculty')
  const rows = lms.state.faculty.map((faculty) => ({ ...faculty, profile: lms.state.profiles.find((profile) => profile.id === faculty.userId) }))

  function startEdit(row) {
    setEditing(row)
    setForm({
      name: row.profile?.name || '',
      email: row.profile?.email || '',
      phone: row.profile?.phone || '',
      password: '',
      designation: row.designation,
      qualification: row.qualification,
      specialization: row.specialization,
      experience: row.profile?.experience || '',
      avatarFile: null,
      subjectIds: row.subjectIds,
      batchIds: row.batchIds,
    })
    setOpen(true)
  }

  function toggle(list, id) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  return (
    <div>
      <PageTitle eyebrow="Faculty" title="Faculty management" text="Admin and receptionist create the login. Faculty sign in with the email and password from this form." action={<Button onClick={() => { setEditing(null); setForm(emptyFaculty); setOpen(true) }}>Add faculty</Button>} />
      <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr>{['Faculty', 'Specialization', 'Subjects', 'Batches', 'Status', ''].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3"><span className="flex items-center gap-2">{row.profile?.avatarUrl ? <img src={row.profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : null}<span className="font-semibold">{row.profile?.name}<span className="block text-xs font-normal text-muted">{row.profile?.email}</span></span></span></td>
                <td className="px-4 py-3">{row.specialization}</td>
                <td className="px-4 py-3">{row.subjectIds.map((id) => lms.subjectName(id)).join(', ') || '—'}</td>
                <td className="px-4 py-3">{row.batchIds.length}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {row.status !== 'removed' ? <button className="mr-3 font-semibold text-brand-700" onClick={() => startEdit(row)}>Edit</button> : null}
                  {row.status !== 'active' ? <button className="mr-3 font-semibold" onClick={() => lms.setFacultyStatus(row.id, 'active')}>Activate</button> : <button className="mr-3 font-semibold" onClick={() => lms.setFacultyStatus(row.id, 'inactive')}>Deactivate</button>}
                  {row.status !== 'removed' ? <button className="font-semibold text-rose-700" onClick={() => lms.removeFacultyAccess(row.id)}>Remove access</button> : null}
                  {lms.session.role === 'admin' && row.userId !== lms.session.id ? <button className="ml-3 font-semibold text-rose-700" onClick={() => {
                    if (window.confirm(`Permanently delete ${row.profile?.name || 'this faculty member'}'s account?`)) lms.deletePerson(row.userId)
                  }}>Delete account</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} title={editing ? 'Edit faculty' : 'Add faculty'} onClose={() => setOpen(false)} wide>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
          event.preventDefault()
          let ok
          if (editing) {
            ok = lms.session.role === 'admin'
              ? await lms.updatePerson(editing.userId, form)
              : true
            if (ok) ok = lms.updateFaculty(editing.id, form)
          } else {
            ok = await lms.addFaculty(form)
          }
          if (ok) setOpen(false)
        }}>
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email">
            <TextInput type="email" value={form.email} disabled={!!editing && lms.session.role !== 'admin'} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          {editing ? null : (
            <Field label="Temporary password" hint="Shown once. At least 6 characters of any kind.">
              <div className="flex gap-2">
                <PasswordInput minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: `Faculty@${Math.floor(1000 + Math.random() * 9000)}` })}>Generate</Button>
              </div>
            </Field>
          )}
          <Field label="Designation"><TextInput value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          <Field label="Qualification"><TextInput value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></Field>
          <Field label="Specialization"><TextInput value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></Field>
          <Field label="Experience"><TextInput value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="Years or relevant experience" /></Field>
          {lms.session.role === 'admin' ? <Field label="Profile picture"><input type="file" accept="image/*" className="w-full text-sm" onChange={(e) => setForm({ ...form, avatarFile: e.target.files?.[0] || null })} /></Field> : null}
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Subjects</legend>
              <div className="max-h-40 space-y-1 overflow-auto rounded-2xl border border-line p-3">
                {lms.state.subjects.map((subject) => (
                  <label key={subject.id} className="flex gap-2 text-sm">
                    <input type="checkbox" checked={form.subjectIds.includes(subject.id)} onChange={() => setForm({ ...form, subjectIds: toggle(form.subjectIds, subject.id) })} />
                    {subject.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Batches</legend>
              <div className="max-h-40 space-y-1 overflow-auto rounded-2xl border border-line p-3">
                {lms.state.batches.map((batch) => (
                  <label key={batch.id} className="flex gap-2 text-sm">
                    <input type="checkbox" checked={form.batchIds.includes(batch.id)} onChange={() => setForm({ ...form, batchIds: toggle(form.batchIds, batch.id) })} />
                    {batch.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="sm:col-span-2"><Button type="submit">{editing ? 'Save changes' : 'Create faculty login'}</Button></div>
        </form>
      </Modal>
    </div>
  )
}

export function StaffPage({ role, title }) {
  const lms = useLookups()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shift: 'Morning', focus: 'Admissions', experience: '', avatarFile: null })
  useTitle(title)
  const key = role === 'admin' ? null : role === 'receptionist' ? 'receptionists' : role === 'counsellor' ? 'counsellors' : 'accountants'
  const rows = role === 'admin'
    ? lms.state.profiles.filter((profile) => profile.role === 'admin').map((profile) => ({ id: profile.id, userId: profile.id, profile }))
    : lms.state[key].map((row) => ({ ...row, profile: lms.state.profiles.find((profile) => profile.id === row.userId) }))
  const noun = ROLE_LABELS[role]
  return (
    <div>
      <PageTitle eyebrow="People" title={title} text={`${role === 'admin' ? 'Only admins can create or remove another admin. The current admin cannot remove their own access.' : 'Admin and receptionist can add this account and remove its access.'} Accounts sign in with the email and password from this form.`} action={<Button onClick={() => { setEditing(null); setForm({ name: '', email: '', phone: '', password: '', shift: 'Morning', focus: 'Admissions', experience: '', avatarFile: null }); setOpen(true) }}>Add {noun.toLowerCase()}</Button>} />
      {rows.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Name', 'Email', 'Phone', 'Status', ''].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3"><span className="flex items-center gap-2">{row.profile?.avatarUrl ? <img src={row.profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : null}<span className="font-semibold">{row.profile?.name}</span></span></td>
                  <td className="px-4 py-3">{row.profile?.email}</td>
                  <td className="px-4 py-3">{row.profile?.phone || '—'}</td>
                  <td className="px-4 py-3"><Badge tone={row.profile?.active ? 'green' : 'rose'}>{row.profile?.active ? 'active' : 'inactive'}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {lms.session.role === 'admin' ? <button className="mr-3 font-semibold text-brand-700" onClick={() => {
                      setEditing(row)
                      setForm({ name: row.profile?.name || '', email: row.profile?.email || '', phone: row.profile?.phone || '', password: '', shift: row.shift || 'Morning', focus: row.focus || 'Admissions', experience: row.profile?.experience || '', avatarFile: null })
                      setOpen(true)
                    }}>Edit</button> : null}
                    {row.userId !== lms.session.id ? <button className="font-semibold text-rose-700" onClick={() => lms.setStaffStatus(row.userId, !row.profile?.active)}>{row.profile?.active ? 'Remove access' : 'Restore access'}</button> : <span className="text-xs text-muted">Current account</span>}
                    {lms.session.role === 'admin' && row.userId !== lms.session.id ? <button className="ml-3 font-semibold text-rose-700" onClick={() => {
                      if (window.confirm(`Permanently delete ${row.profile?.name || 'this person'}'s account?`)) lms.deletePerson(row.userId)
                    }}>Delete account</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={`No ${noun.toLowerCase()} accounts`} />}
      <Modal open={open} title={editing ? `Edit ${noun.toLowerCase()}` : `Add ${noun.toLowerCase()}`} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault()
          const ok = editing
            ? await lms.updatePerson(editing.userId, form)
            : await lms.addStaff({ ...form, role })
          if (ok) { setOpen(false); setEditing(null); setForm({ name: '', email: '', phone: '', password: '', shift: 'Morning', focus: 'Admissions', experience: '', avatarFile: null }) }
        }}>
          <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Experience"><TextInput value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="Years or relevant experience" /></Field>
          {lms.session.role === 'admin' ? <Field label="Profile picture"><input type="file" accept="image/*" className="w-full text-sm" onChange={(e) => setForm({ ...form, avatarFile: e.target.files?.[0] || null })} /></Field> : null}
          {!editing ? <Field label="Password" hint="At least 6 characters of any kind.">
            <div className="flex gap-2">
              <PasswordInput minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: `Staff@${Math.floor(1000 + Math.random() * 9000)}` })}>Generate</Button>
            </div>
          </Field> : null}
          <Button type="submit">{editing ? 'Save changes' : 'Create account'}</Button>
        </form>
      </Modal>
    </div>
  )
}

export function useFiltered() {
  return useMemo(() => [], [])
}
