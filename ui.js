// ============================================================
// ui.js — Tela, modais, toasts, onboarding, tudo que mexe no DOM
// ============================================================

import {
  estado, dataHojeISO, colorMap, ESTADO_INICIAL,
  salvarEstado, currentUser,
  toggleGoogleAuth,
  exportarDadosCSV as exportarDadosCSVStorage,
  importarDadosCSV as importarDadosCSVStorage
} from './storage.js';

import {
  calcularMesFaturaCartao, totalPagoFatura,
  saldoDevedorFatura, itemApareceNoMes, numeroParcelaNoMes,
  calcularSomaHistoricoPassado, calcularSaldoDisponivelAteMes,
  estenderRecorrentesSeNecessario, lancarComprasCartao, calcularResumoDoMes,
  calcularReceitasPendentesDoMes, faturaJaFechou, somarMeses
} from './calculos.js';

import { calcularProgresso, calcularStreak, calcularMissoes, recalcularEstrelas } from './gamificacao.js';

const NOMES_MES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function getMesAnoSelecionado() {
  return document.getElementById('filtroData').value || dataHojeISO.slice(0, 7);
}
window.getMesAnoSelecionado = getMesAnoSelecionado;

export function atualizarLabelData() {
  let valor = document.getElementById('filtroData').value || dataHojeISO.slice(0, 7);
  let [ano, mes] = valor.split('-').map(Number);
  document.getElementById('filtroDataLabel').innerText = `${NOMES_MES_ABREV[mes - 1]}/${ano}`;
}
window.atualizarLabelData = atualizarLabelData;

export function mudarMes(direcao) {
  let input = document.getElementById('filtroData');
  let valorAtual = input.value || dataHojeISO.slice(0, 7);
  let [ano, mes] = valorAtual.split('-').map(Number);

  mes += direcao;
  if (mes > 12) { mes = 1; ano++; }
  else if (mes < 1) { mes = 12; ano--; }

  input.value = `${ano}-${String(mes).padStart(2, '0')}`;
  atualizarLabelData();
  atualizarTela();
}
window.mudarMes = mudarMes;

export function mudarMesEReabrirModal(direcao, nomeFuncaoReabrir) {
  mudarMes(direcao);
  if (typeof window[nomeFuncaoReabrir] === 'function') {
    window[nomeFuncaoReabrir]();
  }
}
window.mudarMesEReabrirModal = mudarMesEReabrirModal;

function cabecalhoComSetasDeMes(nomeFuncaoReabrir) {
  let mesFiltro = getMesAnoSelecionado();
  let [ano, mes] = mesFiltro.split('-').map(Number);
  let nomeMes = `${NOMES_MES_ABREV[mes - 1]}/${ano}`;
  return `
    <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:6px; font-size:0.75rem; color:var(--text-muted);">
      <button class="mini-btn-box" onclick="window.mudarMesEReabrirModal(-1, '${nomeFuncaoReabrir}')"><i class="fa-solid fa-chevron-left"></i></button>
      <span style="font-weight:700; color:var(--text);">${nomeMes}</span>
      <button class="mini-btn-box" onclick="window.mudarMesEReabrirModal(1, '${nomeFuncaoReabrir}')"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
  `;
}

export function mostrarToast(msg, cor = 'var(--accent-green)') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = cor;
  toast.innerHTML = `<i class="fa-solid fa-circle-info" style="color:${cor}"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
window.mostrarToast = mostrarToast;

export function toggleSidebar() {
  let sb = document.getElementById('sidebar');
  let sbo = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.toggle('active');
  if (sbo) sbo.classList.toggle('active');
}
window.toggleSidebar = toggleSidebar;

export function aplicarTema() {
  let claro = estado.temaClaro === true;
  document.body.classList.toggle('light-theme', claro);
  let lbl = document.getElementById('lblTema');
  if (lbl) lbl.innerText = claro ? 'Tema Escuro' : 'Tema Claro';
}
window.aplicarTema = aplicarTema;

export function alternarTema() {
  estado.temaClaro = !estado.temaClaro;
  aplicarTema();
  salvarEstado();
}
window.alternarTema = alternarTema;

const CHAVE_PRIVACIDADE = 'financasQuest_privacidade';

export function aplicarPrivacidade() {
  let ativa = localStorage.getItem(CHAVE_PRIVACIDADE) === 'true';
  document.body.classList.toggle('privacidade-ativa', ativa);
  let icone = document.getElementById('iconePrivacidade');
  let btn = document.getElementById('btnPrivacidade');
  if (icone) icone.className = ativa ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  if (btn) {
    let span = btn.querySelector('span');
    if (span) span.innerText = ativa ? 'Mostrar' : 'Ocultar';
    btn.title = ativa ? 'Mostrar valores' : 'Ocultar valores';
  }
}
window.aplicarPrivacidade = aplicarPrivacidade;

export function togglePrivacidade() {
  let ativa = localStorage.getItem(CHAVE_PRIVACIDADE) === 'true';
  localStorage.setItem(CHAVE_PRIVACIDADE, ativa ? 'false' : 'true');
  aplicarPrivacidade();
}
window.togglePrivacidade = togglePrivacidade;

export function atualizarBotaoAuth(user) {
  const authBtnText = document.getElementById('authBtnText');
  const authBtn = document.getElementById('authBtn');
  const userInfo = document.getElementById('userInfo');
  if (!authBtnText || !authBtn || !userInfo) return;

  if (user) {
    authBtnText.innerText = "Sair da Conta";
    authBtn.style.background = "rgba(239, 68, 68, 0.15)";
    authBtn.style.borderColor = "var(--accent-red)";
    authBtn.style.color = "var(--accent-red)";
    userInfo.style.display = "block";
    let nomeGoogle = user.email ? user.email.split('@')[0] : user.displayName;
    userInfo.innerText = `Conectado: ${nomeGoogle}`;
  } else {
    authBtnText.innerText = "Entrar com Google";
    authBtn.style.background = "rgba(59, 130, 246, 0.15)";
    authBtn.style.borderColor = "var(--accent-blue)";
    authBtn.style.color = "var(--accent-blue)";
    userInfo.style.display = "none";
    userInfo.innerText = "";
  }
}

window.toggleGoogleAuth = toggleGoogleAuth;

export function soltarConfete() {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
  }
}

export function abrirModal(titulo, htmlConteudo, acaoSalvar) {
  document.getElementById('modalTitulo').innerText = titulo;
  document.getElementById('modalConteudo').innerHTML = htmlConteudo;
  let modalActions = document.getElementById('modalActions');
  if (acaoSalvar) {
    modalActions.style.display = 'flex';
    document.getElementById('btnSalvarModal').onclick = () => { acaoSalvar(); window.fecharModal(); };
  } else {
    modalActions.style.display = 'none';
  }
  document.getElementById('modalGeral').classList.add('active');
}
window.abrirModal = abrirModal;

export function fecharModal() {
  let mg = document.getElementById('modalGeral');
  if (mg) mg.classList.remove('active');
}
window.fecharModal = fecharModal;

export function toggleColocarFixas() {
  estado.fixasOcultas = !estado.fixasOcultas;
  atualizarTela();
  salvarEstado();
}
window.toggleColocarFixas = toggleColocarFixas;

export function explicarGamificacao() {
  let mesFiltro = getMesAnoSelecionado();
  let progresso = calcularProgresso();
  let streak = calcularStreak(mesFiltro);
  let missoes = calcularMissoes(mesFiltro);

  let htmlMissoes = missoes.map(m => `
    <div style="display:flex; align-items:center; gap:6px; padding:5px 0; border-bottom:1px solid var(--card-border);">
      <span style="font-size:1rem;">${m.concluida ? '✅' : '⬜'}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:0.68rem; font-weight:700; color:${m.concluida ? 'var(--accent-green)' : 'var(--text)'};">${m.titulo}</div>
        <div style="font-size:0.6rem; color:var(--text-muted);">${m.descricao}</div>
        <div style="background:var(--bg); border-radius:4px; height:5px; margin-top:3px; overflow:hidden;">
          <div style="background:${m.concluida ? 'var(--accent-green)' : 'var(--accent-blue)'}; height:100%; width:${Math.round((m.progresso / m.total) * 100)}%;"></div>
        </div>
      </div>
      <span style="font-size:0.6rem; color:var(--text-muted); white-space:nowrap;">${m.progresso}/${m.total}</span>
    </div>
  `).join('');

  abrirModal("🌟 Seu Progresso", `
    <div style="text-align:center; margin-bottom:8px;">
      <div style="font-size:1.6rem; font-weight:800; color:var(--accent-gold);">Nível ${progresso.nivel}</div>
      <div style="font-size:0.62rem; color:var(--text-muted); margin-top:2px;">${progresso.xpNoNivelAtual} / 100 XP para o próximo nível</div>
      <div style="background:var(--bg); border-radius:5px; height:7px; margin-top:5px; overflow:hidden;">
        <div style="background:var(--accent-gold); height:100%; width:${progresso.percentualNivel}%;"></div>
      </div>
    </div>

    <div style="display:flex; gap:6px; margin-bottom:8px;">
      <div style="flex:1; background:var(--bg); border-radius:6px; padding:6px; text-align:center;">
        <div style="font-size:1rem;">🔥</div>
        <div style="font-size:0.85rem; font-weight:700;">${streak}</div>
        <div style="font-size:0.55rem; color:var(--text-muted);">meses seguidos</div>
      </div>
      <div style="flex:1; background:var(--bg); border-radius:6px; padding:6px; text-align:center;">
        <div style="font-size:1rem;">⭐</div>
        <div style="font-size:0.85rem; font-weight:700;">${estado.trofeus}</div>
        <div style="font-size:0.55rem; color:var(--text-muted);">estrelas acumuladas</div>
      </div>
    </div>

    <div style="font-size:0.65rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">MISSÕES</div>
    ${htmlMissoes}

    <p style="font-size:0.6rem; color:var(--text-muted); margin-top:8px; line-height:1.3;">
      Ficar dentro do limite de Despesas Diversas ganha XP e acumula estrelas. Ultrapassar o limite custa uma estrela.
    </p>
    <button style="width:100%; margin-top:8px; background:var(--accent-blue); color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>
  `, null);
}
window.explicarGamificacao = explicarGamificacao;

export function explicarReserva() {
  abrirModal("ℹ️ Reserva de Emergência", `
    <p style="font-size:0.72rem; color: var(--text-muted); line-height: 1.3;">
      A reserva de segurança é fundamental para ampará-lo em imprevistos. O ideal é cobrir no mínimo 6 meses das suas despesas fixas.
    </p>
    <button style="width:100%; margin-top:10px; background:var(--accent-blue); color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>
  `, null);
}
window.explicarReserva = explicarReserva;

export function copiarTexto(texto, mensagemSucesso) {
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(texto).then(() => {
      mostrarToast(mensagemSucesso);
    }).catch(() => {
      copiarTextoFallback(texto, mensagemSucesso);
    });
  } else {
    copiarTextoFallback(texto, mensagemSucesso);
  }
}
window.copiarTexto = copiarTexto;

export function copiarTextoFallback(texto, mensagemSucesso) {
  let textarea = document.createElement('textarea');
  textarea.value = texto;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  try {
    let sucesso = document.execCommand('copy');
    if (sucesso) {
      mostrarToast(mensagemSucesso);
    } else {
      mostrarToast('Não foi possível copiar. Selecione e copie manualmente.', 'var(--accent-red)');
    }
  } catch (e) {
    mostrarToast('Não foi possível copiar. Selecione e copie manualmente.', 'var(--accent-red)');
  }
  document.body.removeChild(textarea);
}
window.copiarTextoFallback = copiarTextoFallback;

export function abrirModalSobreProjeto() {
  let pixKey = "00020101021126580014br.gov.bcb.pix0136d04768cf-7ac3-4445-a9e7-274fe6f40b955204000053039865802BR5922GEOVANNE F DE ARCELINO6006RECIFE62070503***6304DB52";
  abrirModal("💡 Sobre o Projeto", `
    <p style="font-size:0.72rem; color: var(--text-muted); line-height: 1.4;">
      O Finanças Quest é um app simples e visual para controlar seu dinheiro. Aqui você acompanha saldo, despesas fixas e variáveis, cartões, investimentos e a construção da sua Reserva de Emergência.
      <br><br>
      Pode ser instalado no celular e sincroniza com a nuvem quando você faz login com o Google.
      <br><br>
      Seus dados ficam apenas na sua conta ou no seu dispositivo. Não vendemos nem compartilhamos informações.
    </p>
    <div style="margin-top: 6px; background: var(--bg); padding: 6px; border-radius: 6px; border: 1px solid var(--card-border);">
      <p style="font-size:0.7rem; font-weight:700; color: var(--accent-gold); margin-bottom: 3px;">Apoie com Pix:</p>
      <button style="width:100%; background:var(--accent-green); color:#000; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer; font-size:0.7rem;" onclick="window.copiarTexto('${pixKey}', 'Chave Pix copiada!');">Copiar Chave Pix</button>
    </div>
    <div style="margin-top: 8px; font-size:0.65rem; color: var(--text-muted);">
      <p>Desenvolvedor: Geovanne Arcelino</p>
      <p>E-mail: geovanne.arcelino@gmail.com</p>
    </div>
    <button style="width:100%; margin-top:10px; background:var(--accent-blue); color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;" onclick="window.fecharModal()">
      <i class="fa-solid fa-arrow-left"></i> Voltar
    </button>
  `, null);
}
window.abrirModalSobreProjeto = abrirModalSobreProjeto;

export function abrirModalModulos() {
  let m = estado.modulos || {};
  abrirModal("⚙️ Ativar / Desativar Módulos", `
    <div style="display:flex; flex-direction:column; gap:6px; font-size:0.75rem;">
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="modDiversos" ${m.despesasDiversas !== false ? 'checked' : ''} style="width:auto;"> Despesas Diversas
      </label>
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="modFixas" ${m.despesasFixas !== false ? 'checked' : ''} style="width:auto;"> Despesas Fixas
      </label>
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="modCartao" ${m.cartaoCredito !== false ? 'checked' : ''} style="width:auto;"> Cartão de Crédito
      </label>
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="modInv" ${m.investimento !== false ? 'checked' : ''} style="width:auto;"> Investimentos
      </label>
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
        <input type="checkbox" id="modRes" ${m.reservaEmergencia !== false ? 'checked' : ''} style="width:auto;"> Reserva de Emergência
      </label>
    </div>
  `, () => {
    estado.modulos.despesasDiversas = document.getElementById('modDiversos').checked;
    estado.modulos.despesasFixas = document.getElementById('modFixas').checked;
    estado.modulos.cartaoCredito = document.getElementById('modCartao').checked;
    estado.modulos.investimento = document.getElementById('modInv').checked;
    estado.modulos.reservaEmergencia = document.getElementById('modRes').checked;
    salvarEstado();
    mostrarToast("Módulos atualizados!");
  });
}
window.abrirModalModulos = abrirModalModulos;

export function abrirModalGerenciarCategorias() {
  let categorias = estado.categoriasDiversos || ['Outros'];
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <span style="font-size:0.65rem; color:var(--text-muted)">Categorias de Despesas Diversas</span>
      <button class="mini-btn-box" style="background:var(--accent-green); color:#000" onclick="window.abrirNovaCategoriaSub()">+ Nova</button>
    </div>
    <div class="history-list">
  `;
  categorias.forEach(c => {
    let ehOutros = c === 'Outros';
    html += `
      <div class="history-item">
        <strong>${c}</strong>
        <div style="display:flex; gap:3px;">
          ${!ehOutros ? `<button class="mini-btn-box" onclick="window.editarCategoriaSub('${c}')">✏️</button>` : ''}
          ${!ehOutros ? `<button class="mini-btn-box" style="background:var(--accent-red); color:white;" onclick="window.excluirCategoria('${c}')">❌</button>` : `<span style="font-size:0.58rem; color:var(--text-muted);">padrão</span>`}
        </div>
      </div>
    `;
  });
  html += `</div><button style="width:100%; margin-top:6px; background:#374151; color:white; padding:5px; border-radius:6px; border:none; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>`;
  abrirModal("🏷️ Categorias", html, null);
}
window.abrirModalGerenciarCategorias = abrirModalGerenciarCategorias;

