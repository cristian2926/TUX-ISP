import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users, TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  Zap, Plus, MessageCircle, ExternalLink, ChevronRight, Download,
} from 'lucide-react'
import api from '../api/client'

function StatCard({ icon: Icon, label, value, sub, color = '#FFD700', badge, badgeColor }) {
  return (
    <div className="bg-[#111827] rounded-xl p-5 border border-[#1F2937]">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
          <Icon size={20} style={{ color }} />
        </div>
        {badge && (
          <span className="text-xs font-bold" style={{ color: badgeColor || color }}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-[#6B7280] text-[10px] uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-3xl font-black text-white mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-[#4B5563] mt-2">{sub}</p>}
    </div>
  )
}

function ActividadItem({ item }) {
  const colors = { activacion: '#22C55E', corte: '#EF4444', pago: '#FFD700', nota: '#6B7280' }
  const color = colors[item.tipo] || '#6B7280'
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#1F2937] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{item.cliente_nombre}</p>
        <p className="text-xs text-[#6B7280] truncate">{item.descripcion}</p>
      </div>
      <span className="text-xs text-[#374151] shrink-0">
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

  const balance = (stats?.ingresos_mes_actual || 0) - (stats?.gastos_mes_actual || 0)
  const activosPct = stats?.total_clientes > 0
    ? ((stats.clientes_activos / stats.total_clientes) * 100).toFixed(1)
    : 0
  const suspendidosPct = stats?.total_clientes > 0
    ? ((stats.clientes_suspendidos / stats.total_clientes) * 100).toFixed(1)
    : 0
  const balanceTrend = stats?.ingresos_mes_anterior > 0
    ? (((stats.ingresos_mes_actual - stats.ingresos_mes_anterior) / stats.ingresos_mes_anterior) * 100).toFixed(1)
    : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Network Overview</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Real-time status of your ISP infrastructure.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] text-[#9CA3AF] text-sm px-3 py-2 rounded-lg hover:text-white hover:border-[#374151] transition-colors">
            <span className="text-xs">Last 30 Days</span>
          </button>
          <button className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] text-[#9CA3AF] text-sm px-3 py-2 rounded-lg hover:text-white hover:border-[#374151] transition-colors">
            <Download size={14} />
            <span className="text-xs hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Clientes"
          value={stats?.total_clientes ?? 0}
          sub={`${stats?.clientes_activos ?? 0} activos en red`}
          color="#22C55E"
          badge="+4% ↑"
          badgeColor="#22C55E"
        />
        <StatCard
          icon={TrendingUp}
          label="Activos"
          value={stats?.clientes_activos ?? 0}
          sub={`${stats?.ingresos_mes_actual ? `S/ ${stats.ingresos_mes_actual.toFixed(0)} ingresos` : 'Sin ingresos'}`}
          color="#22C55E"
          badge={`${activosPct}%`}
          badgeColor="#22C55E"
        />
        <StatCard
          icon={AlertCircle}
          label="Suspendidos"
          value={stats?.clientes_suspendidos ?? 0}
          sub={`${stats?.pagos_pendientes ?? 0} pagos pendientes`}
          color="#EF4444"
          badge={suspendidosPct > 0 ? `${suspendidosPct}%` : null}
          badgeColor="#EF4444"
        />
        <StatCard
          icon={TrendingDown}
          label="Balance Mes"
          value={`S/ ${balance.toFixed(0)}`}
          sub={`Gastos: S/ ${(stats?.gastos_mes_actual ?? 0).toFixed(0)}`}
          color="#FFD700"
          badge={balanceTrend ? `${balanceTrend > 0 ? '+' : ''}${balanceTrend}% ${balanceTrend >= 0 ? '↑' : '↓'}` : null}
          badgeColor={balanceTrend >= 0 ? '#22C55E' : '#EF4444'}
        />
      </div>

      {/* Charts + Accesos Directos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="lg:col-span-2 bg-[#111827] rounded-xl p-5 border border-[#1F2937]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">Ingresos vs Gastos</h2>
            <div className="flex items-center gap-3 text-xs text-[#6B7280]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FFD700]" />Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Gastos</span>
            </div>
          </div>
          <p className="text-xs text-[#4B5563] mb-4">Comparativa semestral de flujo de caja.</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={grafica} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FFD700" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="nombre_mes" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8 }}
                labelStyle={{ color: '#F9FAFB' }}
                itemStyle={{ color: '#9CA3AF' }}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#FFD700" strokeWidth={2} fill="url(#gIngresos)" name="Ingresos" />
              <Area type="monotone" dataKey="gastos"   stroke="#EF4444" strokeWidth={2} fill="url(#gGastos)"   name="Gastos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Accesos Directos */}
        <div className="bg-[#111827] rounded-xl p-5 border border-[#1F2937] space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap size={14} className="text-[#FFD700]" />
            Accesos Directos
          </h2>

          <Link
            to="/clientes/nuevo"
            className="flex items-center justify-between w-full bg-[#FFD700] text-[#111827] font-bold px-4 py-3 rounded-lg hover:bg-yellow-400 transition-colors text-sm"
          >
            <span className="flex items-center gap-2"><Plus size={16} /> Nuevo Cliente</span>
            <ChevronRight size={15} />
          </Link>

          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between w-full bg-[#0D1117] border border-[#1F2937] text-white px-4 py-3 rounded-lg hover:border-[#374151] transition-colors text-sm"
          >
            <span className="flex items-center gap-2">
              <MessageCircle size={15} className="text-green-400" />
              WhatsApp Web
            </span>
            <ExternalLink size={13} className="text-[#4B5563]" />
          </a>

          <div className="bg-[#0D1117] rounded-lg px-4 py-3 border border-[#1F2937]">
            <p className="text-[9px] text-[#4B5563] uppercase tracking-widest font-semibold mb-1">Backup Status</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Cloud Sync</p>
              <span className="text-xs text-[#F59E0B] font-semibold">Pending</span>
            </div>
          </div>

          {/* Actividad */}
          <div className="pt-2 border-t border-[#1F2937]">
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Últimas Actividades</h3>
            <div className="overflow-y-auto max-h-36">
              {actividad.length === 0 ? (
                <p className="text-[#4B5563] text-xs text-center py-3">Sin actividad</p>
              ) : (
                actividad.slice(0, 4).map(item => <ActividadItem key={item.id} item={item} />)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zonas status */}
      <ZonasStatus />
    </div>
  )
}

function StatusBadge({ ok, labelOn, labelOff, loading }) {
  if (loading) return <span className="text-xs text-[#374151]">—</span>
  return ok
    ? <span className="flex items-center gap-1 text-xs text-green-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />{labelOn}</span>
    : <span className="flex items-center gap-1 text-xs text-red-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{labelOff}</span>
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

  const pct = zona.total_clientes > 0
    ? Math.round((zona.clientes_activos / zona.total_clientes) * 100)
    : 0
  const barColor = pct < 50 ? '#22C55E' : pct < 80 ? '#FFD700' : '#EF4444'

  return (
    <div className="bg-[#0D1117] rounded-xl p-4 border border-[#1F2937]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-white text-sm">{zona.nombre}</span>
          <span className="ml-2 text-[10px] text-[#4B5563] font-mono uppercase">
            {zona.nombre.slice(0, 2).toUpperCase()}-{String(zona.id).padStart(3, '0')}
          </span>
        </div>
        <button
          onClick={fetchStatus}
          className="text-[#374151] hover:text-[#6B7280] transition-colors"
        >
          <RefreshCw size={13} className={loadingWg ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Ping', ok: wg?.online },
          { label: 'SSH',  ok: wg?.ssh_ok },
          { label: 'WG',   ok: wg?.wg_peer_online },
        ].map(({ label, ok }) => (
          <div key={label} className="bg-[#111827] rounded p-2 text-center border border-[#1F2937]">
            <p className="text-[9px] text-[#4B5563] uppercase tracking-wide mb-1">{label}</p>
            <StatusBadge ok={ok} labelOn="UP" labelOff="DOWN" loading={loadingWg} />
          </div>
        ))}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#4B5563] uppercase text-[9px] tracking-wide">Pool PPPoE</span>
          <span className="font-bold" style={{ color: barColor }}>{pct}%</span>
        </div>
        <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>

      <div className="space-y-1 text-xs text-[#6B7280]">
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
    <div className="bg-[#111827] rounded-xl p-5 border border-[#1F2937]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Estado de Zonas</h2>
        <button
          onClick={() => {}}
          className="p-1.5 rounded text-[#4B5563] hover:text-[#9CA3AF] transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && (
          <p className="text-[#6B7280] text-sm col-span-3 text-center py-4">Cargando zonas...</p>
        )}
        {!loading && zonas.length === 0 && (
          <p className="text-[#6B7280] text-sm col-span-3 text-center py-4">Sin zonas registradas</p>
        )}
        {zonas.map(z => <ZonaStatusCard key={z.id} zona={z} />)}
      </div>
    </div>
  )
}
