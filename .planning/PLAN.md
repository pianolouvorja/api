# PLAN: pianolouvorja/api

> Repo: github.com/pianolouvorja/api (a criar)
> Stack: Hono + SQLite + Docker + Cloudflare Tunnel
> VM: 137.131.142.73 (Oracle ARM64 — já em produção)

---

## Fase 0: Setup (pré-requisito)

### F0-T1: Criar repo + boilerplate
- `gh repo create pianolouvorja/api --private`
- `npm init` + instalar Hono, better-sqlite3, Kysely, Zod
- Estrutura de pastas:
  ```
  src/
  ├── index.ts              # Hono app entry
  ├── routes/
  │   ├── health.ts
  │   ├── hymns.ts
  │   ├── albums.ts
  │   ├── bible.ts
  │   ├── ccb.ts
  │   └── telemetry.ts
  ├── db/
  │   ├── schema.ts         # Kysely schema definitions
  │   ├── connection.ts     # better-sqlite3 + Kysely
  │   └── migrations/       # SQL migration files
  ├── middleware/
  │   ├── cache.ts          # In-memory LRU cache
  │   ├── rateLimit.ts      # 100 req/min/IP
  │   └── auth.ts           # Firebase Admin verifyIdToken
  ├── scripts/
  │   ├── import-upstream.mjs  # Importa de api.louvorja.com.br
  │   ├── import-sda-hymnal.mjs
  │   └── import-ccb.mjs
  ├── types/
  │   └── api.ts            # Type definitions (Zod schemas)
  └── utils/
      └── response.ts       # { data, meta } formatter
  test/
  ├── unit/
  └── integration/
  data/                     # SQLite + config (gitignored)
  media/                    # Áudio + imagens (gitignored)
  Dockerfile
  docker-compose.yml
  ```

**Commit:** `init: repo setup + Hono + estrutura`

### F0-T2: Docker + docker-compose
- `Dockerfile` (Node 22-slim ARM64)
- `docker-compose.yml` com volumes data/ e media/
- Healthcheck no compose
- `.dockerignore`

**Commit:** `chore(docker): Dockerfile + compose`

### F0-T3: CI (GitHub Actions)
- Lint (Biome)
- Typecheck (tsc)
- Test (Vitest)
- Build (Docker image)
- Deploy (rsync para VM + docker compose restart)

**Commit:** `ci: GitHub Actions pipeline`

---

## Fase 1: Database + Schema

### F1-T1: SQLite schema (migrações)
Criar migration files baseado no schema do louvorja/api:
- `001_languages.sql`
- `002_files.sql`
- `003_albums.sql`
- `004_musics.sql`
- `005_lyrics.sql`
- `006_albums_musics.sql`
- `007_categories.sql`
- `008_categories_albums.sql`
- `009_bible.sql`
- `010_ccb_hymns.sql`
- `011_licenses.sql`

**Commit:** `feat(db): SQLite schema com 10 migrations`

### F1-T2: Kysely connection + types
- `db/connection.ts` — abre SQLite, inicializa Kysely
- `db/types.ts` — tipos type-safe (Database interface)
- Tests: conecta, lista tabelas, fecha

**Commit:** `feat(db): Kysely connection + types`

---

## Fase 2: Importação de Dados

### F2-T1: Script de importação do upstream
- `scripts/import-upstream.mjs`
- Baixa manifest de `api.louvorja.com.br/json_db`
- Para cada arquivo JSON no manifest:
  - Compara hash com última importação
  - Se mudou: baixa, parseia, faz upsert no SQLite
- Loga: quantos registros inseridos/atualizados

**Commit:** `feat(import): script de importação do upstream`

### F2-T2: Script de importação sda-hymnal (EN)
- `npm install sda-hymnal`
- `scripts/import-sda-hymnal.mjs`
- Lê 695 hinos do NPM package
- Insere em `musics` + `lyrics` com `id_language = 'en'`

**Commit:** `feat(import): 695 letras EN do sda-hymnal NPM`

### F2-T3: Script CCB
- `scripts/import-ccb.mjs`
- Pesquisar fonte de dados CCB (hinosccb.com ou outro)
- Estruturar em `ccb_hymns`
- Marcar `public_domain` adequadamente

**Commit:** `feat(import): CCB — Congregação Cristã no Brasil`

### F2-T4: Primeira importação completa
- Rodar os 3 scripts
- Verificar contagem de registros
- Backup do SQLite (`catalog.db` ~1GB)

**Commit:** `feat(data): primeira importação completa`

---

## Fase 3: Endpoints REST

### F3-T1: Health + Meta
- `GET /v1/health` → status, version, uptime, db_size, last_import
- `GET /v1/meta/version` → versão do catálogo
- `GET /v1/meta/hymnals` → hinários disponíveis
- `GET /v1/meta/languages` → idiomas

**Commit:** `feat(api): health + meta endpoints`

### F3-T2: Albums (coletâneas)
- `GET /v1/albums` → lista paginada
- `GET /v1/albums/:id` → detalhe + hinos
- `GET /v1/albums/:id/hymns` → só hinos
- Query params: `?lang=`, `?page=`, `?limit=`

