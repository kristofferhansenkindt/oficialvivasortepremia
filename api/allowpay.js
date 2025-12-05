export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const allowpayData = req.body;
    
    console.log('📤 Proxy AllowPay - Dados recebidos:', allowpayData);
    
    // 🔧 SUA CHAVE DA ALLOWPAY
    const ALLOWPAY_API_KEY = 'sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ';
    
    // Converter valor para centavos se necessário
    if (allowpayData.amount && typeof allowpayData.amount === 'number' && allowpayData.amount < 1000) {
      allowpayData.amount = Math.round(allowpayData.amount * 100);
    }
    
    // Garantir que está no formato correto
    const requestData = {
      amount: allowpayData.amount,
      currency: allowpayData.currency || "BRL",
      description: allowpayData.description || "Pagamento Viva Sorte",
      payment_method: "pix",
      metadata: allowpayData.metadata || {},
      payer: allowpayData.payer || {},
      expires_in: allowpayData.expires_in || 1800
    };
    
    console.log('📤 Enviando para AllowPay:', requestData);
    
    // Chamada REAL para AllowPay
    const response = await fetch('https://api.allowpay.com.br/v1/payments/pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ALLOWPAY_API_KEY}`
      },
      body: JSON.stringify(requestData)
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Erro ao parsear resposta:', responseText);
      throw new Error('Resposta inválida da AllowPay');
    }
    
    console.log('📥 Resposta AllowPay:', data);
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.error || 'Erro na AllowPay',
        details: data
      });
    }
    
    return res.status(response.status).json({
      success: true,
      ...data
    });
    
  } catch (error) {
    console.error('❌ Erro no proxy AllowPay:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro no proxy AllowPay: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
}