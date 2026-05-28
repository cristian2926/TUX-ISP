import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Wifi, WifiOff, Edit, Trash2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const ESTADO_COLORS = {
  activo:     'bg-green-500/20 text-green-400 border border-green-500/30',
  suspendido: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  anulado:    'bg-red-500/20 text-red-400 border border-red-500/30',
  vencido:    'bg-orange-500/20 text-orange-400 border border-orange-500/30',
}

const AVATAR_COLORS = [
  'bg-blue-500/25 text-blue-300',
  'bg-purple-500/25 text-purple-300',
  'bg-green-500/25 text-green-300',
  'bg-orange-500/25 text-orange-300',
  'bg-pink-500/25 text-pink-300',
  'bg-cyan-500/25 text-cyan-300',
  'bg-indigo-500/25 text-indigo-300',
  'bg-teal-500/25 text-teal-300',
]

function getInitials(nombre) {
  const parts = nombre.trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nombre.slice(0, 2).toUpperCase()
}

function getAvatarColor(nombre) {
  let sum = 0
  for (let i = 0; i < nombre.length; i++) sum += nombre.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [zonaFiltro, setZonaFiltro]   = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [zonas, setZonas]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [dashStats, setDashStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/zonas').then(r => setZonas(r.data)).catch(() => {})
    api.get('/dashboard/stats').then(r => setDashStats(r.data)).catch(() => {})
  }, [])

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 20 }
      if (search)      params.search  = search
      if (zonaFiltro)  params.zona_id = zonaFiltro
      if (estadoFiltro) params.estado = estadoFiltro
      const { data } = await api.get('/clientes', { params })
      setClientes(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } finally {
      setLoading(false)
    }
  }, [page, search, zonaFiltro, estadoFiltro])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  async function toggleEstado(cliente) {
    try {
      if (cliente.estado === 'activo') {
        await api.post(`/clientes/${cliente.id}/cortar`)
        toast.success('Servicio cortado')
      } else {
        await api.post(`/clientes/${cliente.id}/reactivar`)
        toast.success('Servicio reactivado')
      }
      fetchClientes()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar cliente "${nombre}"?\nSe borrarán también sus pagos e historial.`)) return
    try {
      await api.delete(`/clientes/${id}`)
      toast.success('Cliente eliminado')
      fetchClientes()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar cliente')
    }
  }

  return (
    <div className="p-6 space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#4B5563] font-mono uppercase tracking-widest">
        <span>Network</span>
        <span className="text-[#1F2937]">›</span>
        <span className="text-[#FFD700]">Client_Management</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-[#6B7280] text-sm">{total} registros</p>
        </div>
        <Link
          to="/clientes/nuevo"
          className="flex items-center gap-2 bg-[#FFD700] text-[#111827] font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors text-sm"
        >
          <Plus size={16} />
          Nuevo Cliente
        </Link>
      </div>

      {/* Stats row */}
      {dashStats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#111827] rounded-xl px-4 py-3 border border-[#1F2937] flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold">Total Clientes</p>
              <p className="text-2xl font-black text-white mt-0.5">{dashStats.total_clientes}</p>
            </div>
          </div>
          <div className="bg-[#111827] rounded-xl px-4 py-3 border border-green-500/20 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold">Activos</p>
              <p className="text-2xl font-black text-green-400 mt-0.5">{dashStats.clientes_activos}</p>
            </div>
          </div>
          <div className="bg-[#111827] rounded-xl px-4 py-3 border border-red-500/20 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold">Suspendidos</p>
              <p className="text-2xl font-black text-red-400 mt-0.5">{dashStats.clientes_suspendidos}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
          <input
            type="text"
            placeholder="Buscar nombre, usuario, IP..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-[#111827] border border-[#1F2937] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
          />
        </div>
        <select
          value={zonaFiltro}
          onChange={e => { setZonaFiltro(e.target.value); setPage(1) }}
          className="bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
        >
          <option value="">Filtrar por Zona: Todas las Zonas</option>
          {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
        <select
          value={estadoFiltro}
          onChange={e => { setEstadoFiltro(e.target.value); setPage(1) }}
          className="bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
        >
          <option value="">Estado: Todos</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
          <option value="anulado">Anulado</option>
        </select>
        <button className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] text-[#6B7280] hover:text-white px-3 py-2 rounded-lg text-sm transition-colors">
          <Download size={14} />
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-xl border border-[#1F2937] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1F2937]">
                {['Nombre / ID', 'Usuario PPPoE', 'IP Asignada', 'Zona', 'Fecha Inst.', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4B5563] uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-[#6B7280]">Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-[#6B7280]">Sin resultados</td></tr>
              ) : clientes.map(c => {
                const initials = getInitials(c.nombre)
                const avatarCls = getAvatarColor(c.nombre)
                return (
                  <tr key={c.id} className="border-b border-[#1F2937]/60 hover:bg-[#1F2937]/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarCls}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{c.nombre}</p>
                          <p className="text-xs text-[#4B5563] font-mono">#{String(c.id).padStart(4, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-mono text-xs">{c.usuario_pppoe}</p>
                      <p className="text-[#4B5563] text-xs">{c.telefono || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#9CA3AF] font-mono text-xs">{c.ip_estatica || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.zona?.nombre ? (
                        <span className="text-xs bg-[#1F2937] text-[#9CA3AF] px-2 py-1 rounded font-mono uppercase">
                          {c.zona.nombre}
                        </span>
                      ) : <span className="text-[#374151]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-xs font-mono">
                      {c.fecha_instalacion
                        ? new Date(c.fecha_instalacion + 'T12:00:00').toLocaleDateString('es-PE')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${ESTADO_COLORS[c.estado] || ESTADO_COLORS.anulado}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleEstado(c)}
                          title={c.estado === 'activo' ? 'Cortar' : 'Reactivar'}
                          className={`p-1.5 rounded transition-colors ${
                            c.estado === 'activo'
                              ? 'text-[#6B7280] hover:text-red-400 hover:bg-red-900/20'
                              : 'text-[#6B7280] hover:text-green-400 hover:bg-green-900/20'
                          }`}
                        >
                          {c.estado === 'activo' ? <WifiOff size={14} /> : <Wifi size={14} />}
                        </button>
                        <Link
                          to={`/clientes/${c.id}`}
                          className="p-1.5 rounded text-[#6B7280] hover:text-[#FFD700] hover:bg-yellow-900/20 transition-colors"
                          title="Ver/Editar"
                        >
                          <Edit size={14} />
                        </Link>
                        <button
                          onClick={() => eliminar(c.id, c.nombre)}
                          className="p-1.5 rounded text-[#6B7280] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1F2937]">
            <span className="text-xs text-[#4B5563]">
              Mostrando {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} de <span className="text-white font-semibold">{total}</span> clientes
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded bg-[#1F2937] text-[#6B7280] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const p = i + Math.max(1, page - 2)
                if (p > pages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm font-semibold transition-colors ${
                      p === page
                        ? 'bg-[#FFD700] text-[#111827]'
                        : 'bg-[#1F2937] text-[#6B7280] hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="w-8 h-8 flex items-center justify-center rounded bg-[#1F2937] text-[#6B7280] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
