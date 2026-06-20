'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Money } = require('../src/domain/money');
const { pixMethod } = require('../src/payment/pix');
const { cartaoCreditoMethod } = require('../src/payment/cartaoCredito');

test('PIX aplica 5% de desconto (HALF_UP)', () => {
  assert.equal(pixMethod.simulate(Money.parse('2355.93')).total_com_desconto.toString(), '2238.13');
  assert.equal(pixMethod.simulate(Money.parse('555.93')).total_com_desconto.toString(), '528.13');
});

test('cartão oferece exatamente 1x, 6x e 12x', () => {
  const { parcelas } = cartaoCreditoMethod.simulate(Money.parse('2355.93'));
  assert.deepEqual(
    parcelas.map((p) => p.quantidade),
    [1, 6, 12],
  );
});

test('cartão 1x não tem juros', () => {
  const { parcelas } = cartaoCreditoMethod.simulate(Money.parse('1800.00'));
  assert.equal(parcelas[0].valor_parcela.toString(), '1800.00');
});

test('cartão 6x e 12x via Price/PMT (2,5% a.m.)', () => {
  const total = cartaoCreditoMethod.simulate(Money.parse('2355.93')).parcelas;
  assert.equal(total[1].valor_parcela.toString(), '427.72'); // 6x
  assert.equal(total[2].valor_parcela.toString(), '229.67'); // 12x

  const multa = cartaoCreditoMethod.simulate(Money.parse('555.93')).parcelas;
  assert.equal(multa[1].valor_parcela.toString(), '100.93'); // 6x
  assert.equal(multa[2].valor_parcela.toString(), '54.20'); // 12x
});
