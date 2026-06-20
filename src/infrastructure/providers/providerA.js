'use strict';

const { Debt } = require('../../domain/debt');
const { Money } = require('../../domain/money');

// Adapter do Provedor A (JSON) para o modelo canônico (porta DebtProvider).
// `source(placa)` simula a chamada externa: devolve a string JSON ou lança erro.
function createProviderA(source) {
  return {
    name: 'provedor-a',
    async fetch(placa) {
      const raw = await source(placa.toString());
      const data = JSON.parse(raw);
      return (data.debts || []).map(
        (d) =>
          new Debt({
            type: d.type,
            amount: Money.fromNumber(d.amount),
            dueDate: d.due_date,
          }),
      );
    },
  };
}

module.exports = { createProviderA };
