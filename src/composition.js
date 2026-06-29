'use strict';

const { InterestRegistry } = require('./domain/interest/registry');
const { ipvaPolicy } = require('./domain/interest/ipva');
const { multaPolicy } = require('./domain/interest/multa');
const { ConsultarDebitos } = require('./application/consultarDebitos');
const { SimularPagamento } = require('./application/simularPagamento');
const { pixMethod } = require('./payment/pix');
const { cartaoCreditoMethod } = require('./payment/cartaoCredito');
const { createProviderA } = require('./infrastructure/providers/providerA');
const { createProviderB } = require('./infrastructure/providers/providerB');
const { withCircuitBreaker } = require('./infrastructure/providers/circuitBreaker');
const { backendA, backendB } = require('./infrastructure/providers/fixtures');
const { DebtController } = require('./infrastructure/http/controller');
const { nullLogger } = require('./infrastructure/logger');

// Data atual fixa do teste (UTC).
const REFERENCE_DATE = '2024-05-10';

// Composition root: o único lugar que conhece as classes concretas e as conecta. (DI)
function buildApp({ logger = nullLogger, providers, referenceDate = REFERENCE_DATE } = {}) {
  const registry = new InterestRegistry([ipvaPolicy, multaPolicy]);

  const consultar = new ConsultarDebitos({
    // Provedor A entra atrás de um circuit breaker: se ficar instável, falha
    // rápido e o fallback cai no Provedor B. (B pode ser envolvido igual.)
    providers: providers || [
      withCircuitBreaker(createProviderA(backendA), { logger }),
      createProviderB(backendB),
    ],
    registry,
    referenceDate,
    logger,
  });

  const simular = new SimularPagamento({ methods: [pixMethod, cartaoCreditoMethod] });

  return new DebtController({ consultar, simular, logger });
}

module.exports = { buildApp, REFERENCE_DATE };
