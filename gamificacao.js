// ============================================================
// gamificacao.js — Sistema de progresso (estilo Duolingo)
// ============================================================

import { estado } from './storage.js';
import { saldoDevedorFatura } from './calculos.js';

const XP_POR_MES_DENTRO_DA_META = 10;
const XP_POR_FIXA_PAGA = 5;
const XP_POR_FATURA_QUITADA = 5;
const XP_POR_NIVEL = 100;

function mesesComGastoDiverso() {
  let meses = new Set();
  estado.historicoDiversos.forEach(h => {
    if (h.data) meses.add(h.data.slice(0, 7));
  });
  return Array.from(meses).sort();
}

function totalDiversosDoMes(mes) {
  return estado.historicoDiversos
    .filter(h => h.data && h.data.startsWith(mes))
    .reduce((acc, cur) => acc + cur.valor, 0);
}

function contarFixasPagas() {
  let total = 0;
  Object.values(estado.pagamentosFixas || {}).forEach(pagosDoMes => {
    total += Object.values(pagosDoMes).filter(Boolean).length;
  });
  return total;
}

function contarFaturasQuitadas() {
  let total = 0;
  Object.keys(estado.pagamentosCartoes || {}).forEach(mes => {
    Object.keys(estado.pagamentosCartoes[mes]).forEach(cardId => {
      let cartao = (estado.cartoes || []).find(c => String(c.id) === String(cardId));
      if (!cartao) return;
      let diaFechamento = cartao.diaFechamento || 1;
      let diaVencimento = cartao.diaVencimento || 10;
      let saldo = saldoDevedorFatura(mes, cartao.id, diaFechamento, diaVencimento);
      if (saldo <= 0.005) total++;
    });
  });
  return total;
}

export function calcularProgresso() {
  let meta = estado.metas.diversos;
  let mesesDentroDaMeta = mesesComGastoDiverso().filter(mes => totalDiversosDoMes(mes) <= meta).length;
  let fixasPagas = contarFixasPagas();
  let faturasQuitadas = contarFaturasQuitadas();

  let xp = (mesesDentroDaMeta * XP_POR_MES_DENTRO_DA_META)
    + (fixasPagas * XP_POR_FIXA_PAGA)
    + (faturasQuitadas * XP_POR_FATURA_QUITADA);

  let nivel = Math.floor(xp / XP_POR_NIVEL) + 1;
  let xpNoNivelAtual = xp % XP_POR_NIVEL;
  let percentualNivel = Math.round((xpNoNivelAtual / XP_POR_NIVEL) * 100);

  return { xp, nivel, xpNoNivelAtual, percentualNivel, mesesDentroDaMeta, fixasPagas, faturasQuitadas };
}

export function calcularStreak(mesAtual) {
  let meta = estado.metas.diversos;
  let meses = mesesComGastoDiverso().filter(m => m <= mesAtual).sort().reverse();
  let streak = 0;
  for (let mes of meses) {
    if (totalDiversosDoMes(mes) <= meta) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calcularMissoes(mesAtual) {
  let progresso = calcularProgresso();
  let streak = calcularStreak(mesAtual);

  return [
    {
      titulo: "Primeiro passo",
      descricao: "Fique 1 mês dentro do limite de Despesas Diversas",
      concluida: progresso.mesesDentroDaMeta >= 1,
      progresso: Math.min(progresso.mesesDentroDaMeta, 1),
      total: 1
    },
    {
      titulo: "Constância",
      descricao: "Alcance 3 meses seguidos dentro do limite",
      concluida: streak >= 3,
      progresso: Math.min(streak, 3),
      total: 3
    },
    {
      titulo: "Organizador",
      descricao: "Pague 5 despesas fixas",
      concluida: progresso.fixasPagas >= 5,
      progresso: Math.min(progresso.fixasPagas, 5),
      total: 5
    },
    {
      titulo: "Sem dívidas",
      descricao: "Quite 1 fatura de cartão por completo",
      concluida: progresso.faturasQuitadas >= 1,
      progresso: Math.min(progresso.faturasQuitadas, 1),
      total: 1
    }
  ];
}

// Atualiza e recupera estrelas do usuário conforme progresso
export function recalcularEstrelas(mesAtual) {
  let progresso = calcularProgresso();
  let missoesConcluidas = calcularMissoes(mesAtual).filter(m => m.concluida).length;
  let maxEstrelas = 5;
  
  // Base de estrelas ganhas pelo progresso e nível do usuário
  let estrelasGanhas = Math.min(maxEstrelas, 3 + Math.floor(progresso.xp / 50) + missoesConcluidas);
  
  if (typeof estado.trofeus !== 'number' || isNaN(estado.trofeus)) {
    estado.trofeus = 5;
  }
  
  // Se as estrelas estiverem abaixo do potencial ganho pelo progresso atual, regenera/aumenta até a cota ganha
  if (estado.trofeus < estrelasGanhas) {
    estado.trofeus = estrelasGanhas;
  }
  
  if (estado.trofeus > maxEstrelas) {
    estado.trofeus = maxEstrelas;
  }
  
  return estado.trofeus;
}