let __graficosAtivos = [];

function destruirGraficosAtivos() {
  __graficosAtivos.forEach(g => { try { g.destroy(); } catch (e) {} });
  __graficosAtivos = [];
}

function gerarUltimosNMeses(mesReferencia, n) {
  let [ano, mes] = mesReferencia.split('-').map(Number);
  let meses = [];
  for (let i = n - 1; i >= 0; i--) {
    let m = mes - i;
    let a = ano;
    while (m < 1) { m += 12; a--; }
    meses.push(`${a}-${String(m).padStart(2, '0')}`);
  }
  return meses;
}

export function abrirModalGraficos() {
  let mesFiltro = getMesAnoSelecionado();

  let html = cabecalhoComSetasDeMes('abrirModalGraficos');
  html += `
    <div style="display:flex; flex-direction:column; gap:8px;">
      <div>
        <div style="font-size:0.65rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">Evolução do Saldo (últimos 6 meses)</div>
        <canvas id="graficoSaldo" height="100"></canvas>
      </div>
      <div>
        <div style="font-size:0.65rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">Gastos por Categoria (${mesFiltro})</div>
        <canvas id="graficoCategorias" height="100"></canvas>
      </div>
      <div>
        <div style="font-size:0.65rem; font-weight:700; color:var(--text-muted); margin-bottom:2px;">Reserva vs Investimentos (Acumulado)</div>
        <canvas id="graficoReserva" height="100"></canvas>
      </div>
    </div>
    <button style="width:100%; margin-top:8px; background:#374151; color:white; padding:6px; border-radius:6px; border:none; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>
  `;

  abrirModal("📊 Gráficos e Estatísticas", html, null);

  setTimeout(() => desenharGraficos(mesFiltro), 0);
}
window.abrirModalGraficos = abrirModalGraficos;

