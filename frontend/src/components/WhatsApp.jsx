import { useEffect, useState } from 'react'
import { RefreshCw, Send, Wifi, WifiOff, QrCode, Bell, CheckCircle, XCircle } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const MOCK_HISTORIAL = [
  { id: 1, cliente: 'Carlos Mamani', tipo: 'recordatorio', fecha: '2025-05-26 09:15', estado: 'entregado' },
  { id: 2, cliente: 'Rosa Quispe', tipo: 'aviso_corte', fecha: '2025-05-26 08:30', estado: 'entregado' },
  { id: 3, cliente: 'Juan Flores', tipo: 'recordatorio', fecha: '2025-05-25 10:00', estado: 'fallido' },
  { id: 4, cliente: 'Maria Huanca', tipo: 'reactivacion', fecha: '2025-05-25 14:20', estado: 'entregado' },
  { id: 5, cliente: 'Pedro Condori', tipo: 'aviso_corte', fecha: '2025-05-24 09:00', estado: 'entregado' },
]

export default function WhatsApp() {
  const [status, setStatus] = useState(null)
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [toggles, setToggles] = useState({
    recordatorio: true,
    aviso_corte: true,
    reactivacion: false,
  })

  async function fetchStatus() {
    setLoading(true)
    try {
      const { data } = await api.get('/whatsapp/status')
      setStatus(data)
      if (!data.connected) {
        const qrRes = await api.get('/whatsapp/qr')
        setQr(qrRes.data.qr)
      } else {
        setQr(null)
      }
    } catch {
      setStatus({ connected: false, status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  async function sendMessage(e) {
    e.preventDefault()
    if (!phone || !message) return
    setSending(true)
    try {
      await api.post('/whatsapp/send', null, { params: { phone, message } })
      toast.success('Mensaje enviado')
      setMessage('')
    } catch {
      toast.error('Error al enviar mensaje')
    } finally {
      setSending(false)
    }
  }

  async function broadcastCobros() {
    if (!confirm('¿Enviar aviso de cobro a todos los clientes con pago pendiente?')) return
    try {
      const { data } = await api.post('/whatsapp/broadcast-cobros')
      toast.success(`Enviados: ${data.enviados} avisos`)
    } catch {
      toast.error('Error al enviar avisos masivos')
    }
  }

  const isConnected = status?.connected

  return (
    <div className="p-6 space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#4B5563] font-mono uppercase tracking-widest">
        <span>Network</span>
        <span className="text-[#1F2937]">›</span>
        <span className="text-[#FFD700]">WhatsApp_Automation</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">WhatsApp Automation</h1>
          <p className="text-[#6B7280] text-sm">Gestión centralizada de avisos y comunicación por red social.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#1F2937] transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {loading ? (
            <span className="text-xs text-[#4B5563] font-mono">Verificando...</span>
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25 px-3 py-1.5 rounded-full uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/> ONLINE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 px-3 py-1.5 rounded-full uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"/> OFFLINE
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column: connection + automation config */}
        <div className="lg:col-span-1 space-y-4">

          {/* Connection card */}
          <div className="bg-[#111827] rounded-xl border border-[#1F2937] p-4">
            <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold mb-3">Estado de Conexión</p>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-7 h-7 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <Wifi size={20} className="text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-400">Conectado</p>
                    <p className="text-xs text-[#9CA3AF]">{status.phone || 'Número activo'}</p>
                  </div>
                </div>
                <button
                  onClick={broadcastCobros}
                  className="w-full flex items-center justify-center gap-2 bg-[#FFD700] text-[#111827] font-bold py-2.5 rounded-lg hover:bg-yellow-400 transition-colors text-sm"
                >
                  <Bell size={15} />
                  Enviar Avisos Masivos
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <WifiOff size={20} className="text-red-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-400">Desconectado</p>
                    <p className="text-xs text-[#9CA3AF]">Escanee el QR para conectar</p>
                  </div>
                </div>
                {qr ? (
                  <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-xl">
                    <img src={qr} alt="QR WhatsApp" className="w-44 h-44" />
                    <p className="text-[#111827] text-xs font-medium">Escanear con WhatsApp</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 bg-[#0D1117] rounded-xl p-6 border border-dashed border-[#1F2937]">
                    <QrCode size={36} className="text-[#374151]" />
                    <p className="text-[#4B5563] text-xs text-center">Servicio no disponible.<br/>Verifique whatsapp-web.js.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Automation toggles */}
          <div className="bg-[#111827] rounded-xl border border-[#1F2937] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between">
              <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold">Avisos Automáticos</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { key: 'recordatorio', label: 'Recordatorio Preventivo', desc: '3 días antes del vencimiento' },
                { key: 'aviso_corte', label: 'Aviso de Corte', desc: 'Cuando se suspende el servicio' },
                { key: 'reactivacion', label: 'Reactivación', desc: 'Cuando el servicio es restaurado' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{label}</p>
                    <p className="text-[10px] text-[#4B5563]">{desc}</p>
                  </div>
                  <button
                    onClick={() => setToggles(t => ({ ...t, [key]: !t[key] }))}
                    className={`relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 ${toggles[key] ? 'bg-[#FFD700]' : 'bg-[#1F2937]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${toggles[key] ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                  </button>
                </div>
              ))}

              <button className="w-full mt-2 py-2 text-xs text-[#6B7280] hover:text-[#FFD700] border border-dashed border-[#1F2937] hover:border-[#FFD700]/30 rounded-lg transition-colors">
                + Crear Nueva Regla
              </button>
            </div>
          </div>
        </div>

        {/* Right column: historial + send manual */}
        <div className="lg:col-span-2 space-y-4">

          {/* Historial de envíos */}
          <div className="bg-[#111827] rounded-xl border border-[#1F2937] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between">
              <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold">Historial de Envíos</p>
              <span className="text-[10px] text-[#4B5563] bg-[#1F2937] px-2 py-0.5 rounded font-mono">{MOCK_HISTORIAL.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1F2937]">
                    {['Cliente', 'Tipo', 'Fecha / Hora', 'Estado', 'Acción'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4B5563] uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_HISTORIAL.map(row => (
                    <tr key={row.id} className="border-b border-[#1F2937]/60 hover:bg-[#1F2937]/40 transition-colors">
                      <td className="px-4 py-2.5 text-white text-xs font-medium">{row.cliente}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-bold ${
                          row.tipo === 'aviso_corte' ? 'bg-red-500/15 text-red-400'
                          : row.tipo === 'reactivacion' ? 'bg-green-500/15 text-green-400'
                          : 'bg-[#FFD700]/10 text-[#FFD700]'
                        }`}>
                          {row.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#6B7280] text-xs font-mono">{row.fecha}</td>
                      <td className="px-4 py-2.5">
                        {row.estado === 'entregado' ? (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle size={12}/> Entregado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <XCircle size={12}/> Fallido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <button className="text-xs text-[#4B5563] hover:text-[#FFD700] transition-colors">
                          Reenviar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enviar mensaje manual */}
          <div className="bg-[#111827] rounded-xl border border-[#1F2937] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1F2937]">
              <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-semibold">Enviar Mensaje Manual</p>
            </div>
            <form onSubmit={sendMessage} className="p-4 space-y-3">
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Número (con código país)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="51936511008"
                  className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFD700]/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Mensaje</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Escriba el mensaje aquí..."
                  className="w-full bg-[#0D1117] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#FFD700]/50 transition-colors resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={sending || !isConnected}
                  className="flex items-center justify-center gap-2 bg-[#FFD700] text-[#111827] font-bold px-5 py-2.5 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 text-sm"
                >
                  <Send size={14} />
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
                {!isConnected && (
                  <p className="text-xs text-red-400">WhatsApp no conectado</p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
