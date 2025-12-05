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
    const { amount, cpf, telefone, quantidade } = req.body;
    
    console.log('📥 Dados recebidos para PIX:', { amount, cpf, telefone, quantidade });
    
    // 🔧 CONFIGURE SUA CHAVE ALLOWPAY AQUI
    const ALLOWPAY_CONFIG = {
      API_KEY: process.env.ALLOWPAY_API_KEY || 'sua-chave-aqui',
      API_URL: 'https://api.allowpay.com.br/v1/payments/pix'
    };
    
    // Dados para enviar ao AllowPay
    const allowpayData = {
      amount: parseFloat(amount),
      currency: "BRL",
      description: `Viva Sorte - ${quantidade} títulos`,
      payer: {
        document: cpf,
        name: `Cliente ${cpf.substring(0, 3)}***`,
        phone: telefone
      },
      expires_in: 1800 // 30 minutos
    };
    
    console.log('📤 Enviando para AllowPay:', allowpayData);
    
    // Chamada para AllowPay (simulação se não tiver a chave)
    let allowpayResponse;
    
    if (ALLOWPAY_CONFIG.API_KEY && ALLOWPAY_CONFIG.API_KEY !== 'sua-chave-aqui') {
      // Se tiver chave real, faz a chamada
      const response = await fetch(ALLOWPAY_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ALLOWPAY_CONFIG.API_KEY}`
        },
        body: JSON.stringify(allowpayData)
      });
      
      allowpayResponse = await response.json();
    } else {
      // Simulação para desenvolvimento
      allowpayResponse = {
        id: `AP${Date.now()}${Math.floor(Math.random() * 1000)}`,
        status: "pending",
        qr_code: `00020126370014BR.GOV.BCB.PIX0114+55219999999995204000053039865802BR5925VIVA SORTE PREMIOS6009SAO PAULO61080540900062250521${Date.now()}6304E2CA`,
        qr_code_image: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020126370014BR.GOV.BCB.PIX0114+5521999999999`,
        expires_at: new Date(Date.now() + 1800000).toISOString()
      };
    }
    
    const transactionId = `VS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    const response = {
      success: true,
      transaction_id: transactionId,
      allowpay_id: allowpayResponse.id,
      codigo_pix: allowpayResponse.qr_code || allowpayResponse.text,
      qr_code_image: allowpayResponse.qr_code_image || 
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(allowpayResponse.qr_code || allowpayResponse.text)}`,
      amount: amount,
      expires_in: 1800,
      message: 'PIX gerado com sucesso via AllowPay'
    };
    
    console.log('✅ PIX gerado:', response.transaction_id);
    
    // Aqui você salvaria no banco de dados
    // await salvarTransacaoNoBanco(response);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Erro na API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar PIX',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}