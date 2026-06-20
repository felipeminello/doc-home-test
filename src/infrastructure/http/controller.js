'use strict';

const { Money } = require('../../domain/money');
const { InvalidPlate, UnknownDebtType, AllProvidersUnavailable } = require('../../domain/errors');

// Orquestra os casos de uso, monta a resposta no contrato da spec e traduz as
// exceções de domínio para status HTTP. Independente do transporte (http).
class DebtController {
  constructor({ consultar, simular, logger }) {
    this.consultar = consultar;
    this.simular = simular;
    this.logger = logger;
  }

  // Recebe a placa já validada no transporte. Devolve { status, body }.
  async handle(placaValue) {
    try {
      const { placa, debitos } = await this.consultar.execute(placaValue);
      const pagamentos = this.simular.execute(debitos);
      return { status: 200, body: serialize(buildResponse(placa, debitos, pagamentos)) };
    } catch (err) {
      return this.toHttpError(err);
    }
  }

  toHttpError(err) {
    if (err instanceof InvalidPlate) return { status: 400, body: { error: err.code } };
    if (err instanceof UnknownDebtType) {
      return { status: 422, body: { error: err.code, type: err.type } };
    }
    if (err instanceof AllProvidersUnavailable) return { status: 503, body: { error: err.code } };
    this.logger.error('unexpected_error', { error: err.message });
    return { status: 500, body: { error: 'internal_error' } };
  }
}

function buildResponse(placa, debitos, pagamentos) {
  return {
    placa: placa.toString(),
    debitos: debitos.map((d) => ({
      tipo: d.tipo,
      valor_original: d.valorOriginal,
      valor_atualizado: d.valorAtualizado,
      vencimento: d.vencimento,
      dias_atraso: d.diasAtraso,
    })),
    resumo: {
      total_original: somar(debitos, 'valorOriginal'),
      total_atualizado: somar(debitos, 'valorAtualizado'),
    },
    pagamentos,
  };
}

function somar(debitos, campo) {
  return debitos.reduce((acc, d) => acc.add(d[campo]), Money.zero());
}

// Converte recursivamente todo Money em string decimal; demais valores intactos.
function serialize(value) {
  if (value instanceof Money) return value.toString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

module.exports = { DebtController };
