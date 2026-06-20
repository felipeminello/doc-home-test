'use strict';

const { Money } = require('../domain/money');

// Caso de uso: monta as opções de pagamento — TOTAL e uma SOMENTE_<TIPO> por
// tipo de débito (singular, mesmo com vários débitos do mesmo tipo).
class SimularPagamento {
  constructor({ methods }) {
    this.methods = methods; // [{ key, simulate(base) }]: pix, cartão...
  }

  execute(debitos) {
    const opcoes = [this.opcao('TOTAL', this.somaTotal(debitos))];
    for (const [tipo, base] of this.basesPorTipo(debitos)) {
      opcoes.push(this.opcao(`SOMENTE_${tipo}`, base));
    }
    return { opcoes };
  }

  somaTotal(debitos) {
    return debitos.reduce((acc, d) => acc.add(d.valorAtualizado), Money.zero());
  }

  // Agrupa por tipo, somando, preservando a ordem de aparição.
  basesPorTipo(debitos) {
    const bases = new Map();
    for (const d of debitos) {
      const atual = bases.get(d.tipo) || Money.zero();
      bases.set(d.tipo, atual.add(d.valorAtualizado));
    }
    return bases;
  }

  opcao(tipo, base) {
    const opcao = { tipo, valor_base: base };
    for (const method of this.methods) {
      opcao[method.key] = method.simulate(base);
    }
    return opcao;
  }
}

module.exports = { SimularPagamento };
