// ============================================================
// app.js — Inicialização e ligação entre os módulos
// ============================================================

import {
  mesAnoAtual, registrarCallbackEstado, registrarCallbackToast, registrarCallbackAuth
} from './storage.js';

import {
  atualizarTela, atualizarLabelData, aplicarTema, mostrarToast,
  atualizarBotaoAuth, abrirOnboardingSeNecessario, aplicarPrivacidade,
  verificarNotificacoesDoDia
} from './ui.js';

// storage.js chama estas funções sem precisar importar ui.js.
registrarCallbackEstado(atualizarTela);
registrarCallbackToast(mostrarToast);
registrarCallbackAuth(atualizarBotaoAuth);

// --- Inicialização da tela ---
document.addEventListener('DOMContentLoaded', () => {
  const filtroInput = document.getElementById('filtroData');
  if (filtroInput) {
    filtroInput.value = mesAnoAtual;
  }
  atualizarLabelData();
  aplicarTema();
  aplicarPrivacidade();
  atualizarTela();
  abrirOnboardingSeNecessario();
  verificarNotificacoesDoDia();
});

// Executa também imediatamente caso o DOM já esteja pronto
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  const filtroInput = document.getElementById('filtroData');
  if (filtroInput && !filtroInput.value) {
    filtroInput.value = mesAnoAtual;
  }
  atualizarLabelData();
  aplicarTema();
  aplicarPrivacidade();
  atualizarTela();
  abrirOnboardingSeNecessario();
  verificarNotificacoesDoDia();
}
