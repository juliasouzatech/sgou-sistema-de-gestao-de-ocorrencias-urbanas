// ============================================================
//  SGOU — Script unificado
// ============================================================

// ── Super admin pré-cadastrado ─────────────────────────────
const SUPER_ADMIN = {
  nome: 'Administrador Master',
  email: 'admin@exemplo.com',
  senha: 'Admin.exemplo',
  setor: 'SGOU',
  tipo: 'admin',
  aprovado: true
};

// ── Chaves de storage ──────────────────────────────────────
const KEY_USUARIOS    = 'sgou_usuarios';
const KEY_SESSAO      = 'sgou_sessao';
const KEY_OCORRENCIAS = 'sgou_ocorrencias';
const KEY_ADMIN_DATA  = 'sgou_admin_data';

// ── Storage helpers ────────────────────────────────────────
function getUsuarios()         { return JSON.parse(localStorage.getItem(KEY_USUARIOS)    || '[]');   }
function salvarUsuarios(arr)   { localStorage.setItem(KEY_USUARIOS, JSON.stringify(arr));            }
function getSessao()           { return JSON.parse(localStorage.getItem(KEY_SESSAO)      || 'null'); }
function salvarSessao(u)       { localStorage.setItem(KEY_SESSAO, JSON.stringify(u));                }
function limparSessao()        { localStorage.removeItem(KEY_SESSAO);                                }
function carregarOcorrencias() { return JSON.parse(localStorage.getItem(KEY_OCORRENCIAS) || '[]');   }
function carregarAdminData()   { return JSON.parse(localStorage.getItem(KEY_ADMIN_DATA)  || '{}');   }
function salvarAdminData(d)    { localStorage.setItem(KEY_ADMIN_DATA, JSON.stringify(d));            }

function sincronizarStatus(protocolo, status) {
  const ocs = carregarOcorrencias();
  const i   = ocs.findIndex(o => o.protocolo === protocolo);
  if (i !== -1) { ocs[i].status = status; localStorage.setItem(KEY_OCORRENCIAS, JSON.stringify(ocs)); }
}

// ── Inicialização ──────────────────────────────────────────
(function init() {
  // Garante super admin cadastrado
  const usuarios = getUsuarios();
  if (!usuarios.find(u => u.email === SUPER_ADMIN.email)) {
    usuarios.push(SUPER_ADMIN);
    salvarUsuarios(usuarios);
  }

  // Verifica sessão ativa
  const sessao = getSessao();
  if (sessao) {
    if (sessao.tipo === 'admin') {
      mostrarSecao('app-admin');
      inicializarAdmin();
    } else {
      mostrarSecao('app-cidadao');
      inicializarCidadao();
    }
    return;
  }

  mostrarSecao('front-wrapper');
  irPara('home');
})();

// ── Mostrar seção principal ────────────────────────────────
function mostrarSecao(id) {
  ['front-wrapper', 'app-cidadao', 'app-admin'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === id) ? 'flex' : 'none';
  });
  window.scrollTo(0, 0);
}

// ── Navegação entre telas do front ────────────────────────
function irPara(telaId) {
  document.querySelectorAll('#front-wrapper .tela').forEach(t => t.classList.remove('ativa'));
  const alvo = document.getElementById(telaId);
  if (alvo) alvo.classList.add('ativa');
  window.scrollTo(0, 0);
}

// ── Navegação interna (cidadão ou admin) ──────────────────
function trocarTelaInterna(id, contexto) {
  // Seleciona telas do contexto correto
  const appEl = document.getElementById(contexto === 'cid' ? 'app-cidadao' : 'app-admin');
  appEl.querySelectorAll('.tela-interna').forEach(t => t.classList.remove('ativa'));
  appEl.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));

  const telaEl = document.getElementById(id);
  if (telaEl) telaEl.classList.add('ativa');
  const btnEl = document.getElementById('btn-' + id);
  if (btnEl) btnEl.classList.add('ativo');

  // Render específico
  if (contexto === 'adm') {
    const map = { painel: renderPainel, categorias: renderCategorias, arquivo: renderArquivo, solicitacoes: renderSolicitacoes };
    if (map[id]) map[id]();
  } else if (id === 'minhas') {
    renderOcorrenciasCidadao();
  }
}

// ── LOGIN CIDADÃO ──────────────────────────────────────────
function fazerLoginCidadao() {
  const email = document.getElementById('email-login-cid')?.value.trim();
  const senha = document.getElementById('senha-login-cid')?.value;
  const erroEl = document.getElementById('erro-login-cidadao');

  if (!email || !senha) { mostrarErroCampo(erroEl, 'Preencha e-mail e senha.'); return; }

  const usuario = getUsuarios().find(u => u.email === email && u.senha === senha && u.tipo === 'cidadao');
  if (!usuario) { mostrarErroCampo(erroEl, 'E-mail ou senha incorretos.'); return; }

  salvarSessao(usuario);
  mostrarSecao('app-cidadao');
  inicializarCidadao();
}

// ── LOGIN ADM ──────────────────────────────────────────────
function fazerLoginAdm() {
  const email = document.getElementById('email-login-adm')?.value.trim();
  const senha = document.getElementById('senha-login-adm')?.value;
  const erroEl = document.getElementById('erro-login-admtela');

  if (!email || !senha) { mostrarErroCampo(erroEl, 'Preencha e-mail e senha.'); return; }

  const usuarios = getUsuarios();
  const usuario  = usuarios.find(u => u.email === email && u.senha === senha && u.tipo === 'admin' && u.aprovado === true);

  if (!usuario) {
    const pendente = usuarios.find(u => u.email === email && u.tipo === 'admin' && u.aprovado === false);
    mostrarErroCampo(erroEl, pendente ? 'Sua solicitação ainda está aguardando aprovação.' : 'E-mail ou senha incorretos, ou acesso não autorizado.');
    return;
  }

  salvarSessao(usuario);
  mostrarSecao('app-admin');
  inicializarAdmin();
}

