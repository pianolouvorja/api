# SPEC: pianolouvorja/api — API Própria

> **Repo:** github.com/pianolouvorja/api (a criar)
> **Stack:** Node.js 22 + Hono + SQLite (better-sqlite3)
> **Referência:** louvorja/api (PHP/Lumen — serve api.louvorja.com.br)
> **Domínio:** api.pianolouvorja.com.br (Cloudflare → VM Oracle)

---

## Contexto

Hoje todos os produtos PIANO consomem `api.louvorja.com.br` (PHP/Lumen, MySQL, gerenciado pela org louvorja). Não controlamos uptime, formato, nem disponibilidade. Se essa API sair do ar, todos os produtos PIANO param.

Esta SPEC define nossa própria API — independente, leve, sem custo de infra.

## Por que Hono e não Nitro (Nuxt)?

O piano-site roda Nitro, mas a API é um serviço diferente com ciclo de release próprio:
- API muda schema → não pode quebrar o site
- API precisa escalar independente do site
- API tem health check, rate limiting, e contratos próprios
- Hono é mais leve que Nitro pra servir só JSON (sem SSR, sem páginas)

Hono roda em qualquer runtime (Node, Bun, Deno, Cloudflare Workers). Se um dia quisermos migrar pra Cloudflare Workers (edge), o código não muda.

## Por que SQLite e não MySQL?

