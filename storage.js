// ============================================================
// storage.js — Persistência: localStorage, Firestore, login Google
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCckjpIMwGH8rd2LVI7rV6lNFhSdLOFnb4",
  authDomain: "financas-quest-a01d0.firebaseapp.com",
  projectId: "financas-quest-a01d0",
  storageBucket: "financas-quest-a01d0.firebasestorage.app",
  messagingSenderId: "431832284859",
  appId: "1:431832284859:web:8d76ef2bbd16db8bee739e",
  measurementId: "G-9KX4PGH4C7"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export let currentUser = null;

const hoje = new Date();
export const dataHojeISO = hoje.toISOString().slice(0, 10);
export const mesAnoAtual = hoje.toISOString().slice(0, 7);

export const colorMap = {
  purple: { hex: 'var(--accent-purple)', btn: 'btn-purple' },
  blue: { hex: 'var(--accent-blue)', btn: 'btn-blue' },
  green: { hex: 'var(--accent-green)', btn: 'btn-green' },
  orange: { hex: 'var(--accent-orange)', btn: 'btn-orange' },
  yellow: { hex: 'var(--accent-gold)', btn: 'btn-gold' }
};

export const ESTADO_INICIAL = {
  trofeus: 5,
  recebidos: 0,
  investido: 0,
  cofre: 0,
  temaClaro: false,
  fixasOcultas: false,
  fixasExcluidasPorMes: {},
  onboardingConcluido: false,
  nomesBlocos: {
    recebidos: "Saldo Disponível",
    diversos: "Despesas Diversas",
    fixas: "Despesas Fixas",
    investido: "Investidos",
    cofre: "Reserva de Emergência"
  },
  modulos: {
    despesasDiversas: true,
    despesasFixas: true,
    cartaoCredito: true,
    investimento: true,
    reservaEmergencia: true
  },
  metas: {
    diversos: 200,
    investimento: 500,
    mesesReserva: 6
  },
  categoriasDiversos: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Outros'],
  cartoes: [
    { id: 1, nome: "Cartão", cor: "purple" }
  ],
  comprasCartoes: {},
  historicoRecebidos: [],
  historicoDiversos: [],
  historicoInvestido: [],
  historicoCofre: [],
  pagamentosFixas: {},
  pagamentosCartoes: {},
  fixas: [],
  aReceber: []
};

export let estado = JSON.parse(JSON.stringify(ESTADO_INICIAL));

export function definirEstado(novoEstado) {
  estado = novoEstado;
}

const CHAVE_CACHE_LOCAL = 'financasQuest_cacheLocal';

export function salvarCacheLocal() {
  try {
    localStorage.setItem(CHAVE_CACHE_LOCAL, JSON.stringify(estado));
  } catch (e) {
    console.error("Erro ao salvar cache local", e);
  }
}

export function carregarCacheLocal() {
  try {
    let cacheSalvo = localStorage.getItem(CHAVE_CACHE_LOCAL);
    if (cacheSalvo) {
      let dadosCache = JSON.parse(cacheSalvo);
      estado = Object.assign({}, JSON.parse(JSON.stringify(ESTADO_INICIAL)), dadosCache);
      if (estado.cartoes) {
        estado.cartoes.forEach(c => { if (!c.cor) c.cor = 'purple'; });
      }
      return true;
    }
  } catch (e) {
    console.error("Erro ao carregar cache local", e);
  }
  return false;
}

export function limparCacheLocal() {
  localStorage.removeItem(CHAVE_CACHE_LOCAL);
}

carregarCacheLocal();

let aoMudarEstado = null;
export function registrarCallbackEstado(fn) {
  aoMudarEstado = fn;
}
function notificarMudanca() {
  if (aoMudarEstado) aoMudarEstado();
}

let aoMostrarToast = null;
export function registrarCallbackToast(fn) {
  aoMostrarToast = fn;
}
function toast(msg, cor) {
  if (aoMostrarToast) aoMostrarToast(msg, cor);
}

function mensagemErroFirestore(e) {
  if (e && e.code === 'unavailable') {
    return "Sem conexão com a internet. Suas alterações estão salvas neste aparelho e serão enviadas para a nuvem assim que a conexão voltar.";
  }
  if (e && e.code === 'permission-denied') {
    return "Sem permissão para sincronizar com a nuvem. Seus dados continuam salvos neste aparelho.";
  }
  return "Não foi possível sincronizar com a nuvem agora. Seus dados continuam salvos neste aparelho.";
}

export async function salvarEstado() {
  notificarMudanca();
  salvarCacheLocal();
  if (currentUser) {
    try {
      const estadoLimpo = JSON.parse(JSON.stringify(estado));
      await setDoc(doc(db, "users", currentUser.uid), estadoLimpo);
    } catch (e) {
      console.error("Erro ao salvar na nuvem", e);
      toast(mensagemErroFirestore(e), "var(--accent-red)");
    }
  }
}

