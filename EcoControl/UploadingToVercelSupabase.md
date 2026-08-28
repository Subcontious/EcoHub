# EcoControl no Vercel + Supabase — plano e contexto

> Este arquivo existe só para guardar contexto entre conversas. Nada aqui foi
> implementado ainda — é o plano combinado, para retomar depois sem precisar
> reexplicar tudo do zero (numa conversa nova, é só apontar pra este arquivo).

## Objetivo

Hoje o `EcoControlBase.html` (e os arquivos por município gerados a partir
dele, ex. `ecocontrolbonito.html`) é um HTML único, sem backend, pensado para
ser colado no "Embed HTML" do Wix. Toda a configuração (nome do município,
usuários, mês de fechamento fiscal, links dos CSVs) fica escrita dentro do
próprio arquivo, no bloco `CONFIG`.

O plano é colocar esse sistema no ar via **Vercel**, e adicionar um botão
**"Atualizar dados"** dentro do próprio painel (visível só pra quem loga como
master) que permite trocar:

- o mês de fechamento fiscal (`periodo.mesFiscalEncerrado`)
- os links dos CSVs (`csv.pessoal`, `csv.despesas`, `csv.receitas`,
  `csv.disponibilidades`)

sem precisar abrir o arquivo `.html` e editar código. E o mais importante:
depois de salvo, **qualquer pessoa que abrir o site** (não só quem editou, não
só naquele navegador) já vê o dado novo.

## Por que isso não dá pra fazer só com Vercel

O Vercel serve o site como estático/serverless — não existe "disco" onde o
próprio site possa gravar de volta no arquivo HTML. Então, pra um botão
"salvar" funcionar de verdade (persistir pra sempre, pra todo mundo), o dado
editável não pode mais morar só dentro do HTML. Precisa morar em algum lugar
que tanto a tela de edição (escrita) quanto a página pública (leitura)
consigam acessar. Esse "algum lugar" é um banco de dados.

## Decisão de arquitetura

- **Vercel** → hospeda o site (frontend) e as pequenas funções de backend
  (API routes / serverless functions). Usuário **já tem conta aqui**.
- **Supabase** (Postgres) → guarda a configuração editável de cada município
  (mês de fechamento, links de CSV). Usuário **ainda não tem conta** — precisa
  criar.

Essa combinação foi escolhida porque:
- Tem plano gratuito para os dois, suficiente para o volume de uso esperado
  (poucos municípios, uso mensal, sem tráfego pesado).
- Não exige reescrever o parser de CSV, os cálculos ou os gráficos — só a
  *origem* de alguns campos do `CONFIG` muda (de "hardcoded no arquivo" para
  "buscado de uma API").
- É a mesma solução já recomendada para o EcoHub principal (o launcher/admin
  também sofre do mesmo problema: hoje só grava no `localStorage`, que não é
  compartilhado entre navegadores/dispositivos). Um único projeto
  Supabase poderia, no futuro, atender os dois sistemas — mas isso é uma
  decisão pra mais adiante, não faz parte deste plano.

## Custos esperados

- **Vercel (Hobby, gratuito):** cobre hospedagem do site + as funções de
  backend tranquilamente para este caso de uso. Só passaria a pagar
  (~US$20/mês, plano Pro) se o projeto virasse algo comercial vendido pra
  fora, ou o tráfego crescesse muito — não é o cenário aqui.
- **Supabase (Free tier):** inclui um banco Postgres de verdade, de graça.
  Único detalhe: se o projeto ficar **uma semana inteira sem nenhum acesso**,
  ele hiberna sozinho e a próxima abertura demora alguns segundos a mais
  enquanto "acorda". Para um sistema usado mensalmente (fechamento fiscal),
  isso na prática nunca deve incomodar.

**Resumo: dá pra montar tudo sem gastar nada, para começar.**

## Status das contas (checar isso na próxima conversa)

- [x] Conta no **Vercel** — já existe.
- [ ] Conta no **Supabase** — falta criar (é grátis, leva ~2 minutos:
      supabase.com → "Start your project" → login com GitHub).
