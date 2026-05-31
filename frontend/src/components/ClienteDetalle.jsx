import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Save, Edit, X, Wifi, WifiOff,
  MessageCircle, Phone, MapPin,
  User, Shield, Calendar, TrendingUp, AlertCircle,
  Package, Clock, RefreshCw,
} from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADO_STYLE = {
  activo:     'bg-green-500/20 text-green-400 border border-green-500/30',
  suspendido: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  anulado:    'bg-red-500/20 text-red-400 border border-red-500/30',
}

/* ── Calendario de pagos ────────────────────────────────────────────── */
function CalendarioPagos({ clienteId, planPrecio, modalMes, setModalMes, onPaymentSaved }) {
  const [calendario, setCalendario] = useState([])
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [monto, setMonto]   = useState(planPrecio || '')
  const [metodo, setMetodo] = useState('efectivo')
  const [loadingCal, setLoadingCal] = useState(false)

  useEffect(() => {
    if (modalMes) setMonto(planPrecio || '')
  }, [modalMes])
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(() => {
    setLoadingCal(true)
    api.get(`/clientes/${clienteId}/calendario-pagos`, { params: { anio } })
      .then(r => setCalendario(r.data))
      .finally(() => setLoadingCal(false))
  }, [clienteId, anio])

  useEffect(() => { fetch() }, [fetch])

  // Refrescar cuando el usuario vuelve a la pestaña
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) fetch() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetch])

  const pagados        = calendario.filter(m => m.estado === 'pagado').length
  const vencidos       = calendario.filter(m => m.estado === 'vencido').length
  const cortes_temp    = calendario.filter(m => m.estado === 'corte_temporal').length

  const COLOR = {
    pagado:         'bg-green-500/25 border-green-500 text-green-300 hover:bg-green-500/40',
    pendiente:      'bg-orange-500/15 border-orange-500/70 text-orange-300 hover:bg-orange-500/25 cursor-pointer',
    vencido:        'bg-red-500/20 border-red-500 text-red-300 hover:bg-red-500/30 cursor-pointer',
    corte_temporal: 'bg-yellow-500/20 border-yellow-400 text-yellow-300',
    futuro:         'bg-[#374151]/50 border-[#374151] text-[#4B5563]',
    no_aplica:      'bg-[#1F2937] border-[#1F2937] text-[#374151]',
  }

  const LABEL = {
    pagado: 'Pagado', pendiente: 'Pendiente', vencido: 'Vencido',
    corte_temporal: 'Corte temporal', futuro: 'Futuro', no_aplica: '—',
  }

  async function registrarPago() {
    if (!monto) return
    setSaving(true)
    try {
      await api.post('/pagos', {
        cliente_id: clienteId,
        monto: parseFloat(monto),
        mes_pagado: modalMes,
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: metodo,
        estado: 'pagado',
      })
      toast.success(`Pago registrado`)
      setModalMes(null)
      fetch()
      if (onPaymentSaved) onPaymentSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  async function registrarCorte() {
    setSaving(true)
    try {
      await api.post('/pagos', {
        cliente_id: clienteId,
        monto: 0,
        mes_pagado: modalMes,
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: 'efectivo',
        estado: 'corte_temporal',
        notas: 'Corte temporal solicitado por el cliente',
      })
      toast.success(`Mes marcado como corte temporal`)
      setModalMes(null)
      fetch()
      if (onPaymentSaved) onPaymentSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Mini stats del año */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-green-400">{pagados}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Pagados</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-red-400">{vencidos}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Vencidos</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-yellow-400">{cortes_temp}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">C. Temporal</p>
        </div>
      </div>

      {/* Cabecera año */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#9CA3AF]">Toca un mes para registrar</p>
        <div className="flex items-center gap-2">
          <button onClick={fetch} disabled={loadingCal} title="Actualizar" className="w-6 h-6 flex items-center justify-center rounded bg-[#374151] text-[#9CA3AF] hover:text-white text-xs disabled:opacity-40">
            <RefreshCw size={11} className={loadingCal ? 'animate-spin' : ''}/>
          </button>
          <button onClick={() => setAnio(a => a-1)} className="w-6 h-6 flex items-center justify-center rounded bg-[#374151] text-[#9CA3AF] hover:text-white text-xs">◀</button>
          <span className="text-sm font-bold text-white w-10 text-center">{anio}</span>
          <button onClick={() => setAnio(a => a+1)} className="w-6 h-6 flex items-center justify-center rounded bg-[#374151] text-[#9CA3AF] hover:text-white text-xs">▶</button>
        </div>
      </div>

      {/* Grid de meses */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {calendario.map((item, i) => {
          const clickable = item.estado === 'pendiente' || item.estado === 'vencido'
          return (
            <button
              key={item.mes}
              onClick={() => clickable && setModalMes(item.mes)}
              disabled={!clickable}
              title={`${MESES_LARGO[i]} — ${LABEL[item.estado] || item.estado}`}
              className={`border rounded-lg py-2 text-center transition-all text-xs font-semibold ${COLOR[item.estado] || COLOR.futuro}`}
            >
              {MESES_CORTO[i]}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-[#9CA3AF]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/>Pagado</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"/>Vencido</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"/>Corte temporal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"/>Pendiente</span>
      </div>

      {/* Modal pago rápido */}
      {modalMes && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] w-full max-w-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">{MESES_LARGO[parseInt(modalMes.split('-')[1])-1]} {modalMes.split('-')[0]}</h3>
              <button onClick={() => setModalMes(null)} className="text-[#9CA3AF] hover:text-white"><X size={15}/></button>
            </div>
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Monto (S/)</label>
              <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)}
                className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]" placeholder="50.00"/>
            </div>
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Método</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)}
                className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFD700]">
                <option value="efectivo">Efectivo</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalMes(null)} className="flex-1 py-2 text-sm border border-[#374151] rounded-lg text-[#9CA3AF] hover:text-white">Cancelar</button>
              <button onClick={registrarPago} disabled={saving}
                className="flex-1 py-2 text-sm bg-[#FFD700] text-[#111827] font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Registrar Pago'}
              </button>
            </div>
            <div className="border-t border-[#374151] pt-3">
              <p className="text-xs text-[#9CA3AF] mb-2">¿El cliente pidió corte temporal este mes?</p>
              <button onClick={registrarCorte} disabled={saving}
                className="w-full py-2 text-sm border border-yellow-600/50 text-yellow-400 rounded-lg hover:bg-yellow-900/20 disabled:opacity-50">
                Marcar como Corte Temporal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Detalle completo ───────────────────────────────────────────────── */
export default function ClienteDetalle() {
  const { id } = useParams()
  const [cliente, setCliente] = useState(null)
  const [historial, setHistorial] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [modalMes, setModalMes] = useState(null)
  const [modalProroga, setModalProroga] = useState(false)
  const [fechaProroga, setFechaProroga] = useState('')
  const [savingProroga, setSavingProroga] = useState(false)
  const [planes, setPlanes] = useState([])
  const [pppoeStatus, setPppoeStatus] = useState(null)
  const [loadingPppoe, setLoadingPppoe] = useState(false)

  function fetchCliente() {
    api.get(`/clientes/${id}`).then(r => { setCliente(r.data); setForm(r.data) })
    api.get(`/clientes/${id}/historial`).then(r => setHistorial(r.data))
  }

  function fetchPppoeStatus() {
    setLoadingPppoe(true)
    api.get(`/clientes/${id}/pppoe-status`)
      .then(r => setPppoeStatus(r.data))
      .catch(() => setPppoeStatus({ conectado: false, error: 'Error al consultar' }))
      .finally(() => setLoadingPppoe(false))
  }

  useEffect(() => { api.get('/planes').then(r => setPlanes(r.data)).catch(() => {}) }, [])

  useEffect(() => { fetchCliente(); fetchPppoeStatus() }, [id])

  async function guardar() {
    setSaving(true)
    try {
      await api.put(`/clientes/${id}`, {
        nombre: form.nombre, telefono: form.telefono,
        telefono_whatsapp: form.telefono_whatsapp, direccion: form.direccion,
        password_pppoe: form.password_pppoe, ip_estatica: form.ip_estatica,
        plan_id: form.plan_id ?? form.plan?.id,
        estado: form.estado, notas: form.notas,
        tipo_conexion: form.tipo_conexion,
        tiene_tv: form.tiene_tv,
        fecha_instalacion: form.fecha_instalacion || null,
        fecha_vencimiento: form.fecha_vencimiento || null,
        estado_equipo: form.estado_equipo,
        equipo_marca: form.equipo_marca,
        equipo_modelo: form.equipo_modelo,
        equipo_serial: form.equipo_serial,
        equipo_descripcion: form.equipo_descripcion,
        equipo_fecha_entrega: form.equipo_fecha_entrega || null,
        equipo_valor: form.equipo_valor ? parseFloat(form.equipo_valor) : null,
      })
      toast.success('Cliente actualizado')
      setEditing(false)
      fetchCliente()
    } catch { toast.error('Error al actualizar') }
    finally { setSaving(false) }
  }

  async function toggleEstado() {
    try {
      if (cliente.estado === 'activo') {
        await api.post(`/clientes/${id}/cortar`)
        toast.success('Servicio cortado')
      } else {
        await api.post(`/clientes/${id}/reactivar`)
        toast.success('Servicio reactivado')
      }
      fetchCliente()
    } catch { toast.error('Error al cambiar estado') }
  }

  async function enviarAviso(tipo) {
    try {
      await api.post(`/whatsapp/aviso-${tipo}/${id}`)
      toast.success('Aviso enviado por WhatsApp')
    } catch { toast.error('Error (¿WhatsApp conectado?)') }
  }

  async function guardarProroga() {
    if (!fechaProroga) return toast.error('Selecciona una fecha')
    setSavingProroga(true)
    try {
      await api.put(`/clientes/${id}`, { fecha_vencimiento: fechaProroga })
      toast.success(`Prórroga aplicada hasta ${fechaProroga}`)
      setModalProroga(false)
      fetchCliente()
    } catch { toast.error('Error al guardar prórroga') }
    finally { setSavingProroga(false) }
  }

  if (!cliente) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const inp = "w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700] transition-colors"

  const HIST_COLOR = {
    activacion: 'bg-green-500', corte: 'bg-red-500',
    pago: 'bg-[#FFD700]', cambio_plan: 'bg-blue-500', nota: 'bg-[#9CA3AF]',
  }

  const diasRestantes = cliente.fecha_vencimiento
    ? Math.ceil((new Date(cliente.fecha_vencimiento + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <>
    <div className="p-4 sm:p-6 space-y-5 w-full">

      {/* ── BREADCRUMB ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-[#4B5563] font-mono uppercase tracking-widest">
        <Link to="/clientes" className="hover:text-[#9CA3AF] transition-colors">Clientes</Link>
        <span className="text-[#1F2937]">›</span>
        <span className="text-[#FFD700]">{cliente.nombre}</span>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Link to="/clientes" className="p-2 mt-0.5 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1F2937] transition-colors shrink-0">
          <ArrowLeft size={18}/>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white truncate">{cliente.nombre}</h1>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${ESTADO_STYLE[cliente.estado]}`}>
              {cliente.estado}
            </span>
            {pppoeStatus?.conectado && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30 uppercase tracking-wide">
                Active Node
              </span>
            )}
          </div>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {cliente.usuario_pppoe} — {cliente.zona?.nombre} — {cliente.plan?.nombre}
          </p>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          <button
            onClick={() => { setFechaProroga(cliente.fecha_vencimiento || ''); setModalProroga(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1F2937] text-[#9CA3AF] hover:text-white border border-[#374151] transition-colors"
          >
            <Clock size={15}/> Prórroga
          </button>
          <button
            onClick={() => enviarAviso(cliente.estado === 'activo' ? 'cobro' : 'corte')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-900/20 text-green-400 hover:bg-green-900/40 border border-green-800/30 transition-colors"
          >
            <MessageCircle size={15}/> WhatsApp
          </button>
          <button
            onClick={toggleEstado}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              cliente.estado === 'activo'
                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/30'
                : 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/30'
            }`}
          >
            {cliente.estado === 'activo' ? <><WifiOff size={15}/> Cortar</> : <><Wifi size={15}/> Reactivar</>}
          </button>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1F2937] text-[#9CA3AF] hover:text-white border border-[#374151] transition-colors">
                <X size={15}/> Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex items-center gap-1.5 bg-[#FFD700] text-[#111827] font-bold px-4 py-2 rounded-lg text-sm hover:bg-yellow-400 disabled:opacity-50">
                <Save size={15}/> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#1F2937] text-[#9CA3AF] hover:text-white border border-[#374151] transition-colors">
              <Edit size={15}/> Editar
            </button>
          )}
        </div>
      </div>

      {/* ── TOP INFO CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Plan Contratado */}
        <div className="bg-[#111827] rounded-xl border border-[#1F2937] p-4">
          <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold mb-2">Plan Contratado</p>
          <p className="text-lg font-bold text-white">{cliente.plan?.nombre || '—'}</p>
          {cliente.plan && (
            <p className="text-xs text-[#6B7280] mt-1">
              ↓{cliente.plan.bajada_mbps} / ↑{cliente.plan.subida_mbps} Mbps · S/ {cliente.plan.precio}/mes
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${pppoeStatus?.conectado ? 'bg-green-400' : 'bg-[#374151]'}`}/>
            <span className="text-xs text-[#6B7280]">
              {loadingPppoe ? 'Verificando...' : pppoeStatus?.conectado ? 'Link Status: Operational' : 'Link Status: Offline'}
            </span>
          </div>
        </div>

        {/* Próximo Vencimiento */}
        <div className={`rounded-xl border p-4 ${diasRestantes !== null && diasRestantes <= 15 ? 'bg-[#FFD700]/8 border-[#FFD700]/25' : 'bg-[#111827] border-[#1F2937]'}`}>
          <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold mb-2">Próximo Vencimiento</p>
          {cliente.fecha_vencimiento ? (
            <>
              <p className="text-xl font-black text-white">
                {new Date(cliente.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long' })}
              </p>
              {diasRestantes !== null && (
                <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium ${
                  diasRestantes < 0 ? 'text-red-400' : diasRestantes <= 5 ? 'text-red-400' : diasRestantes <= 15 ? 'text-[#FFD700]' : 'text-[#6B7280]'
                }`}>
                  {diasRestantes <= 15 && <AlertCircle size={11}/>}
                  {diasRestantes < 0 ? `Vencido hace ${Math.abs(diasRestantes)} días` : `Días restantes: ${diasRestantes}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#374151]">Sin fecha de vencimiento</p>
          )}
        </div>

        {/* Estado de conexión */}
        <div className="bg-[#111827] rounded-xl border border-[#1F2937] p-4">
          <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold mb-2">Estado PPPoE</p>
          <div className="flex items-center gap-2 mt-1">
            {loadingPppoe ? (
              <div className="w-2 h-2 rounded-full bg-[#374151] animate-pulse"/>
            ) : pppoeStatus?.conectado ? (
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"/>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"/>
            )}
            <p className="text-base font-bold text-white">
              {loadingPppoe ? 'Consultando...' : pppoeStatus?.conectado ? 'Sesión Activa' : 'Sin Sesión'}
            </p>
          </div>
          {pppoeStatus?.conectado && (
            <div className="mt-2 space-y-0.5">
              {pppoeStatus.ip_remota && <p className="text-xs text-[#6B7280] font-mono">{pppoeStatus.ip_remota}</p>}
              {pppoeStatus.uptime && <p className="text-xs text-[#6B7280]">Uptime: {pppoeStatus.uptime}</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── CUERPO: 3 columnas en desktop ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Columna izquierda: datos del cliente */}
        <div className="space-y-4 order-2 lg:order-1">

          {/* Datos personales */}
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#374151] flex items-center gap-2">
              <User size={14} className="text-[#FFD700]"/>
              <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Datos personales</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Nombre', key: 'nombre', icon: User },
                { label: 'Teléfono', key: 'telefono', icon: Phone },
                { label: 'WhatsApp', key: 'telefono_whatsapp', icon: MessageCircle },
                { label: 'Dirección', key: 'direccion', icon: MapPin },
              ].map(({ label, key, icon: Icon }) => (
                <div key={key} className="flex items-start gap-3">
                  <Icon size={14} className="text-[#4B5563] mt-2.5 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9CA3AF] mb-1">{label}</p>
                    {editing ? (
                      <input className={inp} value={form[key] || ''} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}/>
                    ) : (
                      <p className="text-sm text-white">{cliente[key] || <span className="text-[#4B5563]">—</span>}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conexión */}
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#374151] flex items-center gap-2">
              <Shield size={14} className="text-[#FFD700]"/>
              <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Conexión</span>
            </div>
            <div className="p-4 space-y-3">

              {/* Estado PPPoE en tiempo real */}
              <div className="bg-[#111827] rounded-lg px-3 py-2.5 border border-[#374151] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {loadingPppoe ? (
                    <div className="w-2 h-2 rounded-full bg-[#4B5563] animate-pulse"/>
                  ) : pppoeStatus?.conectado ? (
                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]"/>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-red-500"/>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {loadingPppoe ? 'Consultando...' : pppoeStatus?.conectado ? 'Sesión activa' : 'Sin sesión PPPoE'}
                    </p>
                    {pppoeStatus?.conectado && (
                      <p className="text-xs text-[#9CA3AF] leading-tight">
                        {pppoeStatus.ip_remota && <span className="font-mono">{pppoeStatus.ip_remota}</span>}
                        {pppoeStatus.uptime && <span> · {pppoeStatus.uptime}</span>}
                      </p>
                    )}
                    {!pppoeStatus?.conectado && pppoeStatus?.error && (
                      <p className="text-xs text-[#4B5563]">{pppoeStatus.error}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={fetchPppoeStatus}
                  disabled={loadingPppoe}
                  className="p-1.5 rounded-lg text-[#4B5563] hover:text-[#9CA3AF] hover:bg-[#374151] transition-colors disabled:opacity-40"
                  title="Actualizar estado"
                >
                  <RefreshCw size={12} className={loadingPppoe ? 'animate-spin' : ''}/>
                </button>
              </div>

              <div>
                <p className="text-xs text-[#9CA3AF] mb-1">Usuario PPPoE</p>
                <p className="text-sm text-white font-mono bg-[#111827] px-2 py-1 rounded">{cliente.usuario_pppoe}</p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] mb-1">Contraseña PPPoE</p>
                {editing ? (
                  <input className={inp} value={form.password_pppoe || ''} onChange={e => setForm(f => ({...f, password_pppoe: e.target.value}))}/>
                ) : (
                  <p className="text-sm text-white font-mono bg-[#111827] px-2 py-1 rounded">{cliente.password_pppoe}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] mb-1">IP Estática</p>
                {editing ? (
                  <input className={inp} value={form.ip_estatica || ''} onChange={e => setForm(f => ({...f, ip_estatica: e.target.value}))}/>
                ) : (
                  <p className="text-sm text-white font-mono bg-[#111827] px-2 py-1 rounded">{cliente.ip_estatica || '—'}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF] mb-1">Zona</p>
                <p className="text-sm text-white">{cliente.zona?.nombre} <span className="text-[#4B5563] font-mono text-xs">({cliente.zona?.ip_wireguard})</span></p>
              </div>
            </div>
          </div>

          {/* Plan y estado */}
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#374151] flex items-center gap-2">
              <TrendingUp size={14} className="text-[#FFD700]"/>
              <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Plan y servicio</span>
            </div>
            <div className="p-4 space-y-3">
              {/* Plan */}
              <div className="bg-[#111827] rounded-lg p-3 border border-[#374151]">
                <p className="text-xs text-[#9CA3AF] mb-1">Plan actual</p>
                {editing ? (
                  <select
                    className={inp}
                    value={form.plan_id ?? form.plan?.id ?? ''}
                    onChange={e => setForm(f => ({...f, plan_id: parseInt(e.target.value)}))}
                  >
                    {planes.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} — S/ {p.precio}/mes</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <p className="text-white font-semibold">{cliente.plan?.nombre}</p>
                    <p className="text-[#FFD700] font-bold text-lg mt-1">S/ {cliente.plan?.precio}<span className="text-xs text-[#9CA3AF] font-normal">/mes</span></p>
                    <p className="text-xs text-[#9CA3AF] mt-1">↓{cliente.plan?.bajada_mbps} Mbps / ↑{cliente.plan?.subida_mbps} Mbps</p>
                  </>
                )}
              </div>

              {/* Tipo conexión + TV */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#111827] rounded-lg p-2.5">
                  <p className="text-xs text-[#9CA3AF] mb-1.5">Conexión</p>
                  {editing ? (
                    <select className="w-full bg-[#111827] border border-[#374151] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                      value={form.tipo_conexion || 'inalambrico'} onChange={e => setForm(f => ({...f, tipo_conexion: e.target.value}))}>
                      <option value="inalambrico">Inalámbrico</option>
                      <option value="fibra_optica">Fibra Óptica</option>
                    </select>
                  ) : (
                    <p className="text-xs text-white font-medium">
                      {cliente.tipo_conexion === 'fibra_optica' ? '🔵 Fibra Óptica' : '📡 Inalámbrico'}
                    </p>
                  )}
                </div>

                {/* TV — sin ícono Tv, solo toggle */}
                <div className="bg-[#111827] rounded-lg p-2.5">
                  <p className="text-xs text-[#9CA3AF] mb-1.5">Servicio TV</p>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({...f, tiene_tv: !f.tiene_tv}))}
                      className={`flex items-center gap-2 text-xs font-semibold transition-colors ${form.tiene_tv ? 'text-[#FFD700]' : 'text-[#4B5563]'}`}
                    >
                      <span className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${form.tiene_tv ? 'bg-[#FFD700]' : 'bg-[#374151]'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.tiene_tv ? 'translate-x-4' : 'translate-x-0.5'}`}/>
                      </span>
                      {form.tiene_tv ? 'Sí' : 'No'}
                    </button>
                  ) : (
                    <p className={`text-xs font-semibold ${cliente.tiene_tv ? 'text-[#FFD700]' : 'text-[#4B5563]'}`}>
                      {cliente.tiene_tv ? '✓ Incluye TV' : '✗ Sin TV'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#111827] rounded-lg p-3 border border-[#374151]">
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Instalación</p>
                  {editing ? (
                    <input type="date" className={inp + ' text-xs py-1'} value={form.fecha_instalacion || ''} onChange={e => setForm(f => ({...f, fecha_instalacion: e.target.value}))}/>
                  ) : (
                    <p className="text-xs text-white font-medium">
                      {cliente.fecha_instalacion ? new Date(cliente.fecha_instalacion+'T12:00:00').toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'}) : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Últ. activación</p>
                  <p className="text-xs text-blue-400 font-medium">
                    {cliente.fecha_ultima_activacion ? new Date(cliente.fecha_ultima_activacion+'T12:00:00').toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'}) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Vencimiento</p>
                  {editing ? (
                    <input type="date" className={inp + ' text-xs py-1'} value={form.fecha_vencimiento || ''} onChange={e => setForm(f => ({...f, fecha_vencimiento: e.target.value}))}/>
                  ) : (
                    <p className={`text-xs font-medium ${cliente.fecha_vencimiento && new Date(cliente.fecha_vencimiento+'T12:00:00') < new Date() ? 'text-red-400' : 'text-green-400'}`}>
                      {cliente.fecha_vencimiento ? new Date(cliente.fecha_vencimiento+'T12:00:00').toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'}) : '—'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs text-[#9CA3AF] mb-1">Estado</p>
                  {editing ? (
                    <select className={inp} value={form.estado} onChange={e => setForm(f => ({...f, estado: e.target.value}))}>
                      <option value="activo">Activo</option>
                      <option value="suspendido">Suspendido</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ESTADO_STYLE[cliente.estado]}`}>{cliente.estado}</span>
                  )}
                </div>
              </div>

              {/* Notas */}
              <div>
                <p className="text-xs text-[#9CA3AF] mb-1">Notas</p>
                {editing ? (
                  <textarea className={inp+' resize-none'} rows={2} value={form.notas || ''} onChange={e => setForm(f => ({...f, notas: e.target.value}))} placeholder="Observaciones..."/>
                ) : (
                  <p className="text-sm text-[#9CA3AF]">{cliente.notas || <span className="text-[#4B5563]">Sin notas</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Equipo entregado */}
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#374151] flex items-center gap-2">
              <Package size={14} className="text-[#FFD700]"/>
              <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Equipo entregado</span>
              {!editing && cliente.estado_equipo && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  cliente.estado_equipo === 'prestado' ? 'bg-yellow-500/20 text-yellow-400'
                  : cliente.estado_equipo === 'comprado' ? 'bg-green-500/20 text-green-400'
                  : 'bg-[#374151] text-[#4B5563]'
                }`}>{cliente.estado_equipo === 'sin_equipo' ? 'Sin equipo' : cliente.estado_equipo}</span>
              )}
            </div>
            <div className="p-4 space-y-3">
              {editing ? (
                <>
                  <div>
                    <p className="text-xs text-[#9CA3AF] mb-1">Estado del equipo</p>
                    <select className={inp} value={form.estado_equipo || 'sin_equipo'} onChange={e => setForm(f => ({...f, estado_equipo: e.target.value}))}>
                      <option value="sin_equipo">Sin equipo</option>
                      <option value="prestado">Prestado</option>
                      <option value="comprado">Comprado</option>
                    </select>
                  </div>
                  {form.estado_equipo !== 'sin_equipo' && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Marca', key: 'equipo_marca', placeholder: 'Ubiquiti' },
                        { label: 'Modelo', key: 'equipo_modelo', placeholder: 'NanoStation M5' },
                        { label: 'Serial', key: 'equipo_serial', placeholder: 'SN-XXXXX', mono: true },
                        { label: 'Valor S/', key: 'equipo_valor', placeholder: '0.00', type: 'number' },
                      ].map(f => (
                        <div key={f.key}>
                          <p className="text-xs text-[#9CA3AF] mb-1">{f.label}</p>
                          <input type={f.type || 'text'} step="0.01"
                            className={inp + (f.mono ? ' font-mono text-xs' : '')}
                            value={form[f.key] || ''} onChange={e => setForm(fr => ({...fr, [f.key]: e.target.value}))}
                            placeholder={f.placeholder}/>
                        </div>
                      ))}
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Fecha entrega</p>
                        <input type="date" className={inp} value={form.equipo_fecha_entrega || ''} onChange={e => setForm(f => ({...f, equipo_fecha_entrega: e.target.value}))}/>
                      </div>
                      <div>
                        <p className="text-xs text-[#9CA3AF] mb-1">Descripción</p>
                        <input className={inp} value={form.equipo_descripcion || ''} onChange={e => setForm(f => ({...f, equipo_descripcion: e.target.value}))} placeholder="Antena + cable"/>
                      </div>
                    </div>
                  )}
                </>
              ) : cliente.estado_equipo && cliente.estado_equipo !== 'sin_equipo' ? (
                <div className="space-y-2">
                  {[
                    { label: 'Marca', val: cliente.equipo_marca },
                    { label: 'Modelo', val: cliente.equipo_modelo },
                    { label: 'Serial', val: cliente.equipo_serial, mono: true },
                    { label: 'Descripción', val: cliente.equipo_descripcion },
                    { label: 'Valor', val: cliente.equipo_valor ? `S/ ${cliente.equipo_valor.toFixed(2)}` : null },
                    { label: 'Entregado', val: cliente.equipo_fecha_entrega ? new Date(cliente.equipo_fecha_entrega+'T12:00:00').toLocaleDateString('es-PE') : null },
                  ].filter(r => r.val).map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs text-[#9CA3AF]">{r.label}</span>
                      <span className={`text-xs text-white ${r.mono ? 'font-mono' : ''}`}>{r.val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#4B5563] text-center py-2">Sin equipo registrado</p>
              )}
            </div>
          </div>
        </div>

        {/* Columna central: calendario de pagos — en mobile va PRIMERO */}
        <div className="order-1 lg:order-2">
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#374151] flex items-center gap-2">
              <Calendar size={14} className="text-[#FFD700]"/>
              <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Historial de Pagos</span>
            </div>
            <div className="p-4">
              <CalendarioPagos
                clienteId={+id}
                planPrecio={cliente.plan?.precio}
                modalMes={modalMes}
                setModalMes={setModalMes}
                onPaymentSaved={fetchCliente}
              />
            </div>
          </div>
        </div>

        {/* Columna derecha: historial de actividad */}
        <div className="order-3">
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#374151] flex items-center gap-2">
              <AlertCircle size={14} className="text-[#FFD700]"/>
              <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Actividad</span>
              <span className="ml-auto text-xs bg-[#374151] text-[#9CA3AF] px-2 py-0.5 rounded-full">{historial.length}</span>
            </div>
            <div className="overflow-y-auto max-h-96 lg:max-h-[600px]">
              {historial.length === 0 ? (
                <p className="text-[#9CA3AF] text-xs text-center py-8">Sin actividad registrada</p>
              ) : (
                <div className="p-4 space-y-3">
                  {historial.map(h => (
                    <div key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${HIST_COLOR[h.tipo] || 'bg-[#9CA3AF]'}`}/>
                        <div className="w-px flex-1 bg-[#374151] mt-1"/>
                      </div>
                      <div className="flex-1 pb-3">
                        <p className="text-xs text-[#4B5563]">
                          {new Date(h.creado_en).toLocaleString('es-PE', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-sm text-white mt-0.5 leading-snug">{h.descripcion}</p>
                        <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${
                          h.tipo === 'pago' ? 'bg-yellow-500/10 text-yellow-400'
                          : h.tipo === 'activacion' ? 'bg-green-500/10 text-green-400'
                          : h.tipo === 'corte' ? 'bg-red-500/10 text-red-400'
                          : 'bg-[#374151] text-[#9CA3AF]'
                        }`}>{h.tipo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Modal Prórroga */}
    {modalProroga && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] w-full max-w-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2"><Clock size={16} className="text-blue-400"/> Dar Prórroga</h3>
            <button onClick={() => setModalProroga(false)} className="text-[#9CA3AF] hover:text-white"><X size={16}/></button>
          </div>

          {cliente.fecha_vencimiento && (
            <div className="bg-[#111827] rounded-lg px-4 py-2 text-xs text-[#9CA3AF]">
              Vencimiento actual: <span className="text-white font-medium">{cliente.fecha_vencimiento}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Nueva fecha de vencimiento</label>
            <input
              type="date"
              className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
              value={fechaProroga}
              onChange={e => setFechaProroga(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {[7, 10, 15, 30].map(dias => (
              <button
                key={dias}
                type="button"
                onClick={() => {
                  const base = fechaProroga ? new Date(fechaProroga + 'T00:00:00') : new Date()
                  base.setDate(base.getDate() + dias)
                  setFechaProroga(base.toISOString().split('T')[0])
                }}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#374151] text-[#9CA3AF] hover:text-white hover:bg-[#4B5563] transition-colors"
              >
                +{dias} días
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setModalProroga(false)} className="flex-1 py-2 text-sm border border-[#374151] rounded-lg text-[#9CA3AF] hover:text-white">
              Cancelar
            </button>
            <button onClick={guardarProroga} disabled={savingProroga}
              className="flex-1 py-2 text-sm bg-[#FFD700] text-[#111827] font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-1">
              <Save size={14}/> {savingProroga ? 'Guardando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
