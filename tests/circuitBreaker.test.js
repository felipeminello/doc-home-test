'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  withCircuitBreaker,
  CircuitOpenError,
  State,
} = require('../src/infrastructure/providers/circuitBreaker');
const { ConsultarDebitos } = require('../src/application/consultarDebitos');
const { InterestRegistry } = require('../src/domain/interest/registry');
const { ipvaPolicy } = require('../src/domain/interest/ipva');
const { multaPolicy } = require('../src/domain/interest/multa');
const { Debt } = require('../src/domain/debt');
const { Money } = require('../src/domain/money');
const { nullLogger } = require('../src/infrastructure/logger');

// Provedor de teste controlável: alterna entre falhar e devolver débitos,
// e conta quantas vezes foi efetivamente chamado.
function makeProvider({ name = 'teste', falha = false } = {}) {
  const p = {
    name,
    falha,
    chamadas: 0,
    async fetch() {
      p.chamadas += 1;
      if (p.falha) throw new Error('indisponível');
      return [new Debt({ type: 'IPVA', amount: Money.parse('1500.00'), dueDate: '2024-01-10' })];
    },
  };
  return p;
}

// Relógio falso para controlar a janela de resetTimeout sem esperar de verdade.
function fakeClock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

const placa = { toString: () => 'ABC1234' };

test('passa as chamadas adiante enquanto o circuito está fechado', async () => {
  const provider = makeProvider();
  const cb = withCircuitBreaker(provider, { failureThreshold: 3 });

  const debts = await cb.fetch(placa);

  assert.equal(cb.state, State.CLOSED);
  assert.equal(provider.chamadas, 1);
  assert.equal(debts[0].type, 'IPVA');
});

test('abre após o limiar de falhas consecutivas e curto-circuita', async () => {
  const provider = makeProvider({ falha: true });
  const cb = withCircuitBreaker(provider, { failureThreshold: 3 });

  for (let i = 0; i < 3; i += 1) {
    await assert.rejects(() => cb.fetch(placa), /indisponível/);
  }
  assert.equal(cb.state, State.OPEN);

  // Aberto: falha rápido com CircuitOpenError, sem tocar no provedor.
  await assert.rejects(() => cb.fetch(placa), CircuitOpenError);
  assert.equal(provider.chamadas, 3);
});

test('uma falha isolada não abre o circuito', async () => {
  const provider = makeProvider({ falha: true });
  const cb = withCircuitBreaker(provider, { failureThreshold: 3 });

  await assert.rejects(() => cb.fetch(placa), /indisponível/);

  assert.equal(cb.state, State.CLOSED);
});

test('sucesso zera o contador de falhas', async () => {
  const provider = makeProvider({ falha: true });
  const cb = withCircuitBreaker(provider, { failureThreshold: 3 });

  await assert.rejects(() => cb.fetch(placa), /indisponível/);
  await assert.rejects(() => cb.fetch(placa), /indisponível/);
  provider.falha = false;
  await cb.fetch(placa); // sucesso reseta
  provider.falha = true;
  await assert.rejects(() => cb.fetch(placa), /indisponível/);

  // Só 1 falha após o reset: ainda fechado.
  assert.equal(cb.state, State.CLOSED);
});

test('após o resetTimeout faz uma chamada de prova e, com sucesso, fecha', async () => {
  const clock = fakeClock();
  const provider = makeProvider({ falha: true });
  const cb = withCircuitBreaker(provider, { failureThreshold: 1, resetTimeout: 30_000, now: clock.now });

  await assert.rejects(() => cb.fetch(placa), /indisponível/);
  assert.equal(cb.state, State.OPEN);

  clock.advance(30_000); // janela expira
  provider.falha = false;
  const debts = await cb.fetch(placa); // chamada de prova bem-sucedida

  assert.equal(cb.state, State.CLOSED);
  assert.equal(debts[0].type, 'IPVA');
});

test('uma falha em half-open reabre o circuito imediatamente', async () => {
  const clock = fakeClock();
  const provider = makeProvider({ falha: true });
  const cb = withCircuitBreaker(provider, { failureThreshold: 1, resetTimeout: 30_000, now: clock.now });

  await assert.rejects(() => cb.fetch(placa), /indisponível/);
  clock.advance(30_000);

  // A chamada de prova (half-open) falha -> reabre sem esperar o limiar.
  await assert.rejects(() => cb.fetch(placa), /indisponível/);
  assert.equal(cb.state, State.OPEN);
});

test('integração: circuito de A aberto faz o fallback cair no Provedor B', async () => {
  const registry = new InterestRegistry([ipvaPolicy, multaPolicy]);
  const a = makeProvider({ name: 'provedor-a', falha: true });
  const cbA = withCircuitBreaker(a, { failureThreshold: 1 });
  const b = {
    name: 'provedor-b',
    async fetch() {
      return [new Debt({ type: 'MULTA', amount: Money.parse('300.50'), dueDate: '2024-02-15' })];
    },
  };
  const consultar = new ConsultarDebitos({
    providers: [cbA, b],
    registry,
    referenceDate: '2024-05-10',
    logger: nullLogger,
  });

  // 1ª consulta: A falha (abre o circuito), fallback usa B.
  const r1 = await consultar.execute('ABC1234');
  assert.equal(r1.debitos[0].tipo, 'MULTA');
  assert.equal(cbA.state, State.OPEN);

  // 2ª consulta: A é curto-circuitado (não é chamado de novo), B atende.
  const r2 = await consultar.execute('ABC1234');
  assert.equal(r2.debitos[0].tipo, 'MULTA');
  assert.equal(a.chamadas, 1); // A não foi tocado na 2ª vez
});
