export default async function handler(req, res) {
  console.log('🔄 Webhook AllowPay recebido');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const webhookData = req.body;
    const signature = req.headers['x-allowpay-signature'] || req.headers['signature'];
    
    console.log('📩 Dados do webhook:', webhookData);
    console.log('🔐 Assinatura:', signature);
    
    // 🔧 SEU SEGREDO DO WEBHOOK
    const WEBHOOK_SECRET = '18fc3dff-e99c-4232-a1ef-3ac787935cc1';
    
    // Aqui você pode validar a assinatura se necessário
    // ...
    
    const eventType = webhookData.event || webhookData.type;
    const paymentId = webhookData.data?.id || webhookData.payment_id;
    const status = webhookData.data?.status || webhookData.status;
    
    console.log(`📊 Evento: ${eventType}, ID: ${paymentId}, Status: ${status}`);
    
    // Processar diferentes tipos de eventos
    switch (eventType) {
      case 'payment.paid':
      case 'payment.completed':
        console.log(`✅ Pagamento ${paymentId} confirmado via webhook`);
        // Aqui você atualizaria seu banco de dados
        // await atualizarPagamentoNoBanco(paymentId, 'paid');
        break;
        
      case 'payment.expired':
        console.log(`⏰ Pagamento ${paymentId} expirado`);
        // await atualizarPagamentoNoBanco(paymentId, 'expired');
        break;
        
      case 'payment.failed':
        console.log(`❌ Pagamento ${paymentId} falhou`);
        // await atualizarPagamentoNoBanco(paymentId, 'failed');
        break;
    }
    
    // Registrar webhook para análise
    console.log('📝 Webhook registrado:', {
      timestamp: new Date().toISOString(),
      event: eventType,
      payment_id: paymentId,
      status: status
    });
    
    // Sempre retornar 200 para a AllowPay
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook recebido',
      received_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    // Mesmo com erro, retornar 200 para AllowPay não reenviar
    return res.status(200).json({ 
      success: false, 
      error: 'Erro interno',
      received_at: new Date().toISOString()
    });
  }
}