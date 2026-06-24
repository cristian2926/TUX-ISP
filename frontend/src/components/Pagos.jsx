import { useEffect, useState, useCallback } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const hoy = new Date()
const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
const fechaHoy = hoy.toISOString().split('T')[0]

const inputCls = "w-full bg-[#FAF7F0] border border-[#E5E0D5] rounded-xl px-3 py-2 text-sm text-[#1C1C1C] placeholder-[#C8C2B5] focus:outline-none focus:border-[#FFD700] transition-colors"

function ModalPago({ clienteInicial = null, mesInicial = mesActual, onClose, onSaved }) {
  const [busqueda, setBusqueda] = useState(clienteInicial?.nombre || '')
  const [resultados, setResultados] = useState([])
  const [clienteSel, setClienteSel] = useState(clienteInicial)
  const [buscando, setBuscando] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    mes_pagado: mesInicial,
    fecha_pago: fechaHoy,
    monto: clienteInicial?.plan?.precio || '',
    metodo_pago: 'efectivo',
    referencia: '',
    notas: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!busqueda || clienteSel) return
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await api.get('/clientes', { params: { search: busqueda, per_page: 8 } })
        setResultados(data.items)
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda, clienteSel])

  function seleccionarCliente(c) {
    setClienteSel(c)
    setBusqueda(c.nombre)
    setResultados([])
    if (c.plan?.precio) set('monto', c.plan.precio)
  }

  function limpiarCliente() {
    setClienteSel(null)
    setBusqueda('')
    setResultados([])
    set('monto', '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!clienteSel) return toast.error('Seleccione un cliente')
    if (!form.monto || !form.mes_pagado || !form.fecha_pago) return toast.error('Complete todos los campos')
    setSaving(true)
    try {
      await api.post('/pagos', {
        cliente_id: clienteSel.id,
        monto: parseFloat(form.monto),
        mes_pagado: form.mes_pagado,
        fecha_pago: form.fecha_pago,
        metodo_pago: form.metodo_pago,
        referencia: form.referencia || null,
        notas: form.notas || null,
        estado: 'pagado',
      })
      toast.success(`Pago registrado — ${clienteSel.nombre}`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE9E0]">
          <h3 className="font-bold text-[#1C1C1C]">Registrar Pago</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-[#9A9AAA] hover:text-[#1C1C1C] hover:bg-[#FAF7F0]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="relative">
            <label className="text-xs text-[#5A5A6A] mb-1 block">Cliente <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                className={inputCls + (clienteSel ? ' border-green-400' : '')}
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); if (clienteSel) limpiarCliente() }}
                placeholder="Buscar por nombre, usuario PPPoE..."
                autoComplete="off"
              />
              {clienteSel && (
                <button type="button" onClick={limpiarCliente} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9A9AAA] hover:text-[#1C1C1C]">
                  <X size={14} />
                </button>
              )}
            </div>
            {resultados.length > 0 && !clienteSel && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-[#E5E0D5] rounded-xl overflow-hidden shadow-lg">
                {resultados.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seleccionarCliente(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FAF7F0] transition-colors border-b border-[#F0EBE0] last:border-0"
                  >
                    <p className="text-sm text-[#1C1C1C] font-medium">{c.nombre}</p>
                    <p className="text-xs text-[#5A5A6A]">
                      {c.usuario_pppoe} — {c.zona?.nombre} — S/{c.plan?.precio}/mes
                    </p>
                  </button>
                ))}
              </div>
            )}
            {clienteSel && (
              <div className="mt-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-xs text-green-600 font-medium">{clienteSel.nombre}</p>
                <p className="text-xs text-[#5A5A6A]">
                  {clienteSel.usuario_pppoe} · {clienteSel.zona?.nombre} · Plan {clienteSel.plan?.codigo}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#5A5A6A] mb-1 block">Mes a pagar <span className="text-red-400">*</span></label>
              <input type="month" className={inputCls} value={form.mes_pagado} onChange={e => set('mes_pagado', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[#5A5A6A] mb-1 block">Monto (S/) <span className="text-red-400">*</span></label>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="50.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#5A5A6A] mb-1 block">Fecha de pago <span className="text-red-400">*</span></label>
              <input type="date" className={inputCls} value={form.fecha_pago} onChange={e => set('fecha_pago', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[#5A5A6A] mb-1 block">Método</label>
              <select className={inputCls} value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#5A5A6A] mb-1 block">Referencia / Comprobante</label>
            <input className={inputCls} value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="Nro. operación (opcional)" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm border border-[#D8D2C5] rounded-xl text-[#5A5A6A] hover:text-[#1C1C1C] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm bg-[#FFD700] text-[#1C1C1C] font-bold rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-colors">
              {saving ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Pagos() {
  const [pagos, setPagos] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [mesFilter, setMesFilter] = useState('')
  const [sinPago, setSinPago] = useState([])
  const [tab, setTab] = useState('pagos')
  const [loading, setLoading] = useState(true)
  const [modalPago, setModalPago] = useState(false)
  const [clienteRapido, setClienteRapido] = useState(null)

  const fetchPagos = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 20 }
      if (mesFilter) params.mes = mesFilter
      const { data } = await api.get('/pagos', { params })
      setPagos(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } finally {
      setLoading(false)
    }
  }, [page, mesFilter])

  const fetchSinPago = useCallback(async () => {
    const { data } = await api.get('/pagos/clientes-sin-pago', {
      params: { mes: mesFilter || mesActual },
    })
    setSinPago(data)
  }, [mesFilter])

  useEffect(() => { fetchPagos() }, [fetchPagos])
  useEffect(() => { if (tab === 'pendientes') fetchSinPago() }, [tab, fetchSinPago])

  function onPagoSaved() {
    fetchPagos()
    if (tab === 'pendientes') fetchSinPago()
  }

  async function enviarAviso(clienteId) {
    try {
      await api.post(`/whatsapp/aviso-cobro/${clienteId}`)
      toast.success('Aviso enviado por WhatsApp')
    } catch {
      toast.error('Error al enviar aviso (¿WhatsApp conectado?)')
    }
  }

  function abrirPagoRapido(cliente) {
    setClienteRapido(cliente)
    setModalPago(true)
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1C]">Pagos</h1>
          <p className="text-[#5A5A6A] text-sm">{total} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mesFilter}
            onChange={e => { setMesFilter(e.target.value); setPage(1) }}
            className="bg-white border border-[#E5E0D5] rounded-xl px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:border-[#FFD700]"
          />
          <button
            onClick={() => { setClienteRapido(null); setModalPago(true) }}
            className="flex items-center gap-2 bg-[#FFD700] text-[#1C1C1C] font-semibold px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors text-sm shrink-0"
          >
            <Plus size={16} /> Registrar Pago
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[['pagos', 'Registro de Pagos'], ['pendientes', 'Sin Pago']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-[#FFD700] text-[#1C1C1C]'
                : 'bg-white text-[#5A5A6A] hover:text-[#1C1C1C] border border-[#E5E0D5]'
            }`}
          >
            {label}
            {key === 'pendientes' && sinPago.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {sinPago.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Registro de pagos */}
      {tab === 'pagos' && (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE9E0]">
                  {['Cliente', 'Mes', 'Fecha', 'Monto', 'Método', 'Referencia', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#9A9AAA] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#9A9AAA]">Cargando...</td></tr>
                ) : pagos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#9A9AAA]">
                      <p className="mb-2">Sin pagos registrados</p>
                      <button onClick={() => { setClienteRapido(null); setModalPago(true) }} className="text-[#FFD700] text-sm underline">
                        Registrar primer pago
                      </button>
                    </td>
                  </tr>
                ) : pagos.map(p => (
                  <tr key={p.id} className="border-b border-[#F0EBE0] hover:bg-[#FAF7F0] transition-colors">
                    <td className="px-4 py-3 text-[#1C1C1C] font-medium">{p.cliente?.nombre || `#${p.cliente_id}`}</td>
                    <td className="px-4 py-3 text-[#5A5A6A] font-mono">{p.mes_pagado}</td>
                    <td className="px-4 py-3 text-[#5A5A6A] whitespace-nowrap">
                      {new Date(p.fecha_pago + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#1C1C1C] font-bold bg-[#FFD700]/20 px-2 py-0.5 rounded-lg">S/ {Number(p.monto).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-[#5A5A6A] capitalize">{p.metodo_pago}</td>
                    <td className="px-4 py-3 text-[#9A9AAA] text-xs">{p.referencia || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                        p.estado === 'pagado' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                      }`}>
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#EDE9E0]">
              <span className="text-xs text-[#9A9AAA]">Página {page} de {pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-[#9A9AAA] hover:text-[#1C1C1C] hover:bg-[#EDE9E0] disabled:opacity-30">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="p-1.5 rounded-lg text-[#9A9AAA] hover:text-[#1C1C1C] hover:bg-[#EDE9E0] disabled:opacity-30">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Sin pago */}
      {tab === 'pendientes' && (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EDE9E0] flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-[#5A5A6A]">
              <span className="text-[#1C1C1C] font-semibold">{sinPago.length}</span> clientes sin pago — {mesFilter || mesActual}
            </span>
            <button
              onClick={async () => {
                if (!confirm(`¿Enviar aviso de cobro por WhatsApp a ${sinPago.length} clientes?`)) return
                try {
                  const { data } = await api.post('/whatsapp/broadcast-cobros', null, {
                    params: { mes: mesFilter || mesActual },
                  })
                  toast.success(`${data.enviados} avisos enviados`)
                } catch {
                  toast.error('Error al enviar avisos masivos')
                }
              }}
              className="flex items-center gap-1.5 text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-xl hover:bg-green-100 border border-green-200 transition-colors"
            >
              <MessageCircle size={13} /> Avisar a todos por WhatsApp
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDE9E0]">
                  {['Cliente', 'PPPoE', 'Zona', 'Plan', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#9A9AAA] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sinPago.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-green-600">
                      Todos los clientes están al día ✓
                    </td>
                  </tr>
                ) : sinPago.map(c => (
                  <tr key={c.id} className="border-b border-[#F0EBE0] hover:bg-[#FAF7F0] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[#1C1C1C] font-medium">{c.nombre}</p>
                      <p className="text-xs text-[#9A9AAA]">{c.telefono || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-[#5A5A6A] font-mono text-xs">{c.usuario_pppoe}</td>
                    <td className="px-4 py-3 text-[#5A5A6A]">{c.zona?.nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-[#1C1C1C] font-semibold bg-[#FFD700]/20 px-2 py-0.5 rounded-lg text-xs">S/ {c.plan?.precio || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => abrirPagoRapido(c)}
                          className="text-xs bg-[#FFD700] text-[#1C1C1C] font-bold px-3 py-1.5 rounded-xl hover:bg-yellow-400 transition-colors whitespace-nowrap"
                        >
                          Registrar Pago
                        </button>
                        <button
                          onClick={() => enviarAviso(c.id)}
                          className="text-xs text-green-600 hover:text-green-700 transition-colors flex items-center gap-1"
                        >
                          <MessageCircle size={13} /> Avisar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalPago && (
        <ModalPago
          clienteInicial={clienteRapido}
          mesInicial={mesFilter || mesActual}
          onClose={() => { setModalPago(false); setClienteRapido(null) }}
          onSaved={onPagoSaved}
        />
      )}
    </div>
  )
}
