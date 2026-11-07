import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '../../components/Logo'
import { NetworkMesh, TechField } from '../../components/TechField'
import { Button, Field, TextInput, ToastViewport } from '../../components/ui'
import { DEMO_LOGINS } from '../../lib/demoAuth'
import { INSTITUTE } from '../../lib/catalog'
import { useLms } from '../../lib/store'
import { useTitle } from '../useTitle'

function LoginScreen({ kind }) {
  const staff = kind === 'staff'
  const { login, requestPasswordReset, session, supabaseConfigured } = useLms()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)
  useTitle(staff ? 'Staff Login' : 'Student Login')

  if (session) return <Navigate to={session.role === 'student' ? '/learn' : '/app'} replace />

  const samples = DEMO_LOGINS.filter((item) => (staff ? item.role !== 'Student' : item.role === 'Student'))

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (forgot) {
        const message = await requestPasswordReset(email)
        setInfo(message)
        setBusy(false)
        return
      }
      const next = await login(email, password)
      navigate(next.role === 'student' ? '/learn' : '/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4faf6]">
      <NetworkMesh />
      <TechField className="opacity-35" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8">
          <Link to="/" className="flex flex-col items-center text-center">
            <Logo className="h-16 w-16" />
            <span className="mt-3 font-display text-xl text-brand-800">{INSTITUTE.name}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{INSTITUTE.tagline}</span>
          </Link>
          <h1 className="mt-6 text-center font-display text-3xl">{forgot ? 'Reset password' : 'Welcome Back'}</h1>
          <p className="mt-1 text-center text-sm text-muted">{forgot ? 'We will use the email on your account.' : 'Sign in with the email and password issued by the academy.'}</p>
          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
            <Link to="/login/student" className={`rounded-xl px-3 py-2 text-center ${staff ? 'text-slate-500' : 'bg-white text-brand-800 shadow'}`}>Student</Link>
            <Link to="/login/staff" className={`rounded-xl px-3 py-2 text-center ${staff ? 'bg-white text-brand-800 shadow' : 'text-slate-500'}`}>Staff</Link>
          </div>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <Field label="Email">
              <TextInput type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            {forgot ? null : (
              <Field label="Password">
                <div className="relative">
                  <TextInput type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="pr-12" />
                  <button type="button" className="absolute right-3 top-2.5 text-muted" onClick={() => setShow((value) => !value)} aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
            )}
            {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            {info ? <p className="rounded-2xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{info}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Please wait…' : forgot ? 'Send reset link' : 'Sign In'}</Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/" className="font-semibold text-brand-700">Home</Link>
            <button className="font-semibold text-brand-700" onClick={() => { setForgot((value) => !value); setError(''); setInfo('') }}>
              {forgot ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </div>
          {!supabaseConfigured && !forgot ? (
            <div className="mt-6 rounded-3xl border border-line bg-brand-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts</p>
              <div className="mt-3 space-y-2">
                {samples.map((account) => (
                  <button key={account.email} type="button" onClick={() => { setEmail(account.email); setPassword(account.password) }} className="flex w-full items-center justify-between rounded-2xl bg-white px-3 py-2 text-left text-sm">
                    <span className="font-semibold">{account.role}</span>
                    <span className="text-xs text-muted">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <ToastViewport />
    </div>
  )
}

export function StaffLoginPage() {
  return <LoginScreen kind="staff" />
}

export function StudentLoginPage() {
  return <LoginScreen kind="student" />
}
