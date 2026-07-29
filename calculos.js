// ============================================================
// calculos.js — Toda a matemática do app: saldo, faturas de
// cartão, metas, parcelas, recorrência, resumo do mês.
// ============================================================

import { estado, dataHojeISO, salvarCacheLocal } from './storage.js';

// --- Utilidades de data usadas em quase tudo abaixo ---

export function somarMeses(ano, mes, qtd) {
  mes += qtd;
  while (mes > 12) { mes -= 12; ano++; }
  while (mes < 1) { mes += 12; ano--; }
  return { ano, mes };
}

export function somarDiasSeguro(ano, mes, dia) {
  let diaValido = Math.min(dia, 28);
  return `${ano}-${String(mes).padStart(2, '0')}-${String(diaValido).padStart(2, '0')}`;
}

// --- Cartão de crédito: fechamento, fatura, saldo devedor ---

export function calcularMesFaturaCartao(dataCompraISO, diaFechamento, diaVencimento) {
  let [anoC, mesC, diaC] = dataCompraISO.split('-').map(Number);
  let diaFechValido = Math.min(diaFechamento, 28);

  let anoFech, mesFech;
  if (diaC < diaFechValido) {
    anoFech = anoC; mesFech = mesC;
  } else {
    let prox = somarMeses(anoC, mesC, 1);
    anoFech = prox.ano; mesFech = prox.mes;
  }

  if (diaVencimento > diaFechValido) {
    return `${anoFech}-${String(mesFech).padStart(2, '0')}`;
  } else {
    let prox = somarMeses(anoFech, mesFech, 1);
    return `${prox.ano}-${String(prox.mes).padStart(2, '0')}`;
  }
}

export function totalComprasFatura(mesFatura, cardId) {
  let compras = (estado.comprasCartoes[mesFatura] && estado.comprasCartoes[mesFatura][cardId]) || [];
  return compras.reduce((acc, c) => acc + c.valor, 0);
}

export function totalPagoFatura(mesFatura, cardId) {
  let info = estado.pagamentosCartoes[mesFatura] && estado.pagamentosCartoes[mesFatura][cardId];
  if (!info || !info.pagamentos) return 0;
  return info.pagamentos.reduce((acc, p) => acc + p.valor, 0);
}

export function mesFechamentoDaFatura(mesFatura, diaFechamento, diaVencimento) {
  let [ano, mes] = mesFatura.split('-').map(Number);
  let diaFechValido = Math.min(diaFechamento, 28);
  if (diaVencimento > diaFechValido) {
    return { ano, mes };
  } else {
    return somarMeses(ano, mes, -1);
  }
}

export function faturaJaFechou(mesFatura, diaFechamento, diaVencimento) {
  let { ano, mes } = mesFechamentoDaFatura(mesFatura, diaFechamento, diaVencimento);
  let diaFechValido = Math.min(diaFechamento, 28);
  let dataFechamentoISO = `${ano}-${String(mes).padStart(2, '0')}-${String(diaFechValido).padStart(2, '0')}`;
  return dataHojeISO >= dataFechamentoISO;
}

export function saldoDevedorFatura(mesFatura, cardId, diaFechamento, diaVencimento, profundidade) {
  profundidade = profundidade || 0;
  let comprasDestaFatura = totalComprasFatura(mesFatura, cardId);
  let pagoNestaFatura = totalPagoFatura(mesFatura, cardId);

  let [ano, mes] = mesFatura.split('-').map(Number);
  let mesAntObj = somarMeses(ano, mes, -1);
  let mesAnt = `${mesAntObj.ano}-${String(mesAntObj.mes).padStart(2, '0')}`;

  let residualAnterior = 0;
  if (profundidade < 24 && faturaJaFechou(mesFatura, diaFechamento, diaVencimento)) {
    residualAnterior = saldoDevedorFatura(mesAnt, cardId, diaFechamento, diaVencimento, profundidade + 1);
  }

  let totalDevido = comprasDestaFatura + residualAnterior;
  return Math.max(0, totalDevido - pagoNestaFatura);
}

// --- Periodicidade (única / sempre / parcelado) ---

export function itemApareceNoMes(item, mesFiltro) {
  if (!item.data) return true;
  let mesInicio = item.data.slice(0, 7);
  if (item.periodicidade === "UNICA") return mesInicio === mesFiltro;
  if (item.periodicidade === "SEMPRE") return mesFiltro >= mesInicio;
  if (item.periodicidade === "PARCELADO") {
    if (mesFiltro < mesInicio) return false;
    let [anoI, mesI] = mesInicio.split('-').map(Number);
    let [anoF, mesF] = mesFiltro.split('-').map(Number);
    let diffMeses = (anoF - anoI) * 12 + (mesF - mesI);
    return diffMeses >= 0 && diffMeses < item.parcelas;
  }
  return true;
}

