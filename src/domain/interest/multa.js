'use strict';

const { Money } = require('../money');

// MULTA: 1% ao dia, sem teto.
const DAILY_RATE_NUM = 1n; // 0,01 = 1/100
const DAILY_RATE_DEN = 100n;

const multaPolicy = {
  type: 'MULTA',
  // juros = valor × 0,01 × dias
  interest(amount, daysOverdue) {
    if (daysOverdue <= 0) return Money.zero();
    return amount.mulDiv(DAILY_RATE_NUM * BigInt(daysOverdue), DAILY_RATE_DEN);
  },
};

module.exports = { multaPolicy };
