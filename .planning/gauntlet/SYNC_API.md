# CUSTOM SYNC API — Contrato (B16)

`POST /v1/custom/sync` — sincronização offline-first das Minhas Coletâneas.

## Auth
- Header `Authorization: Bearer <token>` **obrigatório** (token opaco do
  `/v1/custom/auth/login`). Sem token ou token inválido → `401 {"error":"Não autenticado"}`.

## Request
```json
{
  "collections": [
    {
      "client_uuid": "uuid-v4-gerado-no-cliente",   // identidade do item
      "name": "Louvor Domingo",
      "description": null,
      "author_name": null,
      "updated_at": 1700000000000,                   // ms epoch do cliente
      "deleted_at": null,                            // tombstone (ms epoch) ou null
      "musics": [
        {
          "client_uuid": "uuid-v4",
          "name": "Hino 100",
          "lyric": "texto completo",
          "auxiliary_lyric": "tradução",
          "duration": 240,
          "official_music_id": null,
          "updated_at": 1700000000000,
          "deleted_at": null,
          "lyrics": [                                 // estrofes (payload da música)
            { "lyric": "estrofe", "aux_lyric": null, "time": "00:00",
              "instrumental_time": "00:00", "show_slide": 1, "order": 0 }
          ]
        }
      ]
    }
  ]
}
```
Limites: 500 collections/batch, 2000 musics/collection, 200 lyrics/music.

## Regras LWW (B3)
Por item (collection **e** music, comparados por `client_uuid`):
- `client_ts > server_ts` (updated_at_ms) → **client vence**, servidor aplica.
- `client_ts <= server_ts` → **server vence**, estado do servidor volta na
  resposta e o cliente deve descartar a cópia local (campo `conflicts`).
- Tombstone (`deleted_at` setado) participa do LWW normalmente: se vence,
  o item é marcado deletado no servidor (B4).
- Criação enviada com `client_uuid` já tombstoned → tratada como update no
  registro existente; se o remetente não for o dono → `server-wins-forbidden`
  (nunca ressuscita, B4).
- Dono obrigatório para escrita: registro com `owner_id` diferente do usuário
  do token nunca é sobrescrito (`conflicts: server-wins-forbidden`, B9).
- Registros legados (`owner_id IS NULL`) são editáveis por qualquer autenticado.
- **Coalescing é responsabilidade do cliente** (outbox): o servidor só vê o
  estado final por item.

## Response 200
```json
{
  "server_time": 1700000009999,
  "applied": { "created": 2, "updated": 1 },
  "conflicts": [ { "client_uuid": "...", "resolution": "server-wins" } ],
  "collections": [ /* estado servidor pós-sync: coletâneas vivas do usuário
      (dono ou públicas), cada uma com musics[] e lyrics[], flags is_owner,
      updated_at_ms e client_uuid para o próximo diff */ ]
}
```
`resolutions` possíveis: `server-wins` | `server-wins-forbidden`.

## Erros
| Código | Quando |
|---|---|
| 400 | JSON inválido ou schema fora dos limites (`details[]` com issues) |
| 401 | Sem/inválido Bearer |
| 413 | Quota de mídia excedida (upload, 100 MB/user — B7) |
| 500 | Erro interno |

## IDs
- Servidor: `id_collection`/`id_music` INTEGER (interno).
- Cliente: `client_uuid` (gerado no app; legado recebe uuid no backfill).
- O app web continua exibindo via offsets (custom música = id+1M etc.) —
  inalterado.

## Ciclo de vida
- Delete = tombstone (`deleted_at` ms). Físico só após **30 dias** (purge no
  boot do servidor, B5).
- Quota: 100 MB/owner (soma `files.size` de músicas vivas; tombstones não
  somam, B12). Config via `CUSTOM_QUOTA_MB`.
