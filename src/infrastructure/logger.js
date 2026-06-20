'use strict';

// Logger estruturado (uma linha JSON por evento). Quem chama é responsável por
// já mascarar dados sensíveis (ex.: placa) antes de passar os campos.
function createLogger(out = process.stdout) {
  const log = (level, event, fields = {}) => {
    out.write(`${JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields })}\n`);
  };
  return {
    info: (event, fields) => log('info', event, fields),
    warn: (event, fields) => log('warn', event, fields),
    error: (event, fields) => log('error', event, fields),
  };
}

// Logger silencioso, útil em testes.
const nullLogger = { info() {}, warn() {}, error() {} };

module.exports = { createLogger, nullLogger };
