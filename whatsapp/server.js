const express = require('express')
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode')

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3001
const CHROMIUM = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'

let qrDataUrl = null
let isConnected = false
let connectedPhone = null
let client = null

function initClient() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/app/.wwebjs_auth' }),
    puppeteer: {
      executablePath: CHROMIUM,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    },
  })

  client.on('qr', async (qr) => {
    console.log('QR generado — escanear en /whatsapp del panel')
    try {
      qrDataUrl = await qrcode.toDataURL(qr)
    } catch (e) {
      console.error('Error generando QR:', e)
    }
    isConnected = false
  })

  client.on('ready', () => {
    console.log('WhatsApp conectado ✓')
    isConnected = true
    qrDataUrl = null
    connectedPhone = client.info?.wid?.user || 'activo'
  })

  client.on('auth_failure', (msg) => {
    console.error('Fallo de autenticación:', msg)
    isConnected = false
  })

  client.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason)
    isConnected = false
    connectedPhone = null
    qrDataUrl = null
    setTimeout(initClient, 8000)
  })

  client.initialize().catch(err => {
    console.error('Error al inicializar:', err.message)
    setTimeout(initClient, 15000)
  })
}

/* ── Endpoints ────────────────────────────────────────────────────── */

app.get('/status', (req, res) => {
  res.json({
    connected: isConnected,
    status: isConnected ? 'conectado' : 'desconectado',
    phone: connectedPhone,
    has_qr: !!qrDataUrl,
  })
})

app.get('/qr', (req, res) => {
  res.json({ qr: qrDataUrl })
})

app.post('/send', async (req, res) => {
  const { phone, message } = req.body
  if (!isConnected) return res.status(503).json({ error: 'WhatsApp no conectado' })
  if (!phone || !message) return res.status(400).json({ error: 'Faltan: phone y message' })

  try {
    const number = phone.replace(/[^0-9]/g, '')
    const fullNumber = number.startsWith('51') ? number : `51${number}`

    // Verificar que el número existe en WhatsApp y obtener el chatId real (maneja LIDs)
    const numberId = await client.getNumberId(fullNumber)
    if (!numberId) {
      return res.status(404).json({ error: `El número ${fullNumber} no tiene WhatsApp` })
    }

    await client.sendMessage(numberId._serialized, message)
    res.json({ ok: true, to: numberId._serialized })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WhatsApp API en puerto ${PORT}`)
  initClient()
})
