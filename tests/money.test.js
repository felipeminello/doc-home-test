'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Money } = require('../src/domain/money');

test('parse e toString preservam 2 casas decimais', () => {
  assert.equal(Money.parse('1500.00').toString(), '1500.00');
  assert.equal(Money.parse('300.5').toString(), '300.50');
  assert.equal(Money.parse('1500').toString(), '1500.00');
});

test('fromNumber converte número JSON sem lixo de float', () => {
  assert.equal(Money.fromNumber(1500.0).toString(), '1500.00');
  assert.equal(Money.fromNumber(300.5).toString(), '300.50');
});

test('parse arredonda HALF_UP além de centavos', () => {
  assert.equal(Money.parse('1.005').toString(), '1.01');
  assert.equal(Money.parse('1.004').toString(), '1.00');
});

test('add soma valores', () => {
  assert.equal(Money.parse('1800.00').add(Money.parse('555.93')).toString(), '2355.93');
});

test('mulDiv arredonda HALF_UP (255.425 -> 255.43)', () => {
  // 300.50 × 85/100 = 255.425
  assert.equal(Money.parse('300.50').mulDiv(85n, 100n).toString(), '255.43');
});

test('min escolhe o menor', () => {
  assert.equal(Money.parse('300.00').min(Money.parse('598.95')).toString(), '300.00');
});
