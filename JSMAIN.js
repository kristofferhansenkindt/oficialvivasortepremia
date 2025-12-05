// VARIÁVEIS GLOBAIS
let pacoteSelecionado = {
    quantidade: 6,
    valor: 5.94,
    valorUnitario: 0.99
};

let dadosUsuario = {
    cpf: '',
    telefone: '',
    transactionId: ''
};

let qrCodeGerado = null;

// FUNÇÕES DE SELEÇÃO DE PACOTE
function selecionarPacote(quantidade, valor) {
    pacoteSelecionado = {
        quantidade: quantidade,
        valor: valor,
        valorUnitario: 0.99
    };
    
    // Destacar botão selecionado
    document.querySelectorAll('.cota').forEach(btn => {
        btn.classList.remove('cota-selected');
    });
    
    event.currentTarget.classList.add('cota-selected');
    
    // Atualizar contador
    document.getElementById('numero').value = quantidade;
    document.getElementById('btn-adicionar-carrinho').disabled = false;
    
    // Atualizar resumo no modal
    atualizarResumoCompra();
}

function incrementar() {
    const input = document.getElementById('numero');
    let valor = parseInt(input.value) || 0;
    
    const incrementos = [6, 10, 15, 20, 30, 40, 70, 100, 200];
    const indexAtual = incrementos.indexOf(valor);
    
    if (indexAtual < incrementos.length - 1) {
        valor = incrementos[indexAtual + 1];
    } else if (valor < 500) {
        valor = Math.min(valor + 10, 500);
    }
    
    input.value = valor;
    atualizarPacoteCustomizado();
}

function decrementar() {
    const input = document.getElementById('numero');
    let valor = parseInt(input.value) || 0;
    
    const incrementos = [6, 10, 15, 20, 30, 40, 70, 100, 200];
    const indexAtual = incrementos.indexOf(valor);
    
    if (indexAtual > 0) {
        valor = incrementos[indexAtual - 1];
    } else if (valor > 6) {
        valor = Math.max(valor - 10, 6);
    } else {
        valor = 0;
    }
    
    input.value = valor;
    atualizarPacoteCustomizado();
}

function atualizarPacoteCustomizado() {
    const quantidade = parseInt(document.getElementById('numero').value) || 0;
    const valor = quantidade * 0.99;
    
    pacoteSelecionado = {
        quantidade: quantidade,
        valor: valor,
        valorUnitario: 0.99
    };
    
    document.getElementById('btn-adicionar-carrinho').disabled = quantidade === 0;
    
    // Destacar botão correspondente
    document.querySelectorAll('.cota').forEach(btn => {
        btn.classList.remove('cota-selected');
        const btnQuantidade = parseInt(btn.querySelector('.cota-qtd').textContent.replace('+', ''));
        if (btnQuantidade === quantidade) {
            btn.classList.add('cota-selected');
        }
    });
}

function comprarTitulosCustom() {
    const quantidade = parseInt(document.getElementById('numero').value) || 0;
    if (quantidade === 0) return;
    
    pacoteSelecionado = {
        quantidade: quantidade,
        valor: quantidade * 0.99,
        valorUnitario: 0.99
    };
    
    abrirModalPagamento();
}

// MODAL DE PAGAMENTO
function abrirModalPagamento() {
    atualizarResumoCompra();
    mostrarEtapa(1);
    document.getElementById('modalPagamento').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Resetar formulários
    document.getElementById('inputCPF').value = '';
    document.getElementById('inputTelefone').value = '';
    document.getElementById('erroCPF').style.display = 'none';
    document.getElementById('sucessoCPF').style.display = 'none';
    document.getElementById('btnContinuarCPF').disabled = true;
    document.getElementById('areaPIX').style.display = 'none';
    document.getElementById('btnVerificarPagamento').style.display = 'none';
}

