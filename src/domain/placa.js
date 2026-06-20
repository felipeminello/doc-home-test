'use strict';

const { InvalidPlate } = require('./errors');

// Placa Mercosul (ABC1D23) ou antiga (ABC1234).
const PLACA_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

class Placa {
  constructor(value) {
    const normalized = String(value).trim().toUpperCase();
    if (!PLACA_REGEX.test(normalized)) {
      throw new InvalidPlate(value);
    }
    this.value = normalized;
    Object.freeze(this);
  }

  toString() {
    return this.value;
  }

  // Mascara para logs (LGPD): mantém a 1ª e a última, oculta o miolo.
  masked() {
    const v = this.value;
    return v[0] + '*'.repeat(v.length - 2) + v[v.length - 1];
  }
}

module.exports = { Placa };
