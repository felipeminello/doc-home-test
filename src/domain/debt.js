'use strict';

// Modelo canônico de um débito, após a normalização feita pelos adapters.
class Debt {
  // { type: string, amount: Money, dueDate: 'YYYY-MM-DD' (UTC) }
  constructor({ type, amount, dueDate }) {
    this.type = type;
    this.amount = amount;
    this.dueDate = dueDate;
    Object.freeze(this);
  }
}

module.exports = { Debt };
