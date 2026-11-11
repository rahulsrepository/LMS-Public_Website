import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, DateInput, Empty, Field, PageTitle, Select, TextArea, TextInput, statusTone } from '../../components/ui'
import { formatDate, inr, ROLE_LABELS, safeExternalUrl, todayISO } from '../../lib/format'
import { useLookups } from './lookups'
import { useTitle } from '../useTitle'

export function FacultyAttendancePage() {
  const lms = useLookups()
  const canMark = lms.can('attendance.faculty')
  const date = todayISO()
  const [category, setCategory] = useState('')
  useTitle('Staff attendance')
  const rows = category === 'teaching'
    ? lms.state.faculty.filter((item) => item.status === 'active').map((item) => ({
      id: item.userId,
      facultyId: item.id,
      name: lms.profileName(item.userId),
      role: 'faculty',
    }))
    : lms.state.profiles.filter((item) => item.active && !['faculty', 'student'].includes(item.role)).map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
    }))
  return (
    <div>
      <PageTitle eyebrow="Academic" title="Staff attendance" text={`Teaching and non-teaching attendance for ${formatDate(date)}.`} action={<Link to="/app/attendance" className="inline-flex items-center rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-50">Student attendance</Link>} />
      {!category ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[['teaching', 'Teaching staff', 'Faculty attendance'], ['non-teaching', 'Non-teaching staff', 'Reception, counselling, accounts and admin staff']].map(([value, title, text]) => (
            <button key={value} type="button" onClick={() => setCategory(value)} className="rounded-3xl bg-white p-6 text-left soft-shadow hover:ring-2 hover:ring-brand-200">
              <h2 className="font-display text-xl">{title}</h2>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <Button type="button" variant="outline" className="mb-4" onClick={() => setCategory('')}>Attendance categories</Button>
          {rows.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Staff member', 'Role', 'Today', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((person) => {
                const mark = lms.state.facultyAttendance.find((item) => (
                  item.date === date && item.category === category
                  && (item.personId === person.id || item.facultyId === person.facultyId)
                ))
                return (
                  <tr key={person.id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">{person.name}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[person.role] || person.role}</td>
                    <td className="px-4 py-3">{mark ? <Badge tone={mark.status === 'present' ? 'green' : 'rose'}>{mark.status}</Badge> : <span className="text-muted">Not marked</span>}</td>
                    <td className="px-4 py-3 text-right">
                      {canMark ? (
                        <span className="inline-flex gap-2">
                          <Button type="button" onClick={() => lms.markStaffAttendance(person.id, category, 'present')}>Present</Button>
                          <Button type="button" variant="outline" onClick={() => lms.markStaffAttendance(person.id, category, 'absent')}>Absent</Button>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
          ) : <Empty title={`No active ${category} staff`} text="Add staff under People before marking attendance." />}
        </>
      )}
    </div>
  )
}

export function WorkshopsDesk() {
  const lms = useLookups()
  const [form, setForm] = useState({ title: '', date: '', mode: 'Campus', seats: 30, blurb: '' })
  useTitle('Workshops')
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={async (event) => { event.preventDefault(); if (await lms.saveWorkshop(form)) setForm({ title: '', date: '', mode: 'Campus', seats: 30, blurb: '' }) }}>
        <h1 className="font-display text-2xl">Add workshop</h1>
        <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
        <Field label="Date"><DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
        <Field label="Mode"><TextInput value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} /></Field>
        <Field label="Seats"><TextInput type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} /></Field>
        <Field label="Note"><TextArea value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} /></Field>
        <Button type="submit">Save workshop</Button>
      </form>
      <div className="space-y-3">
        {lms.state.workshops.map((item) => (
          <article key={item.id} className="rounded-3xl bg-white p-4 soft-shadow">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-xl">{item.title}</h2>
                <Badge tone={item.status === 'closed' ? 'slate' : 'green'}>{item.status || 'open'}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => lms.setWorkshopStatus(item.id, item.status === 'closed' ? 'open' : 'closed')}>
                  {item.status === 'closed' ? 'Open' : 'Close'}
                </Button>
                <Button type="button" variant="danger" onClick={() => {
                  if (window.confirm(`Permanently delete the ${item.title} workshop?`)) lms.deleteWorkshop(item.id)
                }}>Delete</Button>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted">{item.date} · {item.mode} · {item.seats} seats</p>
            <p className="mt-2 text-sm">{item.blurb}</p>
          </article>
        ))}
        {!lms.state.workshops.length ? <Empty title="No workshops yet" /> : null}
      </div>
    </div>
  )
}

