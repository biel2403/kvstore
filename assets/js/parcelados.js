// ============================================================
//  CONTROLE DE PARCELADOS - app.js
//  Dados salvos em Google Sheets via Apps Script.
// ============================================================

// Depois de publicar o Code.gs como Web App, cole a URL aqui.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxob30K4mUKz5teTvlMT1aKEWQ7YHld7B1qWWkFIgG6-Brsp3nG9H6uqjzRUuIZFX7y3w/exec';

const AUTH_TOKEN_KEY = 'parcelados_auth_token';
const STATUS_FUNIL = ['Em dia', 'Vence hoje', 'Atrasado', 'Quitado', 'Cancelado'];

let acordos = [];
let parcelas = [];
let acordoAtualId = null;
let filtroAtivo = 'Todos';
let termoBusca = '';
let viewAtiva = 'lista';
let toastTimer = null;

function hoje() {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function escapeHtml(valor) {
  return String(valor || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function parseIsoLocal(iso) {
  const [ano, mes, dia] = String(iso || '').split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function addMeses(iso, meses) {
  const base = parseIsoLocal(iso);
  const diaOriginal = base.getDate();
  base.setMonth(base.getMonth() + meses);
  if (base.getDate() !== diaOriginal) base.setDate(0);
  return formatarIso(base);
}

function formatarIso(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarData(iso) {
  if (!iso || iso === '-') return '-';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function numero(valor) {
  return Number(String(valor || '0').replace(',', '.')) || 0;
}

function formatarMoeda(valor) {
  return numero(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function obterToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function salvarToken(token) {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

function limparToken() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(tela => tela.classList.remove('ativa'));
  document.getElementById('tela-' + id).classList.add('ativa');
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function mostrarNotificacao(mensagem, tipo = 'sucesso', duracao = 3200) {
  const toast = document.getElementById('toast');
  window.clearTimeout(toastTimer);
  toast.textContent = mensagem;
  toast.classList.toggle('erro', tipo === 'erro');
  toast.classList.remove('hidden');
  if (duracao > 0) {
    toastTimer = window.setTimeout(() => toast.classList.add('hidden'), duracao);
  }
}

function aplicarDados(data) {
  acordos = data.acordos || [];
  parcelas = data.parcelas || [];
}

async function apiRequest(payload = { action: 'listar' }) {
  validarApiConfigurada();

  if (payload.action === 'login') return jsonpRequest(payload);

  const token = obterToken();
  if (!token) throw new Error('Faça login para continuar.');

  payload = { ...payload, token };
  if (payload.action === 'listar') return jsonpRequest(payload);

  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(payload),
  });

  return jsonpRequest({ action: 'listar', token });
}

function validarApiConfigurada() {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Configure a constante APPS_SCRIPT_URL no app.js com a URL do Web App do Apps Script.');
  }
}

function jsonpRequest(payload) {
  return new Promise((resolve, reject) => {
    const callbackName = `parceladosCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Tempo esgotado ao carregar dados do Apps Script.'));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = data => {
      cleanup();
      if (!data.ok) {
        reject(new Error(data.error || 'Erro desconhecido na API.'));
        return;
      }
      resolve(data);
    };

    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('callback', callbackName);
    Object.entries(payload).forEach(([key, value]) => {
      url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
    script.onerror = () => {
      cleanup();
      reject(new Error('Não foi possível conectar ao Apps Script.'));
    };
    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function carregarDados() {
  if (!obterToken()) {
    mostrarTela('login');
    return;
  }
  try {
    aplicarDados(await apiRequest({ action: 'listar' }));
    renderHome();
    mostrarTela('lista');
  } catch (error) {
    console.error(error);
    limparToken();
    mostrarTela('login');
    mostrarNotificacao(error.message, 'erro');
  }
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-senha').value;
  const botaoLogin = document.getElementById('btn-login');

  if (!email) { alert('Informe o e-mail.'); return; }
  if (!password) { alert('Informe a senha.'); return; }

  try {
    botaoLogin.disabled = true;
    mostrarNotificacao('Entrando...', 'sucesso', 0);
    const data = await apiRequest({ action: 'login', email, password });
    salvarToken(data.token);
    aplicarDados(await apiRequest({ action: 'listar' }));
    renderHome();
    mostrarTela('lista');
    mostrarNotificacao('Login realizado com sucesso.');
  } catch (error) {
    console.error(error);
    mostrarNotificacao(error.message, 'erro');
  } finally {
    botaoLogin.disabled = false;
  }
}

function sair() {
  limparToken();
  acordos = [];
  parcelas = [];
  mostrarTela('login');
  mostrarNotificacao('Sessão encerrada.');
}

function parcelasDoAcordo(acordoId) {
  return parcelas.filter(parcela => parcela.clienteId === acordoId);
}

function parcelasAbertas(acordoId) {
  return parcelasDoAcordo(acordoId).filter(parcela => parcela.status !== 'Pago');
}

function proximaParcela(acordo) {
  return parcelasAbertas(acordo.id).sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
}

function statusCalculado(acordo) {
  if ((acordo.status || 'Ativo') === 'Cancelado') return 'Cancelado';
  const ps = parcelasDoAcordo(acordo.id);
  if (ps.length && ps.every(parcela => parcela.status === 'Pago')) return 'Quitado';
  const abertas = ps.filter(parcela => parcela.status !== 'Pago');
  if (abertas.some(parcela => parcela.vencimento < hoje())) return 'Atrasado';
  if (abertas.some(parcela => parcela.vencimento === hoje())) return 'Vence hoje';
  return 'Em dia';
}

function badgeClass(status) {
  const map = {
    'Em dia': 'status-emdia',
    'Vence hoje': 'status-hoje',
    'Atrasado': 'status-atrasado',
    'Quitado': 'status-quitado',
    'Cancelado': 'status-cancelado',
  };
  return map[status] || 'status-emdia';
}

function acordoBuscaTexto(acordo) {
  return [
    acordo.nome,
    acordo.whatsapp,
    acordo.email,
    acordo.produto,
    acordo.formaPagamento,
    acordo.obs,
    statusCalculado(acordo),
  ].join(' ').toLowerCase();
}

function acordoPassaBusca(acordo) {
  return !termoBusca || acordoBuscaTexto(acordo).includes(termoBusca.toLowerCase());
}

function acordosFiltrados() {
  return acordos.filter(acordo => {
    const status = statusCalculado(acordo);
    return acordoPassaBusca(acordo) && (filtroAtivo === 'Todos' || status === filtroAtivo);
  });
}

function somaParcelas(lista) {
  return lista.reduce((total, parcela) => total + numero(parcela.valor), 0);
}

function renderHome() {
  renderDashboard();
  renderLista();
  renderHoje();
  renderFunil();
}

function renderDashboard() {
  const dashboard = document.getElementById('dashboard');
  const abertas = parcelas.filter(parcela => parcela.status !== 'Pago');
  const atrasadas = abertas.filter(parcela => parcela.vencimento < hoje());
  const hojeLista = abertas.filter(parcela => parcela.vencimento === hoje());
  const quitados = acordos.filter(acordo => statusCalculado(acordo) === 'Quitado').length;
  const ativos = acordos.filter(acordo => !['Quitado', 'Cancelado'].includes(statusCalculado(acordo))).length;
  const mesAtual = hoje().slice(0, 7);
  const venceMes = abertas.filter(parcela => parcela.vencimento.slice(0, 7) === mesAtual);

  dashboard.innerHTML = [
    ['A receber', formatarMoeda(somaParcelas(abertas))],
    ['Vence no mês', formatarMoeda(somaParcelas(venceMes))],
    ['Atrasadas', atrasadas.length],
    ['Vencem hoje', hojeLista.length],
    ['Vendas ativas', ativos],
    ['Quitados', quitados],
  ].map(([label, value]) => `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
    </div>
  `).join('');
}

function renderLista() {
  const container = document.getElementById('lista-clientes');
  const vazio = document.getElementById('lista-vazia');
  const alerta = document.getElementById('alerta-banner');
  const alertaTxt = document.getElementById('alerta-texto');
  const resultado = acordosFiltrados().sort((a, b) => Number(b.id) - Number(a.id));
  const qtdAtrasados = acordos.filter(acordo => statusCalculado(acordo) === 'Atrasado').length;

  if (qtdAtrasados > 0) {
    alertaTxt.textContent = `${qtdAtrasados} venda(s) com parcela atrasada.`;
    alerta.classList.remove('hidden');
  } else {
    alerta.classList.add('hidden');
  }

  container.innerHTML = '';
  if (resultado.length === 0) {
    vazio.classList.remove('hidden');
    return;
  }
  vazio.classList.add('hidden');
  resultado.forEach(acordo => container.appendChild(renderAcordoCard(acordo)));
}

function renderAcordoCard(acordo) {
  const status = statusCalculado(acordo);
  const aberta = proximaParcela(acordo);
  const ps = parcelasDoAcordo(acordo.id);
  const pagas = ps.filter(parcela => parcela.status === 'Pago').length;
  const tags = [
    `${pagas}/${ps.length} pagas`,
    `Total ${formatarMoeda(acordo.valorTotal)}`,
    acordo.formaPagamento,
  ].filter(Boolean);
  const telefone = String(acordo.whatsapp || '').replace(/\D/g, '');
  const msg = mensagemCobranca(acordo, aberta);

  const card = document.createElement('div');
  card.className = `card${status === 'Atrasado' ? ' atrasado' : ''}${status === 'Vence hoje' ? ' hoje' : ''}`;
  card.innerHTML = `
    <div class="card-topo">
      <div class="card-nome">${escapeHtml(acordo.nome)}</div>
      <span class="badge-status ${badgeClass(status)}">${status}</span>
    </div>
    <div class="card-produto">${escapeHtml(acordo.produto || 'Sem peças informadas')}</div>
    <div class="card-tags">${tags.map(tag => `<span class="card-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    <div class="card-rodape">
      <div class="card-meta">
        <div>${aberta ? `Próxima: ${formatarData(aberta.vencimento)} · ${formatarMoeda(aberta.valor)}` : 'Sem parcelas abertas'}</div>
        <div>Restante: ${formatarMoeda(somaParcelas(parcelasAbertas(acordo.id)))}</div>
      </div>
      <div class="card-acoes">
        ${telefone && aberta ? `<a class="btn-wpp" href="https://wa.me/55${telefone}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <button class="btn-hist" data-action="parcelas">Parcelas</button>
      </div>
    </div>
  `;

  card.addEventListener('click', event => {
    if (event.target.closest('.btn-wpp') || event.target.closest('.btn-hist')) return;
    abrirDetalhe(acordo.id);
  });
  card.querySelector('[data-action="parcelas"]').addEventListener('click', event => {
    event.stopPropagation();
    abrirDetalhe(acordo.id);
  });
  return card;
}

function renderHoje() {
  const container = document.getElementById('lista-hoje');
  const ids = new Set(parcelas
    .filter(parcela => parcela.status !== 'Pago' && parcela.vencimento <= hoje())
    .map(parcela => parcela.clienteId));
  const lista = acordos.filter(acordo => ids.has(acordo.id) && acordoPassaBusca(acordo));

  container.innerHTML = '';
  if (lista.length === 0) {
    container.innerHTML = `
      <div class="lista-vazia">
        <div class="lista-vazia-icon">✓</div>
        <p>Nenhuma cobrança pendente para hoje.</p>
      </div>
    `;
    return;
  }
  lista.forEach(acordo => container.appendChild(renderAcordoCard(acordo)));
}

function renderFunil() {
  const funil = document.getElementById('funil');
  funil.innerHTML = '';

  STATUS_FUNIL.forEach(status => {
    const items = acordos.filter(acordo => statusCalculado(acordo) === status && acordoPassaBusca(acordo));
    const coluna = document.createElement('div');
    coluna.className = 'funil-coluna';
    coluna.innerHTML = `
      <div class="funil-titulo">
        <span>${status}</span>
        <span>${items.length}</span>
      </div>
    `;

    items.forEach(acordo => {
      const aberta = proximaParcela(acordo);
      const card = document.createElement('div');
      card.className = 'funil-card';
      card.innerHTML = `
        <strong>${escapeHtml(acordo.nome)}</strong>
        <span>${escapeHtml(acordo.produto || 'Sem peças')}</span>
        <span>${aberta ? `${formatarData(aberta.vencimento)} · ${formatarMoeda(aberta.valor)}` : 'Sem parcela aberta'}</span>
      `;
      card.addEventListener('click', () => abrirDetalhe(acordo.id));
      coluna.appendChild(card);
    });
    funil.appendChild(coluna);
  });
}

function normalizarAcordo(dados) {
  const id = String(dados.id || Date.now());
  const valorTotal = numero(dados.valorTotal);
  const entrada = numero(dados.entrada);
  const totalParcelas = Math.max(1, Number(dados.totalParcelas) || 1);
  const valorParcela = (Math.max(valorTotal - entrada, 0) / totalParcelas).toFixed(2);
  const now = hoje();
  return {
    id,
    nome: dados.nome || '',
    whatsapp: dados.whatsapp || '',
    email: dados.email || '',
    produto: dados.produto || '',
    valorTotal: valorTotal.toFixed(2),
    entrada: entrada.toFixed(2),
    totalParcelas: String(totalParcelas),
    valorParcela,
    primeiroVencimento: dados.primeiroVencimento || now,
    formaPagamento: dados.formaPagamento || 'Pix',
    status: dados.status || 'Ativo',
    obs: dados.obs || '',
    createdAt: dados.createdAt || now,
    updatedAt: now,
  };
}

function gerarParcelas(acordo) {
  const total = Number(acordo.totalParcelas) || 1;
  const valor = numero(acordo.valorParcela);
  return Array.from({ length: total }, (_, index) => ({
    id: `${acordo.id}-${index + 1}`,
    clienteId: acordo.id,
    numero: String(index + 1),
    vencimento: addMeses(acordo.primeiroVencimento, index),
    valor: valor.toFixed(2),
    status: 'Aberto',
    pagoEm: '',
    obs: '',
  }));
}

function abrirNovoCadastro() {
  document.getElementById('form-id').value = '';
  document.getElementById('form-nome').value = '';
  document.getElementById('form-whatsapp').value = '';
  document.getElementById('form-email').value = '';
  document.getElementById('form-produto').value = '';
  document.getElementById('form-valor-total').value = '';
  document.getElementById('form-entrada').value = '';
  document.getElementById('form-total-parcelas').value = '';
  document.getElementById('form-primeiro-vencimento').value = hoje();
  document.getElementById('form-forma-pagamento').value = 'Pix';
  document.getElementById('form-status').value = 'Ativo';
  document.getElementById('form-obs').value = '';
  document.getElementById('titulo-cadastro').textContent = 'Nova venda';
  document.getElementById('btn-excluir').classList.add('hidden');
  atualizarPreviewParcela();
  mostrarTela('cadastro');
}

function abrirEdicao(id) {
  const acordo = acordos.find(item => item.id === id);
  if (!acordo) return;
  document.getElementById('form-id').value = acordo.id;
  document.getElementById('form-nome').value = acordo.nome;
  document.getElementById('form-whatsapp').value = acordo.whatsapp || '';
  document.getElementById('form-email').value = acordo.email || '';
  document.getElementById('form-produto').value = acordo.produto || '';
  document.getElementById('form-valor-total').value = acordo.valorTotal || '';
  document.getElementById('form-entrada').value = acordo.entrada || '';
  document.getElementById('form-total-parcelas').value = acordo.totalParcelas || '';
  document.getElementById('form-primeiro-vencimento').value = acordo.primeiroVencimento || hoje();
  document.getElementById('form-forma-pagamento').value = acordo.formaPagamento || 'Pix';
  document.getElementById('form-status').value = acordo.status || 'Ativo';
  document.getElementById('form-obs').value = acordo.obs || '';
  document.getElementById('titulo-cadastro').textContent = 'Editar venda';
  document.getElementById('btn-excluir').classList.remove('hidden');
  atualizarPreviewParcela();
  mostrarTela('cadastro');
}

function coletarFormulario() {
  return {
    id: document.getElementById('form-id').value,
    nome: document.getElementById('form-nome').value.trim(),
    whatsapp: document.getElementById('form-whatsapp').value.trim(),
    email: document.getElementById('form-email').value.trim(),
    produto: document.getElementById('form-produto').value.trim(),
    valorTotal: document.getElementById('form-valor-total').value,
    entrada: document.getElementById('form-entrada').value,
    totalParcelas: document.getElementById('form-total-parcelas').value,
    primeiroVencimento: document.getElementById('form-primeiro-vencimento').value,
    formaPagamento: document.getElementById('form-forma-pagamento').value,
    status: document.getElementById('form-status').value,
    obs: document.getElementById('form-obs').value.trim(),
  };
}

function atualizarPreviewParcela() {
  const dados = coletarFormulario();
  const valorTotal = numero(dados.valorTotal);
  const entrada = numero(dados.entrada);
  const total = Math.max(1, Number(dados.totalParcelas) || 1);
  const saldo = Math.max(valorTotal - entrada, 0);
  const valorParcela = saldo / total;
  document.getElementById('preview-parcela').textContent =
    `${total} parcela(s) de ${formatarMoeda(valorParcela)} · saldo parcelado ${formatarMoeda(saldo)}`;
}

async function salvarAcordo() {
  const dados = coletarFormulario();
  if (!dados.nome) { alert('Informe o nome da cliente.'); return; }
  if (!dados.whatsapp) { alert('Informe o WhatsApp da cliente.'); return; }
  if (!numero(dados.valorTotal)) { alert('Informe o valor da compra.'); return; }
  if (!Number(dados.totalParcelas)) { alert('Informe a quantidade de parcelas.'); return; }
  if (!dados.primeiroVencimento) { alert('Informe o primeiro vencimento.'); return; }

  const botao = document.getElementById('btn-salvar');
  try {
    botao.disabled = true;
    mostrarNotificacao('Salvando venda...', 'sucesso', 0);
    aplicarDados(await apiRequest({ action: 'salvarAcordo', acordo: dados }));
    renderHome();
    mostrarTela('lista');
    mostrarNotificacao('Venda salva com sucesso.');
  } catch (error) {
    console.error(error);
    mostrarNotificacao(error.message, 'erro');
  } finally {
    botao.disabled = false;
  }
}

async function excluirAcordo() {
  const id = document.getElementById('form-id').value;
  if (!id) return;
  if (!confirm('Excluir esta venda e todas as parcelas?')) return;

  const botao = document.getElementById('btn-excluir');
  try {
    botao.disabled = true;
    mostrarNotificacao('Excluindo venda...', 'sucesso', 0);
    aplicarDados(await apiRequest({ action: 'excluirAcordo', id }));
    renderHome();
    mostrarTela('lista');
    mostrarNotificacao('Venda excluída com sucesso.');
  } catch (error) {
    console.error(error);
    mostrarNotificacao(error.message, 'erro');
  } finally {
    botao.disabled = false;
  }
}

function abrirDetalhe(id) {
  acordoAtualId = id;
  const acordo = acordos.find(item => item.id === id);
  if (!acordo) return;
  document.getElementById('titulo-detalhe').textContent = acordo.nome.split(' ')[0] || 'Parcelas';
  renderDetalhe();
  mostrarTela('detalhe');
}

function renderDetalhe() {
  const acordo = acordos.find(item => item.id === acordoAtualId);
  const info = document.getElementById('detalhe-info');
  const lista = document.getElementById('lista-parcelas');
  if (!acordo) return;

  const ps = parcelasDoAcordo(acordo.id).sort((a, b) => Number(a.numero) - Number(b.numero));
  const abertas = ps.filter(parcela => parcela.status !== 'Pago');
  info.innerHTML = `
    <div>${escapeHtml(acordo.produto || 'Sem peças informadas')} · ${statusCalculado(acordo)}</div>
    <div>Total: ${formatarMoeda(acordo.valorTotal)} · Restante: ${formatarMoeda(somaParcelas(abertas))}</div>
    <div><button class="btn-card-mini" id="btn-editar-acordo">Editar venda</button></div>
  `;
  info.querySelector('#btn-editar-acordo').addEventListener('click', () => abrirEdicao(acordo.id));

  lista.innerHTML = '';
  ps.forEach(parcela => lista.appendChild(renderParcelaCard(acordo, parcela)));
}

function renderParcelaCard(acordo, parcela) {
  const paga = parcela.status === 'Pago';
  const atrasada = !paga && parcela.vencimento < hoje();
  const venceHoje = !paga && parcela.vencimento === hoje();
  const div = document.createElement('div');
  div.className = `parcela-card${paga ? ' paga' : ''}${atrasada ? ' atrasado' : ''}${venceHoje ? ' hoje' : ''}`;
  div.innerHTML = `
    <div class="parcela-topo">
      <div class="parcela-titulo">Parcela ${escapeHtml(parcela.numero)}</div>
      <span class="badge-status ${paga ? 'status-quitado' : atrasada ? 'status-atrasado' : venceHoje ? 'status-hoje' : 'status-emdia'}">
        ${paga ? 'Pago' : atrasada ? 'Atrasada' : venceHoje ? 'Hoje' : 'Aberta'}
      </span>
    </div>
    <div class="parcela-meta">
      <div>Vencimento: ${formatarData(parcela.vencimento)} · ${formatarMoeda(parcela.valor)}</div>
      ${paga ? `<div>Pago em: ${formatarData(parcela.pagoEm)}</div>` : ''}
    </div>
    <div class="parcela-acoes">
      <button class="btn-card-mini" data-action="toggle">${paga ? 'Reabrir' : 'Marcar pago'}</button>
      ${!paga ? `<a class="btn-wpp" href="https://wa.me/55${String(acordo.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(mensagemCobranca(acordo, parcela))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
    </div>
  `;
  div.querySelector('[data-action="toggle"]').addEventListener('click', () => alternarParcela(parcela));
  return div;
}

async function alternarParcela(parcela) {
  const paga = parcela.status === 'Pago';
  const atualizada = {
    ...parcela,
    status: paga ? 'Aberto' : 'Pago',
    pagoEm: paga ? '' : hoje(),
  };
  try {
    mostrarNotificacao(paga ? 'Reabrindo parcela...' : 'Marcando como paga...', 'sucesso', 0);
    aplicarDados(await apiRequest({ action: 'atualizarParcela', parcela: atualizada }));
    renderHome();
    renderDetalhe();
    mostrarNotificacao(paga ? 'Parcela reaberta.' : 'Parcela marcada como paga.');
  } catch (error) {
    console.error(error);
    mostrarNotificacao(error.message, 'erro');
  }
}

function mensagemCobranca(acordo, parcela) {
  if (!parcela) return `Olá, ${acordo.nome.split(' ')[0]}! Tudo bem? Passando sobre as parcelas da sua compra.`;
  const nome = acordo.nome.split(' ')[0] || 'tudo bem';
  return `Olá, ${nome}! Tudo bem? Passando para lembrar da parcela ${parcela.numero} da sua compra (${formatarMoeda(parcela.valor)}), com vencimento em ${formatarData(parcela.vencimento)}.`;
}

document.getElementById('btn-login').addEventListener('click', fazerLogin);
document.getElementById('login-senha').addEventListener('keydown', e => { if (e.key === 'Enter') fazerLogin(); });
document.getElementById('login-email').addEventListener('keydown', e => { if (e.key === 'Enter') fazerLogin(); });
document.getElementById('btn-sair').addEventListener('click', sair);
document.getElementById('btn-abrir-cadastro').addEventListener('click', abrirNovoCadastro);
document.getElementById('btn-voltar-cadastro').addEventListener('click', () => mostrarTela('lista'));
document.getElementById('btn-voltar-detalhe').addEventListener('click', () => mostrarTela('lista'));
document.getElementById('btn-salvar').addEventListener('click', salvarAcordo);
document.getElementById('btn-excluir').addEventListener('click', excluirAcordo);

document.querySelectorAll('.filtro').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro').forEach(item => item.classList.remove('ativo'));
    btn.classList.add('ativo');
    filtroAtivo = btn.dataset.status;
    renderHome();
  });
});

document.querySelectorAll('.aba-home').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.aba-home').forEach(item => item.classList.remove('ativo'));
    document.querySelectorAll('.home-view').forEach(view => view.classList.remove('ativa'));
    btn.classList.add('ativo');
    viewAtiva = btn.dataset.view;
    document.getElementById('view-' + viewAtiva).classList.add('ativa');
  });
});

document.getElementById('busca').addEventListener('input', e => {
  termoBusca = e.target.value;
  renderHome();
});

[
  'form-valor-total',
  'form-entrada',
  'form-total-parcelas',
].forEach(id => document.getElementById(id).addEventListener('input', atualizarPreviewParcela));

carregarDados();
