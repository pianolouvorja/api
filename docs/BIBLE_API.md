# API — Endpoints Bíblia (catálogo oficial, espelho LouvorJA)

> Fonte viva: `GET /openapi.json` · Swagger UI: `/doc`.
> Complementa [CUSTOM_API.md](./CUSTOM_API.md). Última atualização: 2026-09-10 (feat/custom-auth).

## Visão geral

A Bíblia é servida pelo **catálogo compat** (`/json_db/*`), o mesmo canal que os
apps (Flutter mobile/desktop, web, Electron, Delphi) já usam pra hinários.
Não há endpoint REST dedicado em uso — o `GET /v1/bible` existe mas está
**semi-quebrado pra ES** (ver "Limitações").

## Idiomas e versões

| Idioma | Versões (id → nome) | Capítulos |
|---|---|---|
| **pt** | 1 ACRF · 2 ARA · 3 ARC-IB · 4 NTLH · 5 NVI · 6 KJ Atualizada · 7 NVTransformadora · 8 NAA · 9 ARC-Fiel · 13 AC-Fiel | ✅ 66 livros (ids **1–66**) × 1189 caps |
| **es** | 10 Reina-Valera (RV) · 11 Reino-Valera 1989 (RVA) · 12 Las Sagradas Escrituras (SEV) | ✅ 66 livros (ids **67–132**) × 1189 caps |
| **en** | — não existe no ecossistema LouvorJA | ❌ (clients fazem fallback pt) |

## Endpoints

### `GET /json_db/pt_bible_book` · `GET /json_db/es_bible_book`
Lista de livros do idioma. Formato (contrato com apps):

```json
[{ "id_bible_book": 67, "book_number": 1, "name": "Génesis", "chapters": 50,
   "testament": 1, "keywords": "genesis", "abbreviation": "Gn", "color": "#01a2d9" }]
```

⚠️ **ES usa ids de livro com offset +66** (Génesis=67 … Apocalipsis=132).
Os apps leem o `id_bible_book` daqui e usam direto na chave de capítulo.

### `GET /json_db/pt_bible_version` · `GET /json_db/es_bible_version`
Lista de versões do idioma:

```json
[{ "id_bible_version": 10, "name": "Reina-Valera", "abbreviation": "RV" }]
```

### `GET /json_db/bible_{versionId}_{bookId}_{chapter}`
Capítulo completo (versículo a versículo). Chave definida por
`ScriptureFormat.chapterRecordKey` no Flutter:

```
bible_1_1_1   → Gênesis 1, versão 1 (ACRF, pt)
bible_10_67_1 → Génesis 1, versão 10 (RV, es)   ← bookId 67 = 1º livro ES
```

Resposta: `{"data": ["v1", "v2", ...]}`.

**Cache on-demand:** primeira chamada busca do upstream e grava em
`data/bible_cache/bible_{v}_{b}_{c}.json`; chamadas seguintes saem do disco.
Local: 15.458 arquivos (13 versões × 1189 caps — **completo**, pt+es).
⚠️ A prod do upstream (api.louvorja.com.br) **não tem capítulos ES** — o nosso
mirror é mais completo que a origem; miss de ES nunca resolve no upstream.

## Limitações conhecidas

- `GET /v1/bible` e `GET /v1/bible/{book}/{chapter}` (REST/OpenAPI): a query
  `lang` filtra `bible_books.id_language`, mas só `pt` está populado — ES dá
  lista vazia. **Deprecated de facto**: os apps usam `/json_db/*`. Corrigir ou
  remover numa fase futura.
- `bible_verses` (SQLite) vazia por design — capítulos são proxy+cache, não
  linhas no DB. Busca full-text dependeria de popular essa tabela (FTS5).
- EN: sem dados em toda a cadeia (upstream incluído).
