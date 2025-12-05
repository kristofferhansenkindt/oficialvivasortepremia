<?php
// api/webhook.php - Atualizado para salvar confirmações no banco de dados simulado
header('Content-Type: application/json');

$ALLOWPAY_API_KEY = "sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ";
$CONFIRMED_PAYMENTS_FILE = "confirmed_payments.json";

// Verificar autenticação
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if ($authHeader !== 'Bearer ' . $ALLOWPAY_API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado']);
    exit;
}

// Receber dados
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['error' => 'Dados inválidos']);
    exit;
}

// Processar evento
$eventType = $data['type'] ?? $data['event'] ?? 'unknown';
$transactionId = $data['data']['id'] ?? $data['transaction_id'] ?? null;
$status = $data['data']['status'] ?? null;

// Se for pagamento confirmado
if (($eventType === 'transaction_status_changed' || $eventType === 'payment_received') && 
    ($status === 'paid' || $status === 'completed')) {
    
    $amount = $data['data']['amount'] ?? 0;
    $customer = $data['data']['customer'] ?? [];
    $cpf = $customer['document']['number'] ?? '';
    
    // Carregar pagamentos confirmados existentes
    $confirmedPayments = [];
    if (file_exists($CONFIRMED_PAYMENTS_FILE)) {
        $confirmedPayments = json_decode(file_get_contents($CONFIRMED_PAYMENTS_FILE), true) ?: [];
    }
    
    // Adicionar novo pagamento confirmado
    $confirmedPayments[$transactionId] = [
        'transaction_id' => $transactionId,
        'cpf' => $cpf,
        'amount' => $amount / 100,
        'status' => 'paid',
        'confirmed_at' => date('Y-m-d H:i:s'),
        'allowpay_data' => $data
    ];
    
    // Salvar no arquivo
    file_put_contents($CONFIRMED_PAYMENTS_FILE, json_encode($confirmedPayments, JSON_PRETTY_PRINT));
    
    // Log
    file_put_contents('webhook_success.log', 
        date('Y-m-d H:i:s') . " - Pagamento confirmado: $transactionId\n" .
        "CPF: $cpf\n" .
        "Valor: " . ($amount/100) . "\n\n", 
        FILE_APPEND
    );
    
    echo json_encode([
        'success' => true,
        'message' => 'Pagamento confirmado e salvo',
        'transaction_id' => $transactionId
    ]);
    
} else {
    echo json_encode([
        'success' => true,
        'message' => 'Webhook recebido',
        'event' => $eventType,
        'status' => $status
    ]);
}

exit;
?>