// ── LOGOUT ─────────────────────────────────────────────────
function logout() {
  if (!confirm('Deseja realmente sair do sistema?')) return;
  limparSessao();
  mostrarSecao('front-wrapper');
  irPara('home');
  // Limpa campos de login
  ['email-login-cid', 'senha-login-cid', 'email-login-adm', 'senha-login-adm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ── CADASTRO CIDADÃO ───────────────────────────────────────
function cadastrarCidadao() {
  const nome   = document.getElementById('nome-cad-cid')?.value.trim();
  const tel    = document.getElementById('tel-cad-cid')?.value.trim();
  const email  = document.getElementById('email-cad-cid')?.value.trim();
  const senha  = document.getElementById('senha-cad-cid')?.value;
  const conf   = document.getElementById('conf-senha-cid')?.value;
  const termos = document.getElementById('termos-cid')?.checked;

  if (!nome || !email || !senha) { alertaToast('Preencha todos os campos obrigatórios.', 'erro'); return; }
  if (senha !== conf)             { alertaToast('As senhas não conferem.', 'erro');                 return; }
  if (!termos)                    { alertaToast('Aceite os termos para continuar.', 'erro');        return; }

  const usuarios = getUsuarios();
  if (usuarios.find(u => u.email === email)) { alertaToast('Este e-mail já está cadastrado.', 'erro'); return; }

  usuarios.push({ nome, tel, email, senha, tipo: 'cidadao' });
  salvarUsuarios(usuarios);
  alertaToast('Conta criada com sucesso! Faça login.', 'ok');

  document.getElementById('nome-cad-cid').value = '';
  document.getElementById('tel-cad-cid').value = '';
  document.getElementById('email-cad-cid').value = '';
  document.getElementById('senha-cad-cid').value = '';
  document.getElementById('conf-senha-cid').value = '';

  setTimeout(() => irPara('login-cidadao'), 1500);
}

// ── SOLICITAÇÃO ADM ────────────────────────────────────────
function solicitarAcessoAdm() {
  const nome      = document.getElementById('nome-cad-adm')?.value.trim();
  const matricula = document.getElementById('matricula-adm')?.value.trim();
  const setor     = document.getElementById('setor-adm')?.value.trim();
  const email     = document.getElementById('email-cad-adm')?.value.trim();
  const senha     = document.getElementById('senha-cad-adm')?.value;
  const conf      = document.getElementById('conf-senha-adm')?.value;
  const termos    = document.getElementById('termos-adm')?.checked;

  if (!nome || !email || !senha || !matricula) { alertaToast('Preencha todos os campos obrigatórios.', 'erro'); return; }
  if (senha !== conf)                           { alertaToast('As senhas não conferem.', 'erro');                 return; }
  if (!termos)                                  { alertaToast('Aceite os termos para continuar.', 'erro');        return; }

  const usuarios = getUsuarios();
  if (usuarios.find(u => u.email === email)) { alertaToast('Este e-mail já está cadastrado.', 'erro'); return; }

  usuarios.push({ nome, matricula, setor, email, senha, tipo: 'admin', aprovado: false, dataSolicitacao: new Date().toLocaleDateString('pt-BR') });
  salvarUsuarios(usuarios);
  alertaToast('Solicitação enviada! Aguarde a aprovação de um administrador.', 'ok');
  setTimeout(() => irPara('login-adm'), 2000);
}

// ── INICIALIZAR CIDADÃO ────────────────────────────────────
function inicializarCidadao() {
  const sessao = getSessao();
  if (!sessao) { mostrarSecao('front-wrapper'); irPara('home'); return; }
  const nomeEl = document.getElementById('cidadao-nome');
  if (nomeEl) nomeEl.textContent = sessao.nome?.split(' ')[0] || 'Cidadão';
  // Resetar nav
  document.querySelectorAll('#app-cidadao .tela-interna').forEach(t => t.classList.remove('ativa'));
  document.querySelectorAll('#app-cidadao .nav-btn').forEach(b => b.classList.remove('ativo'));
  document.getElementById('registrar')?.classList.add('ativa');
  document.getElementById('btn-registrar')?.classList.add('ativo');
}

// ── INICIALIZAR ADMIN ──────────────────────────────────────
function inicializarAdmin() {
  const sessao = getSessao();
  if (!sessao) { mostrarSecao('front-wrapper'); irPara('home'); return; }
  const primeiroNome = sessao.nome?.split(' ')[0] || 'Admin';
  const badgeEl = document.getElementById('adm-nome-badge');
  const subEl   = document.getElementById('adm-nome-sub');
  if (badgeEl) badgeEl.textContent = primeiroNome;
  if (subEl)   subEl.textContent   = 'Painel — ' + (sessao.setor || 'Administração');
  // Resetar nav
  document.querySelectorAll('#app-admin .tela-interna').forEach(t => t.classList.remove('ativa'));
  document.querySelectorAll('#app-admin .nav-btn').forEach(b => b.classList.remove('ativo'));
  document.getElementById('painel')?.classList.add('ativa');
  document.getElementById('btn-painel')?.classList.add('ativo');
  renderPainel();
  atualizarBadgeSolicitacoes();
  if (!window._pollingAdmin) {
    window._pollingAdmin = setInterval(checarNovas, 5000);
  }
}

// ============================================================
//  PAINEL CIDADÃO — OCORRÊNCIAS
// ============================================================

function getChaveOcorrencias() {
  const sessao = getSessao() || {};
  return 'sgou_oc_user_' + (sessao.email || 'anonimo');
}

function carregarOcorrenciasCidadao() {
  return JSON.parse(localStorage.getItem(getChaveOcorrencias()) || '[]');
}

function salvarOcorrenciasCidadao(lista) {
  localStorage.setItem(getChaveOcorrencias(), JSON.stringify(lista));
}

function toggleOutro(sel) {
  const campo = document.getElementById('campo-outro');
  const input = document.getElementById('outro-texto');
  if (sel.value === 'outro') {
    campo.style.display = 'flex';
    input.setAttribute('required', '');
  } else {
    campo.style.display = 'none';
    input.removeAttribute('required');
  }
}

function atualizarNomeArquivo(input) {
  const label = document.getElementById('file-label');
  label.textContent = input.files[0] ? input.files[0].name : 'Clique para selecionar uma imagem';
}

function gerarProtocolo(e) {
  e.preventDefault();
  const cat      = document.getElementById('categoria');
  const catLabel = cat.value === 'outro'
    ? document.getElementById('outro-texto').value
    : cat.options[cat.selectedIndex].text;

  const gravidade = document.querySelector('input[name="gravidade"]:checked')?.value || '';
  const inputs    = e.target.querySelectorAll('input[type="text"]');
  const rua       = inputs[0]?.value || '';
  const numero    = inputs[1]?.value || '';
  const bairro    = inputs[2]?.value || '';
  const referencia = inputs[3]?.value || '';
  const descricao = e.target.querySelector('textarea')?.value || '';

  const protocolo = 'OC-' + Date.now().toString().slice(-6);
  const data      = new Date().toLocaleDateString('pt-BR');

  const nova = { protocolo, categoria: catLabel, gravidade, rua, numero, bairro, referencia, descricao, data, status: 'Pendente' };

  // Salva na lista do cidadão
  const lista = carregarOcorrenciasCidadao();
  lista.unshift(nova);
  salvarOcorrenciasCidadao(lista);

  // Salva na lista global (visível ao ADM)
  const sessao = getSessao() || {};
  const global = carregarOcorrencias();
  global.unshift({ ...nova, autor: sessao.nome, email: sessao.email });
  localStorage.setItem(KEY_OCORRENCIAS, JSON.stringify(global));

  // Confirmação
  const box = document.getElementById('protocolo');
  box.style.display = 'flex';
  box.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    Ocorrência registrada com sucesso! Protocolo: <strong>${protocolo}</strong>
  `;
  e.target.reset();
  document.getElementById('campo-outro').style.display = 'none';
  document.getElementById('file-label').textContent = 'Clique para selecionar uma imagem';
  setTimeout(() => { box.style.display = 'none'; }, 6000);
}

function renderOcorrenciasCidadao() {
  // Busca ocorrências do cidadão, atualizando status a partir da lista global
  const minhas   = carregarOcorrenciasCidadao();
  const global   = carregarOcorrencias();
  const adm      = carregarAdminData();
  const container = document.getElementById('lista-ocorrencias');

  // Atualiza status local com base nos dados do admin
  const atualizadas = minhas.map(o => {
    const og = global.find(g => g.protocolo === o.protocolo);
    const admData = adm[o.protocolo];
    const statusReal = admData?.status || og?.status || o.status;
    return { ...o, status: statusReal };
  });

  if (!atualizadas.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <h3>Nenhuma ocorrência registrada ainda</h3>
        <p>Quando você registrar uma ocorrência, ela aparecerá aqui.</p>
        <button class="btn-registrar-vazio" onclick="trocarTelaInterna('registrar','cid')">Registrar agora</button>
      </div>`;
    return;
  }

  container.innerHTML = atualizadas.map(o => {
    const sc = (o.status || 'Pendente').toLowerCase().replace(/\s+/g, '').replace(/[áãâ]/g,'a').replace(/[éê]/g,'e').replace(/[íî]/g,'i').replace(/[óôõ]/g,'o').replace(/[úû]/g,'u');
    return `
    <div class="card">
      <div class="card-left">
        <div class="card-cat">${escHtml(o.categoria)}</div>
        <div class="card-meta">
          <span class="grav grav-${(o.gravidade||'').toLowerCase()}">${escHtml(o.gravidade)}</span>
          <span class="card-data">${escHtml(o.data)}</span>
          <span class="card-protocolo">${escHtml(o.protocolo)}</span>
        </div>
      </div>
      <span class="status status-${sc}">${escHtml(o.status)}</span>
    </div>`;
  }).join('');
}

// ============================================================
//  PAINEL ADMIN
// ============================================================

const prioLabel = { verde: '🟢 Baixa', amarela: '🟡 Moderada', vermelha: '🔴 Urgente', nenhuma: '— Não classificada' };

function statusCls(s) {
  return (s||'').toLowerCase().replace(/\s+/g,'-').replace(/[áãâ]/g,'a').replace(/[éê]/g,'e').replace(/[íî]/g,'i').replace(/[óôõ]/g,'o').replace(/[úû]/g,'u');
}

function getStatus(o, adm) { return adm[o.protocolo]?.status || o.status || 'Pendente'; }
function getPrio(o, adm)   { return adm[o.protocolo]?.prioridade || 'nenhuma'; }

let filtroStatus = '', filtroPrioridade = '', filtroCategoria = '';

function aplicarFiltros() {
  filtroStatus     = document.getElementById('f-status').value;
  filtroPrioridade = document.getElementById('f-prioridade').value;
  filtroCategoria  = document.getElementById('f-categoria').value;
  renderLista();
}

function limparFiltros() {
  filtroStatus = filtroPrioridade = filtroCategoria = '';
  ['f-status','f-prioridade','f-categoria'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderLista();
}

function popularFiltroCategoria(ocs) {
  const sel  = document.getElementById('f-categoria');
  if (!sel) return;
  const cats = [...new Set(ocs.map(o => o.categoria))].sort();
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todas as categorias</option>';
  cats.forEach(c => { const op = document.createElement('option'); op.value = c; op.textContent = c; if (c === atual) op.selected = true; sel.appendChild(op); });
}

function renderStats(ocs, adm) {
  const el = document.getElementById('stats-bar');
  if (!el) return;
  const ativas = ocs.filter(o => getStatus(o, adm) !== 'Concluído');
  el.innerHTML = `
    <div class="stat-card"><div class="stat-label">Ativas</div><div class="stat-num">${ativas.length}</div></div>
    <div class="stat-card pendente"><div class="stat-label">Pendentes</div><div class="stat-num">${ativas.filter(o => getStatus(o,adm)==='Pendente').length}</div></div>
    <div class="stat-card em-andamento"><div class="stat-label">Em análise</div><div class="stat-num">${ativas.filter(o => ['Em análise','Em andamento'].includes(getStatus(o,adm))).length}</div></div>
    <div class="stat-card concluido"><div class="stat-label">Arquivadas</div><div class="stat-num">${ocs.filter(o => getStatus(o,adm)==='Concluído').length}</div></div>
    <div class="stat-card alta"><div class="stat-label">🔴 Urgentes</div><div class="stat-num">${ativas.filter(o => getPrio(o,adm)==='vermelha').length}</div></div>`;
}

function renderPainel() {
  const ocs  = carregarOcorrencias();
  const adm  = carregarAdminData();
  const ativas = ocs.filter(o => getStatus(o,adm) !== 'Concluído');
  renderStats(ocs, adm);
  popularFiltroCategoria(ativas);
  renderLista();
  atualizarBadgeNovas(ativas, adm);
  atualizarBadgeArquivo(ocs, adm);
  atualizarBadgeSolicitacoes();
}

function renderLista() {
  const ocs   = carregarOcorrencias();
  const adm   = carregarAdminData();
  const lista = document.getElementById('lista-ocs');
  if (!lista) return;

  const filtradas = ocs.filter(o => {
    const s = getStatus(o,adm), p = getPrio(o,adm), c = o.categoria||'';
    if (s === 'Concluído')                          return false;
    if (filtroStatus     && s !== filtroStatus)     return false;
    if (filtroPrioridade && p !== filtroPrioridade) return false;
    if (filtroCategoria  && c !== filtroCategoria)  return false;
    return true;
  });

  const sub = document.getElementById('sub-contagem');
  if (sub) sub.textContent = `${filtradas.length} ocorrência${filtradas.length!==1?'s':''} ativa${filtradas.length!==1?'s':''}`;
  lista.innerHTML = '';
  if (!filtradas.length) { lista.innerHTML = emptyHTML('Nenhuma ocorrência encontrada','Ajuste os filtros ou aguarde novos registros.'); return; }
  filtradas.forEach(o => lista.appendChild(construirCard(o, adm, false)));
}

function emptyHTML(titulo, sub) {
  return `<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>${titulo}</h3><p>${sub}</p></div>`;
}

function txt(s)       { return document.createTextNode(String(s||'')); }
function mk(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

function construirCard(o, adm, isArquivo) {
  const a      = adm[o.protocolo] || {};
  const status = a.status     || o.status || 'Pendente';
  const prio   = a.prioridade || 'nenhuma';
  const obs    = a.obs        || '';
  const isNova = !a.visto && !isArquivo;
  const rua    = o.rua ? o.rua + (o.numero ? ', nº '+o.numero : '') : '';
  const bairro = o.bairro || '';

  const card = mk('div', 'oc-card prioridade-'+prio+(isArquivo?' oc-card-arquivo':''));
  card.id = 'card-'+o.protocolo;

  const top = mk('div','oc-top');
  top.addEventListener('click', () => toggleCard(o.protocolo));

  const tl     = mk('div','oc-top-left');
  const catNome = mk('div','oc-categoria'); catNome.appendChild(txt(o.categoria||'—'));
  const meta   = mk('div','oc-meta');
  const sp     = mk('span','oc-protocolo'); sp.appendChild(txt(o.protocolo));  meta.appendChild(sp);
  const sd     = mk('span','oc-data');      sd.appendChild(txt(o.data||''));   meta.appendChild(sd);
  if (bairro) { const sb = mk('span','oc-bairro'); sb.appendChild(txt(' '+bairro)); meta.appendChild(sb); }
  const catDiv = mk('div'); catDiv.appendChild(catNome); catDiv.appendChild(meta);
  tl.appendChild(catDiv); top.appendChild(tl);

  const tr = mk('div','oc-top-right');
  if (isNova)    { const bn = mk('span','badge-novo');       bn.appendChild(txt('Novo'));           tr.appendChild(bn); }
  if (isArquivo) { const ba = mk('span','badge-arquivo-tag'); ba.appendChild(txt('Arquivado'));     tr.appendChild(ba); }
  else           { const bp = mk('span','prio prio-'+prio);  bp.appendChild(txt(prioLabel[prio])); tr.appendChild(bp); }
  const bs = mk('span','status status-'+statusCls(status)); bs.appendChild(txt(status)); tr.appendChild(bs);
  tr.innerHTML += '<svg class="chevron" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  top.appendChild(tr);
  card.appendChild(top);

  const body = mk('div','oc-body'); body.id = 'body-'+o.protocolo;
  const grid = mk('div','oc-detalhe-grid');
  const colE = mk('div','oc-detalhe-col');

  if (o.descricao) {
    const bl = mk('div','detalhe-bloco');
    const lb = mk('div','oc-desc-label'); lb.appendChild(txt('📋 Descrição do problema')); bl.appendChild(lb);
    const dc = mk('div','oc-desc-original'); dc.textContent = o.descricao; bl.appendChild(dc);
    colE.appendChild(bl);
  }

  if (rua || bairro || o.referencia) {
    const bl  = mk('div','detalhe-bloco');
    const lb  = mk('div','oc-desc-label'); lb.appendChild(txt('📍 Endereço / Localização')); bl.appendChild(lb);
    const box = mk('div','oc-endereco-box');
    [['Rua:', rua],['Bairro:', bairro],['Referência:', o.referencia]].forEach(([label,valor]) => {
      if (!valor) return;
      const row = mk('div','endereco-linha');
      const lbl = mk('span','endereco-label'); lbl.appendChild(txt(label)); row.appendChild(lbl);
      row.appendChild(txt(valor)); box.appendChild(row);
    });
    bl.appendChild(box); colE.appendChild(bl);
  }

  {
    const bl    = mk('div','detalhe-bloco');
    const lb    = mk('div','oc-desc-label'); lb.appendChild(txt('ℹ️ Informações do registro')); bl.appendChild(lb);
    const chips = mk('div','info-chips');
    [['Protocolo',o.protocolo,'mono'],['Data',o.data||'—',''],['Gravidade',o.gravidade||'—','grav-inline grav-'+(o.gravidade||'').toLowerCase()],['Categoria',o.categoria||'—','']].forEach(([label,valor,cls]) => {
      const chip = mk('div','info-chip');
      const cl   = mk('span','info-chip-label'); cl.appendChild(txt(label)); chip.appendChild(cl);
      const cv   = mk('span','info-chip-val '+cls); cv.appendChild(txt(valor)); chip.appendChild(cv);
      chips.appendChild(chip);
    });
    bl.appendChild(chips); colE.appendChild(bl);
  }

  if (o.foto) {
    const bl  = mk('div','detalhe-bloco');
    const lb  = mk('div','oc-desc-label'); lb.appendChild(txt('📷 Foto enviada')); bl.appendChild(lb);
    const img = mk('img'); img.src = o.foto; img.alt = 'Foto';
    img.style.cssText = 'max-width:100%;max-height:260px;border-radius:8px;border:1px solid var(--border);margin-top:8px;object-fit:cover;display:block;';
    bl.appendChild(img); colE.appendChild(bl);
  }

  grid.appendChild(colE);

  const colD = mk('div','oc-detalhe-col oc-controles-col');
  const cb   = mk('div','detalhe-bloco controles-bloco');
  const ct   = mk('div','oc-desc-label'); ct.style.marginBottom='14px'; ct.appendChild(txt('⚙️ Gestão administrativa')); cb.appendChild(ct);

  if (isArquivo) {
    const aa = mk('div','arquivo-actions');
    const ai = mk('div','arquivo-info'); ai.appendChild(txt('Concluída em '+(a.dataConclusao||o.data||'—'))); aa.appendChild(ai);
    if (obs) { const od = mk('div','oc-obs-arquivo'); const s = mk('strong'); s.appendChild(txt('Obs: ')); od.appendChild(s); od.appendChild(txt(obs)); aa.appendChild(od); }
    const bd = mk('button','btn-desarquivar'); bd.appendChild(txt('Desarquivar ocorrência'));
    bd.addEventListener('click', () => desarquivar(o.protocolo)); aa.appendChild(bd); cb.appendChild(aa);
  } else {
    const ctrlGrid = mk('div','oc-controls');
    const gp  = mk('div','oc-control-group');
    const lp  = mk('label'); lp.appendChild(txt('Prioridade')); gp.appendChild(lp);
    const sp2 = mk('select','ctrl-select'); sp2.id = 'prio-'+o.protocolo;
    [['nenhuma','— Não classificada'],['verde','🟢 Baixa'],['amarela','🟡 Moderada'],['vermelha','🔴 Urgente']].forEach(([v,t]) => {
      const op = mk('option'); op.value = v; op.textContent = t; if (v === prio) op.selected = true; sp2.appendChild(op);
    });
    gp.appendChild(sp2); ctrlGrid.appendChild(gp);
    const gs = mk('div','oc-control-group');
    const ls = mk('label'); ls.appendChild(txt('Status')); gs.appendChild(ls);
    const ss = mk('select','ctrl-select'); ss.id = 'status-'+o.protocolo;
    [['Pendente','Pendente'],['Em análise','Em análise'],['Em andamento','Em andamento'],['Concluído','✔ Concluído (arquivar)']].forEach(([v,t]) => {
      const op = mk('option'); op.value = v; op.textContent = t; if (v === status) op.selected = true; ss.appendChild(op);
    });
    gs.appendChild(ss); ctrlGrid.appendChild(gs);
    const gg = mk('div','oc-control-group');
    const lg = mk('label'); lg.appendChild(txt('Gravidade (cidadão)')); gg.appendChild(lg);
    const sg = mk('select','ctrl-select'); sg.disabled = true;
    const og = mk('option'); og.textContent = o.gravidade||'—'; sg.appendChild(og); gg.appendChild(sg);
    ctrlGrid.appendChild(gg);
    cb.appendChild(ctrlGrid);
    const og2 = mk('div','oc-obs-group');
    const lo  = mk('label'); lo.appendChild(txt('Observações internas')); og2.appendChild(lo);
    const ta  = mk('textarea','ctrl-textarea'); ta.id = 'obs-'+o.protocolo; ta.placeholder = 'Anotações para acompanhamento interno...'; ta.textContent = obs; og2.appendChild(ta); cb.appendChild(og2);
    const br  = mk('div','btn-row');
    const bsv = mk('button','btn-salvar'); bsv.appendChild(txt('Salvar alterações'));
    bsv.addEventListener('click', () => salvarAdm(o.protocolo)); br.appendChild(bsv);
    const sm = mk('span','salvo-msg'); sm.id = 'salvo-'+o.protocolo; sm.appendChild(txt('✔ Salvo!')); br.appendChild(sm); cb.appendChild(br);
  }

  colD.appendChild(cb); grid.appendChild(colD); body.appendChild(grid); card.appendChild(body);
  return card;
}

function toggleCard(protocolo) {
  const card = document.getElementById('card-'+protocolo);
  const adm  = carregarAdminData();
  if (!adm[protocolo]) adm[protocolo] = {};
  adm[protocolo].visto = true;
  salvarAdminData(adm);
  const badge = card.querySelector('.badge-novo');
  if (badge) badge.remove();
  card.classList.toggle('expandido', !card.classList.contains('expandido'));
  atualizarBadgeNovas(carregarOcorrencias().filter(o => getStatus(o,adm)!=='Concluído'), adm);
}

function salvarAdm(protocolo) {
  const pEl = document.getElementById('prio-'+protocolo);
  const sEl = document.getElementById('status-'+protocolo);
  const oEl = document.getElementById('obs-'+protocolo);
  if (!pEl||!sEl||!oEl) return;
  const prio = pEl.value, status = sEl.value, obs = oEl.value;
  const adm  = carregarAdminData();
  if (!adm[protocolo]) adm[protocolo] = {};
  Object.assign(adm[protocolo], { prioridade: prio, status, obs, visto: true });
  if (status === 'Concluído') adm[protocolo].dataConclusao = new Date().toLocaleDateString('pt-BR');
  salvarAdminData(adm);
  sincronizarStatus(protocolo, status);
  if (status === 'Concluído') {
    mostrarToast('Ocorrência '+protocolo+' concluída e arquivada!');
    const card = document.getElementById('card-'+protocolo);
    if (card) { card.style.transition='opacity .3s,transform .3s'; card.style.opacity='0'; card.style.transform='translateX(28px)'; }
    setTimeout(() => { renderPainel(); atualizarBadgeArquivo(carregarOcorrencias(), carregarAdminData()); }, 320);
    return;
  }
  const card = document.getElementById('card-'+protocolo);
  if (card) {
    card.className = 'oc-card expandido prioridade-'+prio;
    const pe = card.querySelector('.prio');   if (pe) { pe.className='prio prio-'+prio; pe.textContent=prioLabel[prio]; }
    const se = card.querySelector('.status'); if (se) { se.className='status status-'+statusCls(status); se.textContent=status; }
  }
  const msg = document.getElementById('salvo-'+protocolo);
  if (msg) { msg.style.display='flex'; setTimeout(()=>{msg.style.display='none';},2500); }
  mostrarToast('Ocorrência '+protocolo+' atualizada!');
  renderStats(carregarOcorrencias(), carregarAdminData());
}

function renderArquivo() {
  const ocs   = carregarOcorrencias();
  const adm   = carregarAdminData();
  const lista = document.getElementById('lista-arquivo');
  if (!lista) return;
  const arq = ocs.filter(o => getStatus(o,adm)==='Concluído');
  lista.innerHTML = '';
  if (!arq.length) { lista.innerHTML = emptyHTML('Arquivo vazio','Ocorrências concluídas aparecerão aqui.'); return; }
  arq.forEach(o => lista.appendChild(construirCard(o, adm, true)));
}

function desarquivar(protocolo) {
  const adm = carregarAdminData();
  if (!adm[protocolo]) adm[protocolo] = {};
  adm[protocolo].status = 'Pendente'; adm[protocolo].dataConclusao = null;
  salvarAdminData(adm); sincronizarStatus(protocolo,'Pendente');
  mostrarToast('Ocorrência '+protocolo+' desarquivada!');
  renderArquivo(); atualizarBadgeArquivo(carregarOcorrencias(), carregarAdminData());
}

function renderCategorias() {
  const ocs    = carregarOcorrencias();
  const adm    = carregarAdminData();
  const ativas = ocs.filter(o => getStatus(o,adm)!=='Concluído');
  const grid   = document.getElementById('cat-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!ativas.length) { grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Nenhuma ocorrência ativa</h3></div>'; return; }
  const grupos = {};
  ativas.forEach(o => { const c = o.categoria||'Sem categoria'; (grupos[c]=grupos[c]||[]).push(o); });
  Object.entries(grupos).sort(([,a],[,b])=>b.length-a.length).forEach(([cat,lista]) => {
    const pend = lista.filter(o=>getStatus(o,adm)==='Pendente').length;
    const urg  = lista.filter(o=>getPrio(o,adm)==='vermelha').length;
    const card = mk('div','cat-card');
    const ct2  = mk('div','cat-card-title'); ct2.textContent = cat; card.appendChild(ct2);
    const cn   = mk('div','cat-count');      cn.textContent  = String(lista.length); card.appendChild(cn);
    const cs   = mk('div','cat-sub');
    const sPend = mk('span'); sPend.style.cssText = pend?'color:#8a6000;font-weight:700':'color:#287a4a;font-weight:700';
    sPend.textContent = pend ? pend+' pendente'+(pend>1?'s':'') : 'Sem pendências'; cs.appendChild(sPend);
    if (urg) { const sUrg = mk('span'); sUrg.style.cssText='color:#b71c1c;font-weight:700'; sUrg.textContent=' · '+urg+' urgente'+(urg>1?'s':''); cs.appendChild(sUrg); }
    card.appendChild(cs);
    card.addEventListener('click', () => { filtroCategoria = cat; document.getElementById('f-categoria').value = cat; trocarTelaInterna('painel','adm'); });
    grid.appendChild(card);
  });
}

// ── Solicitações ───────────────────────────────────────────
function getSolicitacoesPendentes() { return getUsuarios().filter(u => u.tipo==='admin' && u.aprovado===false); }

function aprovarAdmin(email) {
  const usuarios = getUsuarios();
  const i = usuarios.findIndex(u => u.email === email);
  if (i === -1) return;
  usuarios[i].aprovado = true;
  salvarUsuarios(usuarios);
  mostrarToast('Acesso aprovado para '+usuarios[i].nome+'!');
  renderSolicitacoes(); atualizarBadgeSolicitacoes();
}

function rejeitarAdmin(email) {
  if (!confirm('Tem certeza que deseja rejeitar e remover esta solicitação?')) return;
  const usuarios = getUsuarios();
  const u = usuarios.find(u => u.email === email);
  salvarUsuarios(usuarios.filter(u => u.email !== email));
  mostrarToast('Solicitação de '+(u?.nome||email)+' rejeitada.');
  renderSolicitacoes(); atualizarBadgeSolicitacoes();
}

function renderSolicitacoes() {
  const lista    = document.getElementById('lista-solicitacoes');
  if (!lista) return;
  const pendentes = getSolicitacoesPendentes();
  if (!pendentes.length) {
    lista.innerHTML = `<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><h3>Nenhuma solicitação pendente</h3><p>Novas solicitações de acesso administrativo aparecerão aqui.</p></div>`;
    return;
  }
  lista.innerHTML = pendentes.map(u => `
    <div class="solicit-card">
      <div>
        <div class="solicit-nome">${escHtml(u.nome)}</div>
        <div class="solicit-meta">
          <span><i class="fa-solid fa-envelope" style="font-size:11px;margin-right:4px"></i>${escHtml(u.email)}</span>
          <span><i class="fa-solid fa-hashtag" style="font-size:11px;margin-right:4px"></i>Mat. ${escHtml(u.matricula||'—')}</span>
          <span><i class="fa-solid fa-building" style="font-size:11px;margin-right:4px"></i>${escHtml(u.setor||'—')}</span>
          <span><i class="fa-solid fa-calendar" style="font-size:11px;margin-right:4px"></i>${escHtml(u.dataSolicitacao||'—')}</span>
        </div>
      </div>
      <div class="solicit-acoes">
        <button class="btn-aprovar" onclick="aprovarAdmin('${escHtml(u.email)}')"><i class="fa-solid fa-check"></i> Aprovar</button>
        <button class="btn-rejeitar" onclick="rejeitarAdmin('${escHtml(u.email)}')"><i class="fa-solid fa-xmark"></i> Rejeitar</button>
      </div>
    </div>`).join('');
}

// ── Badges ──────────────────────────────────────────────────
function atualizarBadgeNovas(ocs, adm) {
  const n = ocs.filter(o => !adm[o.protocolo]?.visto).length;
  const b = document.getElementById('badge-novas');
  if (!b) return;
  if (n>0) { b.textContent=n; b.classList.remove('hidden'); } else b.classList.add('hidden');
}
function atualizarBadgeArquivo(ocs, adm) {
  const n = ocs.filter(o => getStatus(o,adm)==='Concluído').length;
  const b = document.getElementById('badge-arquivo');
  if (!b) return;
  if (n>0) { b.textContent=n; b.classList.remove('hidden'); } else b.classList.add('hidden');
}
function atualizarBadgeSolicitacoes() {
  const badge = document.getElementById('badge-solicitacoes');
  if (!badge) return;
  const n = getSolicitacoesPendentes().length;
  if (n>0) { badge.textContent=n; badge.classList.remove('hidden'); } else badge.classList.add('hidden');
}

// ── Toast ───────────────────────────────────────────────────
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Polling ─────────────────────────────────────────────────
let _ultimoTotal = -1;
function checarNovas() {
  const ocs    = carregarOcorrencias();
  const adm    = carregarAdminData();
  const ativas = ocs.filter(o => getStatus(o,adm)!=='Concluído');
  if (_ultimoTotal !== -1 && ativas.length > _ultimoTotal) {
    mostrarToast((ativas.length-_ultimoTotal)+' nova(s) ocorrência(s) recebida(s)!');
    renderPainel();
  }
  _ultimoTotal = ativas.length;
  atualizarBadgeNovas(ativas, adm);
  atualizarBadgeArquivo(ocs, adm);
  atualizarBadgeSolicitacoes();
}

// ── Helpers de formulário ───────────────────────────────────
function toggleSenha(id, btn) {
  const input = document.getElementById(id);
  const icon  = btn.querySelector('i');
  if (input.type === 'password') { input.type='text'; icon.classList.replace('fa-eye','fa-eye-slash'); }
  else { input.type='password'; icon.classList.replace('fa-eye-slash','fa-eye'); }
}

function verificarForca(input, prefixo) {
  const v       = input.value;
  const wrapper = document.getElementById(prefixo);
  const txtEl   = document.getElementById(prefixo+'-txt');
  if (!wrapper) return;
  if (!v) { wrapper.classList.remove('visivel'); return; }
  wrapper.classList.add('visivel');
  let score = 0;
  if (v.length>=8)           score++;
  if (/[A-Z]/.test(v))       score++;
  if (/[0-9]/.test(v))       score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const labels  = ['','Fraca','Razoável','Boa','Forte'];
  const classes = ['','fraca','media','boa','forte'];
  if (txtEl) txtEl.textContent = 'Senha '+(labels[score]||'');
  for (let i=1;i<=4;i++) {
    const barra = document.getElementById(prefixo+'-b'+i);
    if (!barra) continue;
    barra.className = 'forca-barra';
    if (i<=score) barra.classList.add('ativa-'+classes[score]);
  }
}

function confirmarSenha(idOrigem, inputConf, feedbackId) {
  const orig = document.getElementById(idOrigem)?.value;
  const fb   = document.getElementById(feedbackId);
  if (!fb) return;
  if (!inputConf.value) { fb.className = 'campo-feedback'; return; }
  if (orig === inputConf.value) {
    fb.className = 'campo-feedback ok';
    fb.innerHTML = '<i class="fa-solid fa-check"></i> Senhas conferem';
  } else {
    fb.className = 'campo-feedback erro';
    fb.innerHTML = '<i class="fa-solid fa-xmark"></i> Senhas não conferem';
  }
}

function validarEmail(input, feedbackId) {
  const fb = document.getElementById(feedbackId);
  if (!fb) return;
  if (!input.value) { fb.className = 'campo-feedback'; return; }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
  fb.className = ok ? 'campo-feedback ok' : 'campo-feedback erro';
  fb.innerHTML = ok ? '<i class="fa-solid fa-check"></i> E-mail válido' : '<i class="fa-solid fa-xmark"></i> E-mail inválido';
}


function mascaraTel(input) {
  let v = input.value.replace(/\D/g,'');
  v = v.replace(/^(\d{2})(\d)/g,'($1) $2');
  v = v.replace(/(\d{5})(\d{4})$/,'$1-$2');
  input.value = v;
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function alertaToast(msg, tipo) {
  let toast = document.getElementById('sgou-toast-global');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sgou-toast-global';
    toast.style.cssText = 'position:fixed;bottom:28px;right:28px;padding:14px 20px;border-radius:10px;font-family:DM Sans,sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:all .3s;transform:translateY(80px);opacity:0';
    document.body.appendChild(toast);
  }
  toast.style.background = tipo==='ok' ? '#2e7d5b' : '#e53e3e';
  toast.style.color = '#fff';
  toast.innerHTML = (tipo==='ok' ? '<i class="fa-solid fa-check"></i> ' : '<i class="fa-solid fa-circle-exclamation"></i> ') + msg;
  toast.style.transform = 'translateY(0)'; toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.transform='translateY(80px)'; toast.style.opacity='0'; }, 3000);
}

function mostrarErroCampo(el, msg) {
  if (!el) return;
  el.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="margin-right:6px"></i>' + msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display='none'; }, 4000);
}

function recuperarSenha(contexto) {
  const inputId = contexto === 'cid' ? 'recuperar-email-cid' : 'recuperar-email-adm';
  const input = document.getElementById(inputId);
  if (!input) return;
  const email = input.value.trim();
  if (!email) { alertaToast('Informe seu e-mail para recuperação.', 'erro'); return; }

  const usuarios = getUsuarios();
  const usuario = usuarios.find(u =>
    u.email === email &&
    (contexto === 'cid' ? u.tipo === 'cidadao' : u.tipo === 'admin' && u.aprovado === true)
  );

  if (!usuario) {
    alertaToast('Nenhuma conta encontrada com este e-mail.', 'erro');
    return;
  }

  // Exibe a senha em um alert 
  alert(`Recuperação de senha\n\nConta encontrada para: ${usuario.nome}\nSua senha cadastrada é: ${usuario.senha}\n\nEm produção, isso seria enviado por e-mail.`);
  input.value = '';
}

function excluirConta() {
  const sessao = getSessao();
  if (!sessao) return;

  if (!confirm(`Tem certeza que deseja excluir permanentemente a conta de ${sessao.nome}?\nTodas as suas ocorrências também serão removidas.\n\nEsta ação não pode ser desfeita.`)) return;

  // Remove o usuário da lista
  const usuarios = getUsuarios();
  salvarUsuarios(usuarios.filter(u => u.email !== sessao.email));

  // Remove ocorrências globais deste usuário
  const ocs = carregarOcorrencias();
  localStorage.setItem(KEY_OCORRENCIAS, JSON.stringify(ocs.filter(o => o.email !== sessao.email)));

  // Remove ocorrências pessoais
  localStorage.removeItem('sgou_oc_user_' + sessao.email);

  // Encerra sessão
  limparSessao();
  mostrarSecao('front-wrapper');
  irPara('home');
  alertaToast('Conta excluída com sucesso.', 'ok');
}

