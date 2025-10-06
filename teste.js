// ===============================
// Configuração do Supabase
// ===============================
const supabaseUrl = 'https://ttkzahouerphmzzdopti.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a3phaG91ZXJwaG16emRvcHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2ODk5NDcsImV4cCI6MjA3NTI2NTk0N30.fZHo98nT_i4qgxFqLH5VoyW1nlnS0Xm5N-C9-KnlVMQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===============================
// ELEMENTOS DA INTERFACE
// ===============================
const loginPage = document.querySelector('.login-page');
const mainContainer = document.querySelector('.container');
const formLogin = document.getElementById('login-form');
const mensagemLogin = document.getElementById('mensagem');

const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');

const modalProduto = document.getElementById('modal-produto');
const modalMovimentacao = document.getElementById('modal-movimentacao');

const closeButtons = document.querySelectorAll('.close');
const btnCancelarProduto = document.getElementById('btn-cancelar-produto');
const btnCancelarMovimentacao = document.getElementById('btn-cancelar-movimentacao');

const formProduto = document.getElementById('form-produto');
const formMovimentacao = document.getElementById('form-movimentacao');

const btnAdicionarProduto = document.getElementById('btn-adicionar-produto');
const btnNovaMovimentacao = document.getElementById('btn-nova-movimentacao');

const produtoCategoriaTabs = document.querySelectorAll('.tab[data-categoria]');

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================
let produtos = [];
let movimentacoes = [];
let gerentes = [];

// ===============================
// LOGIN
// ===============================
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        // Tentativa de login com Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error || !data.user) {
            mensagemLogin.textContent = "E-mail ou senha incorretos!";
            mensagemLogin.style.color = "red";
        } else {
            mensagemLogin.textContent = "Login realizado com sucesso!";
            mensagemLogin.style.color = "green";

            // Esconder login e mostrar dashboard
            loginPage.style.display = 'none';
            mainContainer.style.display = 'block';

            // Inicializar dados do sistema
            await carregarDados();
            configurarEventListeners();
        }
    } catch (err) {
        console.error(err);
        mensagemLogin.textContent = "Ocorreu um erro. Tente novamente!";
        mensagemLogin.style.color = "red";
    }
});


// ===============================
// CONFIGURAR EVENT LISTENERS
// ===============================
function configurarEventListeners() {
    // Navegação entre abas
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');

            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'dashboard') atualizarDashboard();
            else if (tabId === 'produtos') carregarProdutos();
            else if (tabId === 'movimentacoes') carregarMovimentacoes();
            else if (tabId === 'alertas') carregarAlertas();
        });
    });

    // Filtro por categoria de produtos
    produtoCategoriaTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const categoria = this.getAttribute('data-categoria');
            produtoCategoriaTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filtrarProdutosPorCategoria(categoria);
        });
    });

    // Modal de produto
    btnAdicionarProduto.addEventListener('click', () => abrirModalProduto());
    closeButtons.forEach(btn => btn.addEventListener('click', fecharModais));
    btnCancelarProduto.addEventListener('click', fecharModais);
    formProduto.addEventListener('submit', salvarProduto);

    // Modal de movimentação
    btnNovaMovimentacao.addEventListener('click', () => abrirModalMovimentacao());
    btnCancelarMovimentacao.addEventListener('click', fecharModais);
    formMovimentacao.addEventListener('submit', registrarMovimentacao);

    // Fechar modais ao clicar fora
    window.addEventListener('click', function(e) {
        if (e.target === modalProduto || e.target === modalMovimentacao) fecharModais();
    });
}

// ===============================
// CARREGAMENTO DE DADOS
// ===============================
async function carregarDados() {
    try {
        await Promise.all([
            carregarProdutos(),
            carregarMovimentacoes(),
            carregarGerentes(),
            atualizarDashboard(),
            carregarAlertas()
        ]);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do sistema');
    }
}

