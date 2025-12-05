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
    
    console.log('🔍 Verificando pagamento AllowPay:', transaction_id);
    
    // 🔧 SUA CHAVE DA ALLOWPAY
    const ALLOWPAY_API_KEY = 'sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ';
    
    if (!transaction_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction ID é obrigatório' 
      });
    }
    
    // Chamada REAL para AllowPay
    const response = await fetch(`https://api.allowpay.com.br/v1/payments/${transaction_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ALLOWPAY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`AllowPay API error: ${response.status}`);
    }
    
    const allowpayData = await response.json();
    
    console.log('📊 Status do pagamento AllowPay:', allowpayData.status);
    
    // Mapear status da AllowPay para nosso sistema
    let status = 'pending';
    let allowpay_status = allowpayData.status || 'pending';
    
    const statusMap = {
      'pending': 'pending',
      'waiting_payment': 'pending',
      'paid': 'paid',
      'completed': 'paid',
      'approved': 'paid',
      'expired': 'expired',
      'canceled': 'canceled',
      'failed': 'failed'
    };
    
    status = statusMap[allowpay_status] || 'pending';
    
    const responseData = {
      success: true,
      transaction_id: transaction_id,
      status: status,
      allowpay_status: allowpay_status,
      amount: allowpayData.amount ? (allowpayData.amount / 100) : 0, // Converter de centavos
      paid_at: allowpayData.paid_at,
      verified_at: new Date().toISOString(),
      message: status === 'paid' ? 'Pagamento confirmado' : 'Aguardando pagamento',
      raw_data: allowpayData // Para debug
    };
    
    return res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    
    // Em caso de erro, verificar se é ID inválido ou outro problema
    return res.status(200).json({ 
      success: true,
      transaction_id: req.body.transaction_id || 'unknown',
      status: 'pending',
      allowpay_status: 'api_error',
      amount: 0,
      verified_at: new Date().toISOString(),
      message: 'Erro na verificação, tentando novamente...',
      error: error.message
    });
  }
}