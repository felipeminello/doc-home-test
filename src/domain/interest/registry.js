'use strict';

const { UnknownDebtType } = require('../errors');

// Registro de policies de juros (Strategy). Novo tipo de débito = nova policy
// registrada aqui, sem alterar as existentes (OCP).
class InterestRegistry {
  constructor(policies = []) {
    this.policies = new Map();
    for (const policy of policies) this.register(policy);
  }

  register(policy) {
    this.policies.set(policy.type, policy);
    return this;
  }

  // Lança UnknownDebtType quando não há policy para o tipo (não silencia).
  policyFor(type) {
    const policy = this.policies.get(type);
    if (!policy) throw new UnknownDebtType(type);
    return policy;
  }
}

module.exports = { InterestRegistry };
