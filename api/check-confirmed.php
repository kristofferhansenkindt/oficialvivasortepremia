<?php
// api/check-confirmed.php - Verifica se pagamento está na lista de confirmados
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$CONFIRMED_PAYMENTS_FILE = "confirmed_payments.json";

// Obter transaction_id
$input = json_decode(file_get_contents('php://input'), true);
$transactionId = $input['transaction_id'] ?? $_GET['transaction_id'] ?? '';

if (empty($transactionId)) {
    echo json_encode([
        'success' => false,
        'error' => 'Transaction ID não fornecido'
    ]);
    exit;
}

// Verificar se existe arquivo de pagamentos confirmados
if (!file_exists($CONFIRMED_PAYMENTS_FILE)) {
    echo json_encode([
        'success' => false,
        'error' => 'Nenhum pagamento confirmado encontrado',
        'is_confirmed' => false
    ]);
    exit;
}

// Carregar pagamentos confirmados
$confirmedPayments = json_decode(file_get_contents($CONFIRMED_PAYMENTS_FILE), true);

// Verificar se a transação está confirmada
$isConfirmed = isset($confirmedPayments[$transactionId]) && 
               $confirmedPayments[$transactionId]['status'] === 'paid';

echo json_encode([
    'success' => true,
    'transaction_id' => $transactionId,
    'is_confirmed' => $isConfirmed,
    'payment_data' => $isConfirmed ? $confirmedPayments[$transactionId] : null,
    'checked_at' => date('Y-m-d H:i:s')
]);

exit;
?>