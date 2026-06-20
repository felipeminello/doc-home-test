# ADRs — Decisões de Arquitetura

Registro das decisões de arquitetura e padrões de projeto desta implementação em
Node.js. Cada ADR segue o formato **Contexto → Decisão → Consequências**. Novas
decisões são adicionadas como um novo ADR (o histórico não é reescrito).

| #    | Decisão                                            | Status |
| ---- | -------------------------------------------------- | ------ |
| 0001 | Node.js puro (sem TypeScript, sem libs)            | Aceito |
| 0002 | Clean Architecture + Ports & Adapters (Hexagonal)  | Aceito |
| 0003 | Value Object `Money` com `BigInt` (decimal exato)  | Aceito |
| 0004 | Strategy + Registro para juros por tipo de débito  | Aceito |
| 0005 | Strategy para meios de pagamento                   | Aceito |
| 0006 | Adapter por provedor + fallback "first-wins"       | Aceito |
| 0007 | Parser/serializer XML mínimo por regex             | Aceito |
| 0008 | Erros como exceções de domínio tipadas             | Aceito |
| 0009 | Composition root manual (sem framework/DI)         | Aceito |
| 0010 | Testes com `node:test` + `node:assert`             | Aceito |

---

## ADR-0001 — Node.js puro (sem TypeScript, sem bibliotecas)

**Contexto.** É um teste técnico (test-home) que será avaliado em leitura de código e
modificado **ao vivo, com IA, durante a apresentação**.

**Decisão.** Usar **Node.js puro** (JavaScript/CommonJS) e apenas a biblioteca padrão
(`node:http`, `node:test`, `node:assert`). Nenhuma dependência do npm, nenhum passo de
build/transpilação.

**Consequências.**

- (+) Avaliação direta: o que está no repositório é o que roda — sem build, sem
  `node_modules`, `git clone` + `npm start` basta.
- (+) Iteração ao vivo mais rápida (sem recompilar/aguardar o transpiler).
- (+) Cumpre a restrição de "sem bibliotecas".
- (−) Sem checagem estática de tipos: o contrato entre módulos fica documentado em
  comentários/JSDoc e garantido por testes, não pelo compilador.
- **Em produção**, a escolha seria **TypeScript** pela melhor manutenibilidade (tipos
  no `Money`, nas portas e no modelo canônico, refactors mais seguros e melhor
  autocompletar). A arquitetura em camadas adotada já foi pensada para migrar para TS
  sem reescrever o desenho — apenas anotando tipos nas fronteiras.

## ADR-0002 — Clean Architecture + Ports & Adapters (Hexagonal)

**Contexto.** O enunciado exige isolar integração / domínio / pagamento e ser
extensível a novos provedores e tipos de débito.

**Decisão.** Organizar o código em camadas com a **regra de dependência apontando para
dentro**: `domain` (centro, sem I/O) ← `application` (casos de uso) ← `infrastructure`
(adapters e entrega HTTP). O domínio não conhece HTTP, JSON nem XML; depende de
**portas** (interfaces implícitas) implementadas nas bordas.

**Consequências.**

- (+) Regras de negócio testáveis sem subir servidor nem provedores reais.
- (+) Trocar transporte (HTTP) ou formato de provedor não toca o domínio.
- (−) Mais arquivos/indireções do que um script único — compensado pela clareza e pela
  facilidade de estender ao vivo.

## ADR-0003 — Value Object `Money` com `BigInt` (decimal exato, sem float)

**Contexto.** Valores monetários exigem arredondamento **HALF_UP** com 2 casas e saída
como **strings decimais**; float introduz erro de precisão. O ambiente não tem
`bcmath` (contexto do projeto), e aqui não usamos libs.

**Decisão.** `Money` é um **Value Object imutável** que guarda **centavos como
`BigInt`**. Toda aritmética (juros, teto, desconto PIX, Price/PMT) é feita como frações
inteiras com arredondamento HALF_UP. O Price/PMT é reescrito de forma exata:
`parcela = base × 41^n / (40 × (41^n − 40^n))`, equivalente a
`base × i × (1+i)^n / ((1+i)^n − 1)` com `i = 0,025`.

**Consequências.**

- (+) Saída bate **exatamente** com os exemplos da spec, inclusive as parcelas do cartão
  (sem depender da tolerância de ±R$ 0,02).
- (+) Sem `float` em dinheiro; centraliza toda regra de arredondamento num só lugar.
- (−) É preciso converter entradas para `Money` na borda (`parse`/`fromNumber`) e
  serializar para string na saída.

## ADR-0004 — Strategy + Registro para juros por tipo de débito

**Contexto.** Cada tipo (IPVA, MULTA, …) tem fórmula própria, e novos tipos devem ser
fáceis de adicionar sem alterar os existentes.

**Decisão.** Uma **policy de juros por tipo** (padrão **Strategy**), reunidas em um
`InterestRegistry` que resolve a policy pelo tipo. Tipo sem policy lança
`UnknownDebtType` (não silencia, não converte para "OUTROS").

**Consequências.**

- (+) Novo tipo de débito = **nova policy registrada**, sem editar as demais (OCP).
- (+) Cada fórmula e suas constantes (taxa, teto) ficam isoladas e testáveis.
- (−) Indireção extra entre "tipo string" e a implementação concreta.

