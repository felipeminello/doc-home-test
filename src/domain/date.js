'use strict';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Dias de atraso (UTC) entre o vencimento e a data de referência.
// Negativo quando o débito ainda não venceu.
function daysOverdue(dueDate, referenceDate) {
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  const ref = Date.parse(`${referenceDate}T00:00:00Z`);
  return Math.floor((ref - due) / MS_PER_DAY);
}

module.exports = { daysOverdue };
