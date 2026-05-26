import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, Save, Trash2, Edit, Receipt,
  TrendingDown, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  'Energía eléctrica',
  'Internet proveedor',
  'Mantenimiento',
  'Equipos / Hardware',
  'Personal / Sueldos',
  'Transporte',
  'Alquiler',
  'Telefonía',
  'Otros',
]

const CAT_COLOR = {
  'Energía eléctrica':  'bg-yellow-500/20 text-yellow-400',
  'Internet proveedor': 'bg-blue-500/20 text-blue-400',
  'Mantenimiento':      'bg-orange-500/20 text-orange-400',
  'Equipos / Hardware': 'bg-purple-500/20 text-purple-400',
  'Personal / Sueldos': 'bg-green-500/20 text-green-400',
  'Transporte':         'bg-cyan-500/20 text-cyan-400',
  'Alquiler':           'bg-pink-500/20 text-pink-400',
  'Telefonía':          'bg-indigo-500/20 text-indigo-400',
  'Otros':              'bg-[#374151] text-[#9CA3AF]',
}

const inputCls = "w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFD700] transition-colors"

const EMPTY = {
  descripcion: '', monto: '', categoria: 'Otros',
  fecha: new Date().toISOString().split('T')[0],
  proveedor: '', numero_factura: '', es_recurrente: false, notas: '',
}

