'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Placa } = require('../src/domain/placa');
const { InvalidPlate } = require('../src/domain/errors');

test('aceita placa antiga e Mercosul', () => {
  assert.equal(new Placa('ABC1234').toString(), 'ABC1234');
  assert.equal(new Placa('ABC1D23').toString(), 'ABC1D23');
});

test('normaliza para maiúsculas e remove espaços', () => {
  assert.equal(new Placa('  abc1234 ').toString(), 'ABC1234');
});

test('rejeita placa fora do padrão', () => {
  assert.throws(() => new Placa('AB1234'), InvalidPlate);
  assert.throws(() => new Placa('ABCD123'), InvalidPlate);
  assert.throws(() => new Placa(''), InvalidPlate);
});

test('mascara a placa para logs (LGPD)', () => {
  assert.equal(new Placa('ABC1234').masked(), 'A*****4');
});
