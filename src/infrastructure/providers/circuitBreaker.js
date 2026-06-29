'use strict';

const { nullLogger } = require('../logger');

// Estados do circuito (padrão Circuit Breaker).
//   CLOSED    -> chamadas passam; conta falhas consecutivas.
//   OPEN      -> curto-circuita (falha rápido) sem chamar o provedor.
//   HALF_OPEN -> deixa passar uma chamada de prova para sondar a recuperação.
const State = Object.freeze({ CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half_open' });

// Padrões (sem números mágicos): abre após 3 falhas seguidas; tenta de novo após 30s.
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_RESET_TIMEOUT_MS = 30_000;

// Erro de borda: a chamada foi curto-circuitada porque o circuito está aberto.
// Não é erro de domínio: como qualquer falha de provedor, dispara o fallback
// para o próximo provedor em ConsultarDebitos.fetchWithFallback.
class CircuitOpenError extends Error {
  constructor(name) {
    super(`Circuito aberto para o provedor: ${name}`);
    this.code = 'circuit_open';
    this.provider = name;
  }
}

// Decorator de DebtProvider: protege um provedor instável fazendo-o "falhar rápido"
// enquanto está fora do ar, em vez de pagar o timeout a cada chamada. Mantém o
// mesmo contrato da porta (name, fetch), então é intercambiável (LSP).
function withCircuitBreaker(provider, options = {}) {
  const failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const resetTimeout = options.resetTimeout ?? DEFAULT_RESET_TIMEOUT_MS;
  const now = options.now ?? Date.now; // relógio injetável (testes)
  const logger = options.logger ?? nullLogger;

  let state = State.CLOSED;
  let failures = 0;
  let openedAt = 0;

  function open() {
    state = State.OPEN;
    openedAt = now();
    logger.warn('circuit_open', { provider: provider.name, failures });
  }

  function onSuccess() {
    failures = 0;
    if (state !== State.CLOSED) {
      state = State.CLOSED;
      logger.info('circuit_closed', { provider: provider.name });
    }
  }

  function onFailure() {
    failures += 1;
    // Em HALF_OPEN qualquer falha reabre; em CLOSED, ao atingir o limiar.
    if (state === State.HALF_OPEN || failures >= failureThreshold) {
      open();
    }
  }

  return {
    name: provider.name,

    async fetch(placa) {
      if (state === State.OPEN) {
        if (now() - openedAt < resetTimeout) {
          throw new CircuitOpenError(provider.name); // ainda em espera
        }
        state = State.HALF_OPEN; // janela expirou: deixa sondar
      }

      try {
        const debts = await provider.fetch(placa);
        onSuccess();
        return debts;
      } catch (err) {
        onFailure();
        throw err;
      }
    },

    // Introspecção (observabilidade/testes); não faz parte da porta.
    get state() {
      return state;
    },
  };
}

module.exports = { withCircuitBreaker, CircuitOpenError, State };