- [ ] Projeto criado dentro do Supabase (cada projeto tem sua própria URL e
      chave de API — vamos precisar dessas duas informações).

## Plano técnico (o que efetivamente vai ser feito, quando retomarmos)

### 1. Banco de dados (Supabase)

Uma tabela simples, uma linha por município:

```sql
create table municipio_config (
  instancia text primary key,        -- ex.: "bonito-de-santa-fe", "igaracy"
  mes_fiscal_encerrado int not null default 1,
  csv_pessoal jsonb not null default '{}',          -- { "2023": "url", "2024": "url", ... }
  csv_despesas jsonb not null default '{}',
  csv_receitas jsonb not null default '{}',
  csv_disponibilidades jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);
```

Usar **Row Level Security (RLS)** do Supabase: leitura pública (qualquer um
pode ler a config do próprio município para a página carregar), escrita
bloqueada por padrão — só a função de backend (com uma chave de serviço, não
exposta no navegador) pode gravar.

### 2. Backend (Vercel Functions / API routes)

Duas rotinhas pequenas:

- `GET /api/config?instancia=igaracy` → devolve a config daquele município
  (chamada pela própria página pública, sem precisar de login).
- `POST /api/config` → recebe `{ instancia, mesFiscalEncerrado, csv }`,
  confere que quem está chamando é o usuário master logado, e grava no
  Supabase. É essa rota que o botão "Atualizar dados" vai chamar.

### 3. Mudanças no `EcoControlBase.html`

- No carregamento da página, além de ler o `CONFIG` fixo (nome, usuários,
  brasão — isso continua no arquivo, não precisa virar banco), buscar
  `mesFiscalEncerrado` e os links de CSV via `fetch("/api/config?...")` e
  sobrescrever esses dois campos específicos do `ECO_CONFIG`/`ECO_LINKS`
  antes de carregar os dados.
- Se a chamada falhar (API fora do ar, por exemplo), cair de volta nos
  valores do `CONFIG` do próprio arquivo — assim o site nunca fica
  completamente fora do ar por causa do banco.
- Adicionar o botão **"Atualizar dados"** no menu (visível só quando
  `isMaster()`), abrindo um formulário simples com os campos editáveis.

### 4. O que **não muda**

- Nome do município, brasão e usuários continuam no `CONFIG` do arquivo
  (não fazem parte deste plano — só mês de fechamento e links de CSV).
- Nenhuma fórmula ou função de cálculo é tocada.
- O arquivo continua funcionando sozinho (sem banco) se for aberto localmente
  ou colado no Wix — o banco é só uma camada a mais, opcional, pro cenário do
  Vercel.

## Próximos passos (quando eu voltar a mexer nisso)

1. Usuário cria a conta/projeto no Supabase e me passa (ou eu explico onde
   pegar) a URL do projeto e a chave de API.
2. Eu crio a tabela `municipio_config` (SQL acima).
3. Eu escrevo as duas rotinas de API (`GET`/`POST /api/config`).
4. Eu adapto o `EcoControlBase.html` para buscar `mesFiscalEncerrado` e os
   links de CSV da API, com fallback pro `CONFIG` local.
5. Eu adiciono o botão "Atualizar dados" + formulário no painel (visível só
   pro master).
6. Deploy de teste no Vercel, conferindo que ler e salvar funcionam de
   verdade antes de trocar os municípios reais.

## Arquivos envolvidos

- `EcoControl/EcoControlBase.html` — template mestre (vai ganhar o
  `fetch`/`POST` e o botão novo).
- `EcoControl/ecocontrolbonito.html`, `ecocontrolcurraldecima.html`,
  `ecocontrolsjp.html` — instâncias já existentes; não fazem parte deste
  plano por enquanto (o foco é deixar o `EcoControlBase.html` pronto primeiro).
- Novo: pasta `api/` (rotas do Vercel) — ainda não existe, será criada.
