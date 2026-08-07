# AGENTS.md — pianolouvorja/api

> Guia para AI agents trabalharem neste projeto.
> LEIA ANTES DE ESCREVER QUALQUER CÓDIGO.

## Identidade

| Campo | Valor |
|-------|-------|
| Repo | github.com/pianolouvorja/api (a criar) |
| Stack | Node.js 22 + Hono 4 + SQLite (better-sqlite3) + Kysely |
| Runtime | Docker na VM Oracle ARM64 |
| Domínio | api.pianolouvorja.com.br (Cloudflare Tunnel) |
| Custo | ZERO (VM Free Tier existente) |

## Regras de Ouro

1. **Hono, não Express/Fastify/Nitro.** Hono roda em qualquer runtime, é mais leve.
2. **SQLite, não MySQL/Postgres.** Um arquivo no disco. better-sqlite3 síncrono.
3. **Kysely, não Prisma.** Type-safe sem o overhead do Prisma Engine.
4. **Zod pra validação.** Todo input de usuário é validado com Zod schema.
5. **`defineResponse()` pattern.** Todas respostas: `{ data: T, meta?: {...} }`.
6. **Zero dependências externas pagas.** Tudo roda na VM Free Tier.
7. **TDD.** Teste antes do código. Cobertura mínima 90%.
8. **PT-BR nos comentários.** Código/variáveis em inglês (convenção).
9. **Commits conventional.** `feat(api):`, `fix(db):`, `chore(docker):`.

## Estrutura de Pastas

```
piano-api/
├── src/
│   ├── index.ts              # Hono app entry (porta 3100)
│   ├── routes/               # Handlers por domínio
│   ├── db/                   # SQLite + Kysely
│   │   ├── connection.ts
│   │   ├── schema.ts
│   │   └── migrations/       # .sql files
│   ├── middleware/           # cache, rateLimit, auth, cors
│   ├── scripts/              # import-upstream, import-sda, import-ccb
│   ├── types/                # Zod schemas + TS types
│   └── utils/                # response formatter, logger
├── test/
│   ├── unit/                 # Handlers isolados
│   └── integration/          # End-to-end com DB real
├── data/                     # SQLite + config (GITIGNORED)
├── media/                    # Áudio + imagens 15GB (GITIGNORED)
├── Dockerfile
├── docker-compose.yml
├── vitest.config.ts
├── biome.json
└── tsconfig.json
```

## Comandos

```bash
# Dev local
npm run dev                   # Hono com hot reload (tsx watch)

# Build
npm run build                 # tsc → dist/

# Test
npm test                      # Vitest
npm run test:coverage         # Com coverage

# Importar dados
npm run import:upstream       # De api.louvorja.com.br
npm run import:sda-hymnal     # Do NPM package
npm run import:ccb            # CCB (pesquisar fonte)

# Docker
docker compose up -d          # Sobe API + volumes
docker compose logs -f api    # Logs em tempo real
docker compose exec api sh    # Shell dentro do container
```

## Schema SQLite

Baseado 1:1 no louvorja/api (PHP/Lumen). Ver SPEC.md para definição completa.

Tabelas principais:
- `languages` — pt, en, es
- `files` — áudio, imagens (URL + metadados)
- `albums` — coletâneas (Hinário, Louvor JA, etc)
- `musics` — hinos (título, FKs pra áudio/imagem)
- `lyrics` — estrofes (texto, ordem, slide)
- `albums_musics` — N:N
- `categories` — grupos de coletâneas
- `bible_*` — bíblia (books, versions, verses)
- `ccb_hymns` — hinos CCB (NOVO)

## Endpoints

Ver SPEC.md → seção "Endpoints REST" para lista completa.

## Importação de Dados

O upstream (api.louvorja.com.br) serve JSONs em `/json_db/{file}`.
O script `import-upstream.mjs`:
1. Busca manifest em `/json_db`
2. Compara hash com última importação
3. Baixa apenas mudanças (delta)
4. Upsert no SQLite

Cron: todo dia às 04:00 (baixo tráfego).

## Deploy

A API é AGNÓSTICA — roda em qualquer VPS/cloud com Node 22+ ou Docker.
O Ezequias gerencia o deploy na Hostinger.

3 opções (Ezequias escolhe conforme o plano Hostinger):
- Docker: `docker compose up -d`
- PM2: `pm2 start dist/index.js --name piano-api`
- Hostinger App: deploy via Git panel

CI no GitHub Actions faz: lint → test → build → Docker image → push registry.
Deploy é manual (`docker compose pull && docker compose up -d` na Hostinger) ou automático via webhook.

## O Que NÃO Fazer

- NÃO usar Prisma (pesado, engine separada, overkill pra SQLite)
- NÃO usar MySQL/Postgres (SQLite basta pra nosso volume)
- NÃO abrir ports na VM (Cloudflare Tunnel only)
- NÃO coletar dados pessoais sem necessidade (LGPD)
- NÃO servir áudio diretamente da API (usar Cloudflare CDN)
- NÃO hardcodar URLs do upstream (usar env `UPSTREAM_API`)
- NÃO commitar `data/` ou `media/` (são volumes do Docker)

## Variáveis de Ambiente

```env
NODE_ENV=production
PORT=3100
DB_PATH=/app/data/catalog.db
MEDIA_DIR=/app/media
UPSTREAM_API=https://api.louvorja.com.br
FIREBASE_PROJECT_ID=pianolouvorja
CACHE_TTL_HYMN=86400
CACHE_TTL_AUDIO=3600
CACHE_TTL_BIBLE=604800
RATE_LIMIT_PER_MIN=100
```
