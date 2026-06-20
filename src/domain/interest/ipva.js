'use strict';

const { Money } = require('../money');

// IPVA: 0,33% ao dia; juros limitados a 20% do valor original (teto sobre os juros).
const DAILY_RATE_NUM = 33n; //   0,0033 = 33/10000
const DAILY_RATE_DEN = 10000n;
const CAP_NUM = 20n; //          0,20   = 20/100
const CAP_DEN = 100n;

const ipvaPolicy = {
  type: 'IPVA',
  // juros = min(valor × 0,0033 × dias, valor × 0,20)
  interest(amount, daysOverdue) {
    if (daysOverdue <= 0) return Money.zero();
    const juros = amount.mulDiv(DAILY_RATE_NUM * BigInt(daysOverdue), DAILY_RATE_DEN);
    const teto = amount.mulDiv(CAP_NUM, CAP_DEN);
    return juros.min(teto);
  },
};

module.exports = { ipvaPolicy };
