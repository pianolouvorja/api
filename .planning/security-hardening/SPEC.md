# SPEC: Security Hardening (seniorização da API)

## Contexto
A piano-api é pública e aberta. Rate limit + Zod existem, mas faltam camadas básicas de defesa. Este spec fecha os gaps P0/P1 identificados na auditoria de 24/08/2026. CCB/licenças estão FORA do escopo (projeto futuro).

## Requisitos Funcionais

### RF-01: Secure headers
WHEN qualquer resposta THE SYSTEM SHALL incluir X-Content-Type-Options: nosniff, X-Frame-Options, Referrer-Policy, X-XSS-Protection, Strict-Transport-Security (só quando NODE_ENV=production).
Implementação: `hono/secure-headers` global no app.ts.

### RF-02: Error handler global sem vazamento
WHEN um handler lança exceção THE SYSTEM SHALL responder 500 com `{error: "Internal Server Error"}` SEM stack trace ou mensagem cru do SQLite. WHEN rota não existe THE SYSTEM SHALL responder 404 JSON.

### RF-03: CORS configurável
THE SYSTEM SHALL ler `CORS_ORIGINS` do env (comma-separated). Default `*` (compat com apps). NODE_ENV=production sem CORS_ORIGINS → mantém `*` mas loga warning.

### RF-04: Validação de env no boot
WHEN a API iniciar THE SYSTEM SHALL validar PORT (int), NODE_ENV (enum), DB_PATH, UPSTREAM_API (url) via Zod. IF env inválida THE SYSTEM SHALL falhar fast com mensagem clara (exit 1).

### RF-05: Rate limit proxy-aware
WHEN `TRUSTED_PROXY=true` THE SYSTEM SHALL derivar IP do X-Forwarded-For (primeiro hop). WHEN não confiável THE SYSTEM SHALL ignorar o header (IP do socket). Documenta uso atrás de Cloudflare Tunnel.

### RF-06: Path traversal no /file
WHEN path de /file/{path} contiver `..` ou for absoluto THE SYSTEM SHALL responder 400.

## Não-Funcionais
- Testes unit+integration para cada RF (TDD)
- Zero breaking change nos shapes de resposta das rotas existentes
- Sem novas dependências (hono/secure-headers é built-in)

## Fora de Escopo
- CCB / licenses / auth admin (projeto futuro)
- Rate limit persistido (SQLite) — aceito em memória, instância única
- HTTPS enforcement (domínio ainda não existe)
- Dependabot/npm audit no CI (PR separado)
