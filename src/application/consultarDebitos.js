'use strict';

const { Placa } = require('../domain/placa');
const { daysOverdue } = require('../domain/date');
const { AllProvidersUnavailable } = require('../domain/errors');

// Caso de uso: consulta os débitos de uma placa (com fallback entre provedores)
// e calcula os valores atualizados com juros.
class ConsultarDebitos {
  constructor({ providers, registry, referenceDate, logger }) {
    this.providers = providers; //       ordem de fallback
    this.registry = registry; //         InterestRegistry
    this.referenceDate = referenceDate; // 'YYYY-MM-DD' (UTC)
    this.logger = logger;
  }

  async execute(placaInput) {
    const placa = new Placa(placaInput); // pode lançar InvalidPlate
    const debts = await this.fetchWithFallback(placa);
    const debitos = debts.map((debt) => this.calcular(debt));
    return { placa, debitos };
  }

  // Tenta cada provedor na ordem; "lista vazia" é sucesso, não falha.
  async fetchWithFallback(placa) {
    for (const provider of this.providers) {
      try {
        const debts = await provider.fetch(placa);
        this.logger.info('provider_ok', { provider: provider.name, placa: placa.toString() });
        return debts;
      } catch (err) {
        this.logger.warn('provider_failed', {
          provider: provider.name,
          placa: placa.masked(),
          error: err.message,
        });
      }
    }
    throw new AllProvidersUnavailable();
  }

  calcular(debt) {
    const policy = this.registry.policyFor(debt.type); // pode lançar UnknownDebtType
    const dias = daysOverdue(debt.dueDate, this.referenceDate);
    const juros = policy.interest(debt.amount, dias);
    return {
      tipo: debt.type,
      valorOriginal: debt.amount,
      valorAtualizado: debt.amount.add(juros),
      vencimento: debt.dueDate,
      diasAtraso: Math.max(dias, 0),
    };
  }
}

module.exports = { ConsultarDebitos };
