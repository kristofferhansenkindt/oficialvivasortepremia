// CONFIGURAÇÕES DA API ALLOWPAY
const ALLOWPAY_CONFIG = {
    apiUrl: "https://api.allowpay.online/functions/v1/transactions",
    apiKey: "sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ",
    companyId: "18fc3dff-e99c-4232-a1ef-3ac787935cc1",
    webhookUrl: window.location.origin + "/api/webhook.php"
};

// GERAR PIX VIA ALLOWPAY
async function gerarPIXAllowPay(dados) {
    try {
        const valorEmCentavos = Math.round(dados.amount * 100);
        
        const payload = {
            companyId: ALLOWPAY_CONFIG.companyId,
            customer: {
                name: dados.customerData.nome || "Cliente Viva Sorte",
                email: dados.customerData.email,
                phone: dados.customerData.telefone,
                document: {
                    type: "CPF",
                    number: dados.customerData.cpf
                }
            },
            shipping: {
                address: {
                    street: "Venda de Títulos",
                    streetNumber: "0",
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
            items: [{
                title: `${dados.quantidade} Títulos - Viva Sorte`,
                quantity: 1,
                unitPrice: valorEmCentavos,
                externalRef: `VS-${Date.now()}`
            }],
            amount: valorEmCentavos,
            description: `Pagamento de ${dados.quantidade} títulos - Viva Sorte`,
            ip: await getClientIP(),
            postbackUrl: ALLOWPAY_CONFIG.webhookUrl
        };
        
        console.log("Enviando para AllowPay:", payload);
        
        const response = await fetch(ALLOWPAY_CONFIG.apiUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Basic ${btoa(ALLOWPAY_CONFIG.apiKey + ":")}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AllowPay error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        return {
            success: true,
            transaction: {
                transaction_id: data.id || data.transactionId,
                qr_code: data.pix?.qrcode || "",
                qr_code_image: data.pix?.qrcode ? 
                    `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data.pix.qrcode)}` : 
                    "",
                amount: dados.amount,
                status: "pending",
                created_at: data.createdAt || new Date().toISOString()
            }
        };
        
    } catch (error) {
        console.error("Erro ao gerar PIX:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// OBTER IP DO CLIENTE
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return "127.0.0.1";
    }
}

// VERIFICAR STATUS DO PAGAMENTO
async function verificarStatusPIX(transactionId) {
    try {
        const response = await fetch(`${ALLOWPAY_CONFIG.apiUrl}/${transactionId}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Authorization": `Basic ${btoa(ALLOWPAY_CONFIG.apiKey + ":")}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro ao verificar status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.status; // "paid", "pending", "failed", etc.
        
    } catch (error) {
        console.error("Erro ao verificar status:", error);
        return "unknown";
    }
}

// MONITORAR PAGAMENTO AUTOMATICAMENTE
function monitorarPagamento(transactionId, callback) {
    let tentativas = 0;
    const maxTentativas = 30; // 5 minutos (10s * 30)
    
    const intervalo = setInterval(async () => {
        tentativas++;
        
        if (tentativas > maxTentativas) {
            clearInterval(intervalo);
            callback("timeout");
            return;
        }
        
        const status = await verificarStatusPIX(transactionId);
        
        if (status === "paid" || status === "approved") {
            clearInterval(intervalo);
            callback("paid");
        } else if (status === "failed" || status === "cancelled") {
            clearInterval(intervalo);
            callback("failed");
        }
        // Se ainda estiver pending, continua verificando
    }, 10000); // Verificar a cada 10 segundos
}