// ===============================
// FUNÇÕES DE PRODUTOS
// ===============================
async function carregarProdutos() {
    try {
        const { data, error } = await supabase.from('produtos').select('*').order('nome');
        if (error) throw error;
        produtos = data;
        exibirProdutos(produtos);
        preencherSelectProdutos();
        return data;
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        document.getElementById('lista-produtos').innerHTML = '<div class="alert-item danger">Erro ao carregar produtos</div>';
    }
}

function exibirProdutos(listaProdutos) {
    const container = document.getElementById('lista-produtos');
    if (listaProdutos.length === 0) {
        container.innerHTML = '<div class="alert-item">Nenhum produto encontrado</div>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Preço</th>
                <th>Validade</th>
                <th>Status</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>`;

    listaProdutos.forEach(produto => {
        const hoje = new Date();
        const validade = new Date(produto.validade);
        const diasParaVencer = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));

        let statusBadge = '';
        if (produto.quantidade === 0) statusBadge = '<span class="badge badge-danger">Sem Estoque</span>';
        else if (produto.quantidade < 10) statusBadge = '<span class="badge badge-warning">Baixo Estoque</span>';
        else if (diasParaVencer <= 30) statusBadge = '<span class="badge badge-warning">Vencimento Próximo</span>';
        else statusBadge = '<span class="badge badge-success">OK</span>';

        html += `<tr>
            <td>${produto.nome} ${produto.controlado ? '<span class="badge badge-controlado">Controlado</span>' : ''}</td>
            <td><span class="badge badge-${produto.categoria.toLowerCase()}">${produto.categoria}</span></td>
            <td>${produto.quantidade}</td>
            <td>R$ ${produto.preco.toFixed(2)}</td>
            <td>${validade.toLocaleDateString('pt-BR')}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editarProduto(${produto.id})">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="excluirProduto(${produto.id})">Excluir</button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function filtrarProdutosPorCategoria(categoria) {
    if (categoria === 'todos') exibirProdutos(produtos);
    else exibirProdutos(produtos.filter(p => p.categoria === categoria));
}

// ===============================
// FUNÇÕES DE MOVIMENTAÇÃO
// ===============================
async function carregarMovimentacoes() {
    try {
        const { data, error } = await supabase
            .from('movimentacao')
            .select(`*, produtos(nome), gerente(nome)`)
            .order('data_movimentacao', { ascending: false });
        if (error) throw error;
        movimentacoes = data;
        exibirMovimentacoes(movimentacoes);
        return data;
    } catch (error) {
        console.error('Erro ao carregar movimentações:', error);
        document.getElementById('lista-movimentacoes').innerHTML = '<div class="alert-item danger">Erro ao carregar movimentações</div>';
    }
}

function exibirMovimentacoes(listaMovimentacoes) {
    const container = document.getElementById('lista-movimentacoes');
    if (listaMovimentacoes.length === 0) {
        container.innerHTML = '<div class="alert-item">Nenhuma movimentação encontrada</div>';
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Motivo</th>
                <th>Responsável</th>
            </tr>
        </thead>
        <tbody>`;

    listaMovimentacoes.forEach(mov => {
        const tipo = mov.tipo === 'entrada'
            ? '<span class="badge badge-success">Entrada</span>'
            : '<span class="badge badge-danger">Saída</span>';

        html += `<tr>
            <td>${new Date(mov.data_movimentacao).toLocaleDateString('pt-BR')}</td>
            <td>${mov.produtos.nome}</td>
            <td>${tipo}</td>
            <td>${mov.quantidade}</td>
            <td>${mov.motivo || '-'}</td>
            <td>${mov.gerente.nome}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ===============================
// FUNÇÕES DE GERENTES
// ===============================
async function carregarGerentes() {
    try {
        const { data, error } = await supabase.from('gerente').select('*');
        if (error) throw error;
        gerentes = data;
        return data;
    } catch (error) {
        console.error('Erro ao carregar gerentes:', error);
    }
}

// ===============================
// DASHBOARD
// ===============================
function atualizarDashboard() {
    if (produtos.length === 0) return;

    document.getElementById('total-produtos').textContent = produtos.length;
    document.getElementById('produtos-estoque').textContent = produtos.filter(p => p.quantidade > 0).length;
    document.getElementById('baixo-estoque').textContent = produtos.filter(p => p.quantidade > 0 && p.quantidade < 10).length;

    const hoje = new Date();
    const limite = new Date();
    limite.setDate(hoje.getDate() + 30);
    document.getElementById('proximo-vencimento').textContent = produtos.filter(p => {
        const validade = new Date(p.validade);
        return validade <= limite && validade >= hoje;
    }).length;

    // Atualizar listas do dashboard
    exibirListaDashboard(produtos.filter(p => p.quantidade > 0 && p.quantidade < 10), 'baixo-estoque-list', 'Baixo Estoque');
    exibirListaDashboard(produtos.filter(p => {
        const validade = new Date(p.validade);
        return validade <= limite && validade >= hoje;
    }), 'proximo-vencimento-list', 'Vencimento Próximo');
}

function exibirListaDashboard(lista, elementoId, tipo) {
    const container = document.getElementById(elementoId);
    if (lista.length === 0) {
        container.innerHTML = `<div class="alert-item success">Nenhum produto com ${tipo.toLowerCase()}</div>`;
        return;
    }

    let html = '';
    lista.forEach(produto => {
        const diasParaVencer = Math.ceil((new Date(produto.validade) - new Date()) / (1000 * 60 * 60 * 24));
        html += `<div class="alert-item ${tipo === 'Baixo Estoque' ? 'warning' : 'danger'}">
            <div>
                <strong>${produto.nome}</strong>
                <div>${produto.categoria}</div>
            </div>
            <div>${tipo === 'Baixo Estoque' ? `Estoque: ${produto.quantidade}` : `Vence em: ${diasParaVencer} dias`}</div>
        </div>`;
    });

    container.innerHTML = html;
}

// ===============================
// ALERTAS
// ===============================
function carregarAlertas() {
    if (produtos.length === 0) return;

    const container = document.getElementById('lista-alertas');
    const hoje = new Date();
    const alertas = [];

    // Produtos vencidos
    produtos.filter(p => new Date(p.validade) < hoje).forEach(p => {
        alertas.push({
            tipo: 'danger',
            titulo: 'Produto Vencido',
            mensagem: `${p.nome} - Venceu em ${new Date(p.validade).toLocaleDateString('pt-BR')}`,
            produto: p
        });
    });

    // Vencimento próximo
    const limiteVencimento = new Date();
    limiteVencimento.setDate(hoje.getDate() + 30);
    produtos.filter(p => new Date(p.validade) <= limiteVencimento && new Date(p.validade) > hoje)
        .forEach(p => {
            const dias = Math.ceil((new Date(p.validade) - hoje) / (1000 * 60 * 60 * 24));
            alertas.push({
                tipo: 'warning',
                titulo: 'Vencimento Próximo',
                mensagem: `${p.nome} - Vence em ${dias} dias (${new Date(p.validade).toLocaleDateString('pt-BR')})`,
                produto: p
            });
        });

    // Estoque baixo
    produtos.filter(p => p.quantidade > 0 && p.quantidade < 10).forEach(p => {
        alertas.push({
            tipo: 'warning',
            titulo: 'Estoque Baixo',
            mensagem: `${p.nome} - Apenas ${p.quantidade} unidades em estoque`,
            produto: p
        });
    });

    // Sem estoque
    produtos.filter(p => p.quantidade === 0).forEach(p => {
        alertas.push({
            tipo: 'danger',
            titulo: 'Sem Estoque',
            mensagem: `${p.nome} - Estoque zerado`,
            produto: p
        });
    });

    if (alertas.length === 0) {
        container.innerHTML = '<div class="alert-item success">Nenhum alerta no momento</div>';
        return;
    }

    let html = '';
    alertas.forEach(alerta => {
        html += `<div class="alert-item ${alerta.tipo}">
            <div>
                <strong>${alerta.titulo}</strong>
                <div>${alerta.mensagem}</div>
            </div>
            <div>
                <span class="badge badge-${alerta.produto.categoria.toLowerCase()}">${alerta.produto.categoria}</span>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// ===============================
// MODAIS
// ===============================
function abrirModalProduto(produto = null) {
    const titulo = document.getElementById('modal-produto-titulo');

    if (produto) {
        titulo.textContent = 'Editar Produto';
        document.getElementById('produto-id').value = produto.id;
        document.getElementById('produto-nome').value = produto.nome;
        document.getElementById('produto-categoria').value = produto.categoria;
        document.getElementById('produto-quantidade').value = produto.quantidade;
        document.getElementById('produto-preco').value = produto.preco;
        document.getElementById('produto-validade').value = produto.validade;
        document.getElementById('produto-controlado').checked = produto.controlado;
    } else {
        titulo.textContent = 'Adicionar Produto';
        formProduto.reset();
        document.getElementById('produto-id').value = '';
    }

    modalProduto.style.display = 'flex';
}

function abrirModalMovimentacao() {
    modalMovimentacao.style.display = 'flex';
}

function fecharModais() {
    modalProduto.style.display = 'none';
    modalMovimentacao.style.display = 'none';
}

// ===============================
// SELECT DE PRODUTOS
// ===============================
function preencherSelectProdutos() {
    const select = document.getElementById('movimentacao-produto');
    select.innerHTML = '<option value="">Selecione um produto</option>';
    produtos.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.nome} (Estoque: ${p.quantidade})`;
        select.appendChild(option);
    });
}

// ===============================
// SALVAR PRODUTO
// ===============================
async function salvarProduto(e) {
    e.preventDefault();

    const produtoId = document.getElementById('produto-id').value;
    const produto = {
        nome: document.getElementById('produto-nome').value,
        categoria: document.getElementById('produto-categoria').value,
        quantidade: parseInt(document.getElementById('produto-quantidade').value),
        preco: parseFloat(document.getElementById('produto-preco').value),
        validade: document.getElementById('produto-validade').value,
        controlado: document.getElementById('produto-controlado').checked
    };

    try {
        if (produtoId) {
            const { error } = await supabase.from('produtos').update(produto).eq('id', produtoId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('produtos').insert([produto]);
            if (error) throw error;
        }

        fecharModais();
        carregarProdutos();
        atualizarDashboard();
        carregarAlertas();
        alert('Produto salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        alert('Erro ao salvar produto');
    }
}

// ===============================
// REGISTRAR MOVIMENTAÇÃO
// ===============================
async function registrarMovimentacao(e) {
    e.preventDefault();

    const movimentacao = {
        produto_id: parseInt(document.getElementById('movimentacao-produto').value),
        tipo: document.getElementById('movimentacao-tipo').value,
        quantidade: parseInt(document.getElementById('movimentacao-quantidade').value),
        motivo: document.getElementById('movimentacao-motivo').value,
        gerente_id: 1 // depois pegar do login
    };

    try {
        const { error: errorMov } = await supabase.from('movimentacao').insert([movimentacao]);
        if (errorMov) throw errorMov;

        const produto = produtos.find(p => p.id === movimentacao.produto_id);
        let novaQuantidade = produto.quantidade;
        novaQuantidade += movimentacao.tipo === 'entrada' ? movimentacao.quantidade : -movimentacao.quantidade;
        if (novaQuantidade < 0) novaQuantidade = 0;

        const { error: errorProd } = await supabase.from('produtos').update({ quantidade: novaQuantidade }).eq('id', movimentacao.produto_id);
        if (errorProd) throw errorProd;

        fecharModais();
        carregarProdutos();
        carregarMovimentacoes();
        atualizarDashboard();
        carregarAlertas();
        alert('Movimentação registrada com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar movimentação:', error);
        alert('Erro ao registrar movimentação');
    }
}

// ===============================
// EDITAR E EXCLUIR PRODUTO
// ===============================
function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto) abrirModalProduto(produto);
}

async function excluirProduto(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) throw error;

        carregarProdutos();
        atualizarDashboard();
        carregarAlertas();
        alert('Produto excluído com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto');
    }
}
