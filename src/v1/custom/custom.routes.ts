import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { getDb } from '../../db/connection.js'
import {
  CreateCustomCollectionSchema,
  CreateCustomLyricSchema,
  CreateCustomMusicSchema,
  CustomCollectionSchema,
  CustomCollectionsListResponseSchema,
  CustomLyricSchema,
  CustomLyricsListResponseSchema,
  CustomMusicSchema,
  CustomMusicsListResponseSchema,
  ImportSljaResponseSchema,
  UpdateCustomCollectionSchema,
  UpdateCustomLyricSchema,
  UpdateCustomMusicSchema,
} from './custom.schemas.js'

const customRoutes = new OpenAPIHono()

// ============================================
// Collections
// ============================================

const listCollectionsRoute = createRoute({
  method: 'get',
  path: '/collections',
  tags: ['custom'],
  description: 'Lista todas as coletâneas customizadas (Minhas Coletâneas)',
  responses: {
    200: {
      content: { 'application/json': { schema: CustomCollectionsListResponseSchema } },
      description: 'Lista de coletâneas',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(listCollectionsRoute, (c) => {
  try {
    const db = getDb()
    const collections = db
      .prepare(
        `SELECT cc.*, COUNT(cm.id_music) as musics_count
         FROM custom_collections cc
         LEFT JOIN custom_musics cm ON cm.id_collection = cc.id_collection
         GROUP BY cc.id_collection
         ORDER BY cc.updated_at DESC`,
      )
      .all() as any[]

    return c.json(
      {
        data: collections,
        meta: {
          total: collections.length,
          per_page: collections.length,
          current_page: 1,
          last_page: 1,
        },
      },
      200,
    )
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao listar coletâneas' }, 500)
  }
})

const createCollectionRoute = createRoute({
  method: 'post',
  path: '/collections',
  tags: ['custom'],
  description: 'Cria uma nova coletânea customizada',
  request: {
    body: {
      content: { 'application/json': { schema: CreateCustomCollectionSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: CustomCollectionSchema } },
      description: 'Coletânea criada',
    },
    400: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Dados inválidos',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(createCollectionRoute, (c) => {
  try {
    const body = c.req.valid('json')
    const db = getDb()

    const result = db
      .prepare(
        `INSERT INTO custom_collections (name, description) VALUES (?, ?)`,
      )
      .run(body.name, body.description ?? null)

    const collection = db
      .prepare(`SELECT * FROM custom_collections WHERE id_collection = ?`)
      .get(result.lastInsertRowid) as any

    return c.json({ ...collection, musics_count: 0 }, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao criar coletânea' }, 500)
  }
})

const getCollectionRoute = createRoute({
  method: 'get',
  path: '/collections/{id}',
  tags: ['custom'],
  description: 'Detalhe de uma coletânea customizada',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da coletânea', example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CustomCollectionSchema } },
      description: 'Coletânea encontrada',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Coletânea não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(getCollectionRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const db = getDb()

    const collection = db
      .prepare(
        `SELECT cc.*, COUNT(cm.id_music) as musics_count
         FROM custom_collections cc
         LEFT JOIN custom_musics cm ON cm.id_collection = cc.id_collection
         WHERE cc.id_collection = ?
         GROUP BY cc.id_collection`,
      )
      .get(parseInt(id, 10)) as any

    if (!collection) {
      return c.json({ error: 'Coletânea não encontrada' }, 404)
    }

    return c.json(collection, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao buscar coletânea' }, 500)
  }
})

const updateCollectionRoute = createRoute({
  method: 'put',
  path: '/collections/{id}',
  tags: ['custom'],
  description: 'Atualiza uma coletânea customizada',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da coletânea', example: '1' }),
    }),
    body: {
      content: { 'application/json': { schema: UpdateCustomCollectionSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CustomCollectionSchema } },
      description: 'Coletânea atualizada',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Coletânea não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(updateCollectionRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const db = getDb()

    const collection = db
      .prepare(`SELECT * FROM custom_collections WHERE id_collection = ?`)
      .get(parseInt(id, 10)) as any

    if (!collection) {
      return c.json({ error: 'Coletânea não encontrada' }, 404)
    }

    db.prepare(
      `UPDATE custom_collections
       SET name = ?, description = ?, cover_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id_collection = ?`,
    ).run(body.name ?? collection.name, body.description ?? collection.description, body.cover_url !== undefined ? body.cover_url : collection.cover_url, parseInt(id, 10))

    const updated = db
      .prepare(
        `SELECT cc.*, COUNT(cm.id_music) as musics_count
         FROM custom_collections cc
         LEFT JOIN custom_musics cm ON cm.id_collection = cc.id_collection
         WHERE cc.id_collection = ?
         GROUP BY cc.id_collection`,
      )
      .get(parseInt(id, 10)) as any

    return c.json(updated, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao atualizar coletânea' }, 500)
  }
})

const deleteCollectionRoute = createRoute({
  method: 'delete',
  path: '/collections/{id}',
  tags: ['custom'],
  description: 'Remove uma coletânea customizada (cascade em músicas)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da coletânea', example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
      description: 'Coletânea removida',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Coletânea não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(deleteCollectionRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const db = getDb()

    const collection = db
      .prepare(`SELECT * FROM custom_collections WHERE id_collection = ?`)
      .get(parseInt(id, 10)) as any

    if (!collection) {
      return c.json({ error: 'Coletânea não encontrada' }, 404)
    }

    db.prepare(`DELETE FROM custom_collections WHERE id_collection = ?`).run(parseInt(id, 10))

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao remover coletânea' }, 500)
  }
})

// ============================================
// Musics
// ============================================

const listMusicsRoute = createRoute({
  method: 'get',
  path: '/collections/{id}/musics',
  tags: ['custom'],
  description: 'Lista músicas de uma coletânea customizada',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da coletânea', example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CustomMusicsListResponseSchema } },
      description: 'Lista de músicas',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(listMusicsRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const db = getDb()

    const musics = db
      .prepare(
        `SELECT cm.*,
                f_audio.url as audio_url,
                f_inst.url as instrumental_url,
                f_img.url as image_url,
                f_img.image_position as image_position
         FROM custom_musics cm
         LEFT JOIN files f_audio ON cm.id_file_audio = f_audio.id_file
         LEFT JOIN files f_inst ON cm.id_file_instrumental = f_inst.id_file
         LEFT JOIN files f_img ON cm.id_file_image = f_img.id_file
         WHERE cm.id_collection = ?
         ORDER BY cm.name`,
      )
      .all(parseInt(id, 10)) as any[]

    return c.json(
      {
        data: musics,
        meta: {
          total: musics.length,
          per_page: musics.length,
          current_page: 1,
          last_page: 1,
        },
      },
      200,
    )
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao listar músicas' }, 500)
  }
})

const createMusicRoute = createRoute({
  method: 'post',
  path: '/collections/{id}/musics',
  tags: ['custom'],
  description: 'Cria uma nova música em uma coletânea customizada',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da coletânea', example: '1' }),
    }),
    body: {
      content: { 'application/json': { schema: CreateCustomMusicSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: CustomMusicSchema } },
      description: 'Música criada',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Coletânea não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(createMusicRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const db = getDb()

    const collection = db
      .prepare(`SELECT * FROM custom_collections WHERE id_collection = ?`)
      .get(parseInt(id, 10)) as any

    if (!collection) {
      return c.json({ error: 'Coletânea não encontrada' }, 404)
    }

    const result = db
      .prepare(
        `INSERT INTO custom_musics (id_collection, name, lyric, auxiliary_lyric, id_file_audio, id_file_instrumental, id_file_image, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        parseInt(id, 10),
        body.name,
        body.lyric ?? null,
        body.auxiliary_lyric ?? null,
        body.id_file_audio ?? null,
        body.id_file_instrumental ?? null,
        body.id_file_image ?? null,
        body.duration ?? null,
      )

    const music = db
      .prepare(`SELECT * FROM custom_musics WHERE id_music = ?`)
      .get(result.lastInsertRowid) as any

    return c.json(music, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao criar música' }, 500)
  }
})

const getMusicRoute = createRoute({
  method: 'get',
  path: '/musics/{id}',
  tags: ['custom'],
  description: 'Detalhe de uma música customizada com estrofes',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da música', example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CustomMusicSchema } },
      description: 'Música encontrada',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Música não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(getMusicRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const db = getDb()

    const music = db
      .prepare(
        `SELECT cm.*,
                f_audio.url as audio_url,
                f_inst.url as instrumental_url,
                f_img.url as image_url,
                f_img.image_position as image_position
         FROM custom_musics cm
         LEFT JOIN files f_audio ON cm.id_file_audio = f_audio.id_file
         LEFT JOIN files f_inst ON cm.id_file_instrumental = f_inst.id_file
         LEFT JOIN files f_img ON cm.id_file_image = f_img.id_file
         WHERE cm.id_music = ?`,
      )
      .get(parseInt(id, 10)) as any

    if (!music) {
      return c.json({ error: 'Música não encontrada' }, 404)
    }

    // Estrofes
    const lyrics = db
      .prepare(
        `SELECT cl.*,
                f_img.url as image_url,
                f_img.image_position as image_position
         FROM custom_lyrics cl
         LEFT JOIN files f_img ON cl.id_file_image = f_img.id_file
         WHERE cl.id_music = ?
         ORDER BY cl."order" ASC`,
      )
      .all(parseInt(id, 10)) as any[]

    return c.json({ ...music, lyrics }, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao buscar música' }, 500)
  }
})

const updateMusicRoute = createRoute({
  method: 'put',
  path: '/musics/{id}',
  tags: ['custom'],
  description: 'Atualiza uma música customizada',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da música', example: '1' }),
    }),
    body: {
      content: { 'application/json': { schema: UpdateCustomMusicSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CustomMusicSchema } },
      description: 'Música atualizada',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Música não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(updateMusicRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const db = getDb()

    const music = db
      .prepare(`SELECT * FROM custom_musics WHERE id_music = ?`)
      .get(parseInt(id, 10)) as any

    if (!music) {
      return c.json({ error: 'Música não encontrada' }, 404)
    }

    db.prepare(
      `UPDATE custom_musics
       SET name = ?, lyric = ?, auxiliary_lyric = ?, id_file_audio = ?, id_file_instrumental = ?, id_file_image = ?, duration = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id_music = ?`,
    ).run(
      body.name ?? music.name,
      body.lyric ?? music.lyric,
      body.auxiliary_lyric ?? music.auxiliary_lyric,
      body.id_file_audio ?? music.id_file_audio,
      body.id_file_instrumental ?? music.id_file_instrumental,
      body.id_file_image ?? music.id_file_image,
      body.duration ?? music.duration,
      parseInt(id, 10),
    )

    const updated = db
      .prepare(
        `SELECT cm.*,
                f_audio.url as audio_url,
                f_inst.url as instrumental_url,
                f_img.url as image_url,
                f_img.image_position as image_position
         FROM custom_musics cm
         LEFT JOIN files f_audio ON cm.id_file_audio = f_audio.id_file
         LEFT JOIN files f_inst ON cm.id_file_instrumental = f_inst.id_file
         LEFT JOIN files f_img ON cm.id_file_image = f_img.id_file
         WHERE cm.id_music = ?`,
      )
      .get(parseInt(id, 10)) as any

    return c.json(updated, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao atualizar música' }, 500)
  }
})

const deleteMusicRoute = createRoute({
  method: 'delete',
  path: '/musics/{id}',
  tags: ['custom'],
  description: 'Remove uma música customizada (cascade em estrofes)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da música', example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
      description: 'Música removida',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Música não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(deleteMusicRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const db = getDb()

    const music = db
      .prepare(`SELECT * FROM custom_musics WHERE id_music = ?`)
      .get(parseInt(id, 10)) as any

    if (!music) {
      return c.json({ error: 'Música não encontrada' }, 404)
    }

    db.prepare(`DELETE FROM custom_musics WHERE id_music = ?`).run(parseInt(id, 10))

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao remover música' }, 500)
  }
})

// ============================================
// Lyrics (estrofes)
// ============================================

const listLyricsRoute = createRoute({
  method: 'get',
  path: '/musics/{id}/lyrics',
  tags: ['custom'],
  description: 'Lista estrofes de uma música customizada',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da música', example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CustomLyricsListResponseSchema } },
      description: 'Lista de estrofes',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(listLyricsRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const db = getDb()

    const lyrics = db
      .prepare(
        `SELECT cl.*,
                f_img.url as image_url,
                f_img.image_position as image_position
         FROM custom_lyrics cl
         LEFT JOIN files f_img ON cl.id_file_image = f_img.id_file
         WHERE cl.id_music = ?
         ORDER BY cl."order" ASC`,
      )
      .all(parseInt(id, 10)) as any[]

    return c.json({ data: lyrics }, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao listar estrofes' }, 500)
  }
})

const createLyricRoute = createRoute({
  method: 'post',
  path: '/musics/{id}/lyrics',
  tags: ['custom'],
  description: 'Cria uma nova estrofe em uma música customizada',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da música', example: '1' }),
    }),
    body: {
      content: { 'application/json': { schema: CreateCustomLyricSchema } },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: CustomLyricSchema } },
      description: 'Estrofe criada',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Música não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(createLyricRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const db = getDb()

    const music = db
      .prepare(`SELECT * FROM custom_musics WHERE id_music = ?`)
      .get(parseInt(id, 10)) as any

    if (!music) {
      return c.json({ error: 'Música não encontrada' }, 404)
    }

    // Se order não fornecida, pegar próxima
    let order = body.order
    if (order === undefined) {
      const last = db
        .prepare(`SELECT MAX("order") as max_order FROM custom_lyrics WHERE id_music = ?`)
        .get(parseInt(id, 10)) as any
      order = (last.max_order || 0) + 1
    }

    const result = db
      .prepare(
        `INSERT INTO custom_lyrics (id_music, lyric, aux_lyric, id_file_image, time, instrumental_time, show_slide, "order")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        parseInt(id, 10),
        body.lyric,
        body.aux_lyric ?? null,
        body.id_file_image ?? null,
        body.time ?? '00:00',
        body.instrumental_time ?? '00:00',
        body.show_slide ?? 1,
        order,
      )

    const lyric = db
      .prepare(`SELECT * FROM custom_lyrics WHERE id_lyric = ?`)
      .get(result.lastInsertRowid) as any

    return c.json(lyric, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao criar estrofe' }, 500)
  }
})

const updateLyricRoute = createRoute({
  method: 'put',
  path: '/lyrics/{id}',
  tags: ['custom'],
  description: 'Atualiza uma estrofe',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da estrofe', example: '1' }),
    }),
    body: {
      content: { 'application/json': { schema: UpdateCustomLyricSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: CustomLyricSchema } },
      description: 'Estrofe atualizada',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Estrofe não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(updateLyricRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const db = getDb()

    const lyric = db
      .prepare(`SELECT * FROM custom_lyrics WHERE id_lyric = ?`)
      .get(parseInt(id, 10)) as any

    if (!lyric) {
      return c.json({ error: 'Estrofe não encontrada' }, 404)
    }

    db.prepare(
      `UPDATE custom_lyrics
       SET lyric = ?, aux_lyric = ?, id_file_image = ?, time = ?, instrumental_time = ?, show_slide = ?, "order" = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id_lyric = ?`,
    ).run(
      body.lyric ?? lyric.lyric,
      body.aux_lyric ?? lyric.aux_lyric,
      body.id_file_image ?? lyric.id_file_image,
      body.time ?? lyric.time,
      body.instrumental_time ?? lyric.instrumental_time,
      body.show_slide ?? lyric.show_slide,
      body.order ?? lyric.order,
      parseInt(id, 10),
    )

    const updated = db
      .prepare(`SELECT * FROM custom_lyrics WHERE id_lyric = ?`)
      .get(parseInt(id, 10)) as any

    return c.json(updated, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao atualizar estrofe' }, 500)
  }
})

const deleteLyricRoute = createRoute({
  method: 'delete',
  path: '/lyrics/{id}',
  tags: ['custom'],
  description: 'Remove uma estrofe',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'ID da estrofe', example: '1' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
      description: 'Estrofe removida',
    },
    404: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Estrofe não encontrada',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(deleteLyricRoute, (c) => {
  try {
    const { id } = c.req.valid('param')
    const db = getDb()

    const lyric = db
      .prepare(`SELECT * FROM custom_lyrics WHERE id_lyric = ?`)
      .get(parseInt(id, 10)) as any

    if (!lyric) {
      return c.json({ error: 'Estrofe não encontrada' }, 404)
    }

    db.prepare(`DELETE FROM custom_lyrics WHERE id_lyric = ?`).run(parseInt(id, 10))

    return c.json({ success: true }, 200)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao remover estrofe' }, 500)
  }
})

// ============================================
// Files — upload de mídia custom (áudio/imagens de .slja)
// Salva em media/custom/{audio|imagens}/ e registra na tabela files.
// Servido depois via GET /file/custom/... (compat.ts).
// ============================================

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CUSTOM_MEDIA_DIR = join(process.cwd(), 'media', 'custom')

const uploadCustomFileRoute = createRoute({
  method: 'post',
  path: '/files',
  tags: ['custom'],
  description: 'Upload de arquivo de mídia custom (áudio ou imagem) para uso em músicas/coletâneas',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.any().describe('Arquivo (mp3, png, jpg, bmp...)'),
            kind: z.enum(['audio', 'imagens']).optional().describe('Subpasta de destino'),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            id_file: z.number(),
            url: z.string(),
            name: z.string(),
            size: z.number(),
          }),
        },
      },
      description: 'Arquivo salvo e registrado',
    },
    400: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Arquivo ausente ou inválido',
    },
    500: {
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
      description: 'Erro interno',
    },
  },
})

