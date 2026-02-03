const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

let clientReady = false;
let qrCodeData = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('QR Code gerado!');
    try {
        qrCodeData = await qrcode.toDataURL(qr);
    } catch (err) {
        console.error('Erro ao gerar QR:', err);
    }
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto!');
    clientReady = true;
    qrCodeData = null;
});

client.on('authenticated', () => {
    console.log('✅ Autenticado!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp desconectado:', reason);
    clientReady = false;
});

console.log('Iniciando cliente WhatsApp...');
client.initialize();

app.get('/', (req, res) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WhatsApp API - Lembretes</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 20px;
                    text-align: center;
                    background: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                img {
                    max-width: 100%;
                    margin: 20px 0;
                }
                .status {
                    padding: 10px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .conectado { background: #d4edda; color: #155724; }
                .aguardando { background: #fff3cd; color: #856404; }
                button {
                    background: #25D366;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                button:hover { background: #128C7E; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📱 WhatsApp API - Lembretes</h1>
                ${clientReady ? `
                    <div class="status conectado">
                        <h2>✅ Conectado!</h2>
                        <p>O serviço está pronto para enviar lembretes.</p>
                    </div>
                ` : qrCodeData ? `
                    <div class="status aguardando">
                        <h2>📷 Escaneie o QR Code</h2>
                        <p>1. Abra o WhatsApp no celular</p>
                        <p>2. Toque em Menu (⋮) ou Configurações</p>
                        <p>3. Toque em "Aparelhos conectados"</p>
                        <p>4. Toque em "Conectar um aparelho"</p>
                        <p>5. Aponte a câmera para este QR Code:</p>
                        <img src="${qrCodeData}" alt="QR Code" />
                    </div>
                    <button onclick="location.reload()">🔄 Atualizar</button>
                ` : `
                    <div class="status aguardando">
                        <h2>⏳ Iniciando...</h2>
                        <p>Aguarde, gerando QR Code...</p>
                    </div>
                    <script>setTimeout(() => location.reload(), 3000);</script>
                `}
                <hr style="margin: 30px 0;">
                <p><small>Status: <a href="/status">Verificar API</a></small></p>
            </div>
        </body>
        </html>
    `;
    res.send(html);
});

app.get('/status', (req, res) => {
    res.json({ 
        conectado: clientReady,
        qrDisponivel: qrCodeData !== null,
        timestamp: new Date().toISOString()
    });
});

app.post('/enviar', async (req, res) => {
    const { numero, mensagem, chave } = req.body;
    
    const API_KEY = process.env.API_KEY || 'minha-chave-secreta-12345';
    if (chave !== API_KEY) {
        return res.status(401).json({ 
            sucesso: false,
            erro: 'Chave de API inválida' 
        });
    }
    
    if (!clientReady) {
        return res.status(503).json({ 
            sucesso: false,
            erro: 'WhatsApp não está conectado' 
        });
    }
    
    if (!numero || !mensagem) {
        return res.status(400).json({ 
            sucesso: false,
            erro: 'Número e mensagem são obrigatórios' 
        });
    }
    
    try {
        const numeroLimpo = numero.replace(/\D/g, '');
        
        if (numeroLimpo.length < 10 || numeroLimpo.length > 15) {
            return res.status(400).json({ 
                sucesso: false,
                erro: 'Número inválido. Use formato: 5567999999999' 
            });
        }
        
        const chatId = numeroLimpo + '@c.us';
        await client.sendMessage(chatId, mensagem);
        
        console.log(`✅ Mensagem enviada para ${numeroLimpo}`);
        
        res.json({ 
            sucesso: true,
            mensagem: 'Lembrete enviado com sucesso!',
            para: numeroLimpo,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao enviar:', error);
        res.status(500).json({ 
            sucesso: false,
            erro: 'Falha ao enviar mensagem',
            detalhes: error.message 
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});