export async function toggleGoogleAuth() {
  if (!currentUser) {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast("Login com Google realizado!");
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/popup-blocked') {
        toast("Pop-up bloqueado. Libere pop-ups para este site nas configurações do navegador.", "var(--accent-red)");
      } else if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        toast("Erro no login.", "var(--accent-red)");
      }
    }
  } else {
    try {
      await signOut(auth);
      estado = JSON.parse(JSON.stringify(ESTADO_INICIAL));
      limparCacheLocal();
      notificarMudanca();
      toast("Logout realizado.");
    } catch (error) {
      toast("Erro ao sair.", "var(--accent-red)");
    }
  }
}

let aoMudarAuth = null;
export function registrarCallbackAuth(fn) {
  aoMudarAuth = fn;
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (aoMudarAuth) aoMudarAuth(user);

  if (user) {
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const dadosNuvem = docSnap.data();
        estado = Object.assign({}, JSON.parse(JSON.stringify(ESTADO_INICIAL)), dadosNuvem);
        if (estado.cartoes) {
          estado.cartoes.forEach(c => { if (!c.cor) c.cor = 'purple'; });
        }
        salvarCacheLocal();
        notificarMudanca();
      } else {
        await setDoc(doc(db, "users", user.uid), JSON.parse(JSON.stringify(ESTADO_INICIAL)));
        notificarMudanca();
      }
    } catch (e) {
      console.error("Erro ao carregar dados da nuvem", e);
      toast(mensagemErroFirestore(e), "var(--accent-red)");
    }
  }
});

