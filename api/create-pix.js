export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { amount, cpf, telefone, quantidade, nome } = req.body;
    
    console.log('📥 Dados recebidos para PIX:', { amount, cpf, telefone, quantidade, nome });
    
    // 🔧 SUAS CHAVES DA ALLOWPAY CONFIGURADAS AQUI
    const ALLOWPAY_CONFIG = {
      API_KEY: 'sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ',
      API_URL: 'https://api.allowpay.com.br/v1/payments/pix',
      WEBHOOK_SECRET: '18fc3dff-e99c-4232-a1ef-3ac787935cc1'
    };
    
    // Formatar dados para AllowPay
    const valorEmCentavos = Math.round(parseFloat(amount) * 100);
    
    const allowpayData = {
      amount: valorEmCentavos, // Em centavos
      currency: "BRL",
      description: `Viva Sorte - ${quantidade} títulos - CPF: ${cpf}`,
      payment_method: "pix",
      metadata: {
        cpf: cpf,
        telefone: telefone,
        quantidade_titulos: quantidade,
        produto: "Viva Sorte Prêmios"
      },
      payer: {
        document: cpf,
        name: nome || `Cliente ${cpf.substring(0, 3)}***`,
        phone: telefone,
        email: `${cpf}@vivasorte.com`
      },
      expires_in: 1800 // 30 minutos em segundos
    };
    
    console.log('📤 Enviando para AllowPay:', allowpayData);
    
    // Chamada REAL para AllowPay
    const response = await fetch(ALLOWPAY_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ALLOWPAY_CONFIG.API_KEY}`
      },
      body: JSON.stringify(allowpayData)
    });
    
    const allowpayResponse = await response.json();
    
    console.log('📥 Resposta AllowPay:', allowpayResponse);
    
    if (!allowpayResponse.id || !allowpayResponse.pix) {
      throw new Error('Resposta inválida da AllowPay: ' + JSON.stringify(allowpayResponse));
    }
    
    const transactionId = allowpayResponse.id;
    
    const responseData = {
      success: true,
      transaction_id: transactionId,
      allowpay_id: allowpayResponse.id,
      codigo_pix: allowpayResponse.pix.qr_code || allowpayResponse.pix.text,
      qr_code_image: allowpayResponse.pix.qr_code_image || 
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(allowpayResponse.pix.qr_code || allowpayResponse.pix.text)}`,
      amount: amount,
      expires_in: 1800,
      expires_at: allowpayResponse.expires_at,
      message: 'PIX gerado com sucesso',
      raw_response: allowpayResponse // Para debug
    };
    
    console.log('✅ PIX gerado com sucesso:', responseData.transaction_id);
    
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ Erro na API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar PIX: ' + error.message,
      debug_info: {
        timestamp: new Date().toISOString(),
        endpoint: '/api/create-pix'
      }
    });
  }
}