function todayYM() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ── Modal ──────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#374151] shrink-0">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-[#9CA3AF] hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/* ── Formulario gasto ────────────────────────────────────────────── */
function GastoForm({ initial = EMPTY, onSave, onClose }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    if (!form.descripcion || !form.monto || !form.fecha) {
      toast.error('Descripción, monto y fecha son obligatorios')
      return
    }
    setSaving(true)
    try {
      await onSave({ ...form, monto: parseFloat(form.monto) })
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-[#9CA3AF] mb-1 block">Descripción <span className="text-red-400">*</span></label>
          <input className={inputCls} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Factura energía eléctrica enero" />
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">Monto (S/) <span className="text-red-400">*</span></label>
          <input type="number" step="0.01" min="0" className={inputCls} value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">Fecha <span className="text-red-400">*</span></label>
          <input type="date" className={inputCls} value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-[#9CA3AF] mb-1 block">Categoría</label>
          <select className={inputCls} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">Proveedor</label>
          <input className={inputCls} value={form.proveedor || ''} onChange={e => set('proveedor', e.target.value)} placeholder="Electrosur, Claro..." />
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1 block">N° Factura / Recibo</label>
          <input className={inputCls} value={form.numero_factura || ''} onChange={e => set('numero_factura', e.target.value)} placeholder="F001-00123" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-[#9CA3AF] mb-1 block">Notas</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Observaciones adicionales..." />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="recurrente"
            checked={form.es_recurrente}
            onChange={e => set('es_recurrente', e.target.checked)}
            className="w-4 h-4 accent-[#FFD700]"
          />
          <label htmlFor="recurrente" className="text-sm text-[#9CA3AF] cursor-pointer select-none">
            Gasto recurrente (se repite mensualmente)
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-[#374151] rounded-lg text-[#9CA3AF] hover:text-white">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-[#FFD700] text-[#111827] font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-1">
          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar Gasto'}
        </button>
      </div>
    </form>
  )
}

/* ── Página principal ────────────────────────────────────────────── */
export default function Gastos() {
  const [gastos, setGastos]     = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [mes, setMes]           = useState(todayYM())
  const [catFiltro, setCatFiltro] = useState('')
  const [modal, setModal]       = useState(null)   // null | 'nuevo' | gasto-object
  const [resumen, setResumen]   = useState({})

  const PER_PAGE = 15

  const fetchGastos = useCallback(() => {
    setLoading(true)
    const params = { page, per_page: PER_PAGE }
    if (mes) params.mes = mes
    if (catFiltro) params.categoria = catFiltro
    api.get('/gastos', { params })
      .then(r => {
        setGastos(r.data.items)
        setTotal(r.data.total)
      })
      .finally(() => setLoading(false))
  }, [page, mes, catFiltro])

  useEffect(() => { fetchGastos() }, [fetchGastos])

  useEffect(() => {
    if (!mes) return
    api.get('/gastos', { params: { mes, per_page: 200 } }).then(r => {
      const acc = {}
      let tot = 0
      r.data.items.forEach(g => {
        acc[g.categoria] = (acc[g.categoria] || 0) + g.monto
        tot += g.monto
      })
      setResumen({ cats: acc, total: tot })
    })
  }, [mes, gastos])

  function prevMes() {
    const [y, m] = mes.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setPage(1)
  }
  function nextMes() {
    const [y, m] = mes.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setPage(1)
  }
  const mesLabel = () => {
    const [y, m] = mes.split('-').map(Number)
    const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    return `${names[m - 1]} ${y}`
  }

  async function handleSave(data) {
    if (modal === 'nuevo') {
      await api.post('/gastos', data)
      toast.success('Gasto registrado')
    } else {
      await api.put(`/gastos/${modal.id}`, data)
      toast.success('Gasto actualizado')
    }
    fetchGastos()
  }

  async function handleDelete(g) {
    if (!confirm(`¿Eliminar "${g.descripcion}"?`)) return
    try {
      await api.delete(`/gastos/${g.id}`)
      toast.success('Gasto eliminado')
      fetchGastos()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const pages = Math.ceil(total / PER_PAGE)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Gastos</h1>
          <p className="text-[#9CA3AF] text-sm">{total} registros · {mesLabel()}</p>
        </div>
        <button
          onClick={() => setModal('nuevo')}
          className="flex items-center gap-2 bg-[#FFD700] text-[#111827] font-semibold px-3 py-2 rounded-lg hover:bg-yellow-400 transition-colors text-sm shrink-0"
        >
          <Plus size={16} /> Nuevo Gasto
        </button>
      </div>

      {/* Navegación mes */}
      <div className="flex items-center gap-3 bg-[#1F2937] rounded-xl px-4 py-3 border border-[#374151]">
        <button onClick={prevMes} className="p-1.5 rounded text-[#9CA3AF] hover:text-white hover:bg-[#374151] transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="flex-1 text-center text-white font-semibold text-sm">{mesLabel()}</span>
        <button onClick={nextMes} className="p-1.5 rounded text-[#9CA3AF] hover:text-white hover:bg-[#374151] transition-colors">
          <ChevronRight size={16} />
        </button>
        <button onClick={fetchGastos} className="p-1.5 rounded text-[#9CA3AF] hover:text-white hover:bg-[#374151] transition-colors ml-1" title="Actualizar">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Resumen por categoría */}
      {resumen.cats && Object.keys(resumen.cats).length > 0 && (
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Resumen del mes</p>
            <p className="text-lg font-bold text-red-400">S/ {resumen.total?.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(resumen.cats).sort((a, b) => b[1] - a[1]).map(([cat, monto]) => (
              <button
                key={cat}
                onClick={() => { setCatFiltro(catFiltro === cat ? '' : cat); setPage(1) }}
                className={`rounded-lg p-2.5 text-left transition-all border ${
                  catFiltro === cat
                    ? 'border-[#FFD700] bg-yellow-500/10'
                    : 'border-transparent hover:border-[#374151]'
                } ${CAT_COLOR[cat] || CAT_COLOR['Otros']}`}
              >
                <p className="text-xs font-medium truncate">{cat}</p>
                <p className="text-sm font-bold mt-0.5">S/ {monto.toFixed(2)}</p>
                <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-current opacity-50 rounded-full" style={{ width: `${(monto / resumen.total) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
          {catFiltro && (
            <button onClick={() => setCatFiltro('')} className="mt-2 text-xs text-[#9CA3AF] hover:text-white flex items-center gap-1">
              <X size={12} /> Quitar filtro de categoría
            </button>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gastos.length === 0 ? (
          <div className="text-center py-14">
            <TrendingDown size={40} className="mx-auto text-[#374151] mb-3" />
            <p className="text-[#9CA3AF]">Sin gastos en {mesLabel()}</p>
            <button onClick={() => setModal('nuevo')} className="mt-3 text-[#FFD700] text-sm underline">Registrar primer gasto</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#374151] text-xs text-[#4B5563] uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Proveedor</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]/50">
                  {gastos.map(g => (
                    <tr key={g.id} className="hover:bg-[#374151]/30 transition-colors">
                      <td className="px-4 py-3 text-[#9CA3AF] whitespace-nowrap">{g.fecha}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{g.descripcion}</p>
                        {g.numero_factura && <p className="text-xs text-[#4B5563]">{g.numero_factura}</p>}
                        {g.es_recurrente && <span className="text-xs text-[#FFD700] bg-yellow-500/10 px-1.5 py-0.5 rounded">Recurrente</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${CAT_COLOR[g.categoria] || CAT_COLOR['Otros']}`}>
                          {g.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF] text-xs">{g.proveedor || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-400 whitespace-nowrap">S/ {g.monto.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setModal(g)} className="p-1.5 rounded text-[#9CA3AF] hover:text-[#FFD700] hover:bg-yellow-900/20 transition-colors" title="Editar">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(g)} className="p-1.5 rounded text-[#9CA3AF] hover:text-red-400 hover:bg-red-900/20 transition-colors" title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-[#374151]">
              {gastos.map(g => (
                <div key={g.id} className="p-4 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${(CAT_COLOR[g.categoria] || '').split(' ')[0]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{g.descripcion}</p>
                      <p className="text-sm font-bold text-red-400 shrink-0">S/ {g.monto.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${CAT_COLOR[g.categoria] || CAT_COLOR['Otros']}`}>{g.categoria}</span>
                      <span className="text-xs text-[#4B5563]">{g.fecha}</span>
                      {g.es_recurrente && <span className="text-xs text-[#FFD700]">Recurrente</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal(g)} className="p-1.5 rounded text-[#9CA3AF] hover:text-[#FFD700]"><Edit size={13} /></button>
                    <button onClick={() => handleDelete(g)} className="p-1.5 rounded text-[#9CA3AF] hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#374151]">
                <span className="text-xs text-[#9CA3AF]">Página {page} de {pages}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded border border-[#374151] text-[#9CA3AF] hover:text-white disabled:opacity-30">Anterior</button>
                  <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded border border-[#374151] text-[#9CA3AF] hover:text-white disabled:opacity-30">Siguiente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Total visible */}
      {!loading && gastos.length > 0 && (
        <div className="flex items-center justify-between bg-[#1F2937] rounded-xl border border-[#374151] px-4 py-3">
          <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
            <Receipt size={15} />
            Total registrado {catFiltro ? `· ${catFiltro}` : `· ${mesLabel()}`}
          </div>
          <p className="font-bold text-red-400">S/ {resumen.total?.toFixed(2) || '0.00'}</p>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          title={modal === 'nuevo' ? 'Nuevo Gasto' : `Editar Gasto — ${modal.descripcion}`}
          onClose={() => setModal(null)}
        >
          <GastoForm
            initial={modal === 'nuevo' ? EMPTY : {
              descripcion: modal.descripcion,
              monto: modal.monto,
              categoria: modal.categoria,
              fecha: modal.fecha,
              proveedor: modal.proveedor || '',
              numero_factura: modal.numero_factura || '',
              es_recurrente: modal.es_recurrente || false,
              notas: modal.notas || '',
            }}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}
