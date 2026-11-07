import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { navFor, STUDENT_NAV } from '../lib/permissions'
import { ROLE_LABELS, cx } from '../lib/format'
import { useLms } from '../lib/store'
import { Logo } from './Logo'
import { ToastViewport } from './ui'

function NavItem({ item, nested = false }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => cx('flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-brand-50', nested && 'py-2 text-[13px]', isActive && 'bg-brand-50 text-brand-800')}>
      <item.icon size={nested ? 16 : 18} />
      <span>{item.label}</span>
    </NavLink>
  )
}

function NavGroup({ item }) {
  const { pathname } = useLocation()
  const childActive = item.children.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`))
  const [expanded, setExpanded] = useState(childActive)

  useEffect(() => {
    if (childActive) setExpanded(true)
  }, [childActive])

  return (
    <div>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-brand-50', childActive && 'text-brand-800')}>
        <item.icon size={18} />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={16} className={cx('transition', expanded && 'rotate-180')} />
      </button>
      {expanded ? (
        <div className="mt-1 space-y-0.5 border-l border-line pl-3 ml-5">
          {item.children.map((child) => <NavItem key={child.to} item={child} nested />)}
        </div>
      ) : null}
    </div>
  )
}

export function AppShell({ children, student = false }) {
  const { session, logout } = useLms()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const items = student ? STUDENT_NAV : navFor(session?.role)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  async function onLogout() {
    await logout()
    navigate(student ? '/login/student' : '/login/staff')
  }

  return (
    <div className="app-grid min-h-screen">
      <div className="flex min-h-screen">
        <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-line bg-white transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
          <div className="flex items-center gap-3 px-4 py-4">
            <Logo className="h-11 w-11" />
            <div>
              <p className="font-display text-sm leading-tight">C2C Academy</p>
              <p className="text-xs text-muted">Campus to Corporate</p>
            </div>
          </div>
          <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {items.map((item) => (item.children ? <NavGroup key={item.label} item={item} /> : <NavItem key={item.to} item={item} />))}
          </nav>
          <div className="border-t border-line p-3">
            <div className="rounded-2xl bg-brand-50 px-3 py-3">
              <p className="text-sm font-semibold">{session?.name}</p>
              <p className="text-xs text-brand-800">{ROLE_LABELS[session?.role] || session?.role}</p>
            </div>
            <button onClick={onLogout} className="mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700">
              <LogOut size={16} /> Log out
            </button>
          </div>
        </aside>
        {open ? <button className="fixed inset-0 z-30 bg-ink/30 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-3 backdrop-blur">
            <button className="rounded-xl border border-line p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <p className="text-sm font-semibold text-muted">{student ? 'Student portal' : `${ROLE_LABELS[session?.role]} workspace`}</p>
          </header>
          <div className="px-4 py-5 md:px-6 md:py-6">{children}</div>
        </div>
      </div>
      <ToastViewport />
    </div>
  )
}