function desenharGraficos(mesFiltro) {
  destruirGraficosAtivos();

  let meses = gerarUltimosNMeses(mesFiltro, 6);
  let saldosPorMes = meses.map(m => calcularSaldoDisponivelAteMes(m));
  let labelsAbrev = meses.map(m => {
    let [ano, mes] = m.split('-').map(Number);
    return `${NOMES_MES_ABREV[mes - 1]}/${String(ano).slice(2)}`;
  });

  let ctxSaldo = document.getElementById('graficoSaldo');
  if (ctxSaldo && typeof Chart !== 'undefined') {
    __graficosAtivos.push(new Chart(ctxSaldo, {
      type: 'line',
      data: {
        labels: labelsAbrev,
        datasets: [{
          label: 'Saldo',
          data: saldosPorMes,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.15)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { color: '#9ca3af', font: { size: 9 } } }, x: { ticks: { color: '#9ca3af', font: { size: 9 } } } }
      }
    }));
  }

  // 2) Gastos por categoria do mês selecionado com valor direto
  let gastosDoMes = estado.historicoDiversos.filter(h => h.data && h.data.startsWith(mesFiltro));
  let porCategoria = {};
  gastosDoMes.forEach(h => {
    let cat = h.categoria || 'Outros';
    porCategoria[cat] = (porCategoria[cat] || 0) + h.valor;
  });
  let categorias = Object.keys(porCategoria);
  let valoresCategorias = categorias.map(c => porCategoria[c]);
  let coresCategorias = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#eab308', '#ec4899'];

  let ctxCategorias = document.getElementById('graficoCategorias');
  if (ctxCategorias && typeof Chart !== 'undefined') {
    if (categorias.length === 0) {
      ctxCategorias.parentElement.innerHTML += '<p style="font-size:0.65rem; color:var(--text-muted); text-align:center;">Nenhum gasto neste mês.</p>';
    } else {
      let labelsComValores = categorias.map(c => `${c}: R$ ${porCategoria[c].toFixed(2)}`);
      __graficosAtivos.push(new Chart(ctxCategorias, {
        type: 'doughnut',
        data: {
          labels: labelsComValores,
          datasets: [{ data: valoresCategorias, backgroundColor: coresCategorias }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 9 }, boxWidth: 10 } },
            tooltip: {
              callbacks: {
                label: (ctx) => `R$ ${ctx.raw.toFixed(2)}`
              }
            }
          }
        }
      }));
    }
  }

  // 3) Progresso da Reserva e Investimentos LADO A LADO
  let cofreAtual = calcularSomaHistoricoPassado(estado.historicoCofre, mesFiltro);
  let investidoAtual = calcularSomaHistoricoPassado(estado.historicoInvestido, mesFiltro);

  let totalFixasMensal = estado.fixas
    .filter(item => itemApareceNoMes(item, mesFiltro))
    .reduce((acc, cur) => acc + cur.valor, 0);
  let metaReserva = totalFixasMensal * (estado.metas.mesesReserva || 6);
  let metaInvest = estado.metas.investimento || 500;

  let ctxReserva = document.getElementById('graficoReserva');
  if (ctxReserva && typeof Chart !== 'undefined') {
    __graficosAtivos.push(new Chart(ctxReserva, {
      type: 'bar',
      data: {
        labels: ['Reserva', 'Investimentos'],
        datasets: [
          {
            label: 'Atual',
            data: [cofreAtual, investidoAtual],
            backgroundColor: ['#eab308', '#3b82f6']
          },
          {
            label: 'Meta',
            data: [metaReserva, metaInvest],
            backgroundColor: ['rgba(234, 179, 8, 0.3)', 'rgba(59, 130, 246, 0.3)']
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { color: '#9ca3af', font: { size: 9 }, boxWidth: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: R$ ${ctx.raw.toFixed(2)}` } }
        },
        scales: {
          x: { ticks: { color: '#9ca3af', font: { size: 9 } } },
          y: { ticks: { color: '#9ca3af', font: { size: 9 } } }
        }
      }
    }));
  }
}

export function abrirNovaCategoriaSub() {
  abrirModal("➕ Nova Categoria", `
    <input type="text" id="inputNovaCategoria" placeholder="Nome da categoria">
  `, () => {
    let nome = (document.getElementById('inputNovaCategoria').value || '').trim();
    if (!nome) return;
    if (!estado.categoriasDiversos) estado.categoriasDiversos = ['Outros'];
    if (estado.categoriasDiversos.includes(nome)) {
      mostrarToast("Essa categoria já existe.", "var(--accent-orange)");
      return;
    }
    estado.categoriasDiversos = estado.categoriasDiversos.filter(c => c !== 'Outros').concat([nome, 'Outros']);
    salvarEstado();
    mostrarToast("Categoria adicionada!");
    setTimeout(() => abrirModalGerenciarCategorias(), 0);
  });
}
window.abrirNovaCategoriaSub = abrirNovaCategoriaSub;

export function editarCategoriaSub(nomeAntigo) {
  abrirModal("✏️ Editar Categoria", `
    <input type="text" id="editNomeCategoria" value="${nomeAntigo}">
  `, () => {
    let novoNome = (document.getElementById('editNomeCategoria').value || '').trim();
    if (!novoNome || novoNome === nomeAntigo) return;
    if (estado.categoriasDiversos.includes(novoNome)) {
      mostrarToast("Já existe uma categoria com esse nome.", "var(--accent-orange)");
      return;
    }
    estado.categoriasDiversos = estado.categoriasDiversos.map(c => c === nomeAntigo ? novoNome : c);
    estado.historicoDiversos.forEach(item => {
      if (item.categoria === nomeAntigo) item.categoria = novoNome;
    });
    salvarEstado();
    mostrarToast("Categoria atualizada!");
    setTimeout(() => abrirModalGerenciarCategorias(), 0);
  });
}
window.editarCategoriaSub = editarCategoriaSub;

export function excluirCategoria(nome) {
  if (nome === 'Outros') return;
  if (!confirm(`Excluir "${nome}"? Gastos já lançados nessa categoria passam a contar como "Outros".`)) return;
  estado.categoriasDiversos = (estado.categoriasDiversos || []).filter(c => c !== nome);
  estado.historicoDiversos.forEach(item => {
    if (item.categoria === nome) item.categoria = 'Outros';
  });
  salvarEstado();
  mostrarToast("Categoria excluída.", "var(--accent-red)");
  setTimeout(() => abrirModalGerenciarCategorias(), 0);
}
window.excluirCategoria = excluirCategoria;

export function abrirModalGerenciarCartoes() {
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <span style="font-size:0.65rem; color:var(--text-muted)">Seus Cartões</span>
      <button class="mini-btn-box" style="background:var(--accent-green); color:#000" onclick="window.abrirNovoCartaoSub()">+ Adicionar</button>
    </div>
    <div class="history-list">
  `;
  if (!estado.cartoes || estado.cartoes.length === 0) {
    html += `<p style="font-size:0.7rem; color:var(--text-muted); text-align:center; padding:6px;">Nenhum cartão cadastrado.</p>`;
  } else {
    estado.cartoes.forEach(c => {
      let corNome = c.cor === 'purple' ? 'Roxo' : c.cor === 'blue' ? 'Azul' : c.cor === 'green' ? 'Verde' : c.cor === 'orange' ? 'Laranja' : 'Amarelo';
      html += `
        <div class="history-item">
          <div>
            <strong>${c.nome}</strong>
            <div style="font-size:0.58rem; color:var(--text-muted);">Cor: ${corNome}</div>
          </div>
          <div style="display:flex; gap: 3px;">
            <button class="mini-btn-box" onclick="window.abrirModalEditarCartao(${c.id})">✏️</button>
            <button class="mini-btn-box" style="background:var(--accent-red); color:white;" onclick="window.excluirCartao(${c.id})">❌</button>
          </div>
        </div>
      `;
    });
  }
  html += `</div><button style="width:100%; margin-top:6px; background:#374151; color:white; padding:5px; border-radius:6px; border:none; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>`;
  abrirModal("💳 Gerenciar Cartões", html, null);
}
window.abrirModalGerenciarCartoes = abrirModalGerenciarCartoes;

export function abrirNovoCartaoSub() {
  abrirModal("➕ Adicionar Cartão", `
    <input type="text" id="inputNomeCartao" placeholder="Nome do Cartão">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Cor:</label>
    <select id="inputCorCartao">
      <option value="purple">Roxo</option>
      <option value="blue">Azul</option>
      <option value="green">Verde</option>
      <option value="orange">Laranja</option>
      <option value="yellow">Amarelo</option>
    </select>
    <div style="display:flex; gap:6px; margin-top:3px;">
      <div style="flex:1;">
        <label style="font-size:0.6rem; color:var(--text-muted); display:block;">Dia Fechamento:</label>
        <input type="number" id="inputFechamentoCartao" min="1" max="31" placeholder="Ex: 25">
      </div>
      <div style="flex:1;">
        <label style="font-size:0.6rem; color:var(--text-muted); display:block;">Dia Vencimento:</label>
        <input type="number" id="inputVencimentoCartao" min="1" max="31" placeholder="Ex: 5">
      </div>
    </div>
  `, () => {
    let nome = document.getElementById('inputNomeCartao').value || "Cartão";
    let cor = document.getElementById('inputCorCartao').value;
    let diaFechamento = parseInt(document.getElementById('inputFechamentoCartao').value);
    let diaVencimento = parseInt(document.getElementById('inputVencimentoCartao').value);
    if (!diaFechamento || diaFechamento < 1 || diaFechamento > 31 || !diaVencimento || diaVencimento < 1 || diaVencimento > 31) {
      mostrarToast("Informe o dia de fechamento e vencimento (1 a 31).", "var(--accent-red)");
      return;
    }
    if (!estado.cartoes) estado.cartoes = [];
    estado.cartoes.push({ id: Date.now(), nome, cor, diaFechamento, diaVencimento });
    salvarEstado();
    mostrarToast("Cartão adicionado!");
    abrirModalGerenciarCartoes();
  });
}
window.abrirNovoCartaoSub = abrirNovoCartaoSub;

export function abrirModalEditarCartao(id) {
  let c = estado.cartoes.find(x => x.id === id);
  if (!c) return;
  abrirModal("✏️ Editar Cartão", `
    <input type="text" id="editNomeCartao" value="${c.nome}">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Cor:</label>
    <select id="editCorCartao">
      <option value="purple" ${c.cor === 'purple' ? 'selected' : ''}>Roxo</option>
      <option value="blue" ${c.cor === 'blue' ? 'selected' : ''}>Azul</option>
      <option value="green" ${c.cor === 'green' ? 'selected' : ''}>Verde</option>
      <option value="orange" ${c.cor === 'orange' ? 'selected' : ''}>Laranja</option>
      <option value="yellow" ${c.cor === 'yellow' ? 'selected' : ''}>Amarelo</option>
    </select>
    <div style="display:flex; gap:6px; margin-top:3px;">
      <div style="flex:1;">
        <label style="font-size:0.6rem; color:var(--text-muted); display:block;">Dia Fechamento:</label>
        <input type="number" id="editFechamentoCartao" min="1" max="31" value="${c.diaFechamento || ''}">
      </div>
      <div style="flex:1;">
        <label style="font-size:0.6rem; color:var(--text-muted); display:block;">Dia Vencimento:</label>
        <input type="number" id="editVencimentoCartao" min="1" max="31" value="${c.diaVencimento || ''}">
      </div>
    </div>
  `, () => {
    let diaFechamento = parseInt(document.getElementById('editFechamentoCartao').value);
    let diaVencimento = parseInt(document.getElementById('editVencimentoCartao').value);
    if (!diaFechamento || diaFechamento < 1 || diaFechamento > 31 || !diaVencimento || diaVencimento < 1 || diaVencimento > 31) {
      mostrarToast("Informe o dia de fechamento e vencimento (1 a 31).", "var(--accent-red)");
      return;
    }
    c.nome = document.getElementById('editNomeCartao').value || "Cartão";
    c.cor = document.getElementById('editCorCartao').value;
    c.diaFechamento = diaFechamento;
    c.diaVencimento = diaVencimento;
    salvarEstado();
    mostrarToast("Cartão atualizado!");
    abrirModalGerenciarCartoes();
  });
}
window.abrirModalEditarCartao = abrirModalEditarCartao;

export function excluirCartao(id) {
  if (confirm("Deseja excluir este cartão?")) {
    estado.cartoes = estado.cartoes.filter(c => c.id !== id);
    salvarEstado();
    mostrarToast("Cartão removido.", "var(--accent-red)");
    abrirModalGerenciarCartoes();
  }
}
window.excluirCartao = excluirCartao;

let __ultimoCardIdAberto = null;

export function abrirPainelCartao(cardId) {
  let cartao = estado.cartoes.find(c => c.id === cardId);
  if (!cartao) return;
  __ultimoCardIdAberto = cardId;
  let mesFiltro = getMesAnoSelecionado();
  let compras = (estado.comprasCartoes[mesFiltro] && estado.comprasCartoes[mesFiltro][cardId]) || [];

  let diaFechamento = cartao.diaFechamento || 1;
  let diaVencimento = cartao.diaVencimento || 10;
  let [ano, mes] = mesFiltro.split('-').map(Number);
  let mesAntObj = somarMeses(ano, mes, -1);
  let mesAnt = `${mesAntObj.ano}-${String(mesAntObj.mes).padStart(2, '0')}`;

  let residualAnterior = 0;
  if (faturaJaFechou(mesFiltro, diaFechamento, diaVencimento)) {
    residualAnterior = saldoDevedorFatura(mesAnt, cardId, diaFechamento, diaVencimento);
  }

  let html = cabecalhoComSetasDeMes('__reabrirPainelCartao');
  html += `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <span style="font-size:0.65rem; color:var(--text-muted)">Compras (${mesFiltro})</span>
      <button class="mini-btn-box" style="background:var(--accent-green); color:#000" onclick="window.abrirModalLancarCompraCartao(${cardId})">+ Compra</button>
    </div>
    <div class="history-list">
  `;

  if (residualAnterior > 0.005) {
    html += `
      <div class="history-item" style="border-left: 3px solid var(--accent-red);">
        <div>
          <strong>Saldo Fatura Anterior (Pendente)</strong>
          <div style="font-size:0.58rem; color:var(--accent-red);">Espelho do saldo devedor do mês anterior</div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <span style="font-weight:700; color:var(--accent-red);">R$ ${residualAnterior.toFixed(2)}</span>
          <span style="font-size:0.58rem; color:var(--text-muted); background:var(--bg); padding:2px 4px; border-radius:3px;">Anterior</span>
        </div>
      </div>
    `;
  }

  if (compras.length === 0 && residualAnterior <= 0.005) {
    html += `<p style="font-size:0.7rem; color:var(--text-muted); text-align:center; padding:6px;">Nenhuma compra neste mês.</p>`;
  } else {
    compras.forEach(cp => {
      let ehSerie = cp.idGrupo && cp.periodicidade && cp.periodicidade !== 'UNICA';
      html += `
        <div class="history-item">
          <div>
            <strong>${cp.desc}</strong>
            <div style="font-size:0.58rem; color:var(--text-muted);">${cp.data}${ehSerie ? (cp.periodicidade === 'SEMPRE' ? ' · recorrente' : ' · parcelado') : ''}</div>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-weight:700; color:var(--accent-red);">R$ ${cp.valor.toFixed(2)}</span>
            <button class="mini-btn-box" onclick="window.abrirModalEditarCompra(${cardId}, ${cp.id}, '${mesFiltro}')">✏️</button>
            <button class="mini-btn-box" style="background:var(--accent-red); color:white;" onclick="window.excluirCompraCartao(${cardId}, ${cp.id}, '${mesFiltro}')">❌</button>
            ${ehSerie ? `<button class="mini-btn-box" style="background:#7c2d12; color:white; font-size:0.55rem;" onclick="window.excluirSerieCompraCartao('${cp.idGrupo}')" title="Excluir toda a série">🗑️ Série</button>` : ''}
          </div>
        </div>
      `;
    });
  }
  html += `</div><button style="width:100%; margin-top:6px; background:#374151; color:white; padding:5px; border-radius:6px; border:none; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>`;
  abrirModal(`💳 ${cartao.nome}`, html, null);
}
window.abrirPainelCartao = abrirPainelCartao;
window.__reabrirPainelCartao = () => { if (__ultimoCardIdAberto !== null) abrirPainelCartao(__ultimoCardIdAberto); };

export function abrirModalEditarCompra(cardId, compraId, mesFiltro) {
  let compras = estado.comprasCartoes[mesFiltro][cardId];
  let cp = compras.find(x => x.id === compraId);
  if (!cp) return;
  let cartao = estado.cartoes.find(c => c.id === cardId);

  abrirModal("✏️ Editar Compra", `
     <input type="number" id="editValCompra" value="${cp.valor}" step="0.01">
     <input type="text" id="editDescCompra" value="${cp.desc}" style="margin-top:3px;">
     <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
     <input type="date" id="editDataCompra" value="${cp.data}">
  `, () => {
     cp.valor = parseFloat(document.getElementById('editValCompra').value) || cp.valor;
     cp.desc = document.getElementById('editDescCompra').value || cp.desc;
     let novaData = document.getElementById('editDataCompra').value || cp.data;
     cp.data = novaData;

     let diaFechamento = (cartao && cartao.diaFechamento) || 1;
     let diaVencimento = (cartao && cartao.diaVencimento) || 10;
     let novoMesFatura = calcularMesFaturaCartao(novaData, diaFechamento, diaVencimento);

     if (novoMesFatura !== mesFiltro) {
       estado.comprasCartoes[mesFiltro][cardId] = estado.comprasCartoes[mesFiltro][cardId].filter(x => x.id !== compraId);
       if (!estado.comprasCartoes[novoMesFatura]) estado.comprasCartoes[novoMesFatura] = {};
       if (!estado.comprasCartoes[novoMesFatura][cardId]) estado.comprasCartoes[novoMesFatura][cardId] = [];
       estado.comprasCartoes[novoMesFatura][cardId].push(cp);
     }

     salvarEstado();
     mostrarToast(novoMesFatura !== mesFiltro ? `Compra atualizada e movida para a fatura de ${novoMesFatura}!` : "Compra atualizada!");
     setTimeout(() => abrirPainelCartao(cardId), 0);
  });
}
window.abrirModalEditarCompra = abrirModalEditarCompra;

export function abrirModalLancarCompraCartao(cardId) {
  let cartao = estado.cartoes.find(c => c.id === cardId);
  abrirModal("🛒 Lançar Compra", `
    <input type="number" id="inputValCompra" placeholder="Valor (R$)" step="0.01" autofocus>
    <input type="text" id="inputDescCompra" placeholder="Descrição" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Frequência:</label>
    <select id="selectPeriodoCompra" onchange="window.toggleCampoParcelasCompra(this.value)">
      <option value="UNICA">Única (só esta compra)</option>
      <option value="PARCELADO">Parcelado</option>
      <option value="SEMPRE">Recorrente (assinatura mensal)</option>
    </select>
    <div id="boxParcelasCompra" style="display:none; margin-top:3px;">
      <label style="font-size:0.6rem; color:var(--text-muted);">Número de parcelas:</label>
      <input type="number" id="inputParcelasCompra" value="2" min="2">
    </div>
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data da compra:</label>
    <input type="date" id="inputDataCompra" value="${dataHojeISO}">
  `, () => {
    let val = parseFloat(document.getElementById('inputValCompra').value) || 0;
    let desc = document.getElementById('inputDescCompra').value || "Compra Cartão";
    let data = document.getElementById('inputDataCompra').value || dataHojeISO;
    let periodicidade = document.getElementById('selectPeriodoCompra').value;
    let parcelas = parseInt(document.getElementById('inputParcelasCompra').value) || 2;
    if (val > 0) {
      let diaFechamento = (cartao && cartao.diaFechamento) || 1;
      let diaVencimento = (cartao && cartao.diaVencimento) || 10;
      lancarComprasCartao(cardId, desc, val, data, diaFechamento, diaVencimento, periodicidade, parcelas);
      salvarEstado();
      mostrarToast(periodicidade === 'UNICA' ? "Compra lançada!" : "Compra lançada em todas as faturas!");
    }
  });
}
window.abrirModalLancarCompraCartao = abrirModalLancarCompraCartao;

export function toggleCampoParcelasCompra(val) {
  let box = document.getElementById('boxParcelasCompra');
  if (box) box.style.display = (val === 'PARCELADO') ? 'block' : 'none';
}
window.toggleCampoParcelasCompra = toggleCampoParcelasCompra;

export function excluirCompraCartao(cardId, compraId, mesFiltro) {
  if (estado.comprasCartoes[mesFiltro] && estado.comprasCartoes[mesFiltro][cardId]) {
    estado.comprasCartoes[mesFiltro][cardId] = estado.comprasCartoes[mesFiltro][cardId].filter(c => c.id !== compraId);
    salvarEstado();
    mostrarToast("Compra removida.");
    abrirPainelCartao(cardId);
  }
}
window.excluirCompraCartao = excluirCompraCartao;

export function excluirSerieCompraCartao(idGrupo) {
  if (!confirm("Remover TODAS as parcelas/ocorrências desta série, em todos os meses (inclusive futuros)?")) return;
  let cardIdAfetado = null;
  Object.keys(estado.comprasCartoes).forEach(mes => {
    Object.keys(estado.comprasCartoes[mes]).forEach(cardId => {
      let antes = estado.comprasCartoes[mes][cardId].length;
      estado.comprasCartoes[mes][cardId] = estado.comprasCartoes[mes][cardId].filter(c => c.idGrupo !== idGrupo);
      if (estado.comprasCartoes[mes][cardId].length !== antes) cardIdAfetado = cardId;
    });
  });
  salvarEstado();
  mostrarToast("Série removida de todas as faturas.");
  if (cardIdAfetado) setTimeout(() => abrirPainelCartao(cardIdAfetado), 0);
}
window.excluirSerieCompraCartao = excluirSerieCompraCartao;

export function abrirModalPagarFaturaParcial(cardId, mesFiltro) {
  let cartao = estado.cartoes.find(c => c.id === cardId);
  if (!cartao) return;
  let diaFechamento = cartao.diaFechamento || 1;
  let diaVencimento = cartao.diaVencimento || 10;
  let saldoDevedor = saldoDevedorFatura(mesFiltro, cardId, diaFechamento, diaVencimento);
  let info = (estado.pagamentosCartoes[mesFiltro] && estado.pagamentosCartoes[mesFiltro][cardId]) || { pagamentos: [] };

  let htmlPagamentos = info.pagamentos.length === 0
    ? `<p style="font-size:0.65rem; color:var(--text-muted); text-align:center; padding:4px;">Nenhum pagamento registrado ainda.</p>`
    : info.pagamentos.map((p) => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.68rem; background:var(--bg); border:1px solid var(--card-border); border-radius:5px; padding:4px 6px; margin-top:3px;">
          <span>R$ ${p.valor.toFixed(2)} <span style="color:var(--text-muted);">em ${p.data.split('-').reverse().join('/')}</span></span>
          <div style="display:flex; gap:3px;">
            <button class="mini-btn-box" onclick="window.editarPagamentoCartao(${cardId}, '${mesFiltro}', ${p.id})"><i class="fa-solid fa-pen"></i></button>
            <button class="mini-btn-box" style="color:var(--accent-red);" onclick="window.excluirPagamentoCartao(${cardId}, '${mesFiltro}', ${p.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('');

  abrirModal(`💳 Fatura: ${cartao.nome}`, `
    <p style="font-size:0.75rem; color:var(--text-muted);">Saldo devedor: <strong style="color:var(--accent-red);">R$ ${saldoDevedor.toFixed(2)}</strong></p>
    <div style="margin-top:6px;">${htmlPagamentos}</div>
    <div style="margin-top:10px; border-top:1px solid var(--card-border); padding-top:8px;">
      <label style="font-size:0.65rem; color:var(--text-muted); display:block;">Registrar pagamento (pode ser parcial):</label>
      <input type="number" id="inputValorPagamento" placeholder="Valor (R$)" step="0.01" value="${saldoDevedor > 0 ? saldoDevedor.toFixed(2) : ''}">
      <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data do pagamento:</label>
      <input type="date" id="inputDataPagamento" value="${dataHojeISO}">
    </div>
  `, () => {
    let valor = parseFloat(document.getElementById('inputValorPagamento').value) || 0;
    let data = document.getElementById('inputDataPagamento').value || dataHojeISO;
    if (valor <= 0) return;
    if (!currentUser) {
      mostrarToast("Faça login com o Google.", "var(--accent-orange)");
      return;
    }
    if (!estado.pagamentosCartoes[mesFiltro]) estado.pagamentosCartoes[mesFiltro] = {};
    if (!estado.pagamentosCartoes[mesFiltro][cardId]) estado.pagamentosCartoes[mesFiltro][cardId] = { pagamentos: [] };
    estado.pagamentosCartoes[mesFiltro][cardId].pagamentos.push({ id: Date.now(), valor, data });
    estado.recebidos -= valor;
    let novoSaldo = saldoDevedorFatura(mesFiltro, cardId, diaFechamento, diaVencimento);
    if (novoSaldo <= 0.005) soltarConfete();
    salvarEstado();
    mostrarToast(novoSaldo <= 0.005 ? "Fatura quitada!" : "Pagamento registrado!");
  });
}
window.abrirModalPagarFaturaParcial = abrirModalPagarFaturaParcial;

export function editarPagamentoCartao(cardId, mesFiltro, pagamentoId) {
  let info = estado.pagamentosCartoes[mesFiltro] && estado.pagamentosCartoes[mesFiltro][cardId];
  if (!info) return;
  let pgto = info.pagamentos.find(p => p.id === pagamentoId);
  if (!pgto) return;
  abrirModal("✏️ Editar Pagamento", `
    <input type="number" id="editValorPagamento" value="${pgto.valor}" step="0.01">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="editDataPagamento" value="${pgto.data}">
  `, () => {
    let novoValor = parseFloat(document.getElementById('editValorPagamento').value);
    let novaData = document.getElementById('editDataPagamento').value;
    if (isNaN(novoValor) || novoValor <= 0) return;
    estado.recebidos += pgto.valor;
    pgto.valor = novoValor;
    pgto.data = novaData || pgto.data;
    estado.recebidos -= novoValor;
    salvarEstado();
    mostrarToast("Pagamento atualizado!");
    setTimeout(() => abrirModalPagarFaturaParcial(cardId, mesFiltro), 0);
  });
}
window.editarPagamentoCartao = editarPagamentoCartao;

export function excluirPagamentoCartao(cardId, mesFiltro, pagamentoId) {
  let info = estado.pagamentosCartoes[mesFiltro] && estado.pagamentosCartoes[mesFiltro][cardId];
  if (!info) return;
  let pgto = info.pagamentos.find(p => p.id === pagamentoId);
  if (!pgto) return;
  estado.recebidos += pgto.valor;
  info.pagamentos = info.pagamentos.filter(p => p.id !== pagamentoId);
  salvarEstado();
  mostrarToast("Pagamento removido. Valor estornado.");
  setTimeout(() => abrirModalPagarFaturaParcial(cardId, mesFiltro), 0);
}
window.excluirPagamentoCartao = excluirPagamentoCartao;

export function abrirModalEditarBlocos() {
  abrirModal("✏️ Editar Nomes dos Blocos", `
    <label style="font-size:0.65rem; color:var(--text-muted)">Saldo Disponível:</label>
    <input type="text" id="nomeRec" value="${estado.nomesBlocos.recebidos}">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px;">Despesas Diversas:</label>
    <input type="text" id="nomeDiv" value="${estado.nomesBlocos.diversos}">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px;">Despesas Fixas:</label>
    <input type="text" id="nomeFix" value="${estado.nomesBlocos.fixas}">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px;">Investidos:</label>
    <input type="text" id="nomeInv" value="${estado.nomesBlocos.investido}">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px;">Reserva de Emergência:</label>
    <input type="text" id="nomeCof" value="${estado.nomesBlocos.cofre}">
  `, () => {
    estado.nomesBlocos.recebidos = document.getElementById('nomeRec').value || estado.nomesBlocos.recebidos;
    estado.nomesBlocos.diversos = document.getElementById('nomeDiv').value || estado.nomesBlocos.diversos;
    estado.nomesBlocos.fixas = document.getElementById('nomeFix').value || estado.nomesBlocos.fixas;
    estado.nomesBlocos.investido = document.getElementById('nomeInv').value || estado.nomesBlocos.investido;
    estado.nomesBlocos.cofre = document.getElementById('nomeCof').value || estado.nomesBlocos.cofre;
    salvarEstado();
    mostrarToast("Nomes atualizados!");
  });
}
window.abrirModalEditarBlocos = abrirModalEditarBlocos;

export function resetarTudo() {
  if (confirm("⚠️ Deseja ZERAR todos os dados?")) {
    Object.keys(estado).forEach(k => delete estado[k]);
    Object.assign(estado, JSON.parse(JSON.stringify(ESTADO_INICIAL)));
    salvarEstado();
    toggleSidebar();
    mostrarToast("Sistema resetado!", "var(--accent-red)");
  }
}
window.resetarTudo = resetarTudo;

export function abrirModalEditarSaldos() {
  let mesFiltro = getMesAnoSelecionado();
  let investidoAtual = calcularSomaHistoricoPassado(estado.historicoInvestido, mesFiltro);
  let cofreAtual = calcularSomaHistoricoPassado(estado.historicoCofre, mesFiltro);

  abrirModal("✏️ Editar Saldos Gerais", `
    <label style="font-size:0.65rem; color:var(--text-muted)">Saldo Disponível (R$):</label>
    <input type="number" id="editRecebidos" value="${estado.recebidos}" step="0.01">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px;">Investido (R$):</label>
    <input type="number" id="editInvestido" value="${investidoAtual}" step="0.01">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px;">Reserva (R$):</label>
    <input type="number" id="editCofre" value="${cofreAtual}" step="0.01">
  `, () => {
    estado.recebidos = parseFloat(document.getElementById('editRecebidos').value) || 0;
    let novoInv = parseFloat(document.getElementById('editInvestido').value) || 0;
    let novoCof = parseFloat(document.getElementById('editCofre').value) || 0;

    estado.historicoInvestido.push({ id: Date.now(), valor: novoInv, desc: "Ajuste Manual", data: `${mesFiltro}-01`, tipo: 'aporte' });
    estado.historicoCofre.push({ id: Date.now() + 1, valor: novoCof, desc: "Ajuste Manual", data: `${mesFiltro}-01`, tipo: 'aporte' });

    salvarEstado();
    mostrarToast("Saldos atualizados!");
  });
}
window.abrirModalEditarSaldos = abrirModalEditarSaldos;

export function abrirModalMetas() {
  abrirModal("⚙️ Configurar Metas", `
    <label style="font-size:0.65rem; color:var(--text-muted)">Meta Limite Despesas Diversas (R$):</label>
    <input type="number" id="metaDiv" value="${estado.metas.diversos}">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px; display:block;">Meta de Investimento (R$):</label>
    <input type="number" id="metaInvest" value="${estado.metas.investimento || 500}">
    <label style="font-size:0.65rem; color:var(--text-muted); margin-top:3px;">Reserva (Qtd Meses Fixas):</label>
    <input type="number" id="metaMesesReserva" value="${estado.metas.mesesReserva || 6}" min="1" max="36">
  `, () => {
    estado.metas.diversos = parseFloat(document.getElementById('metaDiv').value) || 200;
    estado.metas.investimento = parseFloat(document.getElementById('metaInvest').value) || 500;
    estado.metas.mesesReserva = parseInt(document.getElementById('metaMesesReserva').value) || 6;
    salvarEstado();
    mostrarToast("Metas atualizadas!");
  });
}
window.abrirModalMetas = abrirModalMetas;

// --- Adicionar Saldo (Vinculado a Receitas Pendentes se futuro ou recorrente) ---
export function abrirModalEntrada() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  abrirModal("💰 Adicionar Saldo", `
    <input type="number" id="inputValor" placeholder="Valor (R$)" step="0.01" autofocus>
    <input type="text" id="inputDesc" placeholder="Descrição" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Frequência:</label>
    <select id="selectPeriodoEntrada" onchange="window.toggleCampoRepeticaoEntrada(this.value)">
      <option value="UNICA">Único (Apenas este mês)</option>
      <option value="PARCELADO">Repete por X meses</option>
      <option value="SEMPRE">Fixo todos os meses</option>
    </select>
    <div id="boxRepeticaoEntrada" style="display:none; margin-top:3px;">
      <label style="font-size:0.6rem; color:var(--text-muted);">Repetir por quantos meses:</label>
      <input type="number" id="inputMesesEntrada" value="2" min="2">
    </div>
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="inputData" value="${dataHojeISO}">
  `, () => {
    let val = parseFloat(document.getElementById('inputValor').value) || 0;
    let desc = document.getElementById('inputDesc').value || "Recebimento";
    let data = document.getElementById('inputData').value || dataHojeISO;
    let periodicidade = document.getElementById('selectPeriodoEntrada').value;
    let parcelas = periodicidade === 'PARCELADO' ? (parseInt(document.getElementById('inputMesesEntrada').value) || 2) : 1;

    if (val > 0) {
      let ehFuturo = data > dataHojeISO;

      if (ehFuturo || periodicidade !== 'UNICA') {
        // Vai para Receitas Pendentes (futuro ou recorrente)
        if (!estado.aReceber) estado.aReceber = [];
        let itemPend = {
          id: Date.now(),
          descricao: desc,
          valor: val,
          periodicidade,
          parcelas,
          data,
          recebidosMeses: [],
          recebimentos: {}
        };

        // Se a data de início for hoje ou no passado, efetiva o recebimento do mês atual
        if (!ehFuturo) {
          let mesInicio = data.slice(0, 7);
          itemPend.recebidosMeses.push(mesInicio);
          itemPend.recebimentos[mesInicio] = data;
          estado.recebidos += val;
          estado.historicoRecebidos.push({
            id: Date.now() + 1,
            valor: val,
            desc: desc,
            data: data,
            tipo: 'entrada',
            origemAReceberId: itemPend.id,
            origemAReceberMes: mesInicio
          });
        }

        estado.aReceber.push(itemPend);
        soltarConfete();
        salvarEstado();
        mostrarToast(ehFuturo ? "Agendado em Receitas Pendentes!" : "Cadastrado e vinculado a Receitas Pendentes!");
      } else {
        // Data atual/passada e ÚNICA -> Efetiva imediatamente no Saldo Disponível
        estado.recebidos += val;
        estado.historicoRecebidos.push({
          id: Date.now(),
          valor: val,
          desc: desc,
          data: data,
          tipo: 'entrada'
        });
        soltarConfete();
        salvarEstado();
        mostrarToast("Saldo adicionado!");
      }
    }
  });
}
window.abrirModalEntrada = abrirModalEntrada;

export function toggleCampoRepeticaoEntrada(val) {
  let box = document.getElementById('boxRepeticaoEntrada');
  if (box) box.style.display = val === 'PARCELADO' ? 'block' : 'none';
}
window.toggleCampoRepeticaoEntrada = toggleCampoRepeticaoEntrada;

export function abrirModalGasto() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  let opcoesCategorias = (estado.categoriasDiversos || ['Outros']).map(c => `<option value="${c}">${c}</option>`).join('');
  abrirModal("🛒 Despesas Diversas", `
    <input type="number" id="inputValor" placeholder="Valor (R$)" step="0.01" autofocus>
    <input type="text" id="inputDesc" placeholder="Descrição" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Categoria:</label>
    <select id="inputCategoria">${opcoesCategorias}</select>
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="inputData" value="${dataHojeISO}">
  `, () => {
    let val = parseFloat(document.getElementById('inputValor').value) || 0;
    let desc = document.getElementById('inputDesc').value || "Despesa Diversa";
    let categoria = document.getElementById('inputCategoria').value || 'Outros';
    let data = document.getElementById('inputData').value || dataHojeISO;
    if (val > 0) {
      estado.recebidos -= val;
      estado.historicoDiversos.push({ id: Date.now(), valor: val, desc: desc, data: data, categoria: categoria });

      let mesFiltro = data.slice(0, 7);
      let acumuladoMes = estado.historicoDiversos
        .filter(g => g.data && g.data.startsWith(mesFiltro))
        .reduce((acc, c) => acc + c.valor, 0);

      if (acumuladoMes > estado.metas.diversos) {
        estado.trofeus = Math.max(0, (estado.trofeus || 5) - 1);
        mostrarToast("⚠️ Limite de Despesas Diversas ultrapassado!", "var(--accent-red)");
      } else {
        recalcularEstrelas(mesFiltro);
        mostrarToast("Gasto registrado!");
      }
      salvarEstado();
    }
  });
}
window.abrirModalGasto = abrirModalGasto;

export function verHistorico(tipo) {
  let mesFiltro = getMesAnoSelecionado();
  let lista = [];
  let titulo = "";

  if (tipo === 'recebidos') { lista = estado.historicoRecebidos; titulo = `Histórico de Saldo (${mesFiltro})`; }
  else if (tipo === 'diversos') { lista = estado.historicoDiversos; titulo = `Despesas Diversas (${mesFiltro})`; }
  else if (tipo === 'investido') { lista = estado.historicoInvestido; titulo = `Investimentos (${mesFiltro})`; }
  else if (tipo === 'cofre') { lista = estado.historicoCofre; titulo = `Reserva (${mesFiltro})`; }

  let listaFiltrada = lista.filter(h => h.data && h.data.startsWith(mesFiltro));
  let html = cabecalhoComSetasDeMes('__reabrirVerHistorico_' + tipo);
  html += `<div class="history-list">`;
  if (listaFiltrada.length === 0) {
    html += `<p style="font-size:0.7rem; color:var(--text-muted); text-align:center;">Nenhum registro.</p>`;
  } else {
    listaFiltrada.slice().reverse().forEach(h => {
      let dataFmt = h.data ? h.data.split('-').reverse().join('/') : '';
      let corValor = (h.tipo === 'resgate' || tipo === 'diversos') ? 'var(--accent-red)' : 'var(--accent-green)';
      let sinal = h.tipo === 'resgate' ? '-' : '+';
      if (tipo === 'diversos') sinal = '-';
      let categoriaLabel = (tipo === 'diversos') ? ` · ${h.categoria || 'Outros'}` : '';
      html += `
        <div class="history-item">
          <div>
            <strong>${h.desc}</strong>
            <div style="font-size:0.58rem; color:var(--text-muted);">${dataFmt}${categoriaLabel}</div>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-weight:700; color:${corValor};">${sinal} R$ ${h.valor.toFixed(2)}</span>
            <button class="mini-btn-box" onclick="window.editarItemHistorico('${tipo}', ${h.id})">✏️</button>
          </div>
        </div>
      `;
    });
  }
  html += `</div><button style="width:100%; margin-top:6px; background:#374151; color:white; padding:5px; border-radius:6px; border:none; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>`;
  abrirModal(titulo, html, null);
}
window.verHistorico = verHistorico;
window.__reabrirVerHistorico_recebidos = () => verHistorico('recebidos');
window.__reabrirVerHistorico_diversos = () => verHistorico('diversos');
window.__reabrirVerHistorico_investido = () => verHistorico('investido');
window.__reabrirVerHistorico_cofre = () => verHistorico('cofre');

export function editarItemHistorico(tipo, id) {
  let lista = null;
  if (tipo === 'recebidos') lista = estado.historicoRecebidos;
  else if (tipo === 'diversos') lista = estado.historicoDiversos;
  else if (tipo === 'investido') lista = estado.historicoInvestido;
  else if (tipo === 'cofre') lista = estado.historicoCofre;

  if (!lista) return;
  let item = lista.find(i => i.id === id);
  if (!item) return;

  let campoCategoria = (tipo === 'diversos')
    ? `<label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Categoria:</label>
       <select id="editCategoria">${(estado.categoriasDiversos || ['Outros']).map(c => `<option value="${c}" ${((item.categoria || 'Outros') === c) ? 'selected' : ''}>${c}</option>`).join('')}</select>`
    : '';

  abrirModal("✏️ Editar Item", `
    <input type="number" id="editVal" value="${item.valor}" step="0.01">
    <input type="text" id="editDesc" value="${item.desc}" style="margin-top:3px;">
    ${campoCategoria}
    <button style="width:100%; margin-top:8px; background:var(--accent-red); color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer;" onclick="window.deletarItemHistorico('${tipo}', ${id})">Excluir Item</button>
  `, () => {
    item.valor = parseFloat(document.getElementById('editVal').value) || item.valor;
    item.desc = document.getElementById('editDesc').value || item.desc;
    if (tipo === 'diversos') {
      let campoCat = document.getElementById('editCategoria');
      if (campoCat) item.categoria = campoCat.value;
    }
    salvarEstado();
    mostrarToast("Atualizado!");
  });
}
window.editarItemHistorico = editarItemHistorico;

export function deletarItemHistorico(tipo, id) {
  if (confirm("Deseja excluir este item?")) {
    if (tipo === 'recebidos') estado.historicoRecebidos = estado.historicoRecebidos.filter(i => i.id !== id);
    else if (tipo === 'diversos') estado.historicoDiversos = estado.historicoDiversos.filter(i => i.id !== id);
    else if (tipo === 'investido') estado.historicoInvestido = estado.historicoInvestido.filter(i => i.id !== id);
    else if (tipo === 'cofre') estado.historicoCofre = estado.historicoCofre.filter(i => i.id !== id);

    fecharModal();
    salvarEstado();
    mostrarToast("Item excluído.", "var(--accent-red)");
  }
}
window.deletarItemHistorico = deletarItemHistorico;

export function togglePagarFixa(id, mesFiltro) {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  let item = estado.fixas.find(f => f.id === id);
  if (!item) return;
  if (!estado.pagamentosFixas[mesFiltro]) estado.pagamentosFixas[mesFiltro] = {};

  let jaPago = !!estado.pagamentosFixas[mesFiltro][id];
  if (jaPago) {
    delete estado.pagamentosFixas[mesFiltro][id];
    estado.recebidos += item.valor;
    mostrarToast(`Pagamento desfeito.`);
  } else {
    estado.pagamentosFixas[mesFiltro][id] = true;
    estado.recebidos -= item.valor;
    soltarConfete();
    mostrarToast(`Conta paga!`);
  }
  salvarEstado();
}
window.togglePagarFixa = togglePagarFixa;

export function abrirModalNovaDespesaFixa() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  abrirModal("➕ Nova Despesa Fixa", `
    <input type="text" id="inputNome" placeholder="Nome">
    <input type="number" id="inputValor" placeholder="Valor (R$)" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Frequência:</label>
    <select id="selectPeriodo" onchange="window.toggleCampoParcelas(this.value)">
      <option value="SEMPRE">Sempre (Todos os meses)</option>
      <option value="PARCELADO">Repetir por X meses</option>
      <option value="UNICA">Apenas este mês</option>
    </select>
    <div id="boxParcelas" style="display:none; margin-top:3px;">
      <label style="font-size:0.6rem; color:var(--text-muted);">Parcelas:</label>
      <input type="number" id="inputParcelas" value="12" min="1">
    </div>
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data Inicial:</label>
    <input type="date" id="inputData" value="${dataHojeISO}">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Dia de vencimento (opcional, para lembrete):</label>
    <input type="number" id="inputDiaVencimentoFixa" min="1" max="31" placeholder="Ex: 10">
  `, () => {
    let nome = document.getElementById('inputNome').value;
    let val = parseFloat(document.getElementById('inputValor').value) || 0;
    let periodo = document.getElementById('selectPeriodo').value;
    let parcelas = parseInt(document.getElementById('inputParcelas').value) || 1;
    let data = document.getElementById('inputData').value || dataHojeISO;
    let diaVencimentoInput = parseInt(document.getElementById('inputDiaVencimentoFixa').value);
    let diaVencimento = (diaVencimentoInput >= 1 && diaVencimentoInput <= 31) ? diaVencimentoInput : null;
    if (nome && val > 0) {
      estado.fixas.push({ id: Date.now(), nome, valor: val, periodicidade: periodo, parcelas, data, diaVencimento });
      salvarEstado();
      mostrarToast("Despesa fixa cadastrada!");
    }
  });
}
window.abrirModalNovaDespesaFixa = abrirModalNovaDespesaFixa;

export function toggleCampoParcelas(val) {
  let box = document.getElementById('boxParcelas');
  if (box) box.style.display = val === 'PARCELADO' ? 'block' : 'none';
}
window.toggleCampoParcelas = toggleCampoParcelas;

export function abrirOpcoesFixa(id) {
  let item = estado.fixas.find(f => f.id === id);
  if (!item) return;
  abrirModal("⚙️ Despesa Fixa", `
    <input type="text" id="editNome" value="${item.nome}">
    <input type="number" id="editValor" value="${item.valor}" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Dia de vencimento (opcional, para lembrete):</label>
    <input type="number" id="editDiaVencimentoFixa" min="1" max="31" value="${item.diaVencimento || ''}" placeholder="Ex: 10">
    <div style="margin-top:8px; display:flex; flex-direction:column; gap:5px;">
      <button style="background:var(--accent-red); color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer; font-size:0.65rem;" onclick="window.deletarFixaOpcao(${item.id}, 'mes')">Deletar somente deste mês</button>
      <button style="background:var(--accent-red); color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer; font-size:0.65rem;" onclick="window.deletarFixaOpcao(${item.id}, 'nao_pagas')">Deletar todas as não pagas</button>
      <button style="background:#7F1D1D; color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer; font-size:0.65rem;" onclick="window.deletarFixaOpcao(${item.id}, 'todas')">Deletar todas (Definitivo)</button>
    </div>
  `, () => {
    item.nome = document.getElementById('editNome').value || item.nome;
    item.valor = parseFloat(document.getElementById('editValor').value) || item.valor;
    let diaVencimentoInput = parseInt(document.getElementById('editDiaVencimentoFixa').value);
    item.diaVencimento = (diaVencimentoInput >= 1 && diaVencimentoInput <= 31) ? diaVencimentoInput : null;
    salvarEstado();
    mostrarToast("Atualizado!");
  });
}
window.abrirOpcoesFixa = abrirOpcoesFixa;

export function deletarFixaOpcao(id, tipoDelecao) {
  let mesFiltro = getMesAnoSelecionado();
  if (tipoDelecao === 'mes') {
    if (!estado.fixasExcluidasPorMes) estado.fixasExcluidasPorMes = {};
    if (!estado.fixasExcluidasPorMes[mesFiltro]) estado.fixasExcluidasPorMes[mesFiltro] = {};
    estado.fixasExcluidasPorMes[mesFiltro][id] = true;
    mostrarToast("Despesa removida apenas deste mês.");
  } else if (tipoDelecao === 'nao_pagas') {
    estado.fixas = estado.fixas.filter(f => {
      if (f.id !== id) return true;
      let pagoNesteMes = estado.pagamentosFixas[mesFiltro] && estado.pagamentosFixas[mesFiltro][id];
      return pagoNesteMes;
    });
    mostrarToast("Despesas não pagas removidas.");
  } else if (tipoDelecao === 'todas') {
    let item = estado.fixas.find(f => f.id === id);
    if (item) {
      Object.keys(estado.pagamentosFixas || {}).forEach(mesPag => {
        if (estado.pagamentosFixas[mesPag] && estado.pagamentosFixas[mesPag][id]) {
          estado.recebidos += item.valor;
          delete estado.pagamentosFixas[mesPag][id];
        }
      });
    }
    estado.fixas = estado.fixas.filter(f => f.id !== id);
    mostrarToast("Despesa fixa excluída totalmente.", "var(--accent-red)");
  }
  fecharModal();
  salvarEstado();
}
window.deletarFixaOpcao = deletarFixaOpcao;

export function abrirModalAReceber() {
  let mesFiltro = getMesAnoSelecionado();
  let html = cabecalhoComSetasDeMes('abrirModalAReceber');
  html += `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <span style="font-size:0.65rem; color:var(--text-muted)">Cobranças para ${mesFiltro}</span>
      <button class="mini-btn-box" style="background:var(--accent-green); color:#000" onclick="window.abrirNovoAReceberSub()">+ Cadastrar</button>
    </div>
    <div class="history-list">
  `;
  let pendentes = (estado.aReceber || []).filter(a => {
    if (!itemApareceNoMes(a, mesFiltro)) return false;
    let dataRecReal = a.recebimentos && a.recebimentos[mesFiltro];
    if (dataRecReal && dataRecReal.slice(0, 7) !== mesFiltro) return false;
    return true;
  });
  if (pendentes.length === 0) {
    html += `<p style="font-size:0.7rem; color:var(--text-muted); text-align:center; padding:6px;">Nenhum valor.</p>`;
  } else {
    pendentes.forEach(a => {
      let jaRecebeu = (a.recebimentos && a.recebimentos[mesFiltro]) || (a.recebidosMeses && a.recebidosMeses.includes(mesFiltro));
      let dataFmt = a.data ? a.data.split('-').reverse().join('/') : '';
      html += `
        <div class="history-item">
          <div>
            <strong>${a.descricao}</strong>
            <div style="font-size:0.58rem; color:var(--text-muted);">${dataFmt}</div>
            <div style="font-size:0.65rem; color:var(--accent-green); font-weight:700;">R$ ${a.valor.toFixed(2)}</div>
          </div>
          <div style="display:flex; gap:3px;">
            ${!jaRecebeu ? `<button class="mini-btn-pay" style="background:var(--accent-green); color:#000" onclick="window.baixarAReceber(${a.id}, '${mesFiltro}')">Recebido!</button>` : `<span style="font-size:0.6rem; color:var(--accent-green); font-weight:700;">✓ Recebido</span>`}
            <button class="mini-btn-box" onclick="window.editarAReceber(${a.id})">✏️</button>
            <button class="mini-btn-box" onclick="window.excluirAReceber(${a.id})">❌</button>
          </div>
        </div>
      `;
    });
  }
  html += `</div><button style="width:100%; margin-top:6px; background:#374151; color:white; padding:5px; border-radius:6px; border:none; cursor:pointer;" onclick="window.fecharModal()">Fechar</button>`;
  abrirModal("📥 Receitas Pendentes", html, null);
}
window.abrirModalAReceber = abrirModalAReceber;

export function abrirNovoAReceberSub() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  abrirModal("➕ Nova Receita Pendente", `
    <input type="text" id="inputDescReceber" placeholder="Descrição">
    <input type="number" id="inputValReceber" placeholder="Valor (R$)" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Repetição:</label>
    <select id="selectPeriodoReceber" onchange="window.toggleCampoRepeticaoReceber(this.value)">
      <option value="UNICA">Apenas este mês</option>
      <option value="PARCELADO">Repetir por X meses</option>
      <option value="SEMPRE">Sempre</option>
    </select>
    <div id="boxRepeticaoReceber" style="display:none; margin-top:3px;">
      <label style="font-size:0.6rem; color:var(--text-muted);">Repetir por quantos meses:</label>
      <input type="number" id="inputMesesReceber" value="2" min="2">
    </div>
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="inputDataReceber" value="${dataHojeISO}">
  `, () => {
    let desc = document.getElementById('inputDescReceber').value;
    let val = parseFloat(document.getElementById('inputValReceber').value) || 0;
    let periodicidade = document.getElementById('selectPeriodoReceber').value;
    let parcelas = periodicidade === 'PARCELADO' ? (parseInt(document.getElementById('inputMesesReceber').value) || 2) : 1;
    let data = document.getElementById('inputDataReceber').value || dataHojeISO;
    if (desc && val > 0) {
      if (!estado.aReceber) estado.aReceber = [];
      estado.aReceber.push({ id: Date.now(), descricao: desc, valor: val, periodicidade, parcelas, data, recebidosMeses: [], recebimentos: {} });
      salvarEstado();
      mostrarToast("Cadastrado!");
    }
  });
}
window.abrirNovoAReceberSub = abrirNovoAReceberSub;

export function toggleCampoRepeticaoReceber(val) {
  let box = document.getElementById('boxRepeticaoReceber');
  if (box) box.style.display = val === 'PARCELADO' ? 'block' : 'none';
}
window.toggleCampoRepeticaoReceber = toggleCampoRepeticaoReceber;

export function editarAReceber(id) {
  let item = estado.aReceber.find(a => a.id === id);
  if (!item) return;
  abrirModal("✏️ Editar Receita Pendente", `
    <input type="text" id="editDescReceber" value="${item.descricao}">
    <input type="number" id="editValReceber" value="${item.valor}" step="0.01" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Repetição:</label>
    <select id="editPeriodoReceber" onchange="window.toggleCampoRepeticaoReceberEdit(this.value)">
      <option value="UNICA" ${item.periodicidade === 'UNICA' ? 'selected' : ''}>Apenas este mês</option>
      <option value="PARCELADO" ${item.periodicidade === 'PARCELADO' ? 'selected' : ''}>Repetir por X meses</option>
      <option value="SEMPRE" ${item.periodicidade === 'SEMPRE' ? 'selected' : ''}>Sempre</option>
    </select>
    <div id="boxRepeticaoReceberEdit" style="display:${item.periodicidade === 'PARCELADO' ? 'block' : 'none'}; margin-top:3px;">
      <label style="font-size:0.6rem; color:var(--text-muted);">Repetir por quantos meses:</label>
      <input type="number" id="editMesesReceber" value="${item.parcelas || 2}" min="2">
    </div>
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="editDataReceber" value="${item.data}">
    <button style="width:100%; margin-top:8px; background:var(--accent-red); color:white; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer;" onclick="window.excluirAReceber(${item.id})">Excluir</button>
  `, () => {
    let desc = document.getElementById('editDescReceber').value;
    let val = parseFloat(document.getElementById('editValReceber').value) || item.valor;
    let periodicidade = document.getElementById('editPeriodoReceber').value;
    let parcelas = periodicidade === 'PARCELADO' ? (parseInt(document.getElementById('editMesesReceber').value) || 2) : 1;
    let data = document.getElementById('editDataReceber').value || item.data;
    if (desc) item.descricao = desc;
    item.valor = val;
    item.periodicidade = periodicidade;
    item.parcelas = parcelas;
    item.data = data;
    salvarEstado();
    mostrarToast("Atualizado!");
    setTimeout(() => abrirModalAReceber(), 0);
  });
}
window.editarAReceber = editarAReceber;

export function toggleCampoRepeticaoReceberEdit(val) {
  let box = document.getElementById('boxRepeticaoReceberEdit');
  if (box) box.style.display = val === 'PARCELADO' ? 'block' : 'none';
}
window.toggleCampoRepeticaoReceberEdit = toggleCampoRepeticaoReceberEdit;

export function baixarAReceber(id, mesFiltro) {
  let item = estado.aReceber.find(a => a.id === id);
  if (!item) return;
  abrirModal("💰 Confirmar Recebimento", `
    <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:6px;">${item.descricao} — R$ ${item.valor.toFixed(2)}</p>
    <label style="font-size:0.6rem; color:var(--text-muted); display:block;">Data em que recebeu:</label>
    <input type="date" id="inputDataRecebimento" value="${dataHojeISO}">
  `, () => {
    let dataRecebimento = document.getElementById('inputDataRecebimento').value || dataHojeISO;
    if (!item.recebidosMeses) item.recebidosMeses = [];
    if (!item.recebimentos) item.recebimentos = {};
    if (!item.recebidosMeses.includes(mesFiltro)) {
      item.recebidosMeses.push(mesFiltro);
      item.recebimentos[mesFiltro] = dataRecebimento;
      estado.recebidos += item.valor;
      estado.historicoRecebidos.push({
        id: Date.now(), valor: item.valor, desc: `Recebido: ${item.descricao}`, data: dataRecebimento, tipo: 'entrada',
        origemAReceberId: item.id, origemAReceberMes: mesFiltro
      });
      soltarConfete();
      salvarEstado();
      mostrarToast("Adicionado ao saldo!");
    }
  });
}
window.baixarAReceber = baixarAReceber;

export function excluirAReceber(id) {
  if (!confirm("Excluir este item? Se algum valor já foi recebido, ele será descontado do saldo.")) return;
  let entradasVinculadas = estado.historicoRecebidos.filter(h => h.origemAReceberId === id);
  entradasVinculadas.forEach(h => {
    estado.recebidos -= h.valor;
  });
  estado.historicoRecebidos = estado.historicoRecebidos.filter(h => h.origemAReceberId !== id);

  estado.aReceber = estado.aReceber.filter(a => a.id !== id);
  fecharModal();
  salvarEstado();
  mostrarToast("Removido e saldo ajustado.");
}
window.excluirAReceber = excluirAReceber;

export function abrirModalInvestimento() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  abrirModal(`📈 Investir`, `
    <input type="number" id="inputValor" placeholder="Valor (R$)" autofocus step="0.01">
    <input type="text" id="inputDesc" placeholder="Descrição" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="inputData" value="${dataHojeISO}">
  `, () => {
    let val = parseFloat(document.getElementById('inputValor').value) || 0;
    let desc = document.getElementById('inputDesc').value || `Aporte`;
    let data = document.getElementById('inputData').value || dataHojeISO;
    if (val > 0) {
      estado.recebidos -= val;
      estado.investido += val;
      estado.historicoInvestido.push({ id: Date.now(), valor: val, desc: desc, data: data, tipo: 'aporte' });
      soltarConfete();
      salvarEstado();
      mostrarToast("Investido!");
    }
  });
}
window.abrirModalInvestimento = abrirModalInvestimento;

export function abrirModalResgateInvestimento() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  let mesFiltro = getMesAnoSelecionado();
  let investidoAtual = calcularSomaHistoricoPassado(estado.historicoInvestido, mesFiltro);

  abrirModal(`🔄 Resgatar Investimento`, `
    <input type="number" id="inputValor" placeholder="Valor (R$)" autofocus step="0.01">
    <input type="text" id="inputDesc" placeholder="Motivo" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="inputData" value="${dataHojeISO}">
  `, () => {
    let val = parseFloat(document.getElementById('inputValor').value) || 0;
    let desc = document.getElementById('inputDesc').value || `Resgate`;
    let data = document.getElementById('inputData').value || dataHojeISO;
    if (val > 0 && val <= investidoAtual) {
      estado.recebidos += val;
      estado.historicoInvestido.push({ id: Date.now(), valor: val, desc: desc, data: data, tipo: 'resgate' });
      salvarEstado();
      mostrarToast("Resgatado!");
    }
  });
}
window.abrirModalResgateInvestimento = abrirModalResgateInvestimento;

export function abrirModalCofre() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  abrirModal(`🗝️ Guardar na Reserva`, `
    <input type="number" id="inputValor" placeholder="Valor (R$)" autofocus step="0.01">
    <input type="text" id="inputDesc" placeholder="Descrição" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="inputData" value="${dataHojeISO}">
  `, () => {
    let val = parseFloat(document.getElementById('inputValor').value) || 0;
    let desc = document.getElementById('inputDesc').value || `Reserva`;
    let data = document.getElementById('inputData').value || dataHojeISO;
    if (val > 0) {
      estado.recebidos -= val;
      estado.cofre += val;
      estado.historicoCofre.push({ id: Date.now(), valor: val, desc: desc, data: data, tipo: 'aporte' });
      soltarConfete();
      salvarEstado();
      mostrarToast("Guardado na reserva!");
    }
  });
}
window.abrirModalCofre = abrirModalCofre;

export function abrirModalResgateCofre() {
  if (!currentUser) {
    mostrarToast("Faça login com o Google.", "var(--accent-orange)");
    return;
  }
  let mesFiltro = getMesAnoSelecionado();
  let cofreAtual = calcularSomaHistoricoPassado(estado.historicoCofre, mesFiltro);

  abrirModal(`🔄 Resgatar da Reserva`, `
    <input type="number" id="inputValor" placeholder="Valor (R$)" autofocus step="0.01">
    <input type="text" id="inputDesc" placeholder="Motivo" style="margin-top:3px;">
    <label style="font-size:0.6rem; color:var(--text-muted); margin-top:3px; display:block;">Data:</label>
    <input type="date" id="inputData" value="${dataHojeISO}">
  `, () => {
    let val = parseFloat(document.getElementById('inputValor').value) || 0;
    let desc = document.getElementById('inputDesc').value || `Resgate Reserva`;
    let data = document.getElementById('inputData').value || dataHojeISO;
    if (val > 0 && val <= cofreAtual) {
      estado.recebidos += val;
      estado.historicoCofre.push({ id: Date.now(), valor: val, desc: desc, data: data, tipo: 'resgate' });
      salvarEstado();
      mostrarToast("Resgatado da reserva!");
    }
  });
}
window.abrirModalResgateCofre = abrirModalResgateCofre;

export function exportarDadosCSV() {
  exportarDadosCSVStorage();
}
window.exportarDadosCSV = exportarDadosCSV;

export function importarDadosCSV(event) {
  importarDadosCSVStorage(event);
}
window.importarDadosCSV = importarDadosCSV;

// --- Onboarding ---
const PASSOS_ONBOARDING = [
  {
    titulo: "👋 Bem-vindo ao Finanças Quest",
    texto: "Um jeito simples e visual de acompanhar seu dinheiro: saldo, despesas, cartões, investimentos e reserva, tudo numa tela só."
  },
  {
    titulo: "📋 Despesas Fixas",
    texto: "Cadastre contas que se repetem todo mês (aluguel, assinaturas) uma única vez. O app lembra de mostrá-las automaticamente nos meses seguintes."
  },
  {
    titulo: "🛡️ Reserva de Emergência",
    texto: "Guarde um dinheiro à parte para imprevistos. A meta sugerida cobre alguns meses das suas despesas fixas, mas você pode ajustar."
  },
  {
    titulo: "⭐ Estrelas",
    texto: "Ficar dentro do limite de Despesas Diversas mantém e acumula suas estrelas. Ultrapassar o limite custa uma estrela."
  },
  {
    titulo: "📱 Instale o App no Celular (PWA)",
    texto: `
      <div style="font-size:0.7rem; color:var(--text-muted); text-align:left; display:flex; flex-direction:column; gap:6px;">
        <div><strong style="color:var(--text);">Safari (iOS):</strong> Toque no botão Compartilhar (<i class="fa-solid fa-arrow-up-from-bracket" style="color:var(--accent-blue);"></i>) e selecione <strong style="color:var(--accent-green);">"Adicionar à Tela de Início"</strong>.</div>
        <div><strong style="color:var(--text);">Chrome (Android):</strong> Toque nos 3 pontos (⋮) e selecione <strong style="color:var(--accent-green);">'Instalar aplicativo'</strong> ou <strong style="color:var(--accent-green);">'Adicionar à tela inicial'</strong>.</div>
        <div><strong style="color:var(--text);">Chrome (iOS):</strong> Toque no ícone Compartilhar e selecione <strong style="color:var(--accent-green);">'Adicionar à Tela de Início'</strong>.</div>
      </div>
    `
  }
];

export function abrirOnboardingSeNecessario() {
  if (estado.onboardingConcluido) return;
  mostrarPassoOnboarding(0);
}

function mostrarPassoOnboarding(indice) {
  let passo = PASSOS_ONBOARDING[indice];
  let ehUltimo = indice === PASSOS_ONBOARDING.length - 1;
  let bolinhas = PASSOS_ONBOARDING.map((_, i) =>
    `<span style="width:6px; height:6px; border-radius:50%; display:inline-block; margin:0 2px; background:${i === indice ? 'var(--accent-green)' : 'var(--card-border)'};"></span>`
  ).join('');

  abrirModal(passo.titulo, `
    <div style="font-size:0.75rem; color: var(--text-muted); line-height: 1.4;">${passo.texto}</div>
    <div style="text-align:center; margin-top:10px;">${bolinhas}</div>
    <button type="button" style="width:100%; margin-top:10px; background:var(--accent-green); color:#000; padding:7px; border-radius:6px; border:none; font-weight:700; cursor:pointer;" onclick="window.avancarOnboarding(${indice})">
      ${ehUltimo ? 'Começar a usar' : 'Próximo'}
    </button>
  `, null);
}

export function avancarOnboarding(indiceAtual) {
  let proximo = indiceAtual + 1;
  if (proximo < PASSOS_ONBOARDING.length) {
    mostrarPassoOnboarding(proximo);
  } else {
    estado.onboardingConcluido = true;
    try {
      fecharModal();
    } catch(e) {}
    try {
      salvarEstado();
    } catch(e) {}
  }
}
window.avancarOnboarding = avancarOnboarding;

// --- Notificações ---
function coletarPendenciasDeHoje() {
  let hoje = new Date();
  let diaHoje = hoje.getDate();
  let mesAtual = dataHojeISO.slice(0, 7);
  let pendencias = [];

  (estado.aReceber || []).forEach(a => {
    if (!a.data) return;
    let [, , diaStr] = a.data.split('-');
    if (parseInt(diaStr) !== diaHoje) return;
    if (!itemApareceNoMes(a, mesAtual)) return;
    let jaRecebeu = (a.recebimentos && a.recebimentos[mesAtual]) || (a.recebidosMeses && a.recebidosMeses.includes(mesAtual));
    if (jaRecebeu) return;
    pendencias.push(`💰 Receita pendente hoje: ${a.descricao} (R$ ${a.valor.toFixed(2)})`);
  });

  (estado.cartoes || []).forEach(cartao => {
    if (!cartao.diaVencimento || cartao.diaVencimento !== diaHoje) return;
    let diaFechamento = cartao.diaFechamento || 1;
    let saldoDevedor = saldoDevedorFatura(mesAtual, cartao.id, diaFechamento, cartao.diaVencimento);
    if (saldoDevedor <= 0.005) return;
    pendencias.push(`💳 Fatura do ${cartao.nome} vence hoje (R$ ${saldoDevedor.toFixed(2)})`);
  });

  let pagamentosDoMes = estado.pagamentosFixas[mesAtual] || {};
  let excluidasDoMes = (estado.fixasExcluidasPorMes && estado.fixasExcluidasPorMes[mesAtual]) || {};
  (estado.fixas || []).forEach(item => {
    if (!item.diaVencimento || item.diaVencimento !== diaHoje) return;
    if (!itemApareceNoMes(item, mesAtual) || excluidasDoMes[item.id]) return;
    if (pagamentosDoMes[item.id]) return;
    pendencias.push(`📋 Despesa fixa vence hoje: ${item.nome} (R$ ${item.valor.toFixed(2)})`);
  });

  return pendencias;
}

function exibirNotificacao(texto) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Finanças Quest', { body: texto });
  } else {
    mostrarToast(texto, 'var(--accent-orange)');
  }
}