## ADR-0005 — Strategy para meios de pagamento

**Contexto.** O pagamento simula PIX e cartão hoje, mas pode ganhar novos meios; cada
meio produz um fragmento de saída diferente.

**Decisão.** Um **PaymentMethod por meio** (Strategy) com `key` e `simulate(base)`. O
caso de uso `SimularPagamento` aplica todos os métodos a cada base (TOTAL e cada
`SOMENTE_<TIPO>`). A serialização de `Money` é genérica, então o caso de uso não
conhece o formato interno de cada método.

**Consequências.**

- (+) Novo meio de pagamento = nova Strategy registrada na lista, sem mexer no resto.
- (+) Bases (TOTAL/parcial) e meios variam de forma independente.
- (−) O formato de saída de cada meio vive na própria Strategy (não num único lugar).

## ADR-0006 — Adapter por provedor + porta `DebtProvider` com fallback "first-wins"

**Contexto.** Provedores retornam os mesmos dados em formatos diferentes (JSON e XML) e
o sistema deve ser resiliente a falhas, tentando o próximo na ordem.

**Decisão.** Um **Adapter por formato** (`providerA` JSON, `providerB` XML) que
normaliza para o modelo canônico `Debt`, atrás de uma porta comum `fetch(placa)`.
`ConsultarDebitos` tenta os provedores na ordem (**first-wins**); **lista vazia é
sucesso** (não dispara fallback); só quando **todos** falham lança
`AllProvidersUnavailable` (503). Os adapters recebem uma `source(placa)` injetada, o que
simula a chamada externa e torna o fallback testável.

**Consequências.**

- (+) Adicionar provedor = novo adapter na lista de fallback, sem tocar no domínio.
- (+) Falha de provedor é isolada da falha de regra (tipo desconhecido continua 422).
- (−) "First-wins" não reconcilia divergências entre provedores; estratégias de quórum/
  prioridade ficam como evolução (descritas no README).

## ADR-0007 — Parser/serializer XML mínimo por regex (Provedor B)

**Contexto.** O Provedor B usa XML simples e de formato fixo, incluindo o elemento
autofechado `<debts/>` quando não há débitos — mas sem usar bibliotecas.

**Decisão.** Implementar um **parser e serializer mínimos por regex** para esse formato
conhecido, isolados em `infrastructure/providers/xml.js`. O parser trata `<debts/>` como
lista vazia; o serializer emite `<debts/>` quando não há débitos.

**Consequências.**

- (+) Cumpre "sem libs" e mantém o detalhe de XML confinado à borda.
- (+) Fácil de testar (parse/serialize round-trip, caso vazio).
- (−) Não é um parser XML completo: serve só ao schema do Provedor B. Para XML
  arbitrário/produção, trocar por um parser dedicado (atrás do mesmo adapter).

## ADR-0008 — Erros como exceções de domínio tipadas

**Contexto.** O contrato define `400 invalid_plate`, `422 unknown_debt_type` e
`503 all_providers_unavailable`, e o domínio não deve conhecer HTTP.

**Decisão.** Erros de negócio são **exceções de domínio tipadas** (`InvalidPlate`,
`UnknownDebtType`, `AllProvidersUnavailable`) com um `code`. A **tradução para
status/payload acontece só na camada de entrega** (controller HTTP).

**Consequências.**

- (+) Domínio independente do protocolo; o mesmo erro serve a outros transportes.
- (+) Mapa de erros centralizado e fácil de auditar.
- (−) Requer um ponto de tradução explícito na borda (mapeamento exceção → HTTP).

## ADR-0009 — Composition root manual (sem framework/DI container)

**Contexto.** Sem bibliotecas, não há framework web nem container de injeção de
dependências.

**Decisão.** Um **composition root** único (`composition.js`) instancia os concretos
(adapters, registry, métodos de pagamento, casos de uso) e os injeta. O servidor usa
`node:http` e trata só transporte (rota, limite de ~1 MiB, parse do envelope, rejeição
de campos desconhecidos), delegando a regra ao controller.

**Consequências.**

- (+) Um só lugar conhece as classes concretas; o resto depende de abstrações (DIP).
- (+) Testes montam variações do app injetando provedores/loggers falsos.
- (−) Fiação manual: novas peças precisam ser conectadas explicitamente aqui.

## ADR-0010 — Testes com `node:test` + `node:assert`

**Contexto.** É desejável ter testes automatizados (unitários e de integração do
fallback) sem adicionar PHPUnit/Jest/etc.

**Decisão.** Usar o runner nativo **`node:test`** com **`node:assert/strict`**. Testes
unitários por unidade (Money, placa, juros, pagamento, providers) e um teste de
**integração** que valida a saída exata da spec e os casos de borda (placa inválida,
tipo desconhecido, todos os provedores fora, zero débitos, débito não vencido,
fallback A→B).

**Consequências.**

- (+) Zero dependências; `npm test` roda direto no Node 24.
- (+) Teste de integração ancora o contrato (saída idêntica ao enunciado).
- (−) Recursos mais enxutos que frameworks populares (sem mocks avançados) — supridos
  por injeção de dependências simples nos casos de uso.
