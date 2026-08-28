# SPEC — Catálogo Infantis e Doxologia

## Objetivo
Adicionar Infantis e Doxologia ao contrato já consumido por `pianolouvorja/app`, sem alterar o app nem remover rotas legadas.

## Contrato
- `GET /json_db/pt_categories`: inclui categorias `98` (Infantis) e `99` (Doxologia).
- Cada categoria retorna `id_category`, `name`, `albums[]`.
- Cada álbum retorna `id_album`, `name`, `subtitle`, `url_image`.
- `GET /json_db/album_{id}`: mantém o payload existente, incluindo `musics[]`.
- `GET /json_db/music_{id}`: mantém o payload existente.
- Não criar `kids.json`, `doxology.json` ou endpoints paralelos.

## Dados estruturais
- Categoria 98: Infantis; álbum 9000: Infantis.
- Categoria 99: Doxologia; álbuns 9010: Entrada da Plataforma; 9011: Dízimos e Ofertas.
- Categorias `type='collection'`, ordens 98 e 99.
- Nenhuma música fictícia. Músicas serão adicionadas somente com dados reais.

## Compatibilidade
Preservar SQLite, `/json_db/:file`, `/file/*`, `pt_categories`, `pt_musics`, status e payloads existentes.

## Critérios de aceite
1. Migration idempotente em banco novo e existente.
2. `/json_db/pt_categories` retorna as duas categorias com álbuns.
3. Álbuns estruturais retornam `musics: []`.
4. Rotas legadas continuam passando nos testes existentes.
5. `npm run test`, `npm run lint`, `npm run typecheck` e `npm run build` passam.
6. Nenhum conteúdo musical, mídia ou letra é inventado.