customRoutes.openapi(uploadCustomFileRoute, async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    const kindRaw = formData.get('kind') ?? 'imagens'
    const kind = kindRaw === 'audio' ? 'audio' : 'imagens'

    if (!(file instanceof File)) {
      return c.json({ error: 'Campo "file" ausente ou inválido' }, 400)
    }

    // Sanitiza nome: mantém basename, remove separadores e caracteres perigosos
    const safeName = file.name
      .split(/[/\\]/)
      .pop()!
      .replace(/[^a-zA-Z0-9._\- ()]/g, '_')
    if (!safeName || safeName === '.') {
      return c.json({ error: 'Nome de arquivo inválido' }, 400)
    }

    const destDir = join(CUSTOM_MEDIA_DIR, kind)
    mkdirSync(destDir, { recursive: true })

    // Nome final: id_generator-friendly — prefixa timestamp se já existir
    let finalName = safeName
    const bytes = Buffer.from(await file.arrayBuffer())
    let path = join(destDir, finalName)
    if (existsSync(path)) {
      const dot = safeName.lastIndexOf('.')
      const stem = dot > 0 ? safeName.slice(0, dot) : safeName
      const ext = dot > 0 ? safeName.slice(dot) : ''
      finalName = `${stem}_${Date.now()}${ext}`
      path = join(destDir, finalName)
    }
    writeFileSync(path, bytes)

    const urlPath = `/custom/${kind}/${finalName}`
    const type = kind === 'audio' ? 'audio' : 'image'

    const db = getDb()
    const result = db
      .prepare(`INSERT INTO files (name, path, type, url, size) VALUES (?, ?, ?, ?, ?)`)
      .run(safeName, urlPath, type, urlPath, bytes.length)
    const idFile = Number(result.lastInsertRowid)

    return c.json({ id_file: idFile, url: urlPath, name: safeName, size: bytes.length }, 201)
  } catch (error) {
    console.error(error)
    return c.json({ error: 'Erro ao salvar arquivo' }, 500)
  }
})

export { customRoutes }