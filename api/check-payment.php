<?php
// api/check-payment.php - Verifica status do pagamento na Allow Pay
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configurações
$ALLOWPAY_API_URL = "https://api.allowpay.online/functions/v1/transactions";
$ALLOWPAY_API_KEY = "sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ";

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

// URL para consultar transação
$checkUrl = $ALLOWPAY_API_URL . "/" . $transactionId;

// Autenticação
$auth = base64_encode($ALLOWPAY_API_KEY . ":");

// Consultar Allow Pay
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $checkUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json',
    'Authorization: Basic ' . $auth
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Log para debug
file_put_contents('payment_check.log', 
    date('Y-m-d H:i:s') . " - Transaction: $transactionId\n" .
    "HTTP Code: $httpCode\n" .
    "Response: $response\n\n", 
    FILE_APPEND
);

if ($httpCode !== 200) {
    echo json_encode([
        'success' => false,
        'error' => "Erro ao consultar transação (HTTP $httpCode)",
        'status' => 'error'
    ]);
    exit;
}

$responseData = json_decode($response, true);

// Determinar status
$allowPayStatus = $responseData['status'] ?? 'unknown';
$amount = $responseData['amount'] ?? 0;

// Mapear status da Allow Pay para nosso sistema
$statusMap = [
    'paid' => 'paid',
    'completed' => 'paid',
    'pending' => 'pending',
    'waiting_payment' => 'pending',
    'expired' => 'expired',
    'failed' => 'failed',
    'canceled' => 'canceled'
];

$status = $statusMap[$allowPayStatus] ?? 'unknown';

echo json_encode([
    'success' => true,
    'transaction_id' => $transactionId,
    'status' => $status,
    'allowpay_status' => $allowPayStatus,
    'amount' => $amount / 100, // Converter de centavos para reais
    'last_check' => date('Y-m-d H:i:s'),
    'response_data' => $responseData
]);

exit;
?>