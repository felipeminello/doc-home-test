'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Placa } = require('../src/domain/placa');
const { createProviderA } = require('../src/infrastructure/providers/providerA');
const { createProviderB } = require('../src/infrastructure/providers/providerB');
const { parseProviderBXml, buildProviderBXml } = require('../src/infrastructure/providers/xml');

const placa = new Placa('ABC1234');

test('Provedor A (JSON) normaliza para o modelo canônico', async () => {
  const json = JSON.stringify({
    vehicle: 'ABC1234',
    debts: [{ type: 'IPVA', amount: 1500.0, due_date: '2024-01-10' }],
  });
  const debts = await createProviderA(async () => json).fetch(placa);
  assert.equal(debts.length, 1);
  assert.equal(debts[0].type, 'IPVA');
  assert.equal(debts[0].amount.toString(), '1500.00');
  assert.equal(debts[0].dueDate, '2024-01-10');
});

test('Provedor A (JSON) normaliza para o modelo canônico com mais débitos', async () => {
  const json = JSON.stringify({
    vehicle: 'ABC1234',
    debts: [
      { type: 'IPVA', amount: 1500.0, due_date: '2024-01-10' },
      { type: 'MULTA', amount: 200.0, due_date: '2022-01-10' },
      { type: 'XPTO', amount: 45.56, due_date: '2026-01-10' },
      { type: 'JUROS', amount: 0.0, due_date: '2026-02-10' },
    ],
  });
  const debts = await createProviderA(async () => json).fetch(placa);
  assert.equal(debts.length, 4);
  assert.equal(debts[2].type, 'XPTO');
  assert.equal(debts[2].amount.toString(), '45.56');
  assert.equal(debts[2].dueDate, '2026-01-10');
});

test('Provedor B (XML) normaliza para o modelo canônico', async () => {
  const xml = buildProviderBXml('ABC1234', [
    { category: 'MULTA', value: '300.50', expiration: '2024-02-15' },
    { category: 'IPVA', value: '2478.46', expiration: '2021-03-06' },
  ]);
  const debts = await createProviderB(async () => xml).fetch(placa);

  assert.equal(debts.length, 2);

  assert.equal(debts[0].type, 'MULTA');
  assert.equal(debts[0].amount.toString(), '300.50');
  assert.equal(debts[0].dueDate, '2024-02-15');

  assert.equal(debts[1].type, 'IPVA');
  assert.equal(debts[1].amount.toString(), '2478.46');
  assert.equal(debts[1].dueDate, '2021-03-06');
});

test('Provedor B serializa <debts/> autofechado quando vazio', () => {
  assert.equal(buildProviderBXml('ABC1234', []), '<response><plate>ABC1234</plate><debts/></response>');
});

test('Provedor B faz parse de <debts/> como lista vazia (sucesso)', async () => {
  const xml = buildProviderBXml('ABC1234', []);
  assert.deepEqual(parseProviderBXml(xml).debts, []);
  const debts = await createProviderB(async () => xml).fetch(placa);
  assert.deepEqual(debts, []);
});
