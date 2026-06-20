'use strict';

const { Debt } = require('../../domain/debt');
const { Money } = require('../../domain/money');
const { parseProviderBXml } = require('./xml');

// Adapter do Provedor B (XML) para o modelo canônico (porta DebtProvider).
// `source(placa)` simula a chamada externa: devolve a string XML ou lança erro.
function createProviderB(source) {
  return {
    name: 'provedor-b',
    async fetch(placa) {
      const raw = await source(placa.toString());
      const { debts } = parseProviderBXml(raw);
      return debts.map(
        (d) =>
          new Debt({
            type: d.category,
            amount: Money.parse(d.value),
            dueDate: d.expiration,
          }),
      );
    },
  };
}

module.exports = { createProviderB };
