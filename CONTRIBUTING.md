# Contributing to Piano Louvor JA API

Obrigado por contribuir! Este documento descreve o processo para enviar mudanças.

## Quick Start

```bash
git clone https://github.com/pianolouvorja/api.git
cd api
npm install        # instala deps + configura husky hooks automaticamente
npm run dev        # servidor de desenvolvimento (tsx watch)
```

## Pré-requisitos

- Node.js 22+
- npm 10+
- SQLite3 (já incluído via `better-sqlite3`)

## Workflow de Branching

Usamos o modelo **staging → main**:

```
feature/xxx ──→ PR ──→ staging ──→ PR ──→ main
   bugfix/xxx ──↗                  release
```

1. **Nunca** commite diretamente em `main` ou `staging`
2. Crie uma branch a partir de `staging`:
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/minha-feature
   ```
3. Abra um PR para `staging`
4. Após merge e validação em staging, um PR de `staging` → `main` faz o release

### Convenção de Nomes de Branch

| Tipo       | Prefixo      | Exemplo                        |
|------------|--------------|--------------------------------|
| Feature    | `feature/`   | `feature/sda-hymnal-import`    |
| Bug fix    | `fix/`       | `fix/lyrics-empty-import`      |
| Refactor   | `refactor/`  | `refactor/compat-routes`       |
| Docs       | `docs/`      | `docs/api-endpoints`           |
| CI/Infra   | `chore/`     | `chore/add-staging-ci`         |

### Convenção de Commits (Conventional Commits)

```
<type>(<scope>): <description>

feat(bible): adiciona endpoint de busca por versículo
fix(compat): corrige field names do proxy de bíblia
refactor(auth): migra de JWT para PASETO
docs(readme): atualiza instruções de deploy
chore(ci): adiciona branch staging ao workflow
```

Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `ci`

## Qualidade de Código

Temos 4 camadas de proteção contra "código cagado":

### 1. Pre-commit (Husky + lint-staged)
Roda automaticamente ao `git commit`. Formata e linta apenas os arquivos alterados:
- `biome check --write` em arquivos `.ts` e `.json`

### 2. Pre-push (Husky)
Roda automaticamente ao `git push`. Validacão completa:
- `tsc --noEmit` (typecheck)
- `vitest run` (todos os testes)

### 3. CI (GitHub Actions)
Roda em todo PR para `staging` e `main`:
- Lint & Format (Biome CI mode)
- Type Check
- Tests + Coverage
- Docker Build

### 4. Code Review
- Mínimo 1 approval necessário
- CODEOWNERS é automaticamente solicitado

### Comandos Manuais

```bash
npm run lint         # biome check src/ test/
npm run lint:fix     # biome check --write src/ test/
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:coverage # vitest run --coverage
npm run validate:pr  # tudo junto (lint + typecheck + test)
```

## Testes

- Framework: **Vitest**
- Cobertura mínima exigida em novas features
- Execute: `npm run test:coverage`

### Estrutura

```
test/
  *.test.ts    # testes unitários e de integração
```

## Style Guide

- **Linter/Formatter**: Biome (preset recommended)
- `noExplicitAny`: `warn` — evite `any`, use `unknown` + type guard
- Imports: organizados automaticamente pelo Biome
- Aspas: duplas (`"`)
- Indentação: 2 espaços (tab)

## OpenAPI / Documentação

- Endpoints usam `@hono/zod-openapi` para gerar spec automaticamente
- Scalar UI disponível em `/doc`
- Ao adicionar/modificar endpoints, os schemas Zod devem refletir o contrato real

## Issues e Bug Reports

Ao abrir uma issue, inclua:
1. Descrição clara do problema
2. Passos para reproduzir
3. Comportamento esperado vs. atual
4. Versão do Node e OS
5. Logs relevantes

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a licença MIT.
