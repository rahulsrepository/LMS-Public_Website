import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, CircleHelp, LogOut, Menu, Settings, UserRound, X } from 'lucide-react'
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
  const { state, session, logout, can, unreadNotifications } = useLms()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const items = student ? STUDENT_NAV : navFor(session?.role)
  const profilePath = student ? '/learn/profile' : '/app/profile'
  const helpPath = !student && can('tickets.manage') ? '/app/tickets' : '/contact'
  const notificationPath = student ? '/learn/notifications' : '/app/notifications'
  const notificationCount = unreadNotifications().length
  const currentProfile = state.profiles.find((profile) => profile.id === session?.id)
  const initials = (session?.name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  useEffect(() => {
    setOpen(false)
    setProfileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!profileOpen) return undefined
    function closeOnOutsideClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) setProfileOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileOpen])

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
            <div className="relative ml-auto flex items-center gap-2">
              <Link
                to={notificationPath}
                aria-label={`Notifications${notificationCount ? `, ${notificationCount} available` : ''}`}
                title="Notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-brand-50"
              >
                <Bell size={19} />
                {notificationCount ? <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{notificationCount > 9 ? '9+' : notificationCount}</span> : null}
              </Link>
              <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full p-1.5 hover:bg-brand-50"
              >
                {currentProfile?.avatarUrl ? <img src={currentProfile.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-800">{initials}</span>}
                <ChevronDown size={16} className={cx('text-muted transition', profileOpen && 'rotate-180')} />
              </button>
              {profileOpen ? (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
                  <div className="flex items-center gap-3 border-b border-line px-4 py-4">
                    {currentProfile?.avatarUrl ? <img src={currentProfile.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-800">{initials}</span>}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{session?.name}</p>
                      <p className="truncate text-xs text-muted">{session?.email}</p>
                      <p className="mt-1 text-xs font-semibold text-brand-700">{ROLE_LABELS[session?.role] || session?.role}</p>
                    </div>
                  </div>
                  <div className="p-2">
                    <Link to={profilePath} role="menuitem" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-brand-50">
                      <UserRound size={17} /> Profile
                    </Link>
                    {can('settings') ? (
                      <Link to="/app/settings" role="menuitem" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-brand-50">
                        <Settings size={17} /> Settings
                      </Link>
                    ) : null}
                    <Link to={helpPath} role="menuitem" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-brand-50">
                      <CircleHelp size={17} /> Help &amp; support
                    </Link>
                  </div>
                  <div className="border-t border-line p-2">
                    <button type="button" role="menuitem" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                      <LogOut size={17} /> Sign out
                    </button>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
          </header>
          <div className="px-4 py-5 md:px-6 md:py-6">{children}</div>
        </div>
      </div>
      <ToastViewport />
    </div>
  )
}
