import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Wifi, Tv, Package } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

function Field({ label, children, required, span2 }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="block text-sm text-[#9CA3AF] mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFD700] transition-colors"

const FORM_INIT = {
  nombre: '',
  telefono: '',
  telefono_whatsapp: '',
  direccion: '',
  usuario_pppoe: '',
  password_pppoe: '',
  ip_estatica: '',
  zona_id: '',
  plan_id: '',
  fecha_instalacion: new Date().toISOString().split('T')[0],
  fecha_vencimiento: '',
  estado: 'activo',
  tipo_conexion: 'inalambrico',
  tiene_tv: false,
  estado_equipo: 'sin_equipo',
  equipo_marca: '',
  equipo_modelo: '',
  equipo_serial: '',
  equipo_descripcion: '',
  equipo_fecha_entrega: '',
  equipo_valor: '',
  notas: '',
}

export default function NuevoCliente() {
  const navigate = useNavigate()
  const [zonas, setZonas] = useState([])
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(FORM_INIT)

  useEffect(() => {
    api.get('/zonas').then(r => setZonas(r.data))
    api.get('/planes').then(r => setPlanes(r.data)).catch(() => {
      setPlanes([
        { id: 1, codigo: 'PLAN01', nombre: 'Básico 15M', precio: 50 },
        { id: 2, codigo: 'PLAN02', nombre: 'Estándar 20M', precio: 60 },
        { id: 3, codigo: 'PLAN03', nombre: 'Avanzado 30M', precio: 70 },
        { id: 4, codigo: 'PLAN04', nombre: 'Premium 100M', precio: 100 },
      ])
    })
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre || !form.usuario_pppoe || !form.password_pppoe || !form.zona_id || !form.plan_id) {
      toast.error('Complete los campos obligatorios')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        zona_id: +form.zona_id,
        plan_id: +form.plan_id,
        equipo_valor: form.equipo_valor ? parseFloat(form.equipo_valor) : null,
      }
      if (!payload.fecha_vencimiento) delete payload.fecha_vencimiento
      if (!payload.equipo_fecha_entrega) delete payload.equipo_fecha_entrega
      if (payload.estado_equipo === 'sin_equipo') {
        delete payload.equipo_marca
        delete payload.equipo_modelo
        delete payload.equipo_serial
        delete payload.equipo_descripcion
        delete payload.equipo_fecha_entrega
        delete payload.equipo_valor
      }
      await api.post('/clientes', payload)
      toast.success('Cliente registrado exitosamente')
      navigate('/clientes')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar cliente')
    } finally {
      setLoading(false)
    }
  }

  const tieneEquipo = form.estado_equipo !== 'sin_equipo'

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/clientes" className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#374151] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Nuevo Cliente</h1>
          <p className="text-[#9CA3AF] text-sm">Registrar nuevo abonado</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Datos personales */}
        <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151] space-y-4">
          <h2 className="text-sm font-semibold text-[#FFD700] uppercase tracking-wide">Datos Personales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre completo" required>
              <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Quispe Mamani" />
            </Field>
            <Field label="Teléfono">
              <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
            </Field>
            <Field label="WhatsApp">
              <input className={inputCls} value={form.telefono_whatsapp} onChange={e => set('telefono_whatsapp', e.target.value)} placeholder="9XXXXXXXX" />
            </Field>
            <Field label="Dirección">
              <input className={inputCls} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Jr. Lima 123" />
            </Field>
          </div>
        </div>

        {/* Tipo de servicio */}
        <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151] space-y-4">
          <h2 className="text-sm font-semibold text-[#FFD700] uppercase tracking-wide flex items-center gap-2">
            <Wifi size={14} /> Tipo de Servicio
          </h2>

          {/* Tipo conexión */}
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Tipo de conexión</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'inalambrico', label: 'Inalámbrico', desc: 'Antena / Access Point' },
                { val: 'fibra_optica', label: 'Fibra Óptica', desc: 'ONT / Splitter' },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set('tipo_conexion', opt.val)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    form.tipo_conexion === opt.val
                      ? 'border-[#FFD700] bg-yellow-500/10 text-white'
                      : 'border-[#374151] text-[#9CA3AF] hover:border-[#4B5563]'
                  }`}
                >
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* TV */}
          <div className="flex items-center gap-3 bg-[#111827] rounded-lg px-4 py-3">
            <Tv size={16} className="text-[#9CA3AF]" />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Servicio de TV</p>
              <p className="text-xs text-[#4B5563]">El cliente incluye servicio de televisión</p>
            </div>
            <button
              type="button"
              onClick={() => set('tiene_tv', !form.tiene_tv)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.tiene_tv ? 'bg-[#FFD700]' : 'bg-[#374151]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.tiene_tv ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Conexión PPPoE */}
        <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151] space-y-4">
          <h2 className="text-sm font-semibold text-[#FFD700] uppercase tracking-wide">Configuración PPPoE</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Usuario PPPoE" required>
              <input className={inputCls} value={form.usuario_pppoe} onChange={e => set('usuario_pppoe', e.target.value)} placeholder="jquispe" />
            </Field>
            <Field label="Contraseña PPPoE" required>
              <input className={inputCls} value={form.password_pppoe} onChange={e => set('password_pppoe', e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="IP Estática">
              <input className={inputCls} value={form.ip_estatica} onChange={e => set('ip_estatica', e.target.value)} placeholder="192.168.1.100" />
            </Field>
            <Field label="Zona" required>
              <select className={inputCls} value={form.zona_id} onChange={e => set('zona_id', e.target.value)}>
                <option value="">Seleccionar zona</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre} ({z.ip_wireguard})</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Plan y fechas */}
        <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151] space-y-4">
          <h2 className="text-sm font-semibold text-[#FFD700] uppercase tracking-wide">Plan y Fechas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Plan" required>
              <select className={inputCls} value={form.plan_id} onChange={e => set('plan_id', e.target.value)}>
                <option value="">Seleccionar plan</option>
                {planes.map(p => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.nombre} — S/{p.precio}/mes</option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select className={inputCls} value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
                <option value="anulado">Anulado</option>
              </select>
            </Field>
            <Field label="Fecha de instalación" required>
              <input type="date" className={inputCls} value={form.fecha_instalacion} onChange={e => set('fecha_instalacion', e.target.value)} />
            </Field>
            <Field label="Fecha de vencimiento">
              <input type="date" className={inputCls} value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Equipo entregado */}
        <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151] space-y-4">
          <h2 className="text-sm font-semibold text-[#FFD700] uppercase tracking-wide flex items-center gap-2">
            <Package size={14} /> Equipo Entregado
          </h2>

          {/* Estado equipo */}
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">Estado del equipo</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'sin_equipo', label: 'Sin equipo', color: 'text-[#9CA3AF]' },
                { val: 'prestado',   label: 'Prestado',   color: 'text-yellow-400' },
                { val: 'comprado',   label: 'Comprado',   color: 'text-green-400'  },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => set('estado_equipo', opt.val)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    form.estado_equipo === opt.val
                      ? 'border-[#FFD700] bg-yellow-500/10 text-white'
                      : `border-[#374151] ${opt.color} hover:border-[#4B5563]`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detalles del equipo (solo si tiene) */}
          {tieneEquipo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <Field label="Marca">
                <input className={inputCls} value={form.equipo_marca} onChange={e => set('equipo_marca', e.target.value)} placeholder="Ubiquiti, TP-Link..." />
              </Field>
              <Field label="Modelo">
                <input className={inputCls} value={form.equipo_modelo} onChange={e => set('equipo_modelo', e.target.value)} placeholder="NanoStation M5" />
              </Field>
              <Field label="N° Serial">
                <input className={inputCls + ' font-mono'} value={form.equipo_serial} onChange={e => set('equipo_serial', e.target.value)} placeholder="SN-XXXXXXX" />
              </Field>
              <Field label={`Valor (S/)${form.estado_equipo === 'comprado' ? '' : ' — referencial'}`}>
                <input type="number" step="0.01" className={inputCls} value={form.equipo_valor} onChange={e => set('equipo_valor', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Fecha de entrega">
                <input type="date" className={inputCls} value={form.equipo_fecha_entrega} onChange={e => set('equipo_fecha_entrega', e.target.value)} />
              </Field>
              <Field label="Descripción" span2>
                <input className={inputCls} value={form.equipo_descripcion} onChange={e => set('equipo_descripcion', e.target.value)} placeholder="Antena sector + cable 15m" />
              </Field>
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="bg-[#1F2937] rounded-xl p-5 border border-[#374151]">
          <h2 className="text-sm font-semibold text-[#FFD700] uppercase tracking-wide mb-3">Notas</h2>
          <textarea
            className={inputCls + ' resize-none'}
            rows={3}
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones, referencias de ubicación, contacto adicional..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            to="/clientes"
            className="px-5 py-2.5 rounded-lg border border-[#374151] text-[#9CA3AF] hover:text-white hover:border-[#9CA3AF] transition-colors text-sm"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#FFD700] text-[#111827] font-bold px-6 py-2.5 rounded-lg hover:bg-yellow-400 transition-colors text-sm disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
