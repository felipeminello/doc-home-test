'use strict';

// Cartão de crédito: opções fixas 1x, 6x e 12x.
// 1x = sem juros; 6x e 12x = Price/PMT a 2,5% a.m. (i = 0,025 = 1/40).
//
// parcela = base × i × (1+i)^n / ((1+i)^n − 1), com (1+i) = 41/40.
// Reescrito para BigInt exato (sem float):
//   parcela = base × 41^n / (40 × (41^n − 40^n))
const PARCELAS = [1, 6, 12];
const RATE_NUM = 41n; // (1 + 0,025)
const RATE_DEN = 40n;

const cartaoCreditoMethod = {
  key: 'cartao_credito',
  simulate(base) {
    const parcelas = PARCELAS.map((n) => ({
      quantidade: n,
      valor_parcela: parcela(base, n),
    }));
    return { parcelas };
  },
};

function parcela(base, n) {
  if (n === 1) return base; // à vista, sem juros
  const up = RATE_NUM ** BigInt(n); // 41^n
  const down = RATE_DEN ** BigInt(n); // 40^n
  return base.mulDiv(up, RATE_DEN * (up - down));
}

module.exports = { cartaoCreditoMethod };
