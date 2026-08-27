# Plano: Paridade TOTAL pianolouvorja/api com louvorja/api

## GOAL: 500 rounds | 5 fases

Escopo: paridade com as 64 rotas do Laravel/Lumen (auth + admin CRUD + read), mirror de midia Hostinger e plus SDA Hymnal.

### Hierarquia de Repos
- `louvorja/api` = referencia base (Laravel/Lumen PHP). So consultamos.
- `pianolouvorja/api` = upstream/produto final (TypeScript/Hono). Aqui contribuímos com PR.
- `piano-api` = workspace local de desenvolvimento.

### Workflow
PRs → `staging` → `main`. CI obrigatorio (lint + typecheck + test + coverage + build). Husky pre-commit (Biome) + pre-push (typecheck + test).

---

## FASE 0 — Infra Senior (Rounds 1-75)

Tornar o repo pronto pra contribuicao open-source de nivel senior.

| # | Entrega | Status |
|---|---------|--------|
| 0.1 | CI workflow (lint, typecheck, test, coverage, docker build) em staging + main | FEITO |
| 0.2 | PR template + CODEOWNERS | FEITO |
| 0.3 | CONTRIBUTING.md (workflow staging→main, conventional commits, 4 camadas de qualidade) | FEITO |
| 0.4 | FUNDING.yml | FEITO |
| 0.5 | LICENSE MIT | FEITO |
| 0.6 | CODE_OF_CONDUCT.md | FEITO |
| 0.7 | SECURITY.md (policy de reporte, prazos por severidade) | FEITO |
| 0.8 | README.md (badges, stack, quick start, scripts, workflow) | FEITO |
| 0.9 | Scalar OpenAPI UI em `/doc` (purple, modern) | FEITO |
| 0.10 | gh repo: description + topics + branch protection (staging: require CI + review; main: require staging) | PENDENTE (precisa `admin:org`) |
| 0.11 | Branch `staging` criada no remoto | PENDENTE |
| 0.12 | Issue labels padrao (bug, feature, docs, etc.) | PENDENTE |
| 0.13 | Commit de tudo + push para GitHub | PENDENTE |

**Entrega da Fase 0:** Repo pronto pra receber PRs externos com CI verde, protecao de branches, documentacao completa e community files.

---

## FASE 1 — Dados + Fundacao (Rounds 76-175)

Completar dados faltantes e estabelecer a fundacao da API.

| # | Entrega |
|---|---------|
| 1.1 | Import de lyrics (tabela tem 0 registros) — script que preenche a partir do upstream `/json_db/music_{id}` |
| 1.2 | Import de bible_verses (tabela tem 0 registros) — baixar 66 livros x 10 versoes do upstream |
| 1.3 | Investigar por que `data/piano.sqlite` tem 0 bytes |
| 1.4 | Auth JWT (login, refresh, middleware de protecao) |
| 1.5 | Health check endpoint (`/health`) |
| 1.6 | Metadata endpoint (`/meta`) — versao da API, timestamp do ultimo sync |
| 1.7 | Testes unitarios para cada novo endpoint (meta: 100% coverage) |
| 1.8 | Atualizar OpenAPI spec com os novos endpoints |

**Entrega da Fase 1:** Dados completos (lyrics + biblia), auth funcionando, endpoints basicos com testes.

---

## FASE 2 — Mirror de Midia Hostinger (Rounds 176-275)

Eliminar dependencia do upstream para arquivos de midia.

| # | Entrega |
|---|---------|
| 2.1 | Script `mirror-media.ts` — le tabela `files`, monta path, baixa cada arquivo |
| 2.2 | Upload SFTP/SSH para Hostinger (~7.6 GB: 3.491 MP3s + 1.259 BMPs) |
| 2.3 | Migrar rota `/file/*` de redirect-302 para servir da Hostinger (com fallback upstream) |
| 2.4 | Script `sync-media.ts` — sync incremental via `latest_updated` do `/json_db/config` |
| 2.5 | Cron job semanal de sync automatico |
| 2.6 | Testes para rota `/file/*` (hit Hostinger, miss→fallback upstream, error handling) |
| 2.7 | Documentar setup Hostinger (credenciais, paths, SSH config) |

**Entrega da Fase 2:** Zero dependencia do upstream para files. Tudo servido da Hostinger com fallback transparente.

---

## FASE 3 — Paridade 64 Rotas Laravel (Rounds 276-425)

Replicar todas as rotas do `louvorja/api` (routes/web.php).

| # | Entrega |
|---|---------|
| 3.1 | Mapear as 64 rotas do Laravel → endpoints TypeScript (tabela de paridade) |
| 3.2 | `/db/*` endpoints (8 rotas) — wrappers com envelope `{data, meta}` |
| 3.3 | `/{lang}/*` endpoints (13 rotas) — versoes multilingue de categories/albums/musics |
| 3.4 | `/admin/*` CRUD (40 endpoints) — criar/atualizar/deletar com auth + validacao |
| 3.5 | `/tasks/*` — import tasks, status, progress |
| 3.6 | Rate limiting (10.000 req/bucket, igual ao upstream) |
| 3.7 | Paginacao consistente (cursor-based, matching upstream) |
| 3.8 | OpenAPI spec completa para todas as 64 rotas |
| 3.9 | Testes de integracao para cada rota (100% coverage) |
| 3.10 | Gap analysis final — diff entre nossa API e a referencia |

**Entrega da Fase 3:** Paridade TOTAL com `louvorja/api`. Qualquer cliente que funciona contra a referencia funciona contra nos.

---

## FASE 4 — Plus SDA Hymnal (Rounds 426-500)

O diferencial do `pianolouvorja/api` — o que a referencia nao tem.

| # | Entrega |
|---|---------|
| 4.1 | Criar `scripts/import-sda-hymnal.ts` (referenciado no package.json mas nao existe) |
| 4.2 | Import SDA Hymnal — 695 hinos (letras via NPM `sda-hymnal`) |
| 4.3 | Audio SDA — SacCentral (483/695 MP3 coral) + MIDI frazras (695, GPL) |
| 4.4 | Endpoints SDA: `/sda/hymns`, `/sda/hymns/{id}`, `/sda/hymns/{id}/audio` |
| 4.5 | Testes para endpoints SDA (100% coverage) |
| 4.6 | Documentacao SDA Hymnal no README |
| 4.7 | Release v1.0.0 — tag, GitHub Release, changelog |

**Entrega da Fase 4:** Diferencial completo. API superior a referencia: tem tudo que ela tem + SDA Hymnal.

---

## Resumo do Goal

| Fase | Rounds | Entrega Principal |
|------|--------|-------------------|
| 0 — Infra Senior | 1-75 | Repo pronto pra contribuicao open-source |
| 1 — Dados + Fundacao | 76-175 | Lyrics + Biblia + Auth + Endpoints basicos |
| 2 — Mirror Hostinger | 176-275 | Midia self-hosted (~7.6 GB) |
| 3 — Paridade 64 Rotas | 276-425 | Paridade TOTAL com louvorja/api |
| 4 — Plus SDA Hymnal | 426-500 | Diferencial + Release v1.0.0 |
| **TOTAL** | **500** | **API superior a referencia** |

---

## Estado Atual (Round ~1)

FASE 0 quase completa. Falta:
1. `gh repo edit` (description + topics) — precisa `admin:org` scope no token
2. Criar branch `staging` no remoto
3. Branch protection rules
4. Commit + push de tudo

Assim que a Fase 0 fecha, entramos na Fase 1 (completar lyrics).