- 15GB de catálogo cabe em SQLite sem problema
- Zero configuração, zero custo, um arquivo no disco
- better-sqlite3 é síncrono — mais rápido que MySQL pra reads
- Backup = copiar arquivo
- Mesmo formato que o app Delphi e o Elvieira já usam (issue app#46)
- Replicação não é necessária — uma VM basta pra volume de igrejas

---

## Schema do Banco (baseado no louvorja/api)

### languages
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_language | TEXT PK | "pt", "en", "es" |
| name | TEXT | "Português", "English", "Español" |

### files
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_file | INTEGER PK | Auto increment |
| name | TEXT | Nome do arquivo |
| path | TEXT | Caminho relativo |
| type | TEXT | "image", "audio", "midi" |
| url | TEXT | URL completa (CDN ou local) |
| size | INTEGER | Bytes |

### albums (coletâneas)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_album | INTEGER PK | |
| name | TEXT | "Hinário Adventista", "Louvor JA 14" |
| id_file_image | INTEGER FK→files | Capa |
| color | TEXT | Cor de destaque (#RRGGBB) |
| id_language | TEXT FK→languages | |

### musics (hinos)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_music | INTEGER PK | |
| name | TEXT | Título do hino |
| id_file_image | INTEGER FK→files | Imagem |
| id_file_music | INTEGER FK→files | Áudio cantado |
| id_file_instrumental | INTEGER FK→files | Áudio playback |
| id_language | TEXT FK→languages | |

### lyrics (estrofes)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_lyric | INTEGER PK | |
| id_music | INTEGER FK→musics | |
| lyric | TEXT | Texto da estrofe |
| aux_lyric | TEXT? | Texto auxiliar |
| id_file_image | INTEGER FK→files | Fundo do slide |
| time | TEXT | Duração cantado (mm:ss) |
| instrumental_time | TEXT | Duração playback |
| show_slide | INTEGER | 0 ou 1 |
| order | INTEGER | Ordem das estrofes |
| id_language | TEXT FK→languages | |

### albums_musics (N:N)
| Coluna | Tipo |
|--------|------|
| id_album | INTEGER FK→albums |
| id_music | INTEGER FK→musics |

### categories / categories_albums
Categorias de coletâneas (Hinários, Louvor JA, etc).

### bible_books / bible_versions / bible_verses
Bíblia completa, múltiplas versões (ACF, NVI, etc).

### ccb_hymns (NOVO — Congregação Cristã no Brasil)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_hymn | INTEGER PK | Número do hino |
| title | TEXT | Título |
| lyric | TEXT | Letra completa |
| id_language | TEXT FK→languages | |
| audio_url | TEXT? | URL do áudio (se disponível) |
| public_domain | INTEGER | 0 ou 1 (direitos autorais) |

---

## Endpoints REST

### Públicos (sem auth)

```
GET /v1/health                   → { status: "ok", version, uptime }
GET /v1/meta/version             → { version, catalog_date }
GET /v1/meta/hymnals             → [ { id, name, language, count } ]
GET /v1/meta/languages           → [ { id, name } ]

GET /v1/albums                   → Lista de coletâneas (paginado)
GET /v1/albums/:id               → Detalhe + lista de hinos
GET /v1/albums/:id/hymns         → Só os hinos da coletânea

GET /v1/hymns                    → Lista de hinos (paginado, ?album=, ?lang=)
GET /v1/hymns/:id                → Detalhe (metadados + letras)
GET /v1/hymns/:id/lyrics         → Só as estrofes
GET /v1/hymns/:id/audio          → URLs de áudio (cantado, playback, MIDI)
GET /v1/hymns/search?q=          → Busca (número, título, trecho de letra)

GET /v1/bible/books              → Lista de livros
GET /v1/bible/:book/:chapter     → Capítulo completo
GET /v1/bible/search?q=          → Busca por versículo

GET /v1/ccb/hymns                → Lista de hinos CCB (REQUER X-License-Key)
GET /v1/ccb/hymns/:id            → Detalhe + letra (REQUER X-License-Key)
GET /v1/ccb/hymns/search?q=      → Busca CCB (REQUER X-License-Key)

POST /v1/admin/licenses          → Gerar licença (admin only)
GET  /v1/admin/licenses          → Listar licenças (admin only)
PATCH  /v1/admin/licenses/:id    → Ativar/desativar (admin only)
DELETE /v1/admin/licenses/:id    → Revogar (admin only)

POST /v1/telemetry               → Ping anônimo (install_id, version, os)
```

### Admin (Firebase Auth Bearer)

```
POST /v1/admin/cache/invalidate  → Invalida cache de uma rota ou tudo
GET  /v1/admin/stats             → Métricas (req/dia, cache hit rate, etc)
POST /v1/admin/import            → Importa JSON do api.louvorja.com.br
GET  /v1/admin/export            → Exporta SQLite completo
```

---

## Estratégia de Dados em 3 Camadas

### Camada 1: Importação do louvorja/api
Script que roda 1x por dia (cronjob):
1. Baixa JSONs de `api.louvorja.com.br/json_db`
2. Faz upsert no SQLite local
3. Baixa arquivos de mídia (áudio, imagens) pra disco local
4. Registra no campo `url` o caminho local (CDN pra servir)

Se api.louvorja.com.br cair, os dados já estão no SQLite — continuamos servindo.

### Camada 2: Fontes Próprias Independentes
Dados que NÃO vêm de api.louvorja.com.br:

| Fonte | Dados | Como entra no SQLite |
|-------|-------|---------------------|
| sda-hymnal NPM | 695 letras EN | Script de importação do NPM package |
| SacCentral | 483 URLs de MP3 coral EN | Script cataloga URLs em `files.url` |
| frazras/SDA-Hymnal | 695 URLs de MIDI | Script cataloga URLs em `files.url` |
| CCB | ~480 hinos (letra) | Script de importação (pesquisar fonte) |

### Camada 3: Mídia (áudio + imagens) no Cloudflare R2
- 15GB de áudio e imagens NÃO ficam no VPS da API
- Upload para Cloudflare R2 (10GB grátis, $0.005/GB excedente ≈ R$0.15/mês)
- SQLite guarda a URL do R2 no campo `files.url`
- Cliente (app/web/flutter) faz streaming direto do R2 — não passa pela API
- Zero egress no R2 (Cloudflare não cobra banda de saída)
- Script de importação faz upload automático para R2 quando baixa mídia nova

**Por que R2 e não disco do VPS:**
- Banda do VPS é limitada e cara
- R2 tem CDN global integrada (baixa rápido em qualquer lugar do Brasil)
- Se migrarmos de VPS, a mídia não precisa se mover
- Custo: ~R$0.15/mês pra 15GB (praticamente grátis)

---

## Stack Completa

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Runtime | Docker container (Hostinger VPS) | Agnóstico — roda em qualquer cloud |
| Framework | Hono | 4.x |
| Database | SQLite (better-sqlite3) | síncrono, C nativo |
| ORM/Query | Kysely | type-safe SQL builder |
| Cache | LRU in-memory + Cloudflare edge | |
| Auth | Firebase Admin SDK (verifyIdToken) | |
| Validação | Zod | |
| Docs | @hono/zod-openapi → OpenAPI 3.1 | Swagger UI em /docs |
| Test | Vitest + Supertest | |
| Container | Docker + Docker Compose | |
| CI | GitHub Actions | |
| Deploy | Cloudflare Tunnel → VM Oracle | |

---

## Infraestrutura

### Arquitetura de Deploy

```
Internet → Cloudflare (DNS + CDN + DDoS)
              ↓
         Hostinger VPS (api.pianolouvorja.com.br)
              ↓
         Docker Container (ou PM2)
         ┌─────────────────────────┐
         │ Hono API (port 3100)    │
         │ SQLite (/data/catalog.db)│
         │ /media (15GB áudio+img) │
         └─────────────────────────┘
```

> **IMPORTANTE:** A API é AGNÓSTICA de infraestrutura. Roda em qualquer VPS/cloud que tenha Node.js 22+ ou Docker. Não depende da VM Oracle nem de nenhuma infra específica do Rafael. O Ezequias gerencia o deploy na Hostinger.

### Opções de Deploy (Ezequias escolhe)

| Opção | Como | Quando |
|-------|------|--------|
| **Docker** (recomendado) | `docker compose up -d` na Hostinger VPS | Se Hostinger permite Docker |
| **PM2** | `pm2 start dist/index.js --name piano-api` | Se Hostinger é VPS sem Docker |
| **Hostinger App** | Deploy via Git panel da Hostinger | Se Hostinger tem Node.js runtime |

### Requisitos Mínimos da Hostinger
| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| RAM | 1GB | 2GB+ |
| Disco | 20GB | 50GB+ (catálogo + mídia) |
| Node.js | 22 LTS | 22 LTS |
| OS | Linux (Ubuntu/Debian) | Ubuntu 24.04 |

### docker-compose.yml (agnóstico)
```yaml
# docker-compose.yml — funciona em qualquer VPS
services:
  api:
    build: .
    container_name: piano-api
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./data:/app/data          # SQLite + config
      - ./media:/app/media        # 15GB de áudio/imagens
    environment:
      - NODE_ENV=production
      - PORT=3100
      - DB_PATH=/app/data/catalog.db
      - MEDIA_DIR=/app/media
      - FIREBASE_PROJECT_ID=pianolouvorja
      - UPSTREAM_API=https://api.louvorja.com.br
      - CACHE_TTL_HYMN=86400     # 24h
      - CACHE_TTL_AUDIO=3600     # 1h
      - CACHE_TTL_BIBLE=604800   # 7d
      - RATE_LIMIT_PER_MIN=100
```

> O `ports` mapeia 3100:3100 (público). Na Hostinger, o Cloudflare ou Nginx faz reverse proxy pra 3100. Se não quiser expor a porta, usar `127.0.0.1:3100:3100` + Nginx proxy.

---

## Migração dos Clientes

### Fase 1: Setup API + importação de dados
- Criar repo, Hono app, SQLite schema, script de importação
- Rodar primeira importação (baixa tudo de api.louvorja.com.br)
- Deploy na VM

### Fase 2: Migrar Desktop (piano-app)
```typescript
// De:
const API_URL = 'https://api.louvorja.com.br/json_db'
// Para:
const API_URL = 'https://api.pianolouvorja.com.br/v1'
const FALLBACK_API = 'https://api.louvorja.com.br/json_db' // fallback
```

### Fase 3: Migrar Web (piano-web)
Mesma troca de URL.

### Fase 4: Flutter nasce apontando pra nossa API
```dart
const apiUrl = 'https://api.pianolouvorja.com.br/v1';
```

---

## Cron de Importação

```bash
# Cron job — roda todo dia às 04:00 (horário de baixo tráfego)
0 4 * * * cd /home/ubuntu/piano-api && node scripts/import-upstream.mjs
```

O script:
1. Busca manifest em `UPSTREAM_API/json_db`
2. Compara hashes com última importação
3. Baixa apenas arquivos que mudaram
4. Faz upsert no SQLite
5. Baixa mídia nova (áudio, capas) pra `/media`
6. Loga resultado

---

## Segurança

| Aspecto | Estratégia |
|---------|-----------|
| DDoS | Cloudflare (já configurado, absorbs ataque) |
| Rate limit | 100 req/min/IP (Hono middleware) |
| SQL Injection | Kysely (parameterized queries, type-safe) |
| Auth admin | Firebase Admin verifyIdToken |
| Dados públicos | Hinários são públicos — sem auth nos GET |
| CORS | `*` para GET público (apps móveis precisam) |
| HTTPS | Cloudflare (SSL/TLS automático) |
| Firewall | Cloudflare Tunnel — zero ports abertas na VM |

---

## RFs

### RF-API-01: API REST completa
THE SYSTEM SHALL servir todos os endpoints documentados com resposta JSON padronizada `{ data, meta }`.

### RF-API-02: Resiliência (upstream down)
WHEN api.louvorja.com.br está fora THE SYSTEM SHALL continuar servindo todos os dados do SQLite local.

### RF-API-03: Importação incremental
THE SYSTEM SHALL importar apenas dados que mudaram desde a última importação (delta sync por hash).

### RF-API-04: Fontes próprias
THE SYSTEM SHALL servir dados de fontes independentes (sda-hymnal, SacCentral, frazras, CCB) sem depender do upstream.

### RF-API-04: CCB (Congregação Cristã no Brasil) — PROTEGIDO/PAGO
**THE SYSTEM SHALL** servir hinos da CCB em `/v1/ccb/hymns` com autenticação por licença (license key).

**Modelo de Negócio:**
- Hinário Adventista (SDA): GRÁTIS, sem auth, open
- Coletâneas Louvor JA: GRÁTIS, sem auth, open
- Bíblia: GRÁTIS, sem auth, open
- **CCB e outras denominações:** PAGO, requer license key no header

**Sistema de Licenças:**
- `GET /v1/ccb/hymns` requer header `X-License-Key: {uuid}`
- Sem key válida → 403 Forbidden
- Licença vinculada a dispositivo (device_id) ou igreja (org_id)
- Validação via tabela `licenses` no SQLite
- Endpoint admin pra gerar/revogar licenças

**Tabela licenses:**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id_license | TEXT PK | UUID |
| denomination | TEXT | "ccb", "futuro_outro" |
| customer_name | TEXT | Nome da igreja/comprador |
| customer_email | TEXT | Email de contato |
| device_id | TEXT? | Vinculado a um dispositivo (opcional) |
| max_devices | INTEGER | Máximo de dispositivos (default 3) |
| active | INTEGER | 0 ou 1 |
| expires_at | TEXT? | NULL = vitalícia |
| created_at | TEXT | |

**Endpoints de licença (admin only):**
```
POST   /v1/admin/licenses              → Gerar nova licença
GET    /v1/admin/licenses              → Listar licenças
PATCH  /v1/admin/licenses/:id          → Ativar/desativar/renovar
DELETE /v1/admin/licenses/:id          → Revogar
```

**Endpoints CCB (protegidos por licença):**
```
GET /v1/ccb/hymns           → Requer X-License-Key válido
GET /v1/ccb/hymns/:id       → Requer X-License-Key válido
GET /v1/ccb/hymns/search    → Requer X-License-Key válido
```

**Middleware de licença:**
```typescript
// src/middleware/license.ts
import { createMiddleware } from 'hono/factory'

export const requireLicense = (denomination: string) => createMiddleware(async (c, next) => {
  const key = c.req.header('X-License-Key')
  if (!key) return c.json({ error: 'License key required' }, 403)
  
  const license = await db.validateLicense(key, denomination)
  if (!license) return c.json({ error: 'Invalid or expired license' }, 403)
  
  c.set('license', license)
  await next()
})
```

**Uso na rota:**
```typescript
app.get('/v1/ccb/hymns', requireLicense('ccb'), async (c) => {
  // Só chega aqui se a licença for válida
  const hymns = await db.getCcbHymns()
  return c.json({ data: hymns })
})
```

**Cliente (app):**
- App desktop/web gratuito SDA: não envia X-License-Key (só acessa endpoints SDA)
- App com licença CCB: settings tem campo "Licença Denominação", armazena a key, envia no header

**Pipeline de pagamento (futuro):**
1. Cliente compra no site (Stripe/AbacatePay)
2. Pagamento confirmado → webhook gera licença automaticamente
3. Cliente recebe email com licença + instruções
4. Cola a key no app → desbloqueia hinos CCB

### RF-API-06: Rate limiting
THE SYSTEM SHALL limitar a 100 requisições por minuto por IP.

### RF-API-07: Health check
GET /v1/health SHALL retornar `{ status: "ok", version, uptime, db_size, last_import }`.

### RF-API-08: Cache
THE SYSTEM SHALL cachear respostas com TTL configurável por tipo de dado (letra 24h, áudio URL 1h, bíblia 7d).

### RF-API-09: OpenAPI docs
THE SYSTEM SHALL servir documentação OpenAPI 3.1 em `/docs` (Swagger UI).

---

## Estimativa

| Bloco | Esforço |
|-------|---------|
| Repo setup + Hono + Docker | 3h |
| SQLite schema + Kysely + migração | 3h |
| Script de importação (upstream) | 3h |
| Endpoints REST (hymns, albums, lyrics) | 4h |
| Endpoints Bible | 2h |
| Fontes próprias (sda-hymnal, SacCentral) | 3h |
| CCB research + estrutura | 4h |
| Rate limiting + cache middleware | 1h |
| OpenAPI docs | 2h |
| Cloudflare Tunnel + DNS + deploy | 1h |
| CI (lint + test + build + deploy) | 2h |
| Testes (unit + integration) | 3h |
| Migrar clients (app + web) | 2h |
| **Total** | **33h** |
