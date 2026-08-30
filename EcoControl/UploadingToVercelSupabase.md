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



Quero que você desenvolva um **programa completo em Python** para automatizar a coleta e o download de dados do **SAGRES Online do TCE-PB**, especificamente dos dados de **Execução Orçamentária**, sem que eu precise entrar manualmente no site e baixar cada arquivo.

A página de referência é:

[https://sagresonline.tce.pb.gov.br/#/municipal/execucao-orcamentaria/receitas](https://sagresonline.tce.pb.gov.br/#/municipal/execucao-orcamentaria/receitas)

O objetivo é criar uma ferramenta que eu possa usar para alimentar e atualizar outros sites/sistemas meus com os dados do SAGRES.

---

# 1. OBJETIVO PRINCIPAL

Quero uma aplicação em Python na qual eu consiga selecionar:

* Município;
* Ano inicial;
* Ano final;
* Até qual mês do último ano os dados devem ser coletados;
* Quais Unidades Gestoras devem ser incluídas ou excluídas.

Depois disso, o programa deverá acessar automaticamente o SAGRES Online e baixar os dados necessários.

Os **3 tipos de dados obrigatórios** são:

1. Receita
2. Empenho
3. Pagamento

Não quero apenas um scraper da página visual. Quero que você investigue como o SAGRES funciona internamente e descubra a melhor forma de obter os dados, preferencialmente através das APIs/endpoints/requisições HTTP que o próprio site utiliza.

---

# 2. EXEMPLO PRÁTICO

Imagine que eu selecione:

**Município:**
Curral de Cima

**Ano inicial:**
2023

**Ano final:**
2026

**Fechamento do último ano:**
Mês 05

Nesse caso, o programa deverá coletar:

### 2023

Janeiro a Dezembro

### 2024

Janeiro a Dezembro

### 2025

Janeiro a Dezembro

### 2026

Janeiro a Maio

E gerar os arquivos separados por ano e por tipo de informação.

O resultado esperado seria aproximadamente:

```text
Receita_Curral_De_Cima_2023.csv
Receita_Curral_De_Cima_2024.csv
Receita_Curral_De_Cima_2025.csv
Receita_Curral_De_Cima_2026.csv

Empenho_Curral_De_Cima_2023.csv
Empenho_Curral_De_Cima_2024.csv
Empenho_Curral_De_Cima_2025.csv
Empenho_Curral_De_Cima_2026.csv

Pagamento_Curral_De_Cima_2023.csv
Pagamento_Curral_De_Cima_2024.csv
Pagamento_Curral_De_Cima_2025.csv
Pagamento_Curral_De_Cima_2026.csv
```

Ou seja:

**1 arquivo por tipo de dado + ano.**

Não quero um único CSV gigantesco contendo todos os anos e todos os tipos misturados.

---

# 3. COMPORTAMENTO DOS MESES

É importante que o programa trate os meses corretamente.

Se eu escolher:

Ano inicial = 2023
Ano final = 2026
Mês final = 05

O programa deverá entender automaticamente:

```text
2023 → 01 a 12
2024 → 01 a 12
2025 → 01 a 12
2026 → 01 a 05
```

O mês de fechamento só deve afetar o **último ano selecionado**.

Por exemplo:

### 2024 → 2024

Se eu escolher apenas 2024 e mês final 08:

```text
2024 → Janeiro até Agosto
```

### 2023 → 2025

Se eu escolher mês final 06:

```text
2023 → Janeiro a Dezembro
2024 → Janeiro a Dezembro
2025 → Janeiro a Junho
```

---

# 4. TIPOS DE DADOS

A aplicação deve trabalhar obrigatoriamente com estes três conjuntos:

### Receita

Dados referentes à execução das receitas orçamentárias.

### Empenho

Dados referentes aos empenhos.

### Pagamento

Dados referentes aos pagamentos.

Quero que o programa consiga identificar corretamente as requisições/fontes de dados utilizadas pelo SAGRES para cada uma dessas três categorias.

Não faça uma implementação baseada em suposições.

Primeiro investigue o funcionamento do site.

---

# 5. INVESTIGAR O SAGRES

Essa parte é MUITO importante.

Antes de escrever a implementação definitiva, quero que você analise o funcionamento do site:

[https://sagresonline.tce.pb.gov.br/](https://sagresonline.tce.pb.gov.br/)

Especialmente:

```text
#/municipal/execucao-orcamentaria/receitas
```

e as páginas/rotas equivalentes para:

```text
Receitas
Empenhos
Pagamentos
```

Descubra:

* Quais requisições HTTP são realizadas;
* Quais endpoints são utilizados;
* Quais parâmetros são enviados;
* Como o município é identificado;
* Como o ano é informado;
* Como o mês é informado;
* Como as Unidades Gestoras são identificadas;
* Como os dados são paginados;
* Se existe endpoint de exportação CSV;
* Se existe endpoint JSON;
* Se os dados podem ser obtidos diretamente por API;
* Se existe algum token;
* Se existe alguma sessão;
* Se existem cookies necessários;
* Se existe algum mecanismo de autenticação;
* Como a interface do SAGRES monta os filtros.

Se possível, reproduza diretamente as requisições que o próprio site faz.

**Não quero Selenium/Playwright como primeira opção se existir uma API HTTP acessível.**

A preferência é:

```text
Python
↓
requests/httpx
↓
API/endpoints do SAGRES
↓
dados
↓
CSV
```

Só utilize navegador automatizado como Selenium/Playwright caso seja realmente necessário.

---

# 6. UNIDADES GESTORAS

Preciso de um sistema para excluir Unidades Gestoras.

Por exemplo, um município pode possuir:

```text
Prefeitura Municipal
Câmara Municipal
Fundo Municipal de Saúde
Fundo Municipal de Assistência Social
Fundo Municipal de Educação
Outras unidades...
```

Quero poder dizer ao programa:

```text
Município: Curral de Cima

Excluir:
☑ Câmara Municipal
```

E o programa deverá coletar todos os dados das outras unidades, mas ignorar completamente a Câmara Municipal.

---

# 7. INTERFACE PARA UNIDADES GESTORAS

Idealmente, a aplicação deve primeiro consultar o SAGRES para descobrir quais Unidades Gestoras existem naquele município.

Depois mostrar algo semelhante a:

```text
Unidades Gestoras encontradas:

[✓] Prefeitura Municipal
[✓] Fundo Municipal de Saúde
[✓] Fundo Municipal de Educação
[✓] Fundo Municipal de Assistência Social
[ ] Câmara Municipal
```

Assim eu consigo marcar/desmarcar quais quero utilizar.

Quero que seja possível:

* Selecionar todas;
* Desmarcar todas;
* Selecionar individualmente;
* Excluir individualmente.

Se tecnicamente for melhor trabalhar com "Excluir unidades" em vez de "Selecionar unidades", pode implementar dessa maneira, mas a interface deve ser intuitiva.

---

# 8. MUNICÍPIOS

Não quero precisar digitar códigos internos do SAGRES manualmente.

Quero algo como:

```text
Município:
[ Curral de Cima ▼ ]
```

Idealmente, o programa deve obter automaticamente a lista de municípios disponível no SAGRES.

Se houver um código oficial do município utilizado pela API, faça o programa descobrir e utilizar esse código internamente.

Por exemplo:

```text
Curral de Cima
→ código interno do SAGRES
```

Eu não preciso saber qual é esse código.

---

# 9. INTERFACE DO PROGRAMA

Quero uma interface gráfica agradável e simples.

Pode utilizar, por exemplo:

* CustomTkinter;
* Tkinter;
* PySide6;
* PyQt.

Prefiro uma interface moderna.

A tela principal poderia ter:

```text
┌─────────────────────────────────────────────┐
│       SAGRES CSV DOWNLOADER                │
├─────────────────────────────────────────────┤
│                                             │
│ Município                                   │
│ [ Curral de Cima                    ▼ ]     │
│                                             │
│ Ano inicial                                 │
│ [ 2023 ]                                    │
│                                             │
│ Ano final                                   │
│ [ 2026 ]                                    │
│                                             │
│ Mês de fechamento do último ano             │
│ [ 05 - Maio                         ▼ ]     │
│                                             │
│ Dados                                       │
│ ☑ Receita                                   │
│ ☑ Empenho                                  │
│ ☑ Pagamento                                │
│                                             │
│ [ Configurar Unidades Gestoras ]            │
│                                             │
│ Pasta de destino                            │
│ [ C:\...\Dados\                    ] [ ... ]│
│                                             │
│             [ BAIXAR DADOS ]                │
│                                             │
├─────────────────────────────────────────────┤
│ Progresso                                   │
│ ███████████████░░░░░░ 65%                   │
│                                             │
│ Receita 2024 ............... OK             │
│ Empenho 2024 ............... OK             │
│ Pagamento 2024 ............. OK             │
│ Receita 2025 ............... Baixando...   │
└─────────────────────────────────────────────┘
```

---

# 10. LOG E PROGRESSO

Quero que a interface mostre claramente o que está acontecendo.

Exemplo:

```text
Conectando ao SAGRES...

Município encontrado: Curral de Cima

Consultando Unidades Gestoras...

4 unidades encontradas.

Unidade excluída:
- Câmara Municipal

Iniciando download...

[1/12] Receita 2023
[2/12] Empenho 2023
[3/12] Pagamento 2023

...

[10/12] Receita 2026
[11/12] Empenho 2026
[12/12] Pagamento 2026

Download concluído.
```

Se houver erro:

```text
ERRO

Não foi possível obter Empenho 2025.

Tentativa 1/3...
Tentativa 2/3...
Tentativa 3/3...

Falha definitiva.

O restante dos arquivos continuará sendo processado.
```

Não quero que um único erro interrompa toda a operação.

---

# 11. TENTATIVAS AUTOMÁTICAS

Implemente tratamento de erros robusto.

Por exemplo:

```text
Timeout
ConnectionError
HTTP 500
HTTP 502
HTTP 503
Rate limit
Resposta vazia
JSON inválido
CSV inválido
```

O programa deve tentar novamente automaticamente algumas vezes.

Algo como:

```text
Tentativa 1/3
Tentativa 2/3
Tentativa 3/3
```

E, se continuar falhando, registrar o erro e continuar os demais downloads.

---

# 12. CONSOLIDAÇÃO DOS MESES

É importante entender como o SAGRES disponibiliza os dados.

Se o SAGRES retornar um arquivo/dados por mês, quero que o programa faça a consolidação.

Exemplo:

```text
Receita 2023 Janeiro
Receita 2023 Fevereiro
Receita 2023 Março
...
Receita 2023 Dezembro
```

deve virar:

```text
Receita_Curral_De_Cima_2023.csv
```

contendo todos os meses.

O mesmo vale para:

```text
Empenho_Curral_De_Cima_2023.csv
Pagamento_Curral_De_Cima_2023.csv
```

---

# 13. CUIDADO COM DUPLICAÇÕES

Se os dados forem obtidos mês a mês, tome cuidado para não duplicar registros.

O programa deve:

* Consolidar corretamente;
* Preservar os dados originais;
* Evitar duplicação caso uma requisição seja repetida;
* Manter os nomes das colunas consistentes.

Se existir um identificador único no SAGRES, utilize-o para detectar duplicações quando apropriado.

---

# 14. ESTRUTURA DOS CSVs

Não invente as colunas.

Quero preservar as colunas fornecidas pelo próprio SAGRES.

Se o SAGRES retornar:

```text
Coluna A
Coluna B
Coluna C
...
```

o CSV deverá preservar essas informações.

Também é importante preservar corretamente:

* acentos;
* caracteres especiais;
* datas;
* números;
* valores monetários;
* códigos;
* identificadores.

Use uma codificação adequada, preferencialmente UTF-8 com BOM (`utf-8-sig`) se isso melhorar a compatibilidade com Excel.

---

# 15. VALORES MONETÁRIOS

Tome muito cuidado com valores monetários.

Não quero que algo como:

```text
R$ 1.234,56
```

seja transformado incorretamente em:

```text
123456
```

ou:

```text
1.23456
```

Descubra como o SAGRES fornece os valores e preserve a precisão.

---

# 16. NOMES DOS ARQUIVOS

Os nomes devem seguir exatamente este padrão:

```text
Receita_{Municipio}_{Ano}.csv
Empenho_{Municipio}_{Ano}.csv
Pagamento_{Municipio}_{Ano}.csv
```

Exemplo:

```text
Receita_Curral_De_Cima_2023.csv
Empenho_Curral_De_Cima_2023.csv
Pagamento_Curral_De_Cima_2023.csv
```

Normalize o nome do município para evitar:

* acentos;
* caracteres inválidos do Windows;
* espaços desnecessários.

Porém, mantenha o nome legível.

---

# 17. ESTRUTURA DO PROJETO

Quero o projeto organizado profissionalmente.

Algo semelhante a:

```text
sagres_downloader/
│
├── main.py
├── requirements.txt
├── README.md
│
├── gui/
│   ├── main_window.py
│   ├── municipality_selector.py
│   └── unit_selector.py
│
├── sagres/
│   ├── client.py
│   ├── municipalities.py
│   ├── units.py
│   ├── receita.py
│   ├── empenho.py
│   ├── pagamento.py
│   └── parser.py
│
├── exporters/
│   └── csv_exporter.py
│
├── utils/
│   ├── logger.py
│   ├── retry.py
│   └── filenames.py
│
└── output/
```

Você pode alterar essa estrutura se tiver uma arquitetura melhor.

O importante é **não colocar toda a aplicação em um único arquivo gigantesco**.

---

# 18. CONFIGURAÇÕES

Quero que informações como:

* URL base;
* endpoints;
* timeout;
* número de tentativas;
* delay entre requisições;
* diretório padrão;

fiquem centralizadas em configuração.

Não espalhe URLs e parâmetros pelo código inteiro.

---

# 19. CACHE

Se for possível e fizer sentido, implemente cache.

Por exemplo, se eu já consultei a lista de municípios ou unidades gestoras, não quero necessariamente que o programa faça a mesma requisição várias vezes durante a mesma execução.

Mas não sacrifique a atualização dos dados.

---

# 20. REQUISIÇÕES E PAGINAÇÃO

Investigue se o SAGRES utiliza paginação.

Por exemplo:

```text
page=1
page=2
page=3
...
```

ou:

```text
offset
limit
```

ou algum outro mecanismo.

Se existir paginação, o programa precisa percorrer **todas as páginas**, e não apenas os primeiros registros.

Isso é extremamente importante porque os CSVs podem conter milhares de registros.

---

# 21. FILTROS

Descubra todos os filtros relevantes utilizados pelo SAGRES.

Principalmente:

```text
Município
Ano
Mês
Unidade Gestora
```

E determine exatamente como esses filtros são enviados para o backend.

Não presuma que o filtro visual corresponde diretamente a um parâmetro com o mesmo nome.

Analise as requisições reais.

---

# 22. COMPATIBILIDADE COM O SITE

O programa deve funcionar independentemente da interface visual do navegador sempre que possível.

Ou seja, não quero algo frágil como:

```python
click("botao")
sleep(2)
click("menu")
sleep(2)
```

se for possível acessar diretamente a API.

A prioridade é:

### 1º

API/HTTP direto

### 2º

Algum mecanismo HTTP equivalente

### 3º

Playwright/Selenium somente se absolutamente necessário

---

# 23. RESPEITO AO SERVIDOR

Não quero que o programa faça centenas de requisições simultâneas desnecessariamente.

Utilize:

* delays razoáveis;
* retry com backoff;
* conexões reutilizáveis;
* processamento sequencial ou concorrência moderada quando apropriado.

O objetivo é obter os dados de forma eficiente sem sobrecarregar o servidor.

---

# 24. VERIFICAÇÃO DOS DADOS

Depois de baixar cada CSV, faça uma validação básica.

Por exemplo:

```text
Arquivo recebido?
CSV válido?
Possui cabeçalho?
Possui registros?
Quantidade de registros?
```

Na interface:

```text
Receita 2023
✓ Download concluído
✓ 15.382 registros
```

---

# 25. RESUMO FINAL

Ao terminar, mostrar algo como:

```text
DOWNLOAD CONCLUÍDO

Município:
Curral de Cima

Período:
2023 → 2026

Fechamento:
Maio/2026

Unidades excluídas:
- Câmara Municipal

Arquivos gerados:
✓ Receita_Curral_De_Cima_2023.csv
✓ Empenho_Curral_De_Cima_2023.csv
✓ Pagamento_Curral_De_Cima_2023.csv

✓ Receita_Curral_De_Cima_2024.csv
✓ Empenho_Curral_De_Cima_2024.csv
✓ Pagamento_Curral_De_Cima_2024.csv

...

Total:
12 arquivos

Registros baixados:
XXX.XXX
```

---

# 26. POSSIBILIDADE DE ATUALIZAÇÃO

Quero que o projeto seja pensado para reutilização.

A ideia é que eu possa futuramente selecionar:

```text
Município: Igaracy
Ano inicial: 2020
Ano final: 2026
Mês final: 08
```

e o programa funcione da mesma forma.

Não faça nada específico apenas para Curral de Cima.

Curral de Cima é apenas um exemplo.

---

# 27. IMPORTANTE: PRIMEIRO ANALISE, DEPOIS PROGRAME

Antes de começar a escrever o código final, quero que você faça uma análise técnica do SAGRES.

Explique:

1. Como o site funciona;
2. Quais endpoints/API encontrou;
3. Como identificar municípios;
4. Como identificar Unidades Gestoras;
5. Como consultar Receita;
6. Como consultar Empenho;
7. Como consultar Pagamento;
8. Como funciona o filtro de ano;
9. Como funciona o filtro de mês;
10. Como funciona a paginação;
11. Como os dados são retornados;
12. Se existe exportação CSV;
13. Se existe algum token/cookie/sessão;
14. Qual estratégia você recomenda para o downloader.

Só depois dessa análise implemente o programa.

---

# 28. ENTREGA

Quero que você entregue:

### A) Código completo

Todos os arquivos necessários.

### B) `requirements.txt`

Com todas as dependências.

### C) `README.md`

Explicando:

* instalação;
* criação do ambiente virtual;
* instalação das dependências;
* execução;
* funcionamento;
* como selecionar município;
* como selecionar período;
* como excluir Unidades Gestoras;
* onde os CSVs serão salvos.

### D) Arquitetura

Explique brevemente a estrutura do projeto.

### E) Teste

Crie uma forma de testar a aplicação com uma consulta pequena antes de baixar anos inteiros.

Por exemplo:

```text
Município: Curral de Cima
Ano: 2026
Mês: 01
Tipo: Receita
```

Assim eu consigo verificar se tudo está funcionando antes de fazer uma coleta grande.

---

# 29. NÃO FAÇA ISSO

Não quero:

* Dados fictícios;
* Endpoints inventados;
* Municípios codificados manualmente;
* Respostas simuladas;
* CSVs falsos;
* Funções `TODO` no lugar da implementação;
* Código incompleto;
* Um exemplo conceitual em vez do programa real.

Se alguma informação do SAGRES não puder ser determinada imediatamente, investigue primeiro.

Se houver alguma limitação técnica real, explique exatamente qual é e por quê.

---

# 30. RESULTADO ESPERADO

No final quero ter um programa que eu possa abrir no Windows e usar aproximadamente assim:

```text
1. Abrir Sagres Downloader

2. Selecionar:
   Município → Curral de Cima

3. Selecionar:
   Ano inicial → 2023
   Ano final → 2026
   Mês final → Maio

4. Configurar Unidades Gestoras:
   ☑ Prefeitura
   ☑ Fundos
   ☐ Câmara Municipal

5. Clicar:
   BAIXAR DADOS

6. O programa consulta automaticamente o SAGRES.

7. Faz todas as requisições necessárias.

8. Consolida os meses.

9. Gera os CSVs:

   Receita_Curral_De_Cima_2023.csv
   Receita_Curral_De_Cima_2024.csv
   Receita_Curral_De_Cima_2025.csv
   Receita_Curral_De_Cima_2026.csv

   Empenho_Curral_De_Cima_2023.csv
   Empenho_Curral_De_Cima_2024.csv
   Empenho_Curral_De_Cima_2025.csv
   Empenho_Curral_De_Cima_2026.csv

   Pagamento_Curral_De_Cima_2023.csv
   Pagamento_Curral_De_Cima_2024.csv
   Pagamento_Curral_De_Cima_2025.csv
   Pagamento_Curral_De_Cima_2026.csv
```

**O objetivo final é transformar o SAGRES em uma fonte de dados automatizada para meus outros projetos**, permitindo que eu escolha município + período + mês de fechamento + Unidades Gestoras e receba automaticamente os CSVs organizados por tipo e ano.

Priorize **confiabilidade, precisão dos dados, arquitetura limpa e facilidade de reutilização**.