'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildApp } = require('../src/composition');
const { createProviderA } = require('../src/infrastructure/providers/providerA');
const { createProviderB } = require('../src/infrastructure/providers/providerB');
const { backendB } = require('../src/infrastructure/providers/fixtures');
const { Debt } = require('../src/domain/debt');
const { Money } = require('../src/domain/money');

// Saída esperada da spec para a placa de teste ABC1234.
const ESPERADO = {
  placa: 'ABC1234',
  debitos: [
    { tipo: 'IPVA', valor_original: '1500.00', valor_atualizado: '1800.00', vencimento: '2024-01-10', dias_atraso: 121 },
    { tipo: 'MULTA', valor_original: '300.50', valor_atualizado: '555.93', vencimento: '2024-02-15', dias_atraso: 85 },
  ],
  resumo: { total_original: '1800.50', total_atualizado: '2355.93' },
  pagamentos: {
    opcoes: [
      {
        tipo: 'TOTAL',
        valor_base: '2355.93',
        pix: { total_com_desconto: '2238.13' },
        cartao_credito: {
          parcelas: [
            { quantidade: 1, valor_parcela: '2355.93' },
            { quantidade: 6, valor_parcela: '427.72' },
            { quantidade: 12, valor_parcela: '229.67' },
          ],
        },
      },
      {
        tipo: 'SOMENTE_IPVA',
        valor_base: '1800.00',
        pix: { total_com_desconto: '1710.00' },
        cartao_credito: {
          parcelas: [
            { quantidade: 1, valor_parcela: '1800.00' },
            { quantidade: 6, valor_parcela: '326.79' },
            { quantidade: 12, valor_parcela: '175.48' },
          ],
        },
      },
      {
        tipo: 'SOMENTE_MULTA',
        valor_base: '555.93',
        pix: { total_com_desconto: '528.13' },
        cartao_credito: {
          parcelas: [
            { quantidade: 1, valor_parcela: '555.93' },
            { quantidade: 6, valor_parcela: '100.93' },
            { quantidade: 12, valor_parcela: '54.20' },
          ],
        },
      },
    ],
  },
};

test('ABC1234 produz exatamente a saída esperada da spec', async () => {
  const { status, body } = await buildApp().handle('ABC1234');
  assert.equal(status, 200);
  assert.deepEqual(body, ESPERADO);
});

test('placa inválida -> 400 invalid_plate', async () => {
  assert.deepEqual(await buildApp().handle('XX'), { status: 400, body: { error: 'invalid_plate' } });
});

test('tipo desconhecido -> 422 unknown_debt_type com o tipo', async () => {
  const provider = {
    name: 'fake',
    async fetch() {
      return [new Debt({ type: 'LICENCIAMENTO', amount: Money.parse('100.00'), dueDate: '2024-01-10' })];
    },
  };
  const { status, body } = await buildApp({ providers: [provider] }).handle('ABC1234');
  assert.equal(status, 422);
  assert.deepEqual(body, { error: 'unknown_debt_type', type: 'LICENCIAMENTO' });
});

test('todos os provedores falham -> 503 all_providers_unavailable', async () => {
  const falho = { name: 'falho', async fetch() { throw new Error('timeout'); } };
  const { status, body } = await buildApp({ providers: [falho] }).handle('ABC1234');
  assert.equal(status, 503);
  assert.deepEqual(body, { error: 'all_providers_unavailable' });
});

test('provedor A falha -> provedor B responde', async () => {
  const provedorA = createProviderA(async () => {
    throw new Error('timeout');
  });
  const provedorB = createProviderB(backendB);
  const { status, body } = await buildApp({ providers: [provedorA, provedorB] }).handle('ABC1234');
  assert.equal(status, 200);
  assert.deepEqual(body, ESPERADO);
});

test('zero débitos -> apenas opção TOTAL com base 0,00', async () => {
  const { status, body } = await buildApp().handle('XYZ9999');
  assert.equal(status, 200);
  assert.deepEqual(body.debitos, []);
  assert.deepEqual(body.resumo, { total_original: '0.00', total_atualizado: '0.00' });
  assert.equal(body.pagamentos.opcoes.length, 1);
  assert.equal(body.pagamentos.opcoes[0].tipo, 'TOTAL');
  assert.equal(body.pagamentos.opcoes[0].valor_base, '0.00');
});

test('débito não vencido -> valor_atualizado = valor_original', async () => {
  const provider = createProviderA(async () =>
    JSON.stringify({ vehicle: 'ABC1234', debts: [{ type: 'IPVA', amount: 1500.0, due_date: '2024-06-01' }] }),
  );
  const { body } = await buildApp({ providers: [provider] }).handle('ABC1234');
  assert.equal(body.debitos[0].valor_atualizado, '1500.00');
  assert.equal(body.debitos[0].dias_atraso, 0);
});
