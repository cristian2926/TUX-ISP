import { Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import { Menu, Bell, Settings, Search } from 'lucide-react'

function getUsername() {
  const token = localStorage.getItem('token')
  if (!token) return 'Admin'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || 'Admin'
  } catch {
    return 'Admin'
  }
}

function Topbar({ onMenuOpen }) {
  const username = getUsername()
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <div className="h-14 bg-[#111827] border-b border-[#1F2937] flex items-center gap-3 px-4 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="p-1.5 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1F2937] transition-colors lg:hidden shrink-0"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm relative hidden sm:block">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
        <input
          type="text"
          placeholder="Buscar clientes, IP o PPPoE..."
          className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFD700]/40 transition-colors"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1F2937] transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* Settings */}
        <Link
          to="/configuracion"
          className="p-2 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1F2937] transition-colors"
        >
          <Settings size={18} />
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-[#1F2937] mx-2" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-[#111827]">{initials}</span>
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-white leading-tight">{username}</p>
            <p className="text-[9px] text-[#4B5563] uppercase tracking-widest leading-tight font-medium">
              Administrador
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1117]">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#0D1117]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
