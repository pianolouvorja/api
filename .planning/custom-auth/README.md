# Auth Simples de Coletâneas Custom — Plano de Implementação

> **For Hermes:** Usar subagent-driven-development ou execução direta task-a-task. Branch `feat/custom-auth` em todos os repos afetados.

**Goal:** Autoria e propriedade de coletâneas custom via login mínimo (e-mail + senha), sem JWT/refresh — token de sessão opaco no banco. Deletações/edições passam a exigir posse.

**Arquitetura:** Tabela `custom_users` (email, password_hash PBKDF2 via `node:crypto` — sem deps novas), token de sessão `sha256(randomBytes(32))` salvo em `custom_sessions` (sem expiração v1; logout deleta). Middleware Hono de 20 linhas. Migração 021. Web/Electron guarda token no localStorage (já faz isso com `palcoApiBase`). APK: mesma chamada via `LouvorjaApiClient` (fase 2).

**Tech Stack:** Hono middleware, better-sqlite3, node:crypto (PBKDF2), Vitest. Zero dependências novas.

---

## Decisões de design (acordadas com Rafael 10/09)

1. **Login simples, não anônimo**: e-mail + senha, endpoint mínimo na API.
2. **Retrocompatível**: coletâneas existentes (criadas antes do auth) ficam `owner_id = NULL` = públicas editáveis por qualquer um até serem reivindicadas. Migração não quebra nada.
3. **Leitura continua pública** (qualquer um toca/usa coletânea alheia). Escrita (PUT/DELETE collection + CRUD de musics/lyrics de dentro) exige ser o dono ou ser coletânea órfã (owner NULL).
4. **Autoria visível**: `author_name` opcional (display) + `owner_id` real. GET retorna `createdBy: { name }` quando existir.
5. **Sem JWT, sem refresh, sem expiry** — token opaco revogável. Fase 2 pode subir pra JWT se precisar de multi-device/iOS.

---

## TASK 0.1 — Migration 021: custom_users + custom_sessions + owner_id

**Objective:** Criar as 3 tabelas/colunas necessárias.

**Files:**
- Create: `src/db/migrations/021_custom_auth.sql`

**Step 1:** Escrever migration exata:

```sql
-- 021_custom_auth.sql
CREATE TABLE IF NOT EXISTS custom_users (
  id_user INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,        -- pbkdf2$iter$salt$hash
  display_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_sessions (
  token_hash TEXT PRIMARY KEY,        -- sha256(token) — token puro nunca sai do request
  id_user INTEGER NOT NULL REFERENCES custom_users(id_user) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE custom_collections ADD COLUMN owner_id INTEGER REFERENCES custom_users(id_user);
ALTER TABLE custom_collections ADD COLUMN author_name TEXT;
```

**Step 2:** Rodar API dev e conferir migração aplicada:

```bash
curl -s http://localhost:3100/v1/custom/collections | head -c 100
# resposta normal, sem erro de schema
```

**Step 3:** Commit: `feat(db): migration 021 — custom_users, sessions e owner_id em collections`

---

## TASK 0.2 — Utilitário de hash/sessão (pure, testável)

**Objective:** PBKDF2 + geração/hash de token, sem tocar em rota.

**Files:**
- Create: `src/v1/custom/auth.service.ts`
- Test: `test/unit/custom-auth.service.test.ts`

**Step 1 — teste RED:**

```ts
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword, generateSessionToken } from '../../src/v1/custom/auth.service'

describe('auth.service', () => {
  it('hash + verify de senha (roundtrip)', () => {
    const h = hashPassword('S3nh@Fort3!')
    expect(h).toMatch(/^pbkdf2\$\d+\$/)
    expect(verifyPassword('S3nh@Fort3!', h)).toBe(true)
    expect(verifyPassword('errada', h)).toBe(false)
  })

  it('token gerado tem 64 hex e é diferente a cada chamada', () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('hashPassword determinístico não repete (salt por senha)', () => {
    expect(hashPassword('x')).not.toBe(hashPassword('x'))
  })
})
```

**Step 2:** `npx vitest run test/unit/custom-auth.service.test.ts` → FAIL (módulo não existe)

**Step 3 — implementação:**

```ts
// src/v1/custom/auth.service.ts
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'

const PBKDF2_ITERATIONS = 210_000
const KEY_LEN = 32
const DIGEST = 'sha256'

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(plain, salt, PBKDF2_ITERATIONS, KEY_LEN, DIGEST).toString('hex')
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [scheme, iterRaw, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2' || !iterRaw || !salt || !hash) return false
  const candidate = pbkdf2Sync(plain, salt, Number(iterRaw), KEY_LEN, DIGEST)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

/** Token opaco que o cliente guarda; o banco guarda só o sha256 dele. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
```

**Step 4:** `npx vitest run test/unit/custom-auth.service.test.ts` → 3/3 PASS

**Step 5:** Commit: `feat(custom): auth.service — pbkdf2 + token de sessão (TDD)`

---

## TASK 0.3 — Rotas de conta: register / login / logout / me

**Objective:** Endpoints de ciclo de vida do usuário.

**Files:**
- Modify: `src/v1/custom/custom.routes.ts` (append no final)
- Modify: `src/v1/custom/custom.schemas.ts` (schemas de request)
- Test: `test/integration/custom-auth.routes.test.ts`

