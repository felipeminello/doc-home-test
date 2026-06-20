'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Money } = require('../src/domain/money');
const { ipvaPolicy } = require('../src/domain/interest/ipva');
const { multaPolicy } = require('../src/domain/interest/multa');
const { InterestRegistry } = require('../src/domain/interest/registry');
const { UnknownDebtType } = require('../src/domain/errors');
const { daysOverdue } = require('../src/domain/date');

test('dias de atraso em UTC', () => {
  assert.equal(daysOverdue('2024-01-10', '2024-05-10'), 121);
  assert.equal(daysOverdue('2024-02-15', '2024-05-10'), 85);
  assert.equal(daysOverdue('2024-06-01', '2024-05-10'), -22); // não vencido
});

test('IPVA aplica teto de 20% sobre os juros', () => {
  // 1500 × 0,0033 × 121 = 598,95, mas teto = 1500 × 0,20 = 300,00
  const juros = ipvaPolicy.interest(Money.parse('1500.00'), 121);
  assert.equal(juros.toString(), '300.00');
});

test('MULTA usa 1% ao dia sem teto, HALF_UP', () => {
  const juros = multaPolicy.interest(Money.parse('300.50'), 85);
  assert.equal(juros.toString(), '255.43');
});

test('débito não vencido não gera juros', () => {
  assert.equal(ipvaPolicy.interest(Money.parse('1500.00'), 0).toString(), '0.00');
  assert.equal(multaPolicy.interest(Money.parse('300.50'), -5).toString(), '0.00');
});

test('registry lança UnknownDebtType para tipo sem policy', () => {
  const registry = new InterestRegistry([ipvaPolicy, multaPolicy]);
  assert.equal(registry.policyFor('IPVA'), ipvaPolicy);
  assert.throws(() => registry.policyFor('LICENCIAMENTO'), UnknownDebtType);
});