export function numeroParcelaNoMes(item, mesFiltro) {
  if (item.periodicidade !== "PARCELADO" || !item.data) return null;
  let mesInicio = item.data.slice(0, 7);
  let [anoI, mesI] = mesInicio.split('-').map(Number);
  let [anoF, mesF] = mesFiltro.split('-').map(Number);
  let diffMeses = (anoF - anoI) * 12 + (mesF - mesI);
  if (diffMeses < 0 || diffMeses >= item.parcelas) return null;
  return `${diffMeses + 1}/${item.parcelas}`;
}

// --- Somas históricas (investido / cofre / saldo) ---

export function calcularSomaHistoricoPassado(historico, mesFiltro) {
  return historico
    .filter(h => h.data && h.data.slice(0, 7) <= mesFiltro)
    .reduce((acc, cur) => {
      if (cur.tipo === 'resgate') return acc - cur.valor;
      return acc + cur.valor;
    }, 0);
}

export function calcularSaldoDisponivelAteMes(mesFiltro) {
  let saldo = 0;

  estado.historicoRecebidos.forEach(item => {
    if (item.data && item.data.slice(0, 7) <= mesFiltro) saldo += item.valor;
  });

  estado.historicoDiversos.forEach(item => {
    if (item.data && item.data.slice(0, 7) <= mesFiltro) saldo -= item.valor;
  });

  estado.historicoInvestido.forEach(item => {
    if (item.data && item.data.slice(0, 7) <= mesFiltro) {
      if (item.tipo === 'resgate') saldo += item.valor;
      else saldo -= item.valor;
    }
  });

  estado.historicoCofre.forEach(item => {
    if (item.data && item.data.slice(0, 7) <= mesFiltro) {
      if (item.tipo === 'resgate') saldo += item.valor;
      else saldo -= item.valor;
    }
  });

  Object.keys(estado.pagamentosFixas || {}).forEach(mesPag => {
    if (mesPag <= mesFiltro) {
      let pagos = estado.pagamentosFixas[mesPag] || {};
      Object.keys(pagos).forEach(fixaId => {
        if (pagos[fixaId]) {
          let fixa = estado.fixas.find(f => String(f.id) === String(fixaId));
          if (fixa) saldo -= fixa.valor;
        }
      });
    }
  });

  Object.keys(estado.pagamentosCartoes || {}).forEach(mesPag => {
    if (mesPag <= mesFiltro) {
      let cartoesDoMes = estado.pagamentosCartoes[mesPag] || {};
      Object.keys(cartoesDoMes).forEach(cardId => {
        let info = cartoesDoMes[cardId];
        if (info && info.pagamentos) {
          info.pagamentos.forEach(pgto => {
            if (pgto.data && pgto.data.slice(0, 7) <= mesFiltro) saldo -= pgto.valor;
          });
        }
      });
    }
  });

  return saldo;
}

// --- Lançamento de compras de cartão (única / parcelada / recorrente) ---

export function lancarComprasCartao(cardId, desc, valorTotal, dataPrimeira, diaFechamento, diaVencimento, periodicidade, parcelas) {
  let [ano0, mes0] = dataPrimeira.split('-').map(Number);
  let dia0 = Number(dataPrimeira.split('-')[2]);
  let qtdLancamentos = periodicidade === 'PARCELADO' ? parcelas : (periodicidade === 'SEMPRE' ? 12 : 1);
  let valorCadaLancamento = periodicidade === 'PARCELADO' ? Math.round((valorTotal / parcelas) * 100) / 100 : valorTotal;
  let idGrupo = Date.now() + '-' + Math.random().toString(36).slice(2, 8);

  for (let i = 0; i < qtdLancamentos; i++) {
    let { ano: anoP, mes: mesP } = somarMeses(ano0, mes0, i);
    let dataParcela = somarDiasSeguro(anoP, mesP, dia0);
    let mesFatura = calcularMesFaturaCartao(dataParcela, diaFechamento, diaVencimento);
    let descFinal = periodicidade === 'PARCELADO' ? `${desc} (${i + 1}/${qtdLancamentos})` : desc;

    if (!estado.comprasCartoes[mesFatura]) estado.comprasCartoes[mesFatura] = {};
    if (!estado.comprasCartoes[mesFatura][cardId]) estado.comprasCartoes[mesFatura][cardId] = [];

    estado.comprasCartoes[mesFatura][cardId].push({
      id: Date.now() + i,
      desc: descFinal,
      valor: valorCadaLancamento,
      data: dataParcela,
      idGrupo,
      periodicidade,
      indiceParcela: i + 1,
      totalParcelas: qtdLancamentos
    });
  }
  return idGrupo;
}

