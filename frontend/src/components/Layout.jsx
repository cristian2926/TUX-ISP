import { Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import { Menu, Bell, Plus, MessageCircle, User } from 'lucide-react'

function getUsername() {
  const token = localStorage.getItem('token')
  if (!token) return 'Admin Root'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || 'Admin Root'
  } catch {
    return 'Admin Root'
  }
}

function Topbar({ onMenuOpen }) {
  const username = getUsername()
  const initials = username.slice(0, 2).toUpperCase()

  return (
    <div className="h-14 bg-white border-b border-[#E5E0D5] flex items-center gap-3 px-4 shrink-0 shadow-sm">
      <button
        onClick={onMenuOpen}
        className="p-1.5 rounded-lg text-[#9A9AAA] hover:text-[#1C1C1C] hover:bg-[#EDE9E0] transition-colors lg:hidden shrink-0"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C8C2B5]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          placeholder="Search clients, IPs or zones..."
          className="w-full bg-[#FAF7F0] border border-[#E5E0D5] rounded-xl pl-9 pr-3 py-2 text-sm text-[#1C1C1C] placeholder-[#C8C2B5] focus:outline-none focus:border-[#FFD700]/60 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Link
          to="/clientes/nuevo"
          className="hidden sm:flex items-center gap-1.5 bg-[#FFD700] text-[#1C1C1C] font-bold text-sm px-3.5 py-2 rounded-xl hover:bg-yellow-400 transition-colors"
        >
          <Plus size={15} />
          Nuevo Cliente
        </Link>

        <Link
          to="/whatsapp"
          className="hidden md:flex items-center gap-1.5 bg-white border border-[#E5E0D5] text-[#5A5A6A] text-sm px-3.5 py-2 rounded-xl hover:border-[#C8C2B5] transition-colors"
        >
          <MessageCircle size={15} className="text-green-500" />
          WhatsApp Web
        </Link>

        <button className="relative p-2 rounded-xl text-[#9A9AAA] hover:text-[#1C1C1C] hover:bg-[#EDE9E0] transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="w-px h-6 bg-[#E5E0D5] mx-1" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-[#1C1C1C]">{initials}</span>
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-[#1C1C1C] leading-tight">{username}</p>
            <p className="text-[9px] text-[#9A9AAA] uppercase tracking-widest leading-tight font-medium">
              Network Operations
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
    <div className="flex h-screen overflow-hidden bg-[#FAF7F0]">
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 z-30 transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#FAF7F0]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
