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
    const { transaction_id } = req.body;
    
    console.log('🔍 Verificando pagamento:', transaction_id);
    
    // 🔧 CONFIGURE SUA CHAVE ALLOWPAY AQUI
    const ALLOWPAY_CONFIG = {
      API_KEY: process.env.ALLOWPAY_API_KEY || 'sua-chave-aqui'
    };
    
    let status = 'pending';
    
    // Se tiver chave real, verifica no AllowPay
    if (ALLOWPAY_CONFIG.API_KEY && ALLOWPAY_CONFIG.API_KEY !== 'sua-chave-aqui') {
      // Chamada real para AllowPay
      const response = await fetch(`https://api.allowpay.com.br/v1/payments/${transaction_id}`, {
        headers: {
          'Authorization': `Bearer ${ALLOWPAY_CONFIG.API_KEY}`
        }
      });
      
      const allowpayData = await response.json();
      status = allowpayData.status || 'pending';
    } else {
      // Simulação para desenvolvimento (50% de chance de estar pago após 15 segundos)
      const isPaid = Math.random() > 0.5 && Date.now() % 2 === 0;
      status = isPaid ? 'paid' : 'pending';
    }
    
    const response = {
      success: true,
      transaction_id: transaction_id,
      status: status,
      amount: 5.94,
      verified_at: new Date().toISOString(),
      message: status === 'paid' ? 'Pagamento confirmado' : 'Aguardando pagamento'
    };
    
    console.log('📊 Status do pagamento:', response.status);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro na verificação',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}