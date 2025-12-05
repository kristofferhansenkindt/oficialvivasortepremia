// api/allowpay.js - Backend para integrar com Allow Pay
// Coloque este arquivo em uma API (Node.js, PHP, etc.)

const ALLOWPAY_CONFIG = {
    API_URL: "https://api.allowpay.online/functions/v1/transactions",
    API_KEY: "sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ",
    WEBHOOK_URL: "https://seusite.com/api/webhook/allowpay"
};

function gerarAuthAllowPay() {
    const credentials = `${ALLOWPAY_CONFIG.API_KEY}:`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function criarPIXAllowPay(dados) {
    try {
        const { amount, cpf, telefone, quantidade, nome } = dados;
        
        // Converter para centavos
        const valorCentavos = Math.round(parseFloat(amount) * 100);
        
        // Gerar ID único
        const transactionId = `VS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Payload para Allow Pay
        const payload = {
            customer: {
                name: nome || "Cliente Viva Sorte",
                email: `${cpf}@vivasorte.com.br`,
                phone: telefone.replace(/\D/g, ''),
                document: {
                    type: "CPF",
                    number: cpf.replace(/\D/g, '')
                }
            },
            shipping: {
                address: {
                    street: "Não informado",
                    streetNumber: "S/N",
                    complement: "",
                    neighborhood: "Centro",
                    city: "São Paulo",
                    state: "SP",
                    zipCode: "01000000",
                    country: "BR"
                }
            },
            paymentMethod: "PIX",
            pix: {
                expiresInDays: 1
            },
            items: [
                {
                    title: `Viva Sorte - ${quantidade} títulos de capitalização`,
                    quantity: 1,
                    unitPrice: valorCentavos,
                    externalRef: `VS-${cpf.substring(0, 6)}`
                }
            ],
            amount: valorCentavos,
            description: `Viva Sorte - ${quantidade} títulos`,
            externalId: transactionId,
            postbackUrl: ALLOWPAY_CONFIG.WEBHOOK_URL
        };

        console.log('Enviando para Allow Pay:', payload);

        const response = await fetch(ALLOWPAY_CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': gerarAuthAllowPay()
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Erro Allow Pay: ${response.status}`);
        }

        const data = await response.json();
        
        return {
            success: true,
            transaction_id: data.id || transactionId,
            qr_code: data.pix?.qrcode || data.qr_code,
            qr_code_image: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data.pix?.qrcode || data.qr_code)}`,
            codigo_pix: data.pix?.qrcode || data.qr_code,
            valor: amount,
            expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        };

    } catch (error) {
        console.error('Erro ao criar PIX:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Para uso com Node.js/Express
if (typeof module !== 'undefined') {
    module.exports = { criarPIXAllowPay };
}