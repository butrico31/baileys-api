import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import express from 'express'

const app = express()

app.use(express.json())

let sock;

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
  })

  
  sock.ev.on('creds.update', saveCreds)

  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const shouldReconnect = 
        (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut)

      console.log('⚠️ Connection closed. Reconnecting:', shouldReconnect)

      if (shouldReconnect) {
        startSock()
      } else {
        console.log('❌ You have been logged out. Please delete the ./auth folder and restart.')
      }
    } else if (connection === 'open') {
      console.log('✅ Connected successfully!')
    }
  })
}

startSock()

app.post('/send-file', async (req, res) => {
  const { to, message, buffer, empresa } = req.body

  const buff = Buffer.from(buffer, 'base64');

  await sock.sendMessage(to, {document: buff, mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName: 'contrato ' + empresa});

  res.status(200).json({
    status: 'success',
  })
})

app.listen(3000, '0.0.0.0', ()=> console.log('Server is running on port 3000'))