export function estenderRecorrentesSeNecessario(mesFiltro) {
  let gruposVistos = {};
  Object.keys(estado.comprasCartoes).forEach(mes => {
    let cartoesDoMes = estado.comprasCartoes[mes] || {};
    Object.keys(cartoesDoMes).forEach(cardId => {
      (cartoesDoMes[cardId] || []).forEach(compra => {
        if (compra.periodicidade === 'SEMPRE' && compra.idGrupo) {
          let chave = compra.idGrupo;
          if (!gruposVistos[chave] || mes > gruposVistos[chave].ultimoMes) {
            gruposVistos[chave] = { ultimoMes: mes, cardId, desc: compra.desc, valor: compra.valor };
          }
        }
      });
    });
  });

  let cartaoPorId = {};
  estado.cartoes.forEach(c => { cartaoPorId[c.id] = c; });

  Object.keys(gruposVistos).forEach(idGrupo => {
    let g = gruposVistos[idGrupo];
    let [anoU, mesU] = g.ultimoMes.split('-').map(Number);
    let [anoF, mesF] = mesFiltro.split('-').map(Number);
    let diffMeses = (anoF - anoU) * 12 + (mesF - mesU);
    if (diffMeses >= -3) {
      let cartao = cartaoPorId[g.cardId];
      let diaFechamento = (cartao && cartao.diaFechamento) || 1;
      let diaVencimento = (cartao && cartao.diaVencimento) || 10;
      let { ano: anoProx, mes: mesProx } = somarMeses(anoU, mesU, 1);
      for (let i = 0; i < 12; i++) {
        let { ano: anoP, mes: mesP } = somarMeses(anoProx, mesProx, i);
        let dataParcela = somarDiasSeguro(anoP, mesP, 15);
        let mesFatura = calcularMesFaturaCartao(dataParcela, diaFechamento, diaVencimento);
        if (!estado.comprasCartoes[mesFatura]) estado.comprasCartoes[mesFatura] = {};
        if (!estado.comprasCartoes[mesFatura][g.cardId]) estado.comprasCartoes[mesFatura][g.cardId] = [];
        estado.comprasCartoes[mesFatura][g.cardId].push({
          id: Date.now() + Math.random(),
          desc: g.desc,
          valor: g.valor,
          data: dataParcela,
          idGrupo,
          periodicidade: 'SEMPRE'
        });
      }
      salvarCacheLocal();
    }
  });
}

// --- Resumo do mês ---

export function calcularReceitasPendentesDoMes(mesFiltro) {
  let itensDoMes = estado.aReceber.filter(a => {
    if (!itemApareceNoMes(a, mesFiltro)) return false;
    let dataRecReal = a.recebimentos && a.recebimentos[mesFiltro];
    if (dataRecReal && dataRecReal.slice(0, 7) !== mesFiltro) return false;
    return true;
  });
  let totalPrevisto = itensDoMes.reduce((acc, cur) => acc + cur.valor, 0);
  let recebidoDeItensPrevistos = itensDoMes.filter(a => (a.recebimentos && a.recebimentos[mesFiltro]) || (a.recebidosMeses && a.recebidosMeses.includes(mesFiltro))).reduce((acc, cur) => acc + cur.valor, 0);
  let falta = Math.max(0, totalPrevisto - recebidoDeItensPrevistos);
  return { total: totalPrevisto, recebido: recebidoDeItensPrevistos, falta };
}

export function calcularResumoDoMes(mesFiltro) {
  let totalPagoFixas = 0;
  let totalFaltaFixas = 0;
  let pagamentosDoMes = estado.pagamentosFixas[mesFiltro] || {};
  let excluidasDoMes = (estado.fixasExcluidasPorMes && estado.fixasExcluidasPorMes[mesFiltro]) || {};
  estado.fixas.filter(item => itemApareceNoMes(item, mesFiltro) && !excluidasDoMes[item.id]).forEach(item => {
    let estaPago = !!pagamentosDoMes[item.id];
    if (estaPago) totalPagoFixas += item.valor;
    else totalFaltaFixas += item.valor;
  });

  let totalFaturasCartoes = 0;
  let totalFaturasCartoesPago = 0;
  (estado.cartoes || []).forEach(cartao => {
    let comprasCartaoMes = (estado.comprasCartoes[mesFiltro] && estado.comprasCartoes[mesFiltro][cartao.id]) || [];
    let valorComprasMes = comprasCartaoMes.reduce((acc, c) => acc + c.valor, 0);
    let pagoNestaFatura = totalPagoFatura(mesFiltro, cartao.id);
    totalFaturasCartoes += valorComprasMes;
    totalFaturasCartoesPago += pagoNestaFatura;
  });

  let diversosAteMes = estado.historicoDiversos
    .filter(g => g.data && g.data.startsWith(mesFiltro))
    .reduce((acc, cur) => acc + cur.valor, 0);

  let faltaDoMes = Math.max(0, totalFaltaFixas + (totalFaturasCartoes - totalFaturasCartoesPago));
  let pagoDoMes = totalPagoFixas + totalFaturasCartoesPago + diversosAteMes;

  return {
    faltaDoMes, pagoDoMes,
    totalPagoFixas, totalFaltaFixas, totalFaturasCartoes, totalFaturasCartoesPago, diversosAteMes
  };
}
