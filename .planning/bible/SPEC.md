# SPEC: Bíblia na piano-api — mapeamento, gaps e docs

**Data:** 10/09/2026 · **Base:** evidência real (curl local :3100 + produção api.louvorja.com.br + sqlite data/catalog.db + cache data/bible_cache/ 15.458 arquivos)

## Estado ATUAL (verificado)

### Endpoints bíblia

| Endpoint | Local (:3100) | Produção (api.louvorja.com.br, do Mayco) |
|---|---|---|
| `GET /json_db/{pt\|es}_bible_book` | pt ✅ · **es ❌ 404** | pt ✅ · es ✅ |
| `GET /json_db/{pt\|es}_bible_version` | pt ✅ · **es ❌ 404** | pt ✅ · es ✅ |
| `GET /json_db/bible_{v}_{b}_{c}` (capítulo) | ✅ PT (books 1-66) · ✅ ES (books **67-132**, do cache local) | ✅ PT (books 1-66) · **ES ❌ 404 (sem capítulos)** |
| `GET /v1/bible?lang=` (REST OpenAPI) | existe, mas lê `bible_books` **SEM coluna id_language populada p/ es** → só pt funcional | idem (só pt) |
| `GET /v1/bible/{book}/{chapter}?lang=` | idem | idem |

### Dados

- **`bible_versions` (SQLite local):** 10 PT (Almeida×5, NVI, NAA, NTNLH, KJ Atualizada, NVTransformadora) — **zero ES registradas**, mas o cache tem 3 versões ES completas.
- **`bible_books`:** 66 linhas, todas `id_language='pt'` (nomes PT). ES usa **ids 67–132** (offset +66, Génesis=67…, nomes ES vindos do upstream).
- **`bible_cache/`:** 15.458 arquivos = 13 versões × 1189 capítulos + 2 extras (888, 999).
  - PT: versions **1–9 e 13** (10 versões ✅)
  - ES: versions **10 (SEV), 11 (RV), 12 (RVA)** — completas, livros 67–132
- **`bible_verses`:** 0 linhas (capítulos são proxy on-demand + cache; tabela sem uso).
- **EN:** não existe em lugar nenhum (prod 404 em en_bible_book/version). O app Flutter já documenta: "EN não tem, fallback pt".

### Formato da chave de capítulo (contrato com apps)

`bible_{versionId}_{bookId}_{chapter}` — ver `ScriptureFormat.chapterRecordKey` no Flutter. **ES usa bookId +66** (68=Êxodo ES etc.). O app desktop/web já lida com isso via `es_bible_book` (que traz os ids 67+).

## GAPS (o que documentar/corrigir)

### GAP-1 (crítico): `/json_db/es_bible_book` e `es_bible_version` → 404 no local
O handler `compat.ts` só trata `pt_bible_book`/`pt_bible_version`. A produção do Mayco tem; a nossa não. O Flutter (mobile/desktop/web) chama esses arquivos quando o idioma é es → **Bíblia ES quebra no app apontando pra nossa API**.
**Fix:** tratar `es_bible_book` (SELECT com id_language='es' OU id_book BETWEEN 67 AND 132) e `es_bible_version` (versions 10/11/12) no compat.ts — dados já estão no cache/DB.

### GAP-2: versões ES ausentes em `bible_versions` (SQLite)
Registrar SEV(10), RV(11), RVA(12) com language='es'. Hoje a verdade de versões ES só existe no cache de arquivos.

### GAP-3: `/v1/bible` (REST) quebrado pra ES e semi-quebrado no geral
Query filtra `id_language = ?` mas `bible_books` só tem pt; resposta também não inclui `book_number`/`abbreviation`/`color` que o schema promete. Ou conserta, ou marca deprecated apontando pro `/json_db` (que é o que os apps usam de verdade).

### GAP-4 (documentação): `docs/CUSTOM_API.md` não documenta nada de Bíblia
Falta: tabela de endpoints, formato da chave de capítulo, offset de livros ES (+66), lista de versões com ids, regra do cache on-demand (15k arquivos, origin upstream Mayco), limitação EN.

### GAP-5 (informativo): produção do Mayco lista versões ES mas não tem os capítulos
`bible_10_1_1` (e qualquer ES) = 404 na prod. **O nosso mirror local está MAIS completo que a origem** (tem os 3×1189 capítulos ES cacheados). Significa: pra Bíblia ES, a nossa API é a fonte; upstream nunca vai resolver miss de ES.

## Fora de escopo (futuro)

- Novas versões (ARC, NVI es, etc.): exigiria baixar de fonte externa (Bible API) — hoje só espelhamos o ecossistema LouvorJA.
- Popular `bible_verses` (busca full-text): depende de decisão de arquitetura (SQLite FTS5 vs search no client).
