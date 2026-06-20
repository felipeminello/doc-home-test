'use strict';

const { buildProviderBXml } = require('./xml');

// Backends simulados dos provedores externos (substituem chamadas de rede reais).
// Mesma fonte de dados, servida em dois formatos diferentes (JSON e XML).
const DATA = {
  ABC1234: [
    { type: 'IPVA', amount: '1500.00', due: '2024-01-10' },
    { type: 'MULTA', amount: '300.50', due: '2024-02-15' },
  ],
  ABC6789: [
    { type: 'IPVA', amount: '1500.00', due: '2024-05-08' },
    { type: 'MULTA', amount: '300.50', due: '2024-05-08' },
    { type: 'MULTA', amount: '12', due: '2025-02-15' },
  ],
  ABC5678: [
    { type: 'IPVA', amount: '1500.00', due: '2024-05-12' },
    { type: 'MULTA', amount: '300.50', due: '2024-06-08' },
  ],
};

// Provedor A: JSON, no formato { vehicle, debts: [{ type, amount, due_date }] }.
async function backendA(placa) {
  const debts = DATA[placa] || [];
  return JSON.stringify({
    vehicle: placa,
    debts: debts.map((d) => ({ type: d.type, amount: Number(d.amount), due_date: d.due })),
  });
}

// Provedor B: XML, no formato <response><plate/><debts>...</debts></response>.
async function backendB(placa) {
  const debts = DATA[placa] || [];
  return buildProviderBXml(
    placa,
    debts.map((d) => ({ category: d.type, value: d.amount, expiration: d.due })),
  );
}

module.exports = { backendA, backendB, DATA };
