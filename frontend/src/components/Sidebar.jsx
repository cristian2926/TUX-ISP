import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Globe, MessageCircle,
  Settings, LogOut, Wifi, DollarSign, X, TrendingDown,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/zonas', icon: Globe, label: 'Zonas' },
  { to: '/pagos', icon: DollarSign, label: 'Pagos' },
  { to: '/gastos', icon: TrendingDown, label: 'Gastos' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
]

export default function Sidebar({ onClose }) {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="w-56 h-full bg-[#1F2937] border-r border-[#374151] flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#374151]">
        <div className="w-9 h-9 rounded-xl bg-[#FFD700] flex items-center justify-center shrink-0">
          <Wifi size={18} className="text-[#111827]" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm leading-tight">TUX-ISP</p>
          <p className="text-[#9CA3AF] text-xs">tuxtell.net</p>
        </div>
        {/* Close btn — solo visible en mobile */}
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
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#FFD700] text-[#111827]'
                  : 'text-[#9CA3AF] hover:bg-[#374151] hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[#9CA3AF] hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
