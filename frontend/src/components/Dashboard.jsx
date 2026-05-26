import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import {
  Users, TrendingUp, TrendingDown, Globe,
  AlertCircle, CheckCircle, Clock, Zap, Wifi, WifiOff,
  Shield, Terminal, RefreshCw,
} from 'lucide-react'
import api from '../api/client'

function StatCard({ icon: Icon, label, value, sub, color = '#FFD700' }) {
  return (
    <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#9CA3AF] text-xs uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-[#9CA3AF] mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: color + '20' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function ActividadItem({ item }) {
  const colors = { activacion: '#22C55E', corte: '#EF4444', pago: '#FFD700', nota: '#9CA3AF' }
  const color = colors[item.tipo] || '#9CA3AF'
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#374151] last:border-0">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{item.cliente_nombre}</p>
        <p className="text-xs text-[#9CA3AF] truncate">{item.descripcion}</p>
      </div>
      <span className="text-xs text-[#4B5563] shrink-0">
        {new Date(item.creado_en).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [grafica, setGrafica] = useState([])
  const [actividad, setActividad] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/ingresos-mensual'),
      api.get('/dashboard/ultimas-activaciones'),
    ]).then(([s, g, a]) => {
      setStats(s.data)
      setGrafica(g.data)
      setActividad(a.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const utilidad = (stats?.ingresos_mes_actual || 0) - (stats?.gastos_mes_actual || 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-[#9CA3AF] text-sm">
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Clientes Activos"
          value={stats?.clientes_activos ?? 0}
          sub={`${stats?.total_clientes ?? 0} total`}
          color="#22C55E"
        />
        <StatCard
          icon={TrendingUp}
          label="Ingresos Mes"
          value={`S/ ${(stats?.ingresos_mes_actual ?? 0).toFixed(2)}`}
          sub={`Mes anterior: S/ ${(stats?.ingresos_mes_anterior ?? 0).toFixed(2)}`}
          color="#FFD700"
        />
        <StatCard
          icon={TrendingDown}
          label="Gastos Mes"
          value={`S/ ${(stats?.gastos_mes_actual ?? 0).toFixed(2)}`}
          sub={`Utilidad: S/ ${utilidad.toFixed(2)}`}
          color="#EF4444"
        />
        <StatCard
          icon={AlertCircle}
          label="Sin Pagar"
          value={stats?.pagos_pendientes ?? 0}
          sub={`${stats?.clientes_suspendidos ?? 0} suspendidos`}
          color="#F59E0B"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#1F2937] rounded-xl p-5 border border-[#374151]">
          <h2 className="text-sm font-semibold text-white mb-4">Ingresos vs Gastos 2025</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={grafica} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFD700" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="nombre_mes" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#F9FAFB' }}
                itemStyle={{ color: '#9CA3AF' }}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#FFD700" strokeWidth={2} fill="url(#gIngresos)" name="Ingresos" />
              <Area type="monotone" dataKey="gastos" stroke="#EF4444" strokeWidth={2} fill="url(#gGastos)" name="Gastos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Actividad */}
        <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151]">
          <h2 className="text-sm font-semibold text-white mb-4">Últimas Actividades</h2>
          <div className="overflow-y-auto max-h-52">
            {actividad.length === 0 ? (
              <p className="text-[#9CA3AF] text-sm text-center py-4">Sin actividad</p>
            ) : (
              actividad.map(item => <ActividadItem key={item.id} item={item} />)
            )}
          </div>
        </div>
      </div>

      {/* Zonas status bar */}
      <ZonasStatus />
    </div>
  )
}

function StatusBadge({ ok, labelOn, labelOff, loading }) {
  if (loading) return <span className="text-xs text-[#4B5563]">—</span>
  return ok
    ? <span className="flex items-center gap-1 text-xs text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />{labelOn}</span>
    : <span className="flex items-center gap-1 text-xs text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />{labelOff}</span>
}

function ZonaStatusCard({ zona }) {
  const [wg, setWg] = useState(null)
  const [loadingWg, setLoadingWg] = useState(true)

  const fetchStatus = () => {
    setLoadingWg(true)
    api.get(`/zonas/${zona.id}/wireguard-status`)
      .then(r => setWg(r.data))
      .catch(() => setWg(null))
      .finally(() => setLoadingWg(false))
  }

  useEffect(() => { fetchStatus() }, [zona.id])

  return (
    <div className="bg-[#111827] rounded-lg p-4 border border-[#374151]">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-white text-sm">{zona.nombre}</span>
        <button
          onClick={fetchStatus}
          className="text-[#4B5563] hover:text-[#9CA3AF] transition-colors"
          title="Actualizar estado"
        >
          <RefreshCw size={13} className={loadingWg ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#1F2937] rounded p-2 text-center">
          <p className="text-[10px] text-[#6B7280] uppercase mb-1">Ping</p>
          <StatusBadge ok={wg?.online} labelOn="UP" labelOff="DOWN" loading={loadingWg} />
        </div>
        <div className="bg-[#1F2937] rounded p-2 text-center">
          <p className="text-[10px] text-[#6B7280] uppercase mb-1">SSH</p>
          <StatusBadge ok={wg?.ssh_ok} labelOn="UP" labelOff="DOWN" loading={loadingWg} />
        </div>
        <div className="bg-[#1F2937] rounded p-2 text-center">
          <p className="text-[10px] text-[#6B7280] uppercase mb-1">WG</p>
          <StatusBadge ok={wg?.wg_peer_online} labelOn="UP" labelOff="DOWN" loading={loadingWg} />
        </div>
      </div>

      <div className="space-y-1 text-xs text-[#9CA3AF]">
        <div className="flex justify-between">
          <span>IP WireGuard</span>
          <span className="text-white font-mono">{zona.ip_wireguard}</span>
        </div>
        <div className="flex justify-between">
          <span>Handshake</span>
          <span className="text-white truncate max-w-32 text-right">
            {loadingWg ? '—' : (wg?.last_handshake || 'Sin handshake')}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Clientes activos</span>
          <span className="text-white font-medium">{zona.clientes_activos}</span>
        </div>
        <div className="flex justify-between">
          <span>APs</span>
          <span className="text-white font-medium">{zona.access_points?.length ?? 0}</span>
        </div>
      </div>
    </div>
  )
}

function ZonasStatus() {
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/zonas')
      .then(r => setZonas(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151]">
      <h2 className="text-sm font-semibold text-white mb-4">Estado de Zonas en Tiempo Real</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && (
          <p className="text-[#9CA3AF] text-sm col-span-3 text-center py-4">Cargando zonas...</p>
        )}
        {!loading && zonas.length === 0 && (
          <p className="text-[#9CA3AF] text-sm col-span-3 text-center py-4">Sin zonas registradas</p>
        )}
        {zonas.map(z => <ZonaStatusCard key={z.id} zona={z} />)}
      </div>
    </div>
  )
}
