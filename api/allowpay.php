<?php
// api/allowpay.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Permitir requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configurações da Allow Pay
$ALLOWPAY_API_URL = "https://api.allowpay.online/functions/v1/transactions";
$ALLOWPAY_API_KEY = "sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ";

// Obter dados do POST
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode([
        'success' => false,
        'error' => 'Nenhum dado recebido'
    ]);
    exit;
}

// Validar dados obrigatórios
$amount = floatval($input['amount'] ?? 0);
$cpf = preg_replace('/[^0-9]/', '', $input['cpf'] ?? '');
$telefone = preg_replace('/[^0-9]/', '', $input['telefone'] ?? '');
$quantidade = intval($input['quantidade'] ?? 0);

if ($amount <= 0 || empty($cpf) || empty($telefone) || $quantidade <= 0) {
    echo json_encode([
        'success' => false,
        'error' => 'Dados inválidos ou incompletos'
    ]);
    exit;
}

// Converter valor para centavos
$valorCentavos = round($amount * 100);

// Gerar ID único para a transação
$transactionId = "VS-" . time() . "-" . substr(md5(uniqid()), 0, 8);

// Criar payload para Allow Pay
$payload = [
    'customer' => [
        'name' => $input['nome'] ?? "Cliente Viva Sorte",
        'email' => substr($cpf, 0, 8) . "@vivasorte.temp.com",
        'phone' => $telefone,
        'document' => [
            'type' => "CPF",
            'number' => $cpf
        ]
    ],
    'shipping' => [
        'address' => [
            'street' => "Não informado",
            'streetNumber' => "S/N",
            'complement' => "",
            'neighborhood' => "Centro",
            'city' => "São Paulo",
            'state' => "SP",
            'zipCode' => "01000000",
            'country' => "BR"
        ]
    ],
    'paymentMethod' => "PIX",
    'pix' => [
        'expiresInDays' => 1
    ],
    'items' => [
        [
            'title' => "Viva Sorte - " . $quantidade . " títulos de capitalização",
            'quantity' => 1,
            'unitPrice' => $valorCentavos,
            'externalRef' => "VS-" . substr($cpf, 0, 6)
        ]
    ],
    'amount' => $valorCentavos,
    'description' => "Viva Sorte - " . $quantidade . " títulos",
    'externalId' => $transactionId,
    'postbackUrl' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . 
                    "://$_SERVER[HTTP_HOST]/api/webhook.php"
];

// Log para debug
file_put_contents('allowpay_debug.log', 
    date('Y-m-d H:i:s') . " - Payload: " . json_encode($payload, JSON_PRETTY_PRINT) . "\n", 
    FILE_APPEND
);

// Preparar autenticação
$auth = base64_encode($ALLOWPAY_API_KEY . ":");

// Configurar cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $ALLOWPAY_API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json',
    'Authorization: Basic ' . $auth
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

// Executar requisição
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Log da resposta
file_put_contents('allowpay_debug.log', 
    date('Y-m-d H:i:s') . " - HTTP Code: $httpCode\n" . 
    "Response: " . $response . "\n" .
    "CURL Error: " . $curlError . "\n\n", 
    FILE_APPEND
);

// Verificar se houve erro
if ($httpCode !== 200 || $curlError) {
    echo json_encode([
        'success' => false,
        'error' => "Erro na comunicação com Allow Pay (HTTP $httpCode)",
        'details' => $curlError ?: substr($response, 0, 200)
    ]);
    exit;
}

// Processar resposta
$responseData = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        'success' => false,
        'error' => 'Resposta inválida da Allow Pay',
        'raw_response' => substr($response, 0, 200)
    ]);
    exit;
}

// Verificar se tem QR Code PIX
if (empty($responseData['pix']['qrcode']) && empty($responseData['qr_code'])) {
    echo json_encode([
        'success' => false,
        'error' => 'QR Code PIX não gerado pela Allow Pay',
        'response_data' => $responseData
    ]);
    exit;
}

// Sucesso!
$qrCode = $responseData['pix']['qrcode'] ?? $responseData['qr_code'] ?? '';

echo json_encode([
    'success' => true,
    'transaction_id' => $responseData['id'] ?? $transactionId,
    'qr_code' => $qrCode,
    'qr_code_image' => 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' . urlencode($qrCode),
    'codigo_pix' => $qrCode,
    'valor' => $amount,
    'quantidade' => $quantidade,
    'expira_em' => date('Y-m-d H:i:s', strtotime('+24 hours')),
    'raw_response' => $responseData // Para debug
]);

exit;
?>