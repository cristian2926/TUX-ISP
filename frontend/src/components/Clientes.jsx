import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Plus, Wifi, WifiOff, Edit, Trash2,
  DollarSign, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const ESTADO_COLORS = {
  activo: 'bg-green-500/20 text-green-400',
  suspendido: 'bg-yellow-500/20 text-yellow-400',
  anulado: 'bg-red-500/20 text-red-400',
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [zonaFiltro, setZonaFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/zonas').then(r => setZonas(r.data)).catch(() => {})
  }, [])

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 20 }
      if (search) params.search = search
      if (zonaFiltro) params.zona_id = zonaFiltro
      if (estadoFiltro) params.estado = estadoFiltro
      const { data } = await api.get('/clientes', { params })
      setClientes(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } finally {
      setLoading(false)
    }
  }, [page, search, zonaFiltro, estadoFiltro])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

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
    if (!confirm(`¿Eliminar cliente "${nombre}"?\nSe borrarán también sus pagos e historial. Esta acción no se puede deshacer.`)) return
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-[#9CA3AF] text-sm">{total} registros</p>
        </div>
        <Link
          to="/clientes/nuevo"
          className="flex items-center gap-2 bg-[#FFD700] text-[#111827] font-semibold px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors text-sm"
        >
          <Plus size={16} />
          Nuevo Cliente
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Buscar nombre, usuario, IP..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-[#1F2937] border border-[#374151] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#FFD700]"
          />
        </div>
        <select
          value={zonaFiltro}
          onChange={e => { setZonaFiltro(e.target.value); setPage(1) }}
          className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
        >
          <option value="">Todas las zonas</option>
          {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
        <select
          value={estadoFiltro}
          onChange={e => { setEstadoFiltro(e.target.value); setPage(1) }}
          className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151]">
                {['Cliente', 'PPPoE / IP', 'Zona', 'Plan', 'Vencimiento', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-[#9CA3AF]">Cargando...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-[#9CA3AF]">Sin resultados</td></tr>
              ) : clientes.map(c => (
                <tr key={c.id} className="border-b border-[#374151]/50 hover:bg-[#374151]/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{c.nombre}</p>
                      <p className="text-xs text-[#9CA3AF]">{c.telefono || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-mono text-xs">{c.usuario_pppoe}</p>
                    <p className="text-[#9CA3AF] font-mono text-xs">{c.ip_estatica || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF]">{c.zona?.nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-[#374151] text-white px-2 py-1 rounded">
                      {c.plan?.codigo || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                    {c.fecha_vencimiento
                      ? new Date(c.fecha_vencimiento).toLocaleDateString('es-PE')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ESTADO_COLORS[c.estado]}`}>
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
                            ? 'text-[#9CA3AF] hover:text-red-400 hover:bg-red-900/20'
                            : 'text-[#9CA3AF] hover:text-green-400 hover:bg-green-900/20'
                        }`}
                      >
                        {c.estado === 'activo' ? <WifiOff size={15} /> : <Wifi size={15} />}
                      </button>
                      <Link
                        to={`/clientes/${c.id}`}
                        className="p-1.5 rounded text-[#9CA3AF] hover:text-[#FFD700] hover:bg-yellow-900/20 transition-colors"
                        title="Ver/Editar"
                      >
                        <Edit size={15} />
                      </Link>
                      <button
                        onClick={() => eliminar(c.id, c.nombre)}
                        className="p-1.5 rounded text-[#9CA3AF] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#374151]">
            <span className="text-xs text-[#9CA3AF]">Página {page} de {pages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded text-[#9CA3AF] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1 rounded text-[#9CA3AF] hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
