# CONTEXT.md — pianolouvorja/api

## O Que Existe Hoje

### louvorja/api (upstream — não controlamos)
- **Repo:** github.com/louvorja/api
- **Stack:** PHP 8.3 + Lumen 10 + MySQL
- **URL:** api.louvorja.com.br
- **Auth:** JWT (admin only, endpoints públicos sem auth)
- **Dados:** Hinário Adventista, Louvor JA, Canta Igreja, Vencedores, Bíblia
- **Formato de export:** JSON estático em `/json_db/{file}`
- **Models:** Album, Music, Lyric, File, Language, Category, BibleBook/Verse/Version, Config, OnlineVideo, User

### Nossa VM (onde a API vai rodar)
- **IP:** 137.131.142.73 (Oracle ARM64 Free Tier)
- **CPU:** 4 cores ARM (Ampere A1)
- **RAM:** 24GB
- **Disco:** 200GB (~60GB em uso, 140GB livres)
- **OS:** Linux 6.17.0-1011-oracle
- **Já roda:** piano-site (Nuxt, port 3000), n8n, Tailscale
- **Cloudflare Tunnel:** já configurado e funcionando
- **Docker:** instalado e em uso

### Cloudflare
- DNS gerenciado para pianolouvorja.com.br
- Tunnel ativo (zero ports abertas na VM)
- CDN para assets estáticos
- SSL/TLS automático

### Firebase
- Projeto: pianolouvorja
- Admin SDK já configurado no piano-site
- Auth: Rafael + Ezequias cadastrados

---

## Volume de Dados

### Catálogo (estimativa)
| Tipo | Quantidade | Tamanho |
|------|-----------|---------|
| Hinos (letras) | ~5000+ (3 idiomas) | ~5MB |
| Coletâneas | ~50 | ~100KB |
| Áudio (cantado + playback) | ~10000 arquivos MP3 | ~15GB |
| Imagens (capas + fundos) | ~5000 | ~2GB |
| Bíblia (ACF + NVI) | ~31000 versículos | ~10MB |
| CCB | ~480 hinos | ~1MB (letra) |
| **Total** | | **~17GB** |

### Volume de Tráfego (estimativa)
- ~50 igrejas ativas (estimativa conservadora)
- Cada igreja: ~500 req/culto, 2 cultos/semana
- Total: ~50k req/semana ≈ 7k req/dia
- Pico: domingo manhã (~3k req/hora)
- SQLite + Hono aguenta 10k+ req/s tranquilamente

---

## Schema do Upstream (louvorja/api)

### Tabelas e Relacionamentos

```
languages (1) ──< (N) albums
languages (1) ──< (N) musics
languages (1) ──< (N) lyrics

files (1) ──< (N) albums (id_file_image)
files (1) ──< (N) musics (id_file_music, id_file_instrumental_music, id_file_image)
files (1) ──< (N) lyrics (id_file_image)

albums (N) ──< (N) musics    [via albums_musics]
categories (1) ──< (N) categories_albums (N) ──> (1) albums

musics (1) ──< (N) lyrics
```

### Campos Críticos

**musics:**
- `id_music` — PK
- `name` — título do hino
- `id_file_music` — FK → áudio cantado
- `id_file_instrumental_music` — FK → áudio playback
- `id_language` — "pt", "en", "es"

**lyrics:**
- `id_lyric` — PK
- `id_music` — FK
- `lyric` — texto da estrofe (pode ter múltiplas por hino)
- `order` — ordem das estrofes
- `time` — duração cantado
- `instrumental_time` — duração playback
- `show_slide` — se aparece na projeção

**files:**
- `id_file` — PK
- `name`, `path`, `type` (image/audio/midi)
- URL absoluta ou relativa

### Formato JSON do `/json_db`
O upstream exporta cada tabela como JSON estático:
```
/json_db/manifest           → lista de arquivos + hash
/json_db/albums_pt.json     → todos albums em PT
/json_db/musics_pt.json     → todos hinos em PT
/json_db/lyrics_pt.json     → todas letras em PT
...
```

---

## Fontes Independentes (não-dependem do upstream)

### sda-hymnal NPM
- `npm install sda-hymnal`
- 695 hinos do Hinário Adventista em INGLÊS
- MIT License
- Formato: objeto JSON `{ number, title, lyrics }`
- Importação: script `import-sda-hymnal.mjs` lê o package, insere em `musics` + `lyrics` com `id_language='en'`

### SacCentral (bjaarmy.com)
- 483 MP3 de coral em inglês (do 695 total)
- URL pattern: `https://www.bjaarmy.com/audio/hymns/{number}.mp3`
- Não há API formal — catálogo de URLs hardcoded
- Importação: script cataloga URLs em `files.url`

### frazras/SDA-Hymnal (MIDI)
- 695 arquivos MIDI
- GitHub: github.com/frazras/SDA-Hymnal
- GPL License
- Importação: script baixa ou cataloga URLs raw do GitHub

### CCB (Congregação Cristã no Brasil)
- ~480 hinos tradicionais
- Letras disponíveis em sites não-oficiais (hinosccb.com)
- Direitos autorais: CCB é proprietária — pesquisar domínio público
- Sem API conhecida — precisa scraping ou input manual
- Áudio: limitado, alguns sites oferecem

---

## Dependências com Outros Repos

| Repo | Como consome a API | Issue |
|------|-------------------|-------|
| pianolouvorja/app | VITE_URL_DATABASE → API | #66 |
| pianolouvorja/web | VITE_URL_DATABASE → API | #82 |
| pianolouvorja/site | Dashboard lê /v1/admin/stats | #11 |
| pianolouvorja/mobile | Dart const apiUrl → API | (futuro) |

---

## Cron de Importação

```bash
# Todo dia às 04:00 — baixo tráfego
0 4 * * * cd /home/ubuntu/piano-api && docker compose exec api node scripts/import-upstream.mjs >> /var/log/piano-api-import.log 2>&1
```

O script compara hash do manifest. Se nada mudou, termina em <1s.
Se mudou, baixa apenas os arquivos alterados.

---

## Monitoramento

- Health check: `GET https://api.pianolouvorja.com.br/v1/health`
- Logs: `docker compose logs -f api` na VM
- Métricas: `GET /v1/admin/stats` (req/dia, cache hit rate, db_size)
- Alerta: cron job que faz health check a cada 5 min, manda Telegram se falhar
