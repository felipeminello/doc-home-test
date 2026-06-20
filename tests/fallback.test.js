'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ConsultarDebitos } = require('../src/application/consultarDebitos');
const { InterestRegistry } = require('../src/domain/interest/registry');
const { ipvaPolicy } = require('../src/domain/interest/ipva');
const { multaPolicy } = require('../src/domain/interest/multa');
const { Debt } = require('../src/domain/debt');
const { Money } = require('../src/domain/money');
const { AllProvidersUnavailable } = require('../src/domain/errors');
const { nullLogger } = require('../src/infrastructure/logger');

const registry = new InterestRegistry([ipvaPolicy, multaPolicy]);

function makeUseCase(providers) {
  return new ConsultarDebitos({ providers, registry, referenceDate: '2024-05-10', logger: nullLogger });
}

const falho = { name: 'falho', async fetch() { throw new Error('timeout'); } };
const ok = {
  name: 'ok',
  async fetch() {
    return [new Debt({ type: 'IPVA', amount: Money.parse('1500.00'), dueDate: '2024-01-10' })];
  },
};

test('usa o próximo provedor quando o primeiro falha', async () => {
  const { debitos } = await makeUseCase([falho, ok]).execute('ABC1234');
  assert.equal(debitos.length, 1);
  assert.equal(debitos[0].valorAtualizado.toString(), '1800.00');
});

test('lança AllProvidersUnavailable quando todos falham', async () => {
  await assert.rejects(() => makeUseCase([falho, falho]).execute('ABC1234'), AllProvidersUnavailable);
});

test('lista vazia é sucesso (não dispara fallback)', async () => {
  const vazio = { name: 'vazio', async fetch() { return []; } };
  const nunca = { name: 'nunca', async fetch() { throw new Error('não deveria ser chamado'); } };
  const { debitos } = await makeUseCase([vazio, nunca]).execute('ABC1234');
  assert.deepEqual(debitos, []);
});