export function CareersDesk() {
  const lms = useLookups()
  const [form, setForm] = useState({ title: '', company: '', type: 'FULL TIME', industry: 'IT', skills: '', place: '', salary: '', applyUrl: '', blurb: '', open: true })
  const [editingId, setEditingId] = useState(null)
  const canManage = lms.can('jobs.manage')
  useTitle('Job postings')
  function resetForm() {
    setEditingId(null)
    setForm({ title: '', company: '', type: 'FULL TIME', industry: 'IT', skills: '', place: '', salary: '', applyUrl: '', blurb: '', open: true })
  }
  function employmentType(type) {
    const value = String(type || '').toLowerCase().replace(/[-_]/g, ' ')
    if (value.includes('intern')) return 'INTERNSHIP'
    if (value.includes('part')) return 'PART TIME'
    if (value.includes('contract')) return 'CONTRACTED BASED'
    return 'FULL TIME'
  }
  return (
    <div className={canManage ? 'grid gap-4 lg:grid-cols-[0.8fr_1.2fr]' : 'space-y-4'}>
      {canManage ? (
        <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={async (event) => {
          event.preventDefault()
          if (await lms.saveJob({ ...form, id: editingId })) resetForm()
        }}>
          <h1 className="font-display text-2xl">{editingId ? 'Edit job posting' : 'Post a job'}</h1>
          <Field label="Job title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Company name"><TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></Field>
          <Field label="Skills" hint="Separate multiple skills with commas."><TextInput value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} required /></Field>
          <Field label="Location"><TextInput value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} required /></Field>
          <Field label="Salary" hint="Enter an amount or range, for example ₹4–6 LPA or Negotiable."><TextInput value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required /></Field>
          <Field label="Application link" hint="Optional. If provided, use a link starting with https://."><TextInput type="url" placeholder="https://company.example/jobs/role" value={form.applyUrl} onChange={(e) => setForm({ ...form, applyUrl: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Employment type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {['FULL TIME', 'PART TIME', 'INTERNSHIP', 'CONTRACTED BASED'].map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
            <Field label="Industry">
              <Select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                <option value="IT">IT</option>
                <option value="NON IT">NON IT</option>
              </Select>
            </Field>
          </div>
          {editingId ? <Field label="Opening status"><Select value={form.open ? 'open' : 'closed'} onChange={(e) => setForm({ ...form, open: e.target.value === 'open' })}><option value="open">Published</option><option value="closed">Closed</option></Select></Field> : null}
          <Field label="Description"><TextArea value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">{editingId ? 'Save changes' : 'Publish job'}</Button>
            {editingId ? <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button> : null}
          </div>
        </form>
      ) : <PageTitle eyebrow="Jobs" title="Open opportunities" text="Job postings shared by the admin are shown here." />}
      <div className={canManage ? 'space-y-3' : 'grid gap-3 lg:grid-cols-2'}>
        {lms.state.jobs.filter((item) => canManage || item.open !== false).map((item) => (
          <article key={item.id} className="rounded-3xl bg-white p-4 soft-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-brand-700">{item.company || 'Company'} · {employmentType(item.type)} · {item.industry || 'IT'}</p>
                <h2 className="mt-1 font-display text-xl">{item.title}</h2>
              </div>
              {canManage ? <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => {
                setEditingId(item.id)
                setForm({ title: item.title || '', company: item.company || '', type: employmentType(item.type), industry: item.industry || 'IT', skills: item.skills || '', place: item.place || '', salary: item.salary || '', applyUrl: item.applyUrl || '', blurb: item.blurb || '', open: item.open !== false })
              }}>Edit</Button>
                <Button type="button" variant="subtle" onClick={() => lms.setJobOpen(item.id, item.open === false)}> {item.open === false ? 'Reopen' : 'Close'} </Button>
                <Button type="button" variant="danger" onClick={() => {
                  if (window.confirm(`Permanently delete the ${item.title} opening?`)) lms.deleteJob(item.id)
                }}>Delete</Button>
              </div> : null}
            </div>
            {!item.open ? <Badge tone="slate">Closed</Badge> : null}
            <p className="mt-1 text-sm text-muted">{item.place || 'Location not specified'} · {item.salary || 'Salary not specified'}</p>
            {item.skills ? <p className="mt-2 text-sm"><span className="font-semibold">Skills:</span> {item.skills}</p> : null}
            <p className="mt-2 text-sm">{item.blurb}</p>
            {safeExternalUrl(item.applyUrl) ? <a href={safeExternalUrl(item.applyUrl)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Apply</a> : null}
          </article>
        ))}
        {!lms.state.jobs.some((item) => canManage || item.open !== false) ? <Empty title="No open jobs yet" text="New job postings from the admin will appear here." /> : null}
      </div>
    </div>
  )
}

export function InventoryDesk() {
  const lms = useLookups()
  const [form, setForm] = useState({ name: '', qty: 1, note: '' })
  useTitle('Inventory')
  return (
    <div>
      <PageTitle eyebrow="Operations" title="Inventory" text="Books, lab kits and other items kept at the campus." />
      <form className="mb-4 grid gap-3 rounded-3xl bg-white p-5 soft-shadow md:grid-cols-[1.4fr_0.6fr_1fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); if (lms.saveInventory(form)) setForm({ name: '', qty: 1, note: '' }) }}>
        <Field label="Item"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Quantity"><TextInput type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
        <Field label="Note"><TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <Button type="submit">Add</Button>
      </form>
      {lms.state.inventory.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Item', 'Qty', 'Note'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {lms.state.inventory.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{item.name}</td>
                  <td className="px-4 py-3">{item.qty}</td>
                  <td className="px-4 py-3">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="Inventory is empty" />}
    </div>
  )
}

export function TicketsDesk() {
  const lms = useLookups()
  const [form, setForm] = useState({ subject: '', message: '' })
  const admin = lms.session.role === 'admin'
  useTitle('Support tickets')
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={(event) => { event.preventDefault(); if (lms.saveTicket(form)) setForm({ subject: '', message: '' }) }}>
        <h1 className="font-display text-2xl">New ticket</h1>
        <Field label="Subject"><TextInput value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></Field>
        <Field label="Message"><TextArea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></Field>
        <Button type="submit">Send to admin</Button>
      </form>
      <div className="space-y-3">
        {lms.state.tickets.map((item) => (
          <article key={item.id} className="rounded-3xl bg-white p-4 soft-shadow">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{item.subject}</h2>
              <Badge tone={statusTone(item.status)}>{item.status}</Badge>
            </div>
            <p className="mt-1 text-sm">{item.message}</p>
            <p className="mt-2 text-xs text-muted">{item.by} · {item.role} · {new Date(item.at).toLocaleString('en-IN')}</p>
            {admin && item.status === 'open' ? <Button className="mt-3" variant="outline" onClick={() => lms.setTicketStatus(item.id, 'closed')}>Close ticket</Button> : null}
          </article>
        ))}
        {!lms.state.tickets.length ? <Empty title="No tickets" /> : null}
      </div>
    </div>
  )
}

function moneyRows(lms, kind) {
  return lms.state.payments.filter((item) => item.kind === kind)
}

export function CashDesk() {
  const lms = useLookups()
  const [form, setForm] = useState({ amount: '', direction: 'in', note: '' })
  useTitle('Cash on hand')
  const collected = lms.state.payments.filter((item) => item.method === 'cash' && item.kind === 'collection' && item.status === 'verified').reduce((sum, item) => sum + Number(item.amount), 0)
  const refunded = lms.state.payments.filter((item) => item.method === 'cash' && item.kind === 'refund' && item.status === 'verified').reduce((sum, item) => sum + Number(item.amount), 0)
  const notes = lms.state.cashNotes.reduce((sum, item) => sum + (item.direction === 'out' ? -Number(item.amount) : Number(item.amount)), 0)
  return (
    <div>
      <PageTitle eyebrow="Finance" title="Cash on hand" text="Verified cash collections, cash refunds the admin has approved, and manual cash notes." />
      <p className="mb-4 rounded-3xl bg-white p-5 font-display text-3xl soft-shadow">{inr(collected - refunded + notes)}</p>
      <form className="mb-4 grid gap-3 rounded-3xl bg-white p-5 soft-shadow md:grid-cols-[0.6fr_0.6fr_1fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); if (lms.addCashNote(form)) setForm({ amount: '', direction: 'in', note: '' }) }}>
        <Field label="Amount"><TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
        <Field label="Direction">
          <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="in">Cash in</option>
            <option value="out">Cash out</option>
          </Select>
        </Field>
        <Field label="Note"><TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <Button type="submit">Save</Button>
      </form>
      <div className="space-y-2">
        {lms.state.cashNotes.map((item) => (
          <p key={item.id} className="rounded-2xl bg-white px-4 py-3 text-sm soft-shadow">{item.direction === 'out' ? 'Out' : 'In'} · {inr(item.amount)} · {item.note || 'No note'} · {item.by}</p>
        ))}
      </div>
    </div>
  )
}

export function ApprovalsDesk({ kind }) {
  const lms = useLookups()
  const admin = lms.session.role === 'admin'
  const [form, setForm] = useState({ studentId: '', amount: '', note: '', method: 'cash' })
  const [query, setQuery] = useState('')
  const title = kind === 'refund' ? 'Refunds' : 'Discount approvals'
  useTitle(title)
  const matchesStudent = (student) => `${student?.name || ''} ${student?.rollNo || ''}`.toLowerCase().includes(query.toLowerCase())
  const rows = moneyRows(lms, kind).filter((item) => matchesStudent(lms.state.students.find((student) => student.id === item.studentId)))
  const students = lms.state.students.filter(matchesStudent)
  return (
    <div>
      <PageTitle eyebrow="Finance" title={title} text={kind === 'refund' ? 'Reception or accounts can request a refund. It is paid only after an admin approves it.' : 'Reception or accounts can request a discount. It changes the fee only after an admin approves it.'} />
      <TextInput className="mb-4 max-w-sm" placeholder="Search students by name or roll number" value={query} onChange={(e) => setQuery(e.target.value)} />
      <form className="mb-4 grid gap-3 rounded-3xl bg-white p-5 soft-shadow md:grid-cols-2" onSubmit={(event) => {
        event.preventDefault()
        const ok = lms.recordPayment({ ...form, kind, method: kind === 'discount' ? 'adjustment' : form.method })
        if (ok) setForm({ studentId: '', amount: '', note: '', method: 'cash' })
      }}>
        <Field label="Student">
          <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
            <option value="">Select</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.rollNo}</option>)}
          </Select>
        </Field>
        <Field label="Amount"><TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
        <Field label="Reason"><TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} required /></Field>
        {kind === 'refund' ? (
          <Field label="Method">
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
            </Select>
          </Field>
        ) : null}
        <Button type="submit">{admin ? 'Record and approve' : 'Request approval'}</Button>
      </form>
      {rows.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Student', 'Amount', 'Reason', 'Status', ''].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3">{lms.state.students.find((student) => student.id === item.studentId)?.name || 'Student'}</td>
                  <td className="px-4 py-3">{inr(item.amount)}</td>
                  <td className="px-4 py-3">{item.note}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone(item.status)}>{item.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {admin && item.status === 'pending' ? (
                      <span className="inline-flex gap-2">
                        <Button type="button" onClick={() => lms.verifyPayment(item.id, 'verified')}>Approve</Button>
                        <Button type="button" variant="outline" onClick={() => lms.verifyPayment(item.id, 'rejected')}>Reject</Button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title="Nothing waiting" />}
    </div>
  )
}

