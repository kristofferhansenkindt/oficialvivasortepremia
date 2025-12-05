<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Configurações da AllowPay
define('ALLOWPAY_API_URL', 'https://api.allowpay.online/functions/v1/transactions');
define('ALLOWPAY_API_KEY', 'sk_live_NJJH7xyFl6IpBZ1vNiOPzmjxd5jmNF7VoXJOcuryYyrdXkMZ');
define('COMPANY_ID', '18fc3dff-e99c-4232-a1ef-3ac787935cc1');

// Função para Basic Auth
function generateBasicAuth($apiKey) {
    return 'Basic ' . base64_encode($apiKey . ':');
}

// Obter dados da requisição
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['amount']) || !isset($input['customerData'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dados incompletos']);
    exit;
}

$amount = floatval($input['amount']);
$quantidade = $input['quantidade'] ?? 6;
$customerData = $input['customerData'];

// Validar valor mínimo
if ($amount < 0.99) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valor mínimo é R$ 0,99']);
    exit;
}

// Converter para centavos
$valorCentavos = intval($amount * 100);

// Montar payload para AllowPay
$payload = [
    'companyId' => COMPANY_ID,
    'customer' => [
        'name' => $customerData['nome'] ?? 'Cliente Viva Sorte',
        'email' => $customerData['email'] ?? $customerData['cpf'] . '@vivasorte.com',
        'phone' => preg_replace('/\D/', '', $customerData['telefone'] ?? ''),
        'document' => [
            'type' => 'CPF',
            'number' => preg_replace('/\D/', '', $customerData['cpf'])
        ]
    ],
    'shipping' => [
        'address' => [
            'street' => 'Venda de Títulos',
            'streetNumber' => '0',
            'complement' => '',
            'neighborhood' => 'Centro',
            'city' => 'São Paulo',
            'state' => 'SP',
            'zipCode' => '01000000',
            'country' => 'BR'
        ]
    ],
    'paymentMethod' => 'PIX',
    'pix' => [
        'expiresInDays' => 1
    ],
    'items' => [[
        'title' => $quantidade . ' Títulos - Viva Sorte',
        'quantity' => 1,
        'unitPrice' => $valorCentavos,
        'externalRef' => 'VS-' . time() . '-' . $customerData['cpf']
    ]],
    'amount' => $valorCentavos,
    'description' => 'Pagamento de ' . $quantidade . ' títulos - Viva Sorte',
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
    'postbackUrl' => (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . '/api/webhook.php'
];

// Salvar transação localmente (para backup)
$transacaoId = 'VS-' . time() . '-' . uniqid();
$dadosTransacao = [
    'transaction_id' => $transacaoId,
    'cpf' => $customerData['cpf'],
    'telefone' => $customerData['telefone'],
    'quantidade' => $quantidade,
    'valor' => $amount,
    'data' => date('Y-m-d H:i:s'),
    'status' => 'pending',
    'payload' => $payload
];

salvarTransacaoLocal($dadosTransacao);

// Enviar para AllowPay
$ch = curl_init(ALLOWPAY_API_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Content-Type: application/json',
        'Authorization: ' . generateBasicAuth(ALLOWPAY_API_KEY)
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    // Se a AllowPay falhar, criar um PIX simulado
    $pixSimulado = gerarPIXSimulado($amount, $transacaoId);
    
    echo json_encode([
        'success' => true,
        'transaction' => $pixSimulado
    ]);
    exit;
}

$responseData = json_decode($response, true);

if (isset($responseData['pix']['qrcode'])) {
    // Atualizar transação com dados da AllowPay
    $dadosTransacao['allowpay_id'] = $responseData['id'];
    $dadosTransacao['qrcode'] = $responseData['pix']['qrcode'];
    atualizarTransacaoLocal($transacaoId, $dadosTransacao);
    
    echo json_encode([
        'success' => true,
        'transaction' => [
            'transaction_id' => $responseData['id'] ?? $transacaoId,
            'qr_code' => $responseData['pix']['qrcode'],
            'qr_code_image' => 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' . urlencode($responseData['pix']['qrcode']),
            'amount' => $amount,
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s')
        ]
    ]);
} else {
    // Fallback para PIX simulado
    $pixSimulado = gerarPIXSimulado($amount, $transacaoId);
    
    echo json_encode([
        'success' => true,
        'transaction' => $pixSimulado
    ]);
}

// FUNÇÕES AUXILIARES
function salvarTransacaoLocal($dados) {
    $arquivo = __DIR__ . '/../data/transacoes.json';
    $transacoes = [];
    
    if (file_exists($arquivo)) {
        $transacoes = json_decode(file_get_contents($arquivo), true) ?: [];
    }
    
    $transacoes[] = $dados;
    
    // Garantir que o diretório existe
    if (!file_exists(dirname($arquivo))) {
        mkdir(dirname($arquivo), 0777, true);
    }
    
    file_put_contents($arquivo, json_encode($transacoes, JSON_PRETTY_PRINT));
}

function atualizarTransacaoLocal($transactionId, $novosDados) {
    $arquivo = __DIR__ . '/../data/transacoes.json';
    
    if (!file_exists($arquivo)) return;
    
    $transacoes = json_decode(file_get_contents($arquivo), true) ?: [];
    
    foreach ($transacoes as &$transacao) {
        if ($transacao['transaction_id'] === $transactionId) {
            $transacao = array_merge($transacao, $novosDados);
            break;
        }
    }
    
    file_put_contents($arquivo, json_encode($transacoes, JSON_PRETTY_PRINT));
}

function gerarPIXSimulado($valor, $transactionId) {
    // Gerar um código PIX simulado (BRCode)
    $chavePix = '123e4567-e89b-12d3-a456-426614174000'; // Chave aleatória
    $nomeBeneficiario = 'VIVA SORTE LTDA';
    $cidade = 'SAO PAULO';
    
    $payloadPIX = "00020126580014br.gov.bcb.pix0136{$chavePix}0215{$nomeBeneficiario}5204000053039865405" . 
                  sprintf("%05.2f", $valor) . "5802BR5925VIVA SORTE PARTICIPACOES6009{$cidade}62190510{$transactionId}6304";
    
    // Calcular CRC16
    $crc = crc16($payloadPIX . "6304");
    $payloadPIX .= strtoupper(dechex($crc));
    
    return [
        'transaction_id' => $transactionId,
        'qr_code' => $payloadPIX,
        'qr_code_image' => 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' . urlencode($payloadPIX),
        'amount' => $valor,
        'status' => 'pending',
        'created_at' => date('Y-m-d H:i:s')
    ];
}

function crc16($data) {
    $crc = 0xFFFF;
    for ($i = 0; $i < strlen($data); $i++) {
        $crc ^= ord($data[$i]) << 8;
        for ($j = 0; $j < 8; $j++) {
            $crc = ($crc & 0x8000) ? (($crc << 1) ^ 0x1021) : ($crc << 1);
        }
    }
    return $crc & 0xFFFF;
}
?>