**Commit:** `feat(api): endpoints de albums`

### F3-T3: Hymns (hinos)
- `GET /v1/hymns` → lista paginada (?album=, ?lang=)
- `GET /v1/hymns/:id` → detalhe + letras
- `GET /v1/hymns/:id/lyrics` → só estrofes
- `GET /v1/hymns/:id/audio` → URLs (cantado, playback, MIDI)
- `GET /v1/hymns/search?q=` → busca

**Commit:** `feat(api): endpoints de hymns`

### F3-T4: Bible
- `GET /v1/bible/books`
- `GET /v1/bible/:book/:chapter`
- `GET /v1/bible/search?q=`

**Commit:** `feat(api): endpoints de bible`

### F3-T5: CCB (protegido por licença)
- `GET /v1/ccb/hymns` — middleware `requireLicense('ccb')`
- `GET /v1/ccb/hymns/:id`
- `GET /v1/ccb/hymns/search?q=`
- Sem X-License-Key válido → 403 Forbidden

**Commit:** `feat(api): endpoints CCB protegidos por licença`

### F3-T5b: Sistema de Licenças (monetização)
- Tabela `licenses` (UUID, denomination, customer, max_devices, active, expires_at)
- `POST /v1/admin/licenses` — gerar (admin Firebase Auth)
- `GET /v1/admin/licenses` — listar
- `PATCH /v1/admin/licenses/:id` — ativar/desativar/renovar
- `DELETE /v1/admin/licenses/:id` — revogar
- Middleware `requireLicense(denomination)` valida X-License-Key
- App cliente: settings tem campo "Licença" pra colar a key

**Commit:** `feat(license): sistema de licencas para denominacoes pagas`

### F3-T6: Telemetry
- `POST /v1/telemetry` → valida Zod, insere/atualiza install_id

**Commit:** `feat(api): endpoint de telemetry`

---

## Fase 4: Middleware

### F4-T1: Cache (LRU in-memory)
- Cache de respostas com TTL configurável
- Key: `method:path:querystring`
- Invalidação por pattern ou flush all

**Commit:** `feat(middleware): cache LRU`

### F4-T2: Rate limiting
- 100 req/min/IP
- Sliding window
- Resposta 429 com Retry-After header

**Commit:** `feat(middleware): rate limiting`

### F4-T3: CORS + segurança headers
- CORS: `*` para GET, credenciais para admin
- Headers: X-Content-Type-Options, X-Frame-Options

**Commit:** `feat(middleware): CORS + security headers`

---

## Fase 5: Docs + Admin

### F5-T1: OpenAPI + Swagger UI
- `@hono/zod-openapi` gera spec automaticamente
- Swagger UI servido em `/docs`
- Schema exportável em `/openapi.json`

**Commit:** `feat(docs): OpenAPI 3.1 + Swagger UI`

### F5-T2: Admin endpoints
- `POST /v1/admin/cache/invalidate`
- `GET /v1/admin/stats`
- `POST /v1/admin/import` (trigger manual)
- Auth: Firebase Admin verifyIdToken

**Commit:** `feat(admin): cache invalidation + stats + import`

---

## Fase 6: Deploy + Infra

### F6-T1: Deploy na Hostinger
- O Ezequias configura a VPS da Hostinger
- Opções: Docker, PM2, ou Hostinger App panel
- DNS: api.pianolouvorja.com.br aponta pra Hostinger
- Cloudflare na frente (DNS proxy mode)

**Commit:** `chore(deploy): config agnostica — funciona em qualquer VPS`

### F6-T2: CI build + Docker image registry
- GitHub Actions builda a Docker image
- Push para GitHub Container Registry (ghcr.io)
- Deploy: Ezequias faz `docker compose pull && docker compose up -d` na Hostinger
- Health check automático no CI após deploy

**Commit:** `ci: build + push Docker image para ghcr.io`

### F6-T3: Cron de importação
```bash
# /etc/cron.d/piano-api-import
0 4 * * * ubuntu cd /home/ubuntu/piano-api && docker compose exec api node scripts/import-upstream.mjs >> /var/log/piano-api-import.log 2>&1
```

**Commit:** `chore(cron): importação diária automatizada`

---

## Fase 7: Migrar Clientes

### F7-T1: Migrar piano-app (#66)
- Trocar URL base + fallback
- Testar todos os módulos

### F7-T2: Migrar piano-web (#82)
- Mesma troca
- Testar

### F7-T3: Flutter aponta pra nossa API desde o início
- Config em `lib/core/constants/app_constants.dart`

---

## Ordem de Execução

```
F0 (Setup)         → 3h
F1 (Database)      → 3h
F2 (Importação)    → 10h (inclui CCB research)
F3 (Endpoints)     → 8h
F4 (Middleware)    → 2h
F5 (Docs+Admin)    → 3h
F6 (Deploy)        → 2h
F7 (Migrar)        → 2h
Total              → 33h
```

F0-F3 pode rodar em paralelo com a implementação do controle remoto (são independentes).
F7 só depois de F6 (API em produção).
