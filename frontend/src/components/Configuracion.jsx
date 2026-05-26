import { useEffect, useState } from 'react'
import { Settings, Server, Shield, Database, Plus, Edit, Trash2, X, Save, Bell, Zap } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const inp = "w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"

const PLAN_EMPTY = { codigo: '', nombre: '', bajada_mbps: '', subida_mbps: '', precio: '' }

function PlanModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState(plan || PLAN_EMPTY)
  const [saving, setSaving] = useState(false)
  const editing = !!plan?.id

  async function guardar() {
    if (!form.codigo || !form.nombre || !form.bajada_mbps || !form.subida_mbps || !form.precio) {
      toast.error('Completa todos los campos')
      return
    }
    setSaving(true)
    try {
      const payload = {
        codigo: form.codigo.toUpperCase(),
        nombre: form.nombre,
        bajada_mbps: parseInt(form.bajada_mbps),
        subida_mbps: parseInt(form.subida_mbps),
        precio: parseFloat(form.precio),
      }
      if (editing) {
        await api.put(`/planes/${plan.id}`, payload)
        toast.success('Plan actualizado y sincronizado con MikroTik')
      } else {
        await api.post('/planes', payload)
        toast.success('Plan creado y sincronizado con MikroTik')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{editing ? 'Editar Plan' : 'Nuevo Plan'}</h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-white"><X size={16}/></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Código *</label>
            <input className={inp} placeholder="PLAN05" value={form.codigo}
              onChange={e => setForm(f => ({...f, codigo: e.target.value}))}
              disabled={editing}/>
            {editing && <p className="text-xs text-[#4B5563] mt-1">El código no se puede cambiar</p>}
          </div>
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Nombre *</label>
            <input className={inp} placeholder="Básico 15M" value={form.nombre}
              onChange={e => setForm(f => ({...f, nombre: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Bajada (Mbps) *</label>
            <input type="number" className={inp} placeholder="15" value={form.bajada_mbps}
              onChange={e => setForm(f => ({...f, bajada_mbps: e.target.value}))}/>
          </div>
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Subida (Mbps) *</label>
            <input type="number" className={inp} placeholder="6" value={form.subida_mbps}
              onChange={e => setForm(f => ({...f, subida_mbps: e.target.value}))}/>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-[#9CA3AF] mb-1 block">Precio S/ *</label>
            <input type="number" step="0.01" className={inp} placeholder="50.00" value={form.precio}
              onChange={e => setForm(f => ({...f, precio: e.target.value}))}/>
          </div>
        </div>

        <div className="bg-[#111827] rounded-lg p-3 border border-[#374151]">
          <p className="text-xs text-[#9CA3AF]">Rate-limit en MikroTik:</p>
          <p className="text-sm font-mono text-[#FFD700] mt-1">
            {form.bajada_mbps || '?'}M/{form.subida_mbps || '?'}M
          </p>
          <p className="text-xs text-[#4B5563] mt-1">Se aplicará en todos los MikroTiks activos</p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-[#374151] rounded-lg text-[#9CA3AF] hover:text-white">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving}
            className="flex-1 py-2 text-sm bg-[#FFD700] text-[#111827] font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={14}/>{saving ? 'Sincronizando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DIA_OPTIONS = [
  { value: '', label: 'Desactivado' },
  ...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Día ${i + 1}` })),
]

export default function Configuracion() {
  const [planes, setPlanes] = useState([])
  const [modal, setModal] = useState(null)
  const [pwd, setPwd] = useState({ actual: '', nueva: '', confirmar: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [auto, setAuto] = useState({
    automation_activa: false,
    dia_recordatorio_1: '',
    dia_recordatorio_2: '',
    dia_recordatorio_3: '',
    dia_corte_automatico: '',
  })
  const [savingAuto, setSavingAuto] = useState(false)

  function fetchPlanes() {
    api.get('/planes').then(r => setPlanes(r.data)).catch(() => {})
  }

  function fetchConfig() {
    api.get('/configuracion').then(r => {
      const d = r.data
      setAuto({
        automation_activa: d.automation_activa || false,
        dia_recordatorio_1: d.dia_recordatorio_1 != null ? String(d.dia_recordatorio_1) : '',
        dia_recordatorio_2: d.dia_recordatorio_2 != null ? String(d.dia_recordatorio_2) : '',
        dia_recordatorio_3: d.dia_recordatorio_3 != null ? String(d.dia_recordatorio_3) : '',
        dia_corte_automatico: d.dia_corte_automatico != null ? String(d.dia_corte_automatico) : '',
      })
    }).catch(() => {})
  }

  useEffect(() => { fetchPlanes(); fetchConfig() }, [])

  async function guardarAutomatizacion(e) {
    e.preventDefault()
    setSavingAuto(true)
    try {
      await api.put('/configuracion', {
        automation_activa: auto.automation_activa,
        dia_recordatorio_1: auto.dia_recordatorio_1 ? parseInt(auto.dia_recordatorio_1) : null,
        dia_recordatorio_2: auto.dia_recordatorio_2 ? parseInt(auto.dia_recordatorio_2) : null,
        dia_recordatorio_3: auto.dia_recordatorio_3 ? parseInt(auto.dia_recordatorio_3) : null,
        dia_corte_automatico: auto.dia_corte_automatico ? parseInt(auto.dia_corte_automatico) : null,
      })
      toast.success('Automatización guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingAuto(false)
    }
  }

  async function eliminarPlan(plan) {
    if (!confirm(`¿Eliminar ${plan.nombre}? Esto también lo eliminará de todos los MikroTiks.`)) return
    try {
      await api.delete(`/planes/${plan.id}`)
      toast.success('Plan eliminado')
      fetchPlanes()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar')
    }
  }

  async function cambiarPassword(e) {
    e.preventDefault()
    if (pwd.nueva !== pwd.confirmar) { toast.error('Las contraseñas no coinciden'); return }
    if (pwd.nueva.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setSavingPwd(true)
    try {
      await api.put('/auth/password', { password_actual: pwd.actual, password_nueva: pwd.nueva })
      toast.success('Contraseña actualizada')
      setPwd({ actual: '', nueva: '', confirmar: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar contraseña')
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configuración</h1>
        <p className="text-[#9CA3AF] text-sm">Ajustes del sistema TUX-ISP</p>
      </div>

      {/* Planes */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database size={15}/> Planes de Internet
          </h2>
          <button onClick={() => setModal('nuevo')}
            className="flex items-center gap-1.5 bg-[#FFD700] text-[#111827] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-400">
            <Plus size={13}/> Nuevo Plan
          </button>
        </div>

        <div className="space-y-2">
          {planes.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-[#111827] rounded-lg px-4 py-3 border border-[#374151]">
              <span className="text-[#FFD700] font-bold text-sm w-16">{p.codigo}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{p.nombre}</p>
                <p className="text-xs text-[#9CA3AF]">↓{p.bajada_mbps} Mbps / ↑{p.subida_mbps} Mbps</p>
              </div>
              <span className="text-[#FFD700] font-bold text-sm">S/ {p.precio}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setModal(p)}
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#374151] transition-colors">
                  <Edit size={13}/>
                </button>
                <button onClick={() => eliminarPlan(p)}
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-red-400 hover:bg-red-900/20 transition-colors">
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          ))}
          {planes.length === 0 && (
            <p className="text-[#4B5563] text-sm text-center py-4">Sin planes registrados</p>
          )}
        </div>
      </div>

      {/* Automatización */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Zap size={15}/> Automatización</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-[#9CA3AF]">{auto.automation_activa ? 'Activa' : 'Inactiva'}</span>
            <div
              onClick={() => setAuto(a => ({ ...a, automation_activa: !a.automation_activa }))}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${auto.automation_activa ? 'bg-[#FFD700]' : 'bg-[#374151]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${auto.automation_activa ? 'left-5' : 'left-0.5'}`} />
            </div>
          </label>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-xs text-blue-300 leading-relaxed">
          <Bell size={12} className="inline mr-1" />
          Cada día a las <strong>8:00 AM</strong> el sistema revisa si hoy coincide con algún día configurado.
          Si un cliente tiene <strong>fecha de vencimiento futura</strong>, el corte automático lo respeta.
        </div>

        <form onSubmit={guardarAutomatizacion} className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#FFD700] mb-2 uppercase tracking-wide">Recordatorios WhatsApp</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['dia_recordatorio_1', '1er aviso'],
                ['dia_recordatorio_2', '2do aviso'],
                ['dia_recordatorio_3', '3er aviso'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-[#9CA3AF] mb-1 block">{label}</label>
                  <select
                    className={inp}
                    value={auto[key]}
                    onChange={e => setAuto(a => ({ ...a, [key]: e.target.value }))}
                  >
                    {DIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">Corte Automático</p>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Día de corte</label>
                <select
                  className={inp}
                  value={auto.dia_corte_automatico}
                  onChange={e => setAuto(a => ({ ...a, dia_corte_automatico: e.target.value }))}
                >
                  {DIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <p className="text-xs text-[#4B5563] pb-2">Solo corta a clientes sin pago cuya fecha de vencimiento ya pasó o no tiene prórroga.</p>
            </div>
          </div>

          {auto.automation_activa && (auto.dia_recordatorio_1 || auto.dia_recordatorio_2 || auto.dia_recordatorio_3 || auto.dia_corte_automatico) && (
            <div className="bg-[#111827] rounded-lg px-4 py-3 text-xs text-[#9CA3AF] space-y-1">
              <p className="font-semibold text-white mb-1">Resumen del mes:</p>
              {auto.dia_recordatorio_1 && <p>📱 Día {auto.dia_recordatorio_1} — 1er recordatorio WhatsApp</p>}
              {auto.dia_recordatorio_2 && <p>📱 Día {auto.dia_recordatorio_2} — 2do recordatorio WhatsApp</p>}
              {auto.dia_recordatorio_3 && <p>📱 Día {auto.dia_recordatorio_3} — 3er recordatorio WhatsApp</p>}
              {auto.dia_corte_automatico && <p>🔴 Día {auto.dia_corte_automatico} — Corte automático de morosos</p>}
            </div>
          )}

          <button type="submit" disabled={savingAuto}
            className="bg-[#FFD700] text-[#111827] font-bold px-5 py-2 rounded-lg hover:bg-yellow-400 text-sm disabled:opacity-50 flex items-center gap-2">
            <Save size={14}/>{savingAuto ? 'Guardando...' : 'Guardar Automatización'}
          </button>
        </form>
      </div>

      {/* Info del sistema */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Server size={15}/> Sistema</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Dominio', 'tuxtell.duckdns.org'],
            ['Backend', 'FastAPI + PostgreSQL'],
            ['Frontend', 'React + Vite + Tailwind'],
            ['Versión', '1.0.0'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-[#9CA3AF]">{k}</p>
              <p className="text-white font-medium mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Shield size={15}/> Cambiar Contraseña</h2>
        <form onSubmit={cambiarPassword} className="space-y-3">
          {[
            ['actual', 'Contraseña actual'],
            ['nueva', 'Nueva contraseña'],
            ['confirmar', 'Confirmar nueva contraseña'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-[#9CA3AF] mb-1 block">{label}</label>
              <input type="password" className={inp} value={pwd[k]}
                onChange={e => setPwd(p => ({...p, [k]: e.target.value}))}/>
            </div>
          ))}
          <button type="submit" disabled={savingPwd}
            className="bg-[#FFD700] text-[#111827] font-bold px-5 py-2 rounded-lg hover:bg-yellow-400 text-sm disabled:opacity-50">
            {savingPwd ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>

      {modal && (
        <PlanModal
          plan={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchPlanes() }}
        />
      )}
    </div>
  )
}
