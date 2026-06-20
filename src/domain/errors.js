'use strict';

// Exceções de domínio tipadas. A camada HTTP as traduz para status/payload.
class DomainError extends Error {}

class InvalidPlate extends DomainError {
  constructor(value) {
    super(`Placa inválida: ${value}`);
    this.code = 'invalid_plate';
  }
}

class UnknownDebtType extends DomainError {
  constructor(type) {
    super(`Tipo de débito desconhecido: ${type}`);
    this.code = 'unknown_debt_type';
    this.type = type;
  }
}

class AllProvidersUnavailable extends DomainError {
  constructor() {
    super('Todos os provedores estão indisponíveis');
    this.code = 'all_providers_unavailable';
  }
}

module.exports = { DomainError, InvalidPlate, UnknownDebtType, AllProvidersUnavailable };