export function ReferralDesk() {
  const lms = useLookups()
  const [form, setForm] = useState({ name: '', amount: '', note: '' })
  useTitle('Referral wallet')
  const total = lms.state.referrals.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  return (
    <div>
      <PageTitle eyebrow="Finance" title="Referral wallet" text="Credits for people who refer a student. The balance is the sum of the entries below." />
      <p className="mb-4 rounded-3xl bg-white p-5 font-display text-3xl soft-shadow">{inr(total)}</p>
      <form className="mb-4 grid gap-3 rounded-3xl bg-white p-5 soft-shadow md:grid-cols-[1fr_0.6fr_1fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); if (lms.addReferral(form)) setForm({ name: '', amount: '', note: '' }) }}>
        <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Amount"><TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
        <Field label="Note"><TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <Button type="submit">Add</Button>
      </form>
      {lms.state.referrals.map((item) => (
        <p key={item.id} className="mb-2 rounded-2xl bg-white px-4 py-3 text-sm soft-shadow">{item.name} · {inr(item.amount)} · {item.note || 'Referral'} · {item.by}</p>
      ))}
    </div>
  )
}

export function ProfilePage() {
  const lms = useLookups()
  const [form, setForm] = useState({ current: '', next: '' })
  const [busy, setBusy] = useState(false)
  useTitle('Profile settings')
  return (
    <div className="max-w-xl">
      <PageTitle eyebrow="Settings" title="Profile settings" text={`${lms.session.name} · ${lms.session.role}. Enter the password you use now, then the new one.`} />
      <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        const ok = await lms.changeOwnPassword(form.current, form.next)
        setBusy(false)
        if (ok) setForm({ current: '', next: '' })
      }}>
        <Field label="Existing password"><TextInput type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required /></Field>
        <Field label="New password" hint="At least 6 characters of any kind."><TextInput type="password" minLength={6} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required /></Field>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</Button>
      </form>
    </div>
  )
}
