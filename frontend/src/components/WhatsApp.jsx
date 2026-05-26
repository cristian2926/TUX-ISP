import { useEffect, useState } from 'react'
import { MessageCircle, RefreshCw, Send, Wifi, WifiOff, QrCode, Bell } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function WhatsApp() {
  const [status, setStatus] = useState(null)
  const [qr, setQr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

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

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">WhatsApp</h1>
        <p className="text-[#9CA3AF] text-sm">Yape: 936511008 — Avisos automáticos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Estado de conexión */}
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Estado de Conexión</h2>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1.5 rounded text-[#9CA3AF] hover:text-white hover:bg-[#374151] transition-colors"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <Wifi size={24} className="text-green-400" />
                <div>
                  <p className="font-semibold text-green-400">WhatsApp Conectado</p>
                  <p className="text-xs text-[#9CA3AF]">{status.phone || 'Número activo'}</p>
                </div>
                <span className="ml-auto w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              </div>

              <button
                onClick={broadcastCobros}
                className="w-full flex items-center justify-center gap-2 bg-[#FFD700] text-[#111827] font-bold py-3 rounded-lg hover:bg-yellow-400 transition-colors"
              >
                <Bell size={17} />
                Enviar Avisos de Cobro Masivos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                <WifiOff size={24} className="text-red-400" />
                <div>
                  <p className="font-semibold text-red-400">WhatsApp Desconectado</p>
                  <p className="text-xs text-[#9CA3AF]">Escanee el QR para conectar</p>
                </div>
              </div>

              {qr && (
                <div className="flex flex-col items-center gap-3 bg-white p-4 rounded-xl">
                  <img src={qr} alt="QR WhatsApp" className="w-48 h-48" />
                  <p className="text-[#111827] text-xs font-medium">Escanear con WhatsApp</p>
                </div>
              )}

              {!qr && (
                <div className="flex flex-col items-center gap-3 bg-[#111827] rounded-xl p-8 border border-dashed border-[#374151]">
                  <QrCode size={40} className="text-[#4B5563]" />
                  <p className="text-[#9CA3AF] text-sm text-center">
                    El servicio WhatsApp no está disponible.<br />
                    Verifique que whatsapp-web.js esté corriendo.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enviar mensaje manual */}
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Enviar Mensaje</h2>
          <form onSubmit={sendMessage} className="space-y-4">
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Número (con código país)</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="51936511008"
                className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700]"
              />
            </div>
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Mensaje</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder="Escriba el mensaje aquí..."
                className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FFD700] resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !status?.connected}
              className="w-full flex items-center justify-center gap-2 bg-[#FFD700] text-[#111827] font-bold py-2.5 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? 'Enviando...' : 'Enviar Mensaje'}
            </button>
            {!status?.connected && (
              <p className="text-xs text-red-400 text-center">WhatsApp no conectado</p>
            )}
          </form>
        </div>
      </div>

      {/* Plantillas de mensajes */}
      <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Plantillas de Mensajes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: 'Aviso de Cobro',
              preview: 'Hola [nombre], le recordamos que su servicio de internet Tuxtell tiene un costo mensual de S/[precio]. Para pagos comuníquese al 936511008 (Yape disponible).',
            },
            {
              title: 'Aviso de Corte',
              preview: 'Estimado [nombre], le informamos que su servicio de internet Tuxtell será suspendido por falta de pago. Para evitar el corte comuníquese al 936511008.',
            },
            {
              title: 'Bienvenida',
              preview: 'Bienvenido a Tuxtell, [nombre]. Su servicio de internet ha sido activado. Usuario: [pppoe]. Ante cualquier consulta llame al 936511008.',
            },
            {
              title: 'Reactivación',
              preview: 'Estimado [nombre], su servicio de internet Tuxtell ha sido reactivado. Gracias por su pago. Para consultas: 936511008.',
            },
          ].map(({ title, preview }) => (
            <div key={title} className="bg-[#111827] rounded-lg p-4 border border-[#374151]">
              <p className="text-xs font-semibold text-[#FFD700] mb-2">{title}</p>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">{preview}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
