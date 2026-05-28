import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Globe, MessageCircle,
  Settings, LogOut, Wifi, DollarSign, X, TrendingDown,
  Plus, HelpCircle,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes',      icon: Users,           label: 'Clients' },
  { to: '/zonas',         icon: Globe,           label: 'Zones' },
  { to: '/pagos',         icon: DollarSign,      label: 'Pagos' },
  { to: '/gastos',        icon: TrendingDown,    label: 'Gastos' },
  { to: '/whatsapp',      icon: MessageCircle,   label: 'WhatsApp' },
  { to: '/configuracion', icon: Settings,        label: 'Config' },
]

export default function Sidebar({ onClose }) {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="w-56 h-full bg-[#111827] border-r border-[#1F2937] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1F2937]">
        <div className="w-9 h-9 rounded-xl bg-[#FFD700] flex items-center justify-center shrink-0">
          <Wifi size={18} className="text-[#111827]" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm leading-tight tracking-wider">TUX-ISP</p>
          <p className="text-[#4B5563] text-[9px] uppercase tracking-widest font-semibold mt-0.5">
            Network Operations
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-[#9CA3AF] hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#FFD700] text-[#111827]'
                  : 'text-[#6B7280] hover:bg-[#1F2937] hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 pt-3 space-y-1 border-t border-[#1F2937]">
        <Link
          to="/clientes/nuevo"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg bg-[#FFD700] text-[#111827] font-bold text-sm hover:bg-yellow-400 transition-all"
        >
          <Plus size={16} />
          New Client
        </Link>
        <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#6B7280] hover:bg-[#1F2937] hover:text-white transition-all">
          <HelpCircle size={16} />
          Support
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#6B7280] hover:bg-red-900/20 hover:text-red-400 transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
