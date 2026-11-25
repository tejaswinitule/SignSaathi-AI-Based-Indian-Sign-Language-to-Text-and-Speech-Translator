
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  ScanFace,
  GraduationCap,
  History,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  Hand,
  X,
  LockKeyhole
} from 'lucide-react'

import { authApi } from '../services/api'

const links = [
  { to: '/app', label: 'Overview', icon: Home, end: true },
  { to: '/app/translator', label: 'Live Translator', icon: ScanFace },
  { to: '/app/learning', label: 'Learning Mode', icon: GraduationCap },
  { to: '/app/history', label: 'Translation History', icon: History },
  { to: '/app/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/app/settings', label: 'Settings', icon: Settings }
]

export default function Sidebar({ open, onClose }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    authApi.profile()
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }, [])

  const sidebarLinks = [
    ...links,
    ...(user?.role === 'admin'
      ? [{ to: '/app/admin', label: 'Admin Panel', icon: LockKeyhole }]
      : [])
  ]

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
        />
      )}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <Hand size={22} />
            </div>

            <div>
              <div className="font-extrabold tracking-tight text-lg">
                SignSaathi
              </div>
              <div className="text-[10px] text-slate-400 tracking-[.18em] uppercase">
                AI Sign Language
              </div>
            </div>
          </div>

          <button
            className="lg:hidden icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-2 text-[10px] font-bold tracking-[.16em] uppercase text-slate-400">
          Workspace
        </div>

        <nav className="px-3 space-y-1">
          {sidebarLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 p-4 text-white">
            <div className="text-sm font-bold">
              Every sign matters.
            </div>

            <p className="mt-1 text-xs leading-5 text-white/75">
              Learn Indian Sign Language one gesture at a time.
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck size={14} />
              Inclusive by design
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 px-2 py-2">
            <div className="avatar">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {user?.full_name || 'Guest User'}
              </div>

              <div className="text-xs text-slate-400 truncate">
                {user?.email || 'Not logged in'}
              </div>

              {user?.role === 'admin' && (
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  Administrator
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
