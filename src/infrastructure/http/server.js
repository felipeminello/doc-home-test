'use strict';

const http = require('node:http');

const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB
const ROUTE = '/consultas';
const TOO_LARGE = Symbol('too_large');

// Servidor HTTP: cuida só do transporte (rota, limite de corpo, parse, validação
// do envelope) e delega a regra para o controller.
function createServer({ controller, logger, route = ROUTE }) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method !== 'POST' || req.url.split('?')[0] !== route) {
        return send(res, 404, { error: 'not_found' });
      }

      const body = await readBody(req);
      if (body === TOO_LARGE) return send(res, 413, { error: 'payload_too_large' });

      const parsed = parseRequest(body);
      if (parsed.error) return send(res, 400, { error: parsed.error });

      const result = await controller.handle(parsed.placa);
      return send(res, result.status, result.body);
    } catch (err) {
      logger.error('request_failed', { error: err.message });
      return send(res, 500, { error: 'internal_error' });
    }
  });
}

// Lê o corpo respeitando o limite de tamanho.
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        resolve(TOO_LARGE);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Valida o envelope: JSON com exatamente { "placa": string }. Rejeita campos extras.
function parseRequest(body) {
  let data;
  try {
    data = JSON.parse(body || '');
  } catch {
    return { error: 'invalid_json' };
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'invalid_request' };
  }
  const keys = Object.keys(data);
  if (keys.length !== 1 || keys[0] !== 'placa' || typeof data.placa !== 'string') {
    return { error: 'invalid_request' };
  }
  return { placa: data.placa };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

module.exports = { createServer, MAX_BODY_BYTES, ROUTE };
