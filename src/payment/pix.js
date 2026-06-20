'use strict';

// PIX: 5% de desconto aplicado à base de CADA opção (TOTAL e cada parcial).
const DISCOUNT_NUM = 95n; // 1 − 0,05 = 0,95 = 95/100
const DISCOUNT_DEN = 100n;

const pixMethod = {
  key: 'pix',
  // total_com_desconto = valor_base × 0,95 (HALF_UP, 2 casas)
  simulate(base) { // base tipo Money
    return { total_com_desconto: base.mulDiv(DISCOUNT_NUM, DISCOUNT_DEN) };
  },
};

module.exports = { pixMethod };