function fecharModal() {
    document.getElementById('modalPagamento').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function atualizarResumoCompra() {
    const resumo = document.getElementById('resumoCompraEtapa1');
    resumo.textContent = `${pacoteSelecionado.quantidade} títulos - R$${pacoteSelecionado.valor.toFixed(2).replace('.', ',')}`;
    
    // Atualizar também nas outras etapas
    document.getElementById('quantidadeResumo').textContent = pacoteSelecionado.quantidade;
    document.getElementById('valorResumo').textContent = pacoteSelecionado.valor.toFixed(2).replace('.', ',');
    document.getElementById('totalResumo').textContent = pacoteSelecionado.valor.toFixed(2).replace('.', ',');
    document.getElementById('valorConfirmado').textContent = pacoteSelecionado.valor.toFixed(2).replace('.', ',');
}

function mostrarEtapa(numeroEtapa) {
    // Esconder todas as etapas
    document.querySelectorAll('.etapa').forEach(etapa => {
        etapa.classList.remove('ativa');
    });
    
    // Mostrar etapa selecionada
    document.getElementById(`etapa${numeroEtapa}`).classList.add('ativa');
    
    // Atualizar progresso
    atualizarProgressoEtapas(numeroEtapa);
}

function atualizarProgressoEtapas(etapaAtual) {
    document.querySelectorAll('.etapa-item').forEach((item, index) => {
        item.classList.remove('ativa', 'completada');
        
        const numeroItem = index + 1;
        
        if (numeroItem < etapaAtual) {
            item.classList.add('completada');
            item.querySelector('.etapa-numero').textContent = '✓';
        } else if (numeroItem === etapaAtual) {
            item.classList.add('ativa');
        }
    });
}

// VALIDAÇÃO DE CPF EM TEMPO REAL
document.getElementById('inputCPF').addEventListener('input', function(e) {
    formatarCPF(this);
    const cpfNumeros = this.value.replace(/\D/g, '');
    const btnContinuar = document.getElementById('btnContinuarCPF');
    
    if (cpfNumeros.length === 11) {
        btnContinuar.disabled = false;
        btnContinuar.style.background = 'linear-gradient(to right, #2f4eb5, #3949ab)';
    } else {
        btnContinuar.disabled = true;
        btnContinuar.style.background = '#cccccc';
    }
    
    // Limpar mensagens
    document.getElementById('erroCPF').style.display = 'none';
    document.getElementById('sucessoCPF').style.display = 'none';
});

// TECLA ENTER NO CPF
document.getElementById('inputCPF').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        validarEtapa1();
    }
});

// FORMATAR TELEFONE
document.getElementById('inputTelefone').addEventListener('input', function(e) {
    formatarTelefone(this);
});

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    // Configurar input de quantidade
    const inputQuantidade = document.getElementById('numero');
    inputQuantidade.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        let valor = parseInt(this.value) || 0;
        if (valor > 500) valor = 500;
        this.value = valor;
        atualizarPacoteCustomizado();
    });
    
    // Fechar modal ao clicar fora
    document.getElementById('modalPagamento').addEventListener('click', function(e) {
        if (e.target === this) {
            fecharModal();
        }
    });
    
    // Popups de notificação (mantido do original)
    iniciarPopupsNotificacao();
});

// POPUPS DE NOTIFICAÇÃO (mantido do original)
function iniciarPopupsNotificacao() {
    const mensagens = [
        "João P. acabou de Ganhar 50mil!",
        "Larissa F. acabou de Ganhar Um Iphone 16 Pro!",
        "Diego S. acabou de comprar 70 cotas!",
        "Juliana M. acabou de comprar 100 cotas!",
        "Bruno T. acabou de comprar 200 cotas!",
        "Carla R. acabou de comprar 70 cotas!",
        "Felipe N. acabou de comprar 30 cotas!",
        "Amanda C. acabou de comprar 40 cotas!",
        "Pedro V. acabou de comprar 70 cotas!",
        "Thais L. acabou de comprar 100 cotas!",
    ];

    const popup = document.getElementById('popup');
    const notifySound = document.getElementById('notifySound');

    let index = 0;

    function mostrarPopup() {
        if (index >= mensagens.length) return;

        popup.innerText = mensagens[index];
        popup.style.display = 'block';
        notifySound.play();

        setTimeout(() => {
            popup.style.display = 'none';
            index++;
            setTimeout(mostrarPopup, 5000);
        }, 4000);
    }

    setTimeout(mostrarPopup, 1000);
}