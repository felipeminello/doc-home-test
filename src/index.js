'use strict';

const { createServer, ROUTE } = require('./infrastructure/http/server');
const { buildApp } = require('./composition');
const { createLogger } = require('./infrastructure/logger');

const PORT = process.env.PORT || 8080;
const logger = createLogger();
const controller = buildApp({ logger });
const server = createServer({ controller, logger });

server.listen(PORT, () => {
  logger.info('server_started', { port: Number(PORT), route: ROUTE });
});
