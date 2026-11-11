import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Mail, MapPin, Menu, Moon, Phone, Sun, X } from 'lucide-react'
import { contactLinks, INSTITUTE, NAV_LINKS } from '../lib/catalog'
import { cx } from '../lib/format'
import { useLms } from '../lib/store'
import { Logo } from './Logo'
import { TechField } from './TechField'
import { ToastViewport } from './ui'

export function PublicLayout({ children }) {
  const { pathname } = useLocation()
  const { state, session } = useLms()
  const [open, setOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const loginRef = useRef(null)
  const contact = contactLinks({
    phone: state.settings?.phone,
    email: state.settings?.email,
    address: state.settings?.address,
  })

  function toggleTheme() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('c2c-theme', next ? 'dark' : 'light')
    setDark(next)
  }

  useEffect(() => {
    window.scrollTo(0, 0)
    setOpen(false)
    setLoginOpen(false)
  }, [pathname])

  useEffect(() => {
    function onPointer(event) {
      if (!loginRef.current?.contains(event.target)) setLoginOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [])

  const workspace = session?.role === 'student' ? '/learn' : '/app'

  return (
    <div className="relative min-h-screen text-ink">
      <div className="pointer-events-none fixed inset-0 -z-10 hero-wash" aria-hidden>
        <TechField className="opacity-90" />
      </div>
      <div className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
          <p>C2C Academy · Campus to Corporate</p>
          <p className="flex items-center gap-3">
            <a href={contact.map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><MapPin size={12} /> {contact.address}</a>
            <span className="hidden sm:inline">{state.settings?.hours || INSTITUTE.hours}</span>
          </p>
        </div>
      </div>
      <header className="sticky top-0 z-40 nav-blur border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-14 w-14" />
            <span>
              <span className="block font-display text-sm leading-tight sm:text-base">{state.settings?.name || INSTITUTE.name}</span>
              <span className="block text-[11px] text-muted">{INSTITUTE.tagline}</span>
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <a href={contact.tel} className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-brand-700">
              <Phone size={16} /> {contact.phone}
            </a>
            <button type="button" onClick={toggleTheme} aria-label={dark ? 'Switch to bright mode' : 'Switch to dark mode'} className="rounded-full border border-line p-2 text-brand-700">
              {dark ? <Sun size={16} className="text-gold-400" /> : <Moon size={16} className="text-brand-700" />}
            </button>
            <div className="relative" ref={loginRef}>
              <button onClick={() => setLoginOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700" aria-expanded={loginOpen}>
                Login <ChevronDown size={16} className={cx('transition', loginOpen && 'rotate-180')} />
              </button>
              {loginOpen ? (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-white py-1 soft-shadow">
                  <Link to="/login/staff" className="block px-4 py-3 text-sm font-semibold text-ink hover:bg-brand-50">Staff Login</Link>
                  <Link to="/login/student" className="block border-t border-line px-4 py-3 text-sm font-semibold text-ink hover:bg-brand-50">Student Login</Link>
                </div>
              ) : null}
            </div>
            {session ? (
              <Link to={workspace} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Open workspace</Link>
            ) : (
              <Link to="/enroll" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Enroll Now</Link>
            )}
          </div>
          <button type="button" onClick={toggleTheme} aria-label={dark ? 'Switch to bright mode' : 'Switch to dark mode'} className="ml-auto rounded-full border border-line p-2 text-brand-700 md:hidden">
            {dark ? <Sun size={16} className="text-gold-400" /> : <Moon size={16} className="text-brand-700" />}
          </button>
          <button className="rounded-full border border-line p-2 md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav className="mx-auto hidden max-w-6xl justify-center px-4 pb-3 md:flex">
          <div className="flex flex-wrap items-center gap-1 rounded-full bg-[#eef3f0] p-1">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => cx('rounded-full px-3.5 py-2 text-sm font-semibold text-slate-600', isActive && 'bg-white text-ink shadow-sm')}>
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
        {open ? (
          <div className="space-y-1 border-t border-line px-4 py-3 md:hidden">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className="block rounded-xl px-3 py-2 text-sm font-semibold">
                {link.label}
              </NavLink>
            ))}
            <Link to="/login/staff" className="block rounded-xl px-3 py-2 text-sm font-semibold">Staff Login</Link>
            <Link to="/login/student" className="block rounded-xl px-3 py-2 text-sm font-semibold">Student Login</Link>
            <Link to="/enroll" className="mt-2 block rounded-full bg-brand-600 px-3 py-2 text-center text-sm font-semibold text-white">Enroll Now</Link>
          </div>
        ) : null}
      </header>
      <main>{children}</main>
      <footer className="relative z-10 bg-[#0c2416] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <Logo className="h-11 w-11" />
              <p className="font-display text-lg leading-tight">{state.settings?.name || INSTITUTE.name}</p>
            </div>
            <p className="mt-3 text-sm text-white/70">Classroom labs, live projects and placement support. From the campus to the first job in technology.</p>
          </div>
          <div>
            <p className="font-semibold">Explore</p>
            <div className="mt-3 space-y-2 text-sm text-white/75">
              {NAV_LINKS.slice(0, 6).map((link) => <Link key={link.to} to={link.to} className="block hover:text-white">{link.label}</Link>)}
            </div>
          </div>
          <div>
            <p className="font-semibold">Students</p>
            <div className="mt-3 space-y-2 text-sm text-white/75">
              <Link to="/courses" className="block hover:text-white">Course catalogue</Link>
              <Link to="/enroll" className="block hover:text-white">Enroll now</Link>
              <Link to="/login/student" className="block hover:text-white">Student login</Link>
              <Link to="/login/staff" className="block hover:text-white">Staff login</Link>
              <Link to="/faq" className="block hover:text-white">FAQ</Link>
            </div>
          </div>
          <div>
            <p className="font-semibold">Contact</p>
            <div className="mt-3 space-y-2 text-sm text-white/75">
              <a href={contact.tel} className="flex items-center gap-2 hover:text-white"><Phone size={14} /> {contact.phone}</a>
              <a href={contact.mail} className="flex items-center gap-2 hover:text-white"><Mail size={14} /> {contact.email}</a>
              <a href={contact.map} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><MapPin size={14} /> {contact.address}</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">© {new Date().getFullYear()} {state.settings?.name || INSTITUTE.name}. All rights reserved.</div>
      </footer>
      <a href={contact.whatsapp} target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-30 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-lg">WhatsApp</a>
      <ToastViewport />
    </div>
  )
}

export function PageHero({ eyebrow, title, text }) {
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-6xl rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl text-brand-800 md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base text-muted">{text}</p>
      </div>
    </section>
  )
}
