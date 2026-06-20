'use strict';

// Helpers de XML mínimos para o formato do Provedor B (sem bibliotecas).

// Extrai o conteúdo da primeira ocorrência de <tag>...</tag>.
function tag(name, xml) {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
}

// Faz o parse do XML do Provedor B em { plate, debts: [{category, value, expiration}] }.
// Suporta o elemento autofechado <debts/> (zero débitos).
function parseProviderBXml(xml) {
  const debts = [];
  const debtRe = /<debt>([\s\S]*?)<\/debt>/g;
  let m;
  while ((m = debtRe.exec(xml)) !== null) {
    const block = m[1];
    debts.push({
      category: tag('category', block),
      value: tag('value', block),
      expiration: tag('expiration', block),
    });
  }
  return { plate: tag('plate', xml), debts };
}

// Serializa o XML do Provedor B. Sem débitos => elemento autofechado <debts/>.
function buildProviderBXml(plate, debts) {
  if (debts.length === 0) {
    return `<response><plate>${plate}</plate><debts/></response>`;
  }
  const items = debts
    .map(
      (d) =>
        `<debt><category>${d.category}</category>` +
        `<value>${d.value}</value>` +
        `<expiration>${d.expiration}</expiration></debt>`,
    )
    .join('');
  return `<response><plate>${plate}</plate><debts>${items}</debts></response>`;
}

module.exports = { parseProviderBXml, buildProviderBXml };
