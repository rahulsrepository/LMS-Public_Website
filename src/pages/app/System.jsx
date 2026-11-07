import { useState } from 'react'
import { Button, Field, PageTitle, Select, TextArea, TextInput } from '../../components/ui'
import { getSupabaseConfig } from '../../lib/supabase'
import { useLookups } from './lookups'
import { useTitle } from '../useTitle'

export function NotificationsPage() {
  const lms = useLookups()
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' })
  const manage = lms.can('notifications.manage')
  useTitle('Notifications')
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      {manage ? (
        <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={(event) => { event.preventDefault(); if (lms.addNotification(form)) setForm({ title: '', body: '', audience: 'all' }) }}>
          <h1 className="font-display text-2xl">Send a notification</h1>
          <Field label="Title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Message"><TextArea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></Field>
          <Field label="Audience">
            <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {['all', 'staff', 'students', 'faculty', 'counsellor', 'accountant', 'receptionist'].map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
          <Button type="submit">Publish</Button>
        </form>
      ) : <PageTitle eyebrow="Desk" title="Notifications" text="Messages sent to your role." />}
      <div className="space-y-3">
        {lms.notifications().map((item) => (
          <article key={item.id} className="rounded-3xl bg-white p-4 soft-shadow">
            <p className="text-xs font-semibold uppercase text-brand-700">{item.audience}</p>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function LogsPage() {
  const lms = useLookups()
  useTitle('Activity logs')
  return (
    <div>
      <PageTitle eyebrow="Analytics" title="Audit logs" text="Who signed in, who changed a password, and who recorded fees, admissions, people and other actions." />
      <div className="overflow-x-auto rounded-3xl bg-white soft-shadow">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase text-muted"><tr>{['When', 'Person', 'Role', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {lms.state.logs.map((log) => (
              <tr key={log.id} className="border-t border-line">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.at).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">{log.actorName}</td>
                <td className="px-4 py-3">{log.role}</td>
                <td className="px-4 py-3">{log.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const lms = useLookups()
  const [form, setForm] = useState(lms.state.settings)
  const saved = getSupabaseConfig()
  const [cloud, setCloud] = useState({ url: saved.url, key: saved.key })
  const [cloudError, setCloudError] = useState('')
  const [cloudBusy, setCloudBusy] = useState(false)
  useTitle('Settings')

  async function onConnect(event) {
    event.preventDefault()
    setCloudError('')
    setCloudBusy(true)
    try {
      await lms.connectSupabase(cloud.url, cloud.key)
    } catch (error) {
      setCloudError(error.message)
    } finally {
      setCloudBusy(false)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageTitle eyebrow="System" title="Institute settings" text="These details appear on the public website and receipts." />
      <form className="space-y-3 rounded-3xl bg-white p-5 soft-shadow" onSubmit={(event) => { event.preventDefault(); lms.updateSettings(form) }}>
        <Field label="Institute name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Email"><TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Address"><TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <Field label="Hours"><TextInput value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></Field>
        <Button type="submit">Save settings</Button>
      </form>
      <section className="rounded-3xl bg-white p-5 text-sm soft-shadow">
        <p className="font-semibold">Supabase</p>
        <p className="mt-1 text-muted">{lms.supabaseConfigured ? 'This browser is using your Supabase project for sign-in.' : 'Demo sign-in is active. Paste your project URL and anon key to connect.'}</p>
        <form className="mt-4 space-y-3" onSubmit={onConnect}>
          <Field label="Project URL">
            <TextInput value={cloud.url} onChange={(e) => setCloud({ ...cloud, url: e.target.value })} placeholder="https://your-project.supabase.co" required />
          </Field>
          <Field label="Anon key">
            <TextInput value={cloud.key} onChange={(e) => setCloud({ ...cloud, key: e.target.value })} placeholder="eyJhbGciOi..." required />
          </Field>
          {cloudError ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-rose-700">{cloudError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={cloudBusy}>{cloudBusy ? 'Checking…' : 'Connect Supabase'}</Button>
            <Button type="button" variant="outline" onClick={() => { lms.disconnectSupabase(); setCloud({ url: '', key: '' }) }}>Disconnect</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted">Run supabase/schema.sql in the SQL editor, then create the first admin in Authentication and add a matching profiles row. Keep the service role key on the server only.</p>
        <Button className="mt-3" variant="outline" onClick={() => lms.resetDemo()}>Clear local records</Button>
      </section>
    </div>
  )
}
