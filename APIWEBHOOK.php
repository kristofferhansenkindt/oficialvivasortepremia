<?php
header('Content-Type: application/json');

// Configurar logging
$logFile = __DIR__ . '/../data/webhook_log.txt';
$dataHora = date('Y-m-d H:i:s');

// Obter dados do webhook
$input = file_get_contents('php://input');
$dados = json_decode($input, true);

// Log da requisição
$logData = "=== WEBHOOK RECEBIDO {$dataHora} ===\n";
$logData .= "IP: {$_SERVER['REMOTE_ADDR']}\n";
$logData .= "User-Agent: {$_SERVER['HTTP_USER_AGENT']}\n";
$logData .= "Dados: " . json_encode($dados, JSON_PRETTY_PRINT) . "\n\n";

file_put_contents($logFile, $logData, FILE_APPEND);

// Verificar se é da AllowPay
if (isset($dados['id']) && isset($dados['status'])) {
    $transactionId = $dados['id'];
    $status = $dados['status'];
    
    // Atualizar transação local
    atualizarStatusTransacao($transactionId, $status, $dados);
    
    // Se pagamento confirmado, registrar
    if ($status === 'paid' || $status === 'approved') {
        registrarPagamentoConfirmado($transactionId, $dados);
    }
    
    echo json_encode(['success' => true, 'message' => 'Webhook processado']);
} else {
    echo json_encode(['success' => false, 'error' => 'Dados inválidos']);
}

// FUNÇÕES
function atualizarStatusTransacao($transactionId, $status, $dadosWebhook) {
    $arquivo = __DIR__ . '/../data/transacoes.json';
    
    if (!file_exists($arquivo)) return;
    
    $transacoes = json_decode(file_get_contents($arquivo), true) ?: [];
    $atualizado = false;
    
    foreach ($transacoes as &$transacao) {
        if (($transacao['allowpay_id'] ?? '') === $transactionId || 
            ($transacao['transaction_id'] ?? '') === $transactionId) {
            
            $transacao['status'] = $status;
            $transacao['data_atualizacao'] = date('Y-m-d H:i:s');
            $transacao['webhook_data'] = $dadosWebhook;
            $atualizado = true;
            break;
        }
    }
    
    if ($atualizado) {
        file_put_contents($arquivo, json_encode($transacoes, JSON_PRETTY_PRINT));
    }
}

function registrarPagamentoConfirmado($transactionId, $dados) {
    $arquivo = __DIR__ . '/../data/pagamentos_confirmados.json';
    $pagamentos = [];
    
    if (file_exists($arquivo)) {
        $pagamentos = json_decode(file_get_contents($arquivo), true) ?: [];
    }
    
    $pagamento = [
        'transaction_id' => $transactionId,
        'data_pagamento' => date('Y-m-d H:i:s'),
        'valor_pago' => $dados['amount'] / 100 ?? 0,
        'metodo' => 'PIX',
        'dados_completos' => $dados
    ];
    
    $pagamentos[] = $pagamento;
    
    // Garantir diretório
    if (!file_exists(dirname($arquivo))) {
        mkdir(dirname($arquivo), 0777, true);
    }
    
    file_put_contents($arquivo, json_encode($pagamentos, JSON_PRETTY_PRINT));
}
?>