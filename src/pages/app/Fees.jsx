import { useState } from 'react'
import { Badge, Button, DateInput, Empty, Field, Modal, PageTitle, Select, TextInput, statusTone } from '../../components/ui'
import { downloadCsv, formatDate, inr, todayISO } from '../../lib/format'
import { useLookups, monthSeries } from './lookups'
import { useTitle } from '../useTitle'

function feeOf(state, studentId) {
  return state.feeRecords.find((fee) => fee.studentId === studentId)
}

export function FeesPage({ focus = 'accounts' }) {
  const lms = useLookups()
  const manage = lms.can('fees.manage')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  useTitle(focus === 'pending' ? 'Pending fees' : focus === 'transactions' ? 'Transactions' : 'Fees')
  const students = (lms.session.role === 'accountant' ? lms.students() : lms.state.students).filter((student) => `${student.name} ${student.rollNo}`.toLowerCase().includes(query.toLowerCase()))
  const pendingOnly = focus === 'pending'
  const visible = pendingOnly ? students.filter((student) => (feeOf(lms.state, student.id)?.pending || 0) > 0) : students

  if (focus === 'transactions') return <Transactions lms={lms} />
  if (focus === 'verify') return <Verification lms={lms} />
  if (focus === 'receipts') return <Receipts lms={lms} />
  if (focus === 'collect') return <Collect lms={lms} />

  return (
    <div>
      <PageTitle eyebrow="Accounts" title={pendingOnly ? 'Pending fees' : manage ? 'Student fee management' : 'Fee summary'} text={manage ? 'Name, roll number, course fee, installments and balance.' : 'You can review balances. Recording a payment stays with accounts.'} action={manage && !pendingOnly ? <Button onClick={() => setOpen(true)}>Record payment</Button> : null} />
      <TextInput className="mb-4 max-w-sm" placeholder="Search student or roll number" value={query} onChange={(e) => setQuery(e.target.value)} />
      {visible.length ? (
        <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr>{['Roll', 'Student', 'Course', 'Fee', 'Paid', 'Pending', 'Due'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {visible.map((student) => {
                const fee = feeOf(lms.state, student.id)
                const overdue = fee?.pending > 0 && fee.dueDate && fee.dueDate < todayISO()
                return (
                  <tr key={student.id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">{student.rollNo}</td>
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3">{lms.courseName(student.courseId)}</td>
                    <td className="px-4 py-3">{inr(fee?.total)}</td>
                    <td className="px-4 py-3">{inr(fee?.paid)}</td>
                    <td className="px-4 py-3">{inr(fee?.pending)} {overdue ? <Badge tone="rose">Overdue</Badge> : null}</td>
                    <td className="px-4 py-3">{formatDate(fee?.dueDate)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty title="Nothing in this list" />}
      {manage ? <PaymentModal lms={lms} open={open} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

function Collect({ lms }) {
  useTitle('Fee collection')
  return (
    <div className="max-w-xl">
      <PageTitle eyebrow="Accounts" title="Fee collection" text="Cash, UPI or bank transfer. UPI and bank payments need a UTR. Refunds wait for an admin." />
      <PaymentForm lms={lms} />
    </div>
  )
}

function PaymentForm({ lms, onDone }) {
  const [form, setForm] = useState({ studentId: '', amount: '', method: 'upi', kind: 'collection', utr: '', note: '', date: todayISO(), proofName: '' })
  return (
    <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={(event) => {
      event.preventDefault()
      const ok = lms.recordPayment(form)
      if (ok) {
        setForm({ ...form, amount: '', utr: '', note: '', proofName: '' })
        onDone?.()
      }
    }}>
      <Field label="Student">
        <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
          <option value="">Select</option>
          {lms.state.students.filter((student) => student.status !== 'inactive').map((student) => <option key={student.id} value={student.id}>{student.name} · {student.rollNo}</option>)}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount"><TextInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
        <Field label="Date"><DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Method">
          <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank transfer</option>
          </Select>
        </Field>
        <Field label="Type">
          <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="collection">Collection</option>
            <option value="discount">Discount</option>
            <option value="refund">Refund</option>
          </Select>
        </Field>
      </div>
      {form.method !== 'cash' ? <Field label="UTR / Transaction ID"><TextInput value={form.utr} onChange={(e) => setForm({ ...form, utr: e.target.value })} /></Field> : null}
      <Field label="Note">{form.kind === 'collection' ? <TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /> : <TextInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Reason, required for refund or discount" />}</Field>
      <Field label="Payment proof"><input type="file" className="text-sm" onChange={(e) => setForm({ ...form, proofName: e.target.files?.[0]?.name || '' })} /></Field>
      <Button type="submit">Save payment</Button>
    </form>
  )
}

function PaymentModal({ lms, open, onClose }) {
  return (
    <Modal open={open} title="Record payment" onClose={onClose} wide>
      <PaymentForm lms={lms} onDone={onClose} />
    </Modal>
  )
}

function Verification({ lms }) {
  useTitle('Payment verification')
  const rows = lms.payments().filter((payment) => payment.status === 'pending')
  return (
    <div>
      <PageTitle eyebrow="Accounts" title="Payment verification" text="Refunds and discounts can be verified only by an admin." />
      {rows.length ? rows.map((payment) => (
        <article key={payment.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 soft-shadow">
          <div>
            <p className="font-semibold">{lms.studentName(payment.studentId)} · {inr(payment.amount)}</p>
            <p className="text-sm text-muted">{payment.kind} · {payment.method} · {payment.utr || 'No UTR'} {payment.proofName ? `· ${payment.proofName}` : ''}</p>
            {payment.note ? <p className="text-sm">{payment.note}</p> : null}
          </div>
          <div className="flex gap-2">
            {payment.kind === 'collection' || lms.session.role === 'admin' ? <Button onClick={() => lms.verifyPayment(payment.id, 'verified')}>Verify</Button> : <Badge tone="gold">Needs admin</Badge>}
            <Button variant="outline" onClick={() => lms.verifyPayment(payment.id, 'rejected')}>Reject</Button>
          </div>
        </article>
      )) : <Empty title="Verification queue is clear" />}
    </div>
  )
}

function Transactions({ lms }) {
  useTitle('Transactions')
  const rows = lms.payments()
  return (
    <div>
      <PageTitle eyebrow="Accounts" title="UTR / transaction records" text="Every collection, discount and refund, with the receipt number." />
      <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-xs uppercase text-muted"><tr>{['Receipt', 'Student', 'Amount', 'Method', 'UTR', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((payment) => (
              <tr key={payment.id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{payment.receiptNo}</td>
                <td className="px-4 py-3">{lms.studentName(payment.studentId)}</td>
                <td className="px-4 py-3">{inr(payment.amount)} <span className="text-xs text-muted">{payment.kind}</span></td>
                <td className="px-4 py-3">{payment.method}</td>
                <td className="px-4 py-3">{payment.utr || '—'}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(payment.status)}>{payment.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Receipts({ lms }) {
  const [id, setId] = useState(lms.payments()[0]?.id || '')
  const payment = lms.payments().find((item) => item.id === id)
  const student = lms.state.students.find((item) => item.id === payment?.studentId)
  useTitle('Receipts')
  return (
    <div>
      <PageTitle eyebrow="Accounts" title="Payment receipts" text="Choose a transaction and print it. Use the browser print dialog to save a PDF." action={<Button onClick={() => window.print()}>Print / Save PDF</Button>} />
      <Select className="mb-4 max-w-md" value={id} onChange={(e) => setId(e.target.value)}>
        {lms.payments().map((item) => <option key={item.id} value={item.id}>{item.receiptNo} · {lms.studentName(item.studentId)}</option>)}
      </Select>
      {payment ? (
        <article className="print-sheet max-w-xl rounded-3xl border border-line bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{lms.state.settings.name}</p>
          <h2 className="font-display text-2xl">Fee receipt</h2>
          <p className="text-sm text-muted">{payment.receiptNo} · {formatDate(payment.date)}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Student</dt><dd className="font-semibold">{student?.name}</dd></div>
            <div className="flex justify-between"><dt>Roll number</dt><dd>{student?.rollNo}</dd></div>
            <div className="flex justify-between"><dt>Course</dt><dd>{lms.courseName(student?.courseId)}</dd></div>
            <div className="flex justify-between"><dt>Amount</dt><dd className="font-semibold">{inr(payment.amount)}</dd></div>
            <div className="flex justify-between"><dt>Method</dt><dd>{payment.method}</dd></div>
            <div className="flex justify-between"><dt>UTR</dt><dd>{payment.utr || '—'}</dd></div>
            <div className="flex justify-between"><dt>Status</dt><dd>{payment.status}</dd></div>
          </dl>
        </article>
      ) : <Empty title="No receipts yet" />}
    </div>
  )
}

export function DownloadsPage() {
  const lms = useLookups()
  useTitle('Downloads')
  function paymentsCsv() {
    downloadCsv('fee-collections.csv', [
      ['Receipt', 'Date', 'Student', 'Roll', 'Amount', 'Method', 'UTR', 'Status', 'Kind'],
      ...lms.payments().map((payment) => {
        const student = lms.state.students.find((item) => item.id === payment.studentId)
        return [payment.receiptNo, payment.date, student?.name, student?.rollNo, payment.amount, payment.method, payment.utr, payment.status, payment.kind]
      }),
    ])
  }
  function pendingCsv() {
    downloadCsv('pending-fees.csv', [
      ['Roll', 'Student', 'Course', 'Total', 'Paid', 'Pending', 'Due'],
      ...lms.state.feeRecords.filter((fee) => fee.pending > 0).map((fee) => {
        const student = lms.state.students.find((item) => item.id === fee.studentId)
        return [student?.rollNo, student?.name, lms.courseName(student?.courseId), fee.total, fee.paid, fee.pending, fee.dueDate]
      }),
    ])
  }
  return (
    <div>
      <PageTitle eyebrow="Accounts" title="Excel / PDF downloads" text="Excel files download as CSV, which opens in Excel. PDF uses the print dialog." />
      <div className="flex flex-wrap gap-3">
        <Button onClick={paymentsCsv}>Download collections</Button>
        <Button variant="outline" onClick={pendingCsv}>Download pending fees</Button>
        <Button variant="gold" onClick={() => window.print()}>Print financial summary</Button>
      </div>
      <div className="print-sheet mt-6 rounded-3xl bg-white p-5 soft-shadow">
        <h2 className="font-display text-xl">Monthly collection</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {monthSeries().map((month) => {
            const value = lms.payments().filter((payment) => payment.status === 'verified' && payment.kind === 'collection' && payment.date.startsWith(month.key)).reduce((sum, payment) => sum + payment.amount, 0)
            return <li key={month.key} className="flex justify-between border-b border-line py-2"><span>{month.label}</span><span className="font-semibold">{inr(value)}</span></li>
          })}
        </ul>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const lms = useLookups()
  const role = lms.session.role
  useTitle('Reports')
  if (role === 'counsellor') return <CounsellorReports lms={lms} />
  if (role === 'accountant') return <FinanceReports lms={lms} />
  if (role === 'faculty') {
    return <PageTitle eyebrow="Reports" title="Academic reports" text="Open Performance Reports for attendance, assignments and exam scores in your batches." />
  }
  return <FinanceReports lms={lms} institute />
}

function FinanceReports({ lms, institute }) {
  const byCourse = lms.state.courses.map((course) => {
    const ids = new Set(lms.state.students.filter((student) => student.courseId === course.id).map((student) => student.id))
    const collected = lms.state.payments.filter((payment) => ids.has(payment.studentId) && payment.status === 'verified' && payment.kind === 'collection').reduce((sum, payment) => sum + payment.amount, 0)
    const pending = lms.state.feeRecords.filter((fee) => ids.has(fee.studentId)).reduce((sum, fee) => sum + fee.pending, 0)
    return { name: course.name, collected, pending }
  }).filter((row) => row.collected || row.pending)
  return (
    <div>
      <PageTitle eyebrow="Reports" title={institute ? 'Reports & analytics' : 'Financial reports'} text="Collected fees, outstanding balances and course-wise totals." />
      <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase text-muted"><tr>{['Course', 'Collected', 'Pending'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {byCourse.map((row) => <tr key={row.name} className="border-t border-line"><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{inr(row.collected)}</td><td className="px-4 py-3">{inr(row.pending)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CounsellorReports({ lms }) {
  const items = lms.enquiries()
  return (
    <div>
      <PageTitle eyebrow="Reports" title="Enquiry reports" text="Daily load, course interest and conversion." />
      <div className="grid gap-3 sm:grid-cols-3">
        {ENQUIRY_STATUSES.map((status) => (
          <article key={status.id} className="rounded-3xl bg-white p-4 soft-shadow">
            <p className="text-sm text-muted">{status.label}</p>
            <p className="font-display text-3xl">{items.filter((item) => item.status === status.id).length}</p>
          </article>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white soft-shadow">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted"><tr><th className="px-4 py-3">Course</th><th className="px-4 py-3">Enquiries</th><th className="px-4 py-3">Converted</th></tr></thead>
          <tbody>
            {lms.state.courses.map((course) => {
              const rows = items.filter((item) => item.courseId === course.id)
              if (!rows.length) return null
              return <tr key={course.id} className="border-t border-line"><td className="px-4 py-3">{course.name}</td><td className="px-4 py-3">{rows.length}</td><td className="px-4 py-3">{rows.filter((item) => item.status === 'converted').length}</td></tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