// --- Exportação/Importação CSV Completa ---
export function exportarDadosCSV() {
  let rows = [["Secao", "Nome_Descricao", "Valor", "Data", "Periodicidade_Tipo_Categoria", "Parcelas_Cor", "Id_CardId_Extra"]];

  // Historico Recebidos
  (estado.historicoRecebidos || []).forEach(item => {
    rows.push(["RECEBIMENTO", `"${(item.desc || '').replace(/"/g, '""')}"`, item.valor || 0, item.data || "", item.tipo || "entrada", "", item.origemAReceberId || ""]);
  });

  // Historico Diversos
  (estado.historicoDiversos || []).forEach(item => {
    rows.push(["GASTO_DIVERSO", `"${(item.desc || '').replace(/"/g, '""')}"`, item.valor || 0, item.data || "", `"${(item.categoria || 'Outros').replace(/"/g, '""')}"`, "", ""]);
  });

  // Despesas Fixas
  (estado.fixas || []).forEach(item => {
    rows.push(["DESPESA_FIXA", `"${(item.nome || '').replace(/"/g, '""')}"`, item.valor || 0, item.data || "", item.periodicidade || "SEMPRE", item.parcelas || 1, item.diaVencimento || ""]);
  });

  // Investimentos
  (estado.historicoInvestido || []).forEach(item => {
    rows.push(["INVESTIMENTO", `"${(item.desc || '').replace(/"/g, '""')}"`, item.valor || 0, item.data || "", item.tipo || "aporte", "", ""]);
  });

  // Cofre / Reserva
  (estado.historicoCofre || []).forEach(item => {
    rows.push(["COFRE", `"${(item.desc || '').replace(/"/g, '""')}"`, item.valor || 0, item.data || "", item.tipo || "aporte", "", ""]);
  });

  // Receitas Pendentes (aReceber)
  (estado.aReceber || []).forEach(item => {
    rows.push(["A_RECEBER", `"${(item.descricao || '').replace(/"/g, '""')}"`, item.valor || 0, item.data || "", item.periodicidade || "UNICA", item.parcelas || 1, ""]);
  });

  // Cartões
  (estado.cartoes || []).forEach(cartao => {
    rows.push(["CARTAO", `"${(cartao.nome || '').replace(/"/g, '""')}"`, 0, "", cartao.cor || "purple", cartao.diaFechamento || 1, cartao.diaVencimento || 10]);
  });

  // Compras de Cartão
  Object.keys(estado.comprasCartoes || {}).forEach(mes => {
    let cartoesDoMes = estado.comprasCartoes[mes] || {};
    Object.keys(cartoesDoMes).forEach(cardId => {
      let compras = cartoesDoMes[cardId] || [];
      compras.forEach(cp => {
        rows.push(["COMPRA_CARTAO", `"${(cp.desc || '').replace(/"/g, '""')}"`, cp.valor || 0, cp.data || "", cp.periodicidade || "UNICA", cardId, cp.idGrupo || ""]);
      });
    });
  });

  let csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
  let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  let url = URL.createObjectURL(blob);
  let link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `financas_quest_backup_${dataHojeISO}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast("Backup exportado!");
}

export function importarDadosCSV(event) {
  let inputEl = event.target;
  let file = inputEl.files && inputEl.files[0];
  if (!file) return;

  let reader = new FileReader();
  reader.onload = function (e) {
    try {
      let text = e.target.result;
      let lines = text.split(/\r?\n/);

      // Limpa coleções existentes antes da importação completa
      estado.historicoRecebidos = [];
      estado.historicoDiversos = [];
      estado.fixas = [];
      estado.historicoInvestido = [];
      estado.historicoCofre = [];
      estado.aReceber = [];
      estado.cartoes = [];
      estado.comprasCartoes = {};

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Parse de CSV respeitando aspas
        let cols = [];
        let inQuotes = false;
        let token = '';
        for (let c = 0; c < line.length; c++) {
          let char = line[c];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(token.trim());
            token = '';
          } else {
            token += char;
          }
        }
        cols.push(token.trim());

        if (cols.length >= 3) {
          let secao = cols[0].replace(/^"|"$/g, '').trim();
          if (secao === "Secao") continue; // Cabeçalho

          let desc = cols[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
          let valor = parseFloat(cols[2]) || 0;
          let data = cols[3] ? cols[3].replace(/^"|"$/g, '').trim() : dataHojeISO;
          let campo5 = cols[4] ? cols[4].replace(/^"|"$/g, '').trim() : "";
          let campo6 = cols[5] ? cols[5].replace(/^"|"$/g, '').trim() : "";
          let campo7 = cols[6] ? cols[6].replace(/^"|"$/g, '').trim() : "";

          if (secao === "RECEBIMENTO") {
            estado.historicoRecebidos.push({
              id: Date.now() + Math.random(),
              valor,
              desc,
              data,
              tipo: campo5 || 'entrada',
              origemAReceberId: campo7 || null
            });
          } else if (secao === "GASTO_DIVERSO") {
            estado.historicoDiversos.push({
              id: Date.now() + Math.random(),
              valor,
              desc,
              data,
              categoria: campo5 || 'Outros'
            });
          } else if (secao === "DESPESA_FIXA") {
            let diaV = parseInt(campo7);
            estado.fixas.push({
              id: Date.now() + Math.random(),
              nome: desc,
              valor,
              periodicidade: campo5 || "SEMPRE",
              parcelas: parseInt(campo6) || 1,
              data,
              diaVencimento: (diaV >= 1 && diaV <= 31) ? diaV : null
            });
          } else if (secao === "INVESTIMENTO") {
            estado.historicoInvestido.push({
              id: Date.now() + Math.random(),
              valor,
              desc,
              data,
              tipo: campo5 || 'aporte'
            });
          } else if (secao === "COFRE") {
            estado.historicoCofre.push({
              id: Date.now() + Math.random(),
              valor,
              desc,
              data,
              tipo: campo5 || 'aporte'
            });
          } else if (secao === "A_RECEBER") {
            estado.aReceber.push({
              id: Date.now() + Math.random(),
              descricao: desc,
              valor,
              periodicidade: campo5 || "UNICA",
              parcelas: parseInt(campo6) || 1,
              data,
              recebidosMeses: [],
              recebimentos: {}
            });
          } else if (secao === "CARTAO") {
            let diaF = parseInt(campo6) || 1;
            let diaV = parseInt(campo7) || 10;
            estado.cartoes.push({
              id: Date.now() + Math.random(),
              nome: desc || "Cartão",
              cor: campo5 || "purple",
              diaFechamento: diaF,
              diaVencimento: diaV
            });
          } else if (secao === "COMPRA_CARTAO") {
            let mesFatura = data.slice(0, 7);
            let cardId = parseFloat(campo6) || 1;
            if (!estado.comprasCartoes[mesFatura]) estado.comprasCartoes[mesFatura] = {};
            if (!estado.comprasCartoes[mesFatura][cardId]) estado.comprasCartoes[mesFatura][cardId] = [];
            estado.comprasCartoes[mesFatura][cardId].push({
              id: Date.now() + Math.random(),
              desc,
              valor,
              data,
              idGrupo: campo7 || null,
              periodicidade: campo5 || "UNICA"
            });
          }
        }
      }

      if (estado.cartoes.length === 0) {
        estado.cartoes.push({ id: 1, nome: "Cartão", cor: "purple", diaFechamento: 1, diaVencimento: 10 });
      }

      salvarEstado();
      toast("Backup importado com sucesso!");
    } catch (err) {
      console.error("Erro ao importar CSV:", err);
      toast("Erro ao ler o arquivo CSV.", "var(--accent-red)");
    } finally {
      inputEl.value = '';
    }
  };
  reader.readAsText(file);
}