export function verificarNotificacoesDoDia() {
  let pendencias = coletarPendenciasDeHoje();
  if (pendencias.length === 0) return;

  let disparar = () => pendencias.forEach(p => exibirNotificacao(p));

  if (!('Notification' in window)) {
    disparar();
    return;
  }

  if (Notification.permission === 'granted') {
    disparar();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permissao => {
      if (permissao === 'granted') {
        disparar();
      } else {
        pendencias.forEach(p => mostrarToast(p, 'var(--accent-orange)'));
      }
    });
  }
}
window.verificarNotificacoesDoDia = verificarNotificacoesDoDia;

// ============================================================
// atualizarTela
// ============================================================
export function atualizarTela() {
  let mesFiltro = getMesAnoSelecionado();
  estenderRecorrentesSeNecessario(mesFiltro);
  recalcularEstrelas(mesFiltro);

  document.getElementById('labelBlocoRecebidos').innerText = estado.nomesBlocos.recebidos;
  document.getElementById('labelBlocoDiversos').innerText = estado.nomesBlocos.diversos;
  document.getElementById('labelBlocoFixas').innerText = estado.nomesBlocos.fixas;
  document.getElementById('labelBlocoInvestido').innerText = estado.nomesBlocos.investido;
  document.getElementById('labelBlocoCofre').innerText = estado.nomesBlocos.cofre;

  document.getElementById('starsCount').innerText = estado.trofeus || 5;
  document.getElementById('lblMetaDiversos').innerText = `R$ ${estado.metas.diversos.toFixed(0)}`;
  document.getElementById('lblMetaInvestimento').innerText = `R$ ${(estado.metas.investimento || 500).toFixed(0)}`;

  let mod = estado.modulos || {};
  document.getElementById('blocoDiversosWrapper').style.display = mod.despesasDiversas !== false ? 'flex' : 'none';
  document.getElementById('blocoFixasWrapper').style.display = mod.despesasFixas !== false ? 'flex' : 'none';
  document.getElementById('blocoInvestimentoWrapper').style.display = mod.investimento !== false ? 'flex' : 'none';
  document.getElementById('blocoReservaWrapper').style.display = mod.reservaEmergencia !== false ? 'flex' : 'none';

  let resumoDoMes = calcularResumoDoMes(mesFiltro);

  let investidoAteMes = calcularSomaHistoricoPassado(estado.historicoInvestido, mesFiltro);
  let cofreAteMes = calcularSomaHistoricoPassado(estado.historicoCofre, mesFiltro);
  let recebidosAteMes = calcularSaldoDisponivelAteMes(mesFiltro);

  document.getElementById('displayRecebidos').innerText = `R$ ${recebidosAteMes.toFixed(2)}`;
  document.getElementById('displayInvestido').innerText = `R$ ${investidoAteMes.toFixed(2)}`;
  document.getElementById('displayCofre').innerText = `R$ ${cofreAteMes.toFixed(2)}`;
  document.getElementById('displayDiversos').innerText = `R$ ${resumoDoMes.diversosAteMes.toFixed(2)}`;

  let totalFixasMensal = estado.fixas
    .filter(item => itemApareceNoMes(item, mesFiltro))
    .reduce((acc, cur) => acc + cur.valor, 0);
  let mesesMeta = estado.metas.mesesReserva || 6;
  document.getElementById('lblMesesReservaMeta').innerText = mesesMeta;
  document.getElementById('lblMetaCofre').innerText = `R$ ${(totalFixasMensal * mesesMeta).toFixed(0)}`;

  let pct = (resumoDoMes.diversosAteMes / estado.metas.diversos) * 100;
  let bar = document.getElementById('barDiversos');
  bar.style.width = `${Math.min(pct, 100)}%`;
  bar.style.backgroundColor = pct > 100 ? 'var(--accent-red)' : 'var(--accent-orange)';

  let listaFixasEl = document.getElementById('listaFixas');
  listaFixasEl.className = `compact-list ${estado.fixasOcultas ? 'collapsed' : ''}`;
  document.getElementById('iconToggleFixas').style.transform = estado.fixasOcultas ? 'rotate(-90deg)' : 'rotate(0deg)';

  listaFixasEl.innerHTML = '';
  let pagamentosDoMes = estado.pagamentosFixas[mesFiltro] || {};
  let excluidasDoMes = (estado.fixasExcluidasPorMes && estado.fixasExcluidasPorMes[mesFiltro]) || {};
  let fixasDoMes = estado.fixas.filter(item => itemApareceNoMes(item, mesFiltro) && !excluidasDoMes[item.id]);

  if (fixasDoMes.length === 0) {
    listaFixasEl.innerHTML = `<p style="font-size:0.65rem; color:var(--text-muted); text-align:center; padding:4px;">Nenhuma despesa para este mês.</p>`;
  } else {
    fixasDoMes.forEach(item => {
      let estaPago = !!pagamentosDoMes[item.id];
      let parcelaAtual = numeroParcelaNoMes(item, mesFiltro);
      let labelInfo = parcelaAtual ? ` (${parcelaAtual})` : '';

      let div = document.createElement('div');
      div.className = `compact-item ${estaPago ? 'paid' : ''}`;
      div.innerHTML = `
        <span>${item.nome}${labelInfo} (R$ ${item.valor.toFixed(2)})</span>
        <div class="item-actions">
          ${!estaPago
            ? `<button class="mini-btn-pay" onclick="window.togglePagarFixa(${item.id}, '${mesFiltro}')">Pagar</button>`
            : `<button class="mini-btn-box" style="color:var(--accent-green)" onclick="window.togglePagarFixa(${item.id}, '${mesFiltro}')"><i class="fa-solid fa-check"></i> Pago</button>`
          }
          <button class="mini-btn-box" onclick="window.abrirOpcoesFixa(${item.id})">⚙️</button>
        </div>
      `;
      listaFixasEl.appendChild(div);
    });
  }

  document.getElementById('totalFixasPago').innerText = `R$ ${resumoDoMes.totalPagoFixas.toFixed(2)}`;
  document.getElementById('totalFixasFalta').innerText = `R$ ${resumoDoMes.totalFaltaFixas.toFixed(2)}`;

  let containerCartoes = document.getElementById('containerCartoes');
  containerCartoes.innerHTML = '';
  let temCartoes = mod.cartaoCredito !== false && estado.cartoes && estado.cartoes.length > 0;

  if (!temCartoes) {
    containerCartoes.style.display = 'none';
  } else {
    containerCartoes.style.display = 'flex';
    estado.cartoes.forEach(cartao => {
      let corConfig = colorMap[cartao.cor || 'purple'];
      let diaFechamento = cartao.diaFechamento || 1;
      let diaVencimento = cartao.diaVencimento || 10;

      let comprasCartaoMes = (estado.comprasCartoes[mesFiltro] && estado.comprasCartoes[mesFiltro][cartao.id]) || [];
      let valorComprasMes = comprasCartaoMes.reduce((acc, c) => acc + c.valor, 0);
      let pagoNestaFatura = totalPagoFatura(mesFiltro, cartao.id);
      let saldoDevedor = saldoDevedorFatura(mesFiltro, cartao.id, diaFechamento, diaVencimento);

      let [ano, mes] = mesFiltro.split('-').map(Number);
      let mesAntObj = somarMeses(ano, mes, -1);
      let mesAnt = `${mesAntObj.ano}-${String(mesAntObj.mes).padStart(2, '0')}`;
      let residualAnterior = 0;
      if (faturaJaFechou(mesFiltro, diaFechamento, diaVencimento)) {
        residualAnterior = saldoDevedorFatura(mesAnt, cartao.id, diaFechamento, diaVencimento);
      }

      let temResidualAnterior = residualAnterior > 0.005;

      let statusPagamento = saldoDevedor <= 0.005
        ? `<span style="font-size:0.6rem; color:var(--accent-green); font-weight:700;">✓ Quitada</span>`
        : (pagoNestaFatura > 0
          ? `<span style="font-size:0.6rem; color:var(--accent-orange);">Pago R$ ${pagoNestaFatura.toFixed(2)} · falta R$ ${saldoDevedor.toFixed(2)}</span>`
          : '');

      let cardDiv = document.createElement('div');
      cardDiv.className = 'block-card card-cartao-individual';
      cardDiv.style.gridColumn = 'span 2';
      cardDiv.innerHTML = `
        <div class="card-title">
          <span>💳 ${cartao.nome}${cartao.diaVencimento ? ` <span style="font-weight:400; color:var(--text-muted); font-size:0.9em;">(vence dia ${cartao.diaVencimento})</span>` : ''}</span>
          <i class="fa-solid fa-ellipsis-vertical" style="cursor:pointer;" onclick="window.abrirPainelCartao(${cartao.id})" title="Gerenciar Cartão"></i>
        </div>
        ${temResidualAnterior ? `<div style="font-size:0.6rem; color:var(--accent-red); margin-top:1px;">Inclui R$ ${residualAnterior.toFixed(2)} de saldo anterior não pago</div>` : ''}
        <div style="display: flex; justify-space-between; align-items: center; margin-top: 2px;">
          <div>
            <div class="card-value" style="color: ${corConfig.hex}; margin:0;">R$ ${saldoDevedor.toFixed(2)}</div>
            ${statusPagamento}
          </div>
          <div style="display: flex; gap: 4px;">
            ${saldoDevedor > 0.005
              ? `<button class="card-action-btn ${corConfig.btn}" style="padding: 4px 10px; width:auto;" onclick="window.abrirModalPagarFaturaParcial(${cartao.id}, '${mesFiltro}')">Pagar Fatura</button>`
              : `<button class="card-action-btn btn-outline" style="padding: 4px 10px; width:auto; color:var(--accent-green); border-color:var(--accent-green);" onclick="window.abrirModalPagarFaturaParcial(${cartao.id}, '${mesFiltro}')">✓ Paga</button>`
            }
            <button class="card-action-btn btn-outline" style="padding: 4px 8px; width:auto;" onclick="window.abrirModalLancarCompraCartao(${cartao.id})"><i class="fa-solid fa-plus"></i> Compra</button>
          </div>
        </div>
      `;
      containerCartoes.appendChild(cardDiv);
    });
  }

  document.getElementById('resumoDespesasFalta').innerText = `R$ ${resumoDoMes.faltaDoMes.toFixed(2)}`;
  document.getElementById('resumoDespesasPago').innerText = `R$ ${resumoDoMes.pagoDoMes.toFixed(2)}`;

  let receitasPendentes = calcularReceitasPendentesDoMes(mesFiltro);
  document.getElementById('valorReceitasPendentesResumo').innerText = `R$ ${receitasPendentes.falta.toFixed(2)}`;
}
window.atualizarTela = atualizarTela;
