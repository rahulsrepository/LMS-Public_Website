import { useEffect, useState } from 'react'
import { CalendarDays, Eye, EyeOff, X } from 'lucide-react'
import { cx } from '../lib/format'
import { useLms } from '../lib/store'

export function Button({ children, variant = 'primary', className, type = 'button', ...props }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    gold: 'bg-gold-400 text-brand-900 hover:bg-gold-300',
    outline: 'border border-brand-200 bg-white text-brand-800 hover:bg-brand-50',
    ghost: 'text-brand-800 hover:bg-brand-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    subtle: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  }
  return (
    <button type={type} className={cx('inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50', styles[variant], className)} {...props}>
      {children}
    </button>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

const control = 'w-full rounded-2xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100'

export function TextInput({ className, ...props }) {
  return <input className={cx(control, className)} {...props} />
}

export function DateInput({ className, ...props }) {
  return (
    <span className="relative block">
      <input type="date" className={cx(control, 'pr-10', className)} {...props} />
      <CalendarDays size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </span>
  )
}

export function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative w-full">
      <input type={visible ? 'text' : 'password'} className={cx(control, 'pr-11', className)} {...props} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-muted hover:text-ink"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}
export function Select({ className, ...props }) {
  return <select className={cx(control, className)} {...props} />
}
export function TextArea({ className, ...props }) {
  return <textarea className={cx(control, 'min-h-24 resize-y', className)} {...props} />
}

export function Badge({ children, tone = 'green' }) {
  const tones = {
    green: 'bg-brand-50 text-brand-800',
    gold: 'bg-gold-200 text-amber-900',
    slate: 'bg-slate-100 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-800',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close dialog" onClick={onClose} />
      <div className={cx('relative max-h-[90vh] w-full overflow-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-brand-50" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
      <p className="font-display text-lg">{title}</p>
      {text ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Stat({ icon: Icon, label, value, tone = 'bg-brand-50 text-brand-700' }) {
  return (
    <article className="rounded-3xl border border-white bg-white p-4 soft-shadow">
      <div className={cx('mb-4 flex h-10 w-10 items-center justify-center rounded-2xl', tone)}>
        <Icon size={18} />
      </div>
      <p className="font-display text-2xl tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </article>
  )
}

export function PageTitle({ eyebrow, title, text, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl text-ink md:text-3xl">{title}</h1>
        {text ? <p className="mt-1 max-w-2xl text-sm text-muted">{text}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ToastViewport() {
  const { toasts, dismissToast } = useLms()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={cx('flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-lg', toast.tone === 'error' ? 'bg-rose-700' : 'bg-brand-800')}>
          <p>{toast.message}</p>
          <button onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function AccessDenied() {
  return (
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center soft-shadow">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Restricted</p>
      <h1 className="mt-2 font-display text-2xl">You don’t have access to this page</h1>
      <p className="mt-2 text-sm text-muted">Your role can only open the modules assigned to it. If you need access, ask an admin.</p>
    </div>
  )
}

export function statusTone(status) {
  if (['active', 'verified', 'enrolled', 'published', 'present', 'converted', 'evaluated', 'running'].includes(status)) return 'green'
  if (['pending', 'processing', 'draft', 'interested', 'follow_up', 'late', 'submitted', 'waiting'].includes(status)) return 'gold'
  if (['inactive', 'removed', 'rejected', 'absent', 'not_interested', 'closed'].includes(status)) return 'rose'
  return 'slate'
}
