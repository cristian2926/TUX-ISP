import { useState } from 'react'
import { Settings, Server, Shield, Database, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

const inputCls = "w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"

export default function Configuracion() {
  const [pwd, setPwd] = useState({ actual: '', nueva: '', confirmar: '' })

  function cambiarPassword(e) {
    e.preventDefault()
    if (pwd.nueva !== pwd.confirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    toast.success('Contraseña actualizada (funcionalidad de demo)')
    setPwd({ actual: '', nueva: '', confirmar: '' })
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Configuración</h1>
        <p className="text-[#9CA3AF] text-sm">Ajustes del sistema TUX-ISP</p>
      </div>

      {/* Info del sistema */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Server size={15} /> Información del Sistema</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Dominio', 'tuxtell.net'],
            ['VPS', '161.132.48.127'],
            ['WhatsApp Yape', '936511008'],
            ['Versión', '1.0.0'],
            ['Backend', 'FastAPI + PostgreSQL'],
            ['Frontend', 'React + Vite + Tailwind'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-[#9CA3AF]">{k}</p>
              <p className="text-white font-medium mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Planes */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Database size={15} /> Planes de Internet</h2>
        <div className="space-y-2">
          {[
            { codigo: 'PLAN01', bajada: '15 Mbps', subida: '6 Mbps', precio: 'S/ 50/mes' },
            { codigo: 'PLAN02', bajada: '20 Mbps', subida: '8 Mbps', precio: 'S/ 60/mes' },
            { codigo: 'PLAN03', bajada: '30 Mbps', subida: '15 Mbps', precio: 'S/ 70/mes' },
            { codigo: 'PLAN04', bajada: '100 Mbps', subida: '10 Mbps', precio: 'S/ 100/mes' },
          ].map(p => (
            <div key={p.codigo} className="flex items-center gap-4 bg-[#111827] rounded-lg px-4 py-3 border border-[#374151]">
              <span className="text-[#FFD700] font-bold text-sm w-16">{p.codigo}</span>
              <span className="text-white text-sm flex-1">↓{p.bajada} / ↑{p.subida}</span>
              <span className="text-[#9CA3AF] text-sm">{p.precio}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zonas */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Shield size={15} /> Zonas WireGuard</h2>
        <div className="space-y-2">
          {[
            { nombre: 'Cabanillas', ip: '10.10.0.2' },
            { nombre: 'Palca', ip: '10.10.0.3' },
            { nombre: 'Paratia', ip: '10.10.0.4' },
          ].map(z => (
            <div key={z.nombre} className="flex items-center gap-4 bg-[#111827] rounded-lg px-4 py-3 border border-[#374151]">
              <span className="text-white font-medium text-sm w-24">{z.nombre}</span>
              <span className="text-[#9CA3AF] font-mono text-sm">{z.ip}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                WireGuard
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Shield size={15} /> Cambiar Contraseña</h2>
        <form onSubmit={cambiarPassword} className="space-y-3">
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Contraseña actual</label>
            <input type="password" className={inputCls} value={pwd.actual} onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Nueva contraseña</label>
            <input type="password" className={inputCls} value={pwd.nueva} onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Confirmar contraseña</label>
            <input type="password" className={inputCls} value={pwd.confirmar} onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} />
          </div>
          <button type="submit" className="bg-[#FFD700] text-[#111827] font-bold px-5 py-2 rounded-lg hover:bg-yellow-400 text-sm">
            Actualizar Contraseña
          </button>
        </form>
      </div>
    </div>
  )
}