**Rotas (todas sob `/v1/custom`):**
- `POST /auth/register` `{ email, password, displayName }` → 201 `{ token, user: { id, email, displayName } }` (409 email duplicado; 422 senha < 8)
- `POST /auth/login` `{ email, password }` → 200 `{ token, user }` (401 credenciais inválidas)
- `POST /auth/logout` (header `Authorization: Bearer <token>`) → 204 (deleta sessão)
- `GET /auth/me` (header) → 200 `{ user }` / 401

**Implementação-chave (esboço — middleware inline nesta task, extraído na 0.4):**

```ts
function authUser(c: any) {
  const raw = c.req.header('authorization') ?? ''
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : ''
  if (!token) return null
  const row = db.selectFrom('custom_sessions')
    .innerJoin('custom_users', 'custom_users.id_user', 'custom_sessions.id_user')
    .where('custom_sessions.token_hash', '=', hashToken(token))
    .select(['custom_users.id_user', 'custom_users.email', 'custom_users.display_name'])
    .executeTakeFirst()
  return row ?? null
}
```

**Teste RED essencial (integration, banco em memória):** register→login→me→logout→me 401. Cobertura 100% obrigatória (thresholds do repo).

**Commit:** `feat(custom): rotas register/login/logout/me`

---

## TASK 0.4 — Middleware de posse: PUT/DELETE de collections protegidos

**Objective:** Só o dono (ou coletânea órfã) edita/deleta. CRUD de musics/lyrics herda a checagem via id_collection.

**Files:**
- Modify: `src/v1/custom/custom.routes.ts` (handlers updateCollection, deleteCollection, createMusic, createLyric, updateLyric, deleteLyric, updateMusic, deleteMusic)
- Test: `test/integration/custom-ownership.test.ts`

**Regra única (helper):**

```ts
function canModify(collection: { owner_id: number | null }, user: { id_user: number } | null): boolean {
  return collection.owner_id == null || (user != null && collection.owner_id === user.id_user)
}
```

- `PUT/DELETE /collections/:id` → 403 `{ error: 'Somente o dono pode alterar esta coletânea' }` quando `!canModify`
- `POST /collections/:id/musics` e filhos → mesma checagem via lookup do `owner_id` da collection
- **Casos de teste:** órfã modificável por anônimo; dona modificável pelo dono; dona → 403 pra anônimo; dona → 403 pra outro user; musics de coletânea alheia → 403.

**Commit:** `feat(custom): middleware de posse — escrita só pelo dono ou coletânea órfã`

---

## TASK 0.5 — POST createCollection retorna token do dono + author_name

**Objective:** Quem cria vira dono automaticamente (se autenticado) e define author_name.

**Files:**
- Modify: `src/v1/custom/custom.routes.ts` (handler createCollection), `custom.schemas.ts`

**Regras:**
- `POST /collections` com `Authorization` válida → `owner_id = user.id_user` (200 retorna `owner: true`)
- Com `author_name` no body → persiste
- GET `/collections` passa a incluir `createdBy: author_name ?? display_name do dono` (null se órfã)

**Commit:** `feat(custom): createCollection vincula dono autenticado + author_name no GET`

---

## TASK 0.6 — Validação CI completa + PR

**Objective:** Fechar o ciclo no repo api.

```bash
npm run validate:pr   # lint + typecheck + test + coverage(100%) + build
git push origin feat/custom-auth
gh pr create --repo pianolouvorja/api --base staging --head feat/custom-auth --title "feat(custom): login simples + posse de coletâneas" --body "..."
```

Checklist CI: [ ] validate:pr exit 0 · [ ] coverage 100% · [ ] Docker build · [ ] review Ezequias

---

## Fase Web/Electron (TASK W.1–W.3 — resumo, specs depois que API mergear)

- **W.1** `custom-auth.service` no app: register/login/logout + token no localStorage (`louvorja.customToken`) + interceptor fetch injetando `Authorization` em `/v1/custom/*`
- **W.2** Modal "Minhas Coletâneas": estado logado (badge com displayName) / deslogado (link "Entrar p/ criar coletânea"); criar coletânea autenticada; tab "Comunidade" vs "Minhas"
- **W.3** Badge de autoria: `createdBy` exibido no card/modal da coletânea (todo mundo vê de quem é)

## Fase APK (TASK A.1 — depois, paridade)

- Consumo dos mesmos endpoints via `LouvorjaApiClient` + tela de login mínima; offline-first preservado (token só pra escrever, leitura segue funcionando sem login).

---

## ARMADILHAS

1. **`better-sqlite3` é síncrono** — não usar `await` nos handlers de db (padrão do repo, mas agents erram).
2. **Testes integration de auth precisam de DB isolada** — usar padrão do `setup-db.ts` existente, NUNCA a `catalog.db` de dev.
3. **Header Authorization no Electron via file://** — fetch relativo não resolve; usar `customApiUrl()` já existente em toda chamada.
4. **CORS**: `secureHeaders` + CORP já ajustado no PR #67 (`30e1143`) — o header `Authorization` precisa entrar no allow-headers se CORS_MODE específico; testar do Vite 5173.
5. **Token no localStorage ≠ cookie**: sem risco CSRF, mas XSS vaza token — sanitizar displayName no render (Vue já escapa por padrão; não usar v-html).
6. **Retrocompatibilidade**: NUNCA bloquear leitura (GET) por falta de auth — quebra o APK e o web production que já consomem.
7. **`verifyPassword` com `timingSafeEqual`** — comparar buffers de MESMO length antes (senão throw).
8. **Email único**: capturar constraint UNIQUE do sqlite (código `SQLITE_CONSTRAINT`) → 409, não 500.
