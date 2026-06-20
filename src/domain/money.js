'use strict';

// Value object monetário: decimal exato armazenado em centavos (BigInt).
// Nunca usa float, evitando perda de precisão em dinheiro.
class Money {
  // cents: BigInt (quantidade de centavos)
  constructor(cents) {
    if (typeof cents !== 'bigint') {
      throw new TypeError('Money espera centavos como BigInt');
    }
    this.cents = cents;
    Object.freeze(this);
  }

  static zero() {
    return new Money(0n);
  }

  // Converte uma string decimal exata ("1500.00", "300.5", "1500") em Money.
  static parse(decimal) {
    const s = String(decimal).trim();
    if (!/^-?\d+(\.\d+)?$/.test(s)) {
      throw new TypeError(`Valor monetário inválido: ${decimal}`);
    }
    const negative = s.startsWith('-');
    const [intPart, fracPart = ''] = s.replace('-', '').split('.');
    const frac2 = (fracPart + '00').slice(0, 2); // duas primeiras casas
    let cents = BigInt(intPart) * 100n + BigInt(frac2);
    // Casas além de centavos: arredonda HALF_UP.
    if (fracPart.length > 2 && fracPart.charCodeAt(2) >= 53 /* '5' */) cents += 1n;
    return new Money(negative ? -cents : cents);
  }

  // Converte um número JSON (ex.: 1500, 300.5) em Money, arredondando HALF_UP.
  static fromNumber(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new TypeError(`Valor monetário inválido: ${n}`);
    }
    return Money.parse(n.toFixed(6)); // string evita lixo de float
  }

  add(other) {
    return new Money(this.cents + other.cents);
  }

  // Multiplica por (num/den) com arredondamento HALF_UP. Mantém precisão exata.
  mulDiv(num, den) {
    return new Money(roundDiv(this.cents * num, den));
  }

  isLessThan(other) {
    return this.cents < other.cents;
  }

  min(other) {
    return this.isLessThan(other) ? this : other;
  }

  // Sempre com 2 casas decimais: "1234.56".
  toString() {
    const neg = this.cents < 0n;
    const abs = neg ? -this.cents : this.cents;
    const frac = (abs % 100n).toString().padStart(2, '0');
    return `${neg ? '-' : ''}${abs / 100n}.${frac}`;
  }
}

// Divisão inteira com arredondamento HALF_UP (meia unidade para longe do zero).
function roundDiv(numerator, denominator) {
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const neg = numerator < 0n;
  const abs = neg ? -numerator : numerator;
  const q = abs / denominator;
  const r = abs % denominator;
  const rounded = r * 2n >= denominator ? q + 1n : q;
  return neg ? -rounded : rounded;
}

module.exports = { Money };
