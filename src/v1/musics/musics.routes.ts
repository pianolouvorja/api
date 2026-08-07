import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../../db/connection.js";
import {
  MusicDetailSchema,
  MusicsListResponseSchema,
} from "./musics.schemas.js";

const musicsRoutes = new OpenAPIHono();

const listMusicsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["musics"],
  description: "Lista todas as músicas com paginação e filtro por idioma",
  request: {
    query: z.object({
      lang: z
        .string()
        .openapi({ description: "Idioma (ex: pt, es)", example: "pt" }),
      page: z
        .string()
        .optional()
        .openapi({ description: "Página atual (default: 1)", example: "1" }),
      per_page: z
        .string()
        .optional()
        .openapi({
          description: "Itens por página (default: 20)",
          example: "20",
        }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: MusicsListResponseSchema } },
      description: "Lista de músicas com paginação",
    },
    500: {
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
      description: "Erro interno",
    },
  },
});

musicsRoutes.openapi(listMusicsRoute, (c) => {
  const { lang, page, per_page } = c.req.valid("query");

  const pageNum = parseInt(page || "1", 10);
  const perPage = parseInt(per_page || "20", 10);
  const offset = (pageNum - 1) * perPage;

  try {
    const db = getDb();
    const { count } = db
      .prepare(`SELECT COUNT(*) as count FROM musics WHERE id_language = ?`)
      .get(lang) as { count: number };

    const musics = db
      .prepare(
        `SELECT m.*, f.url as url_image FROM musics m LEFT JOIN files f ON m.id_file_image = f.id_file WHERE m.id_language = ? LIMIT ? OFFSET ?`,
      )
      .all(lang, perPage, offset) as any[];

    return c.json(
      {
        current_page: pageNum,
        per_page: perPage,
        total: count,
        data: musics.map((m) => ({
          id_music: m.id_music,
          name: m.name,
          url_image: m.url_image || null,
          has_music: m.has_music === 1,
          has_instrumental_music: (m.has_instrumental_music === 1 ? 1 : 0) as
            | 0
            | 1,
          has_lyrics: m.has_lyrics === 1,
        })),
      },
      200,
    );
  } catch (error) {
    console.error(error);
    return c.json({ error: "Erro ao buscar músicas" }, 500);
  }
});

const getMusicRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["musics"],
  description: "Busca uma música pelo ID",
  request: {
    params: z.object({
      id: z.string().openapi({ description: "ID da Música", example: "1" }),
    }),
    query: z.object({
      lang: z
        .string()
        .openapi({ description: "Idioma (ex: pt, es)", example: "pt" }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: MusicDetailSchema } },
      description: "Detalhes da música",
    },
    404: {
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
      description: "Música não encontrada",
    },
    500: {
      content: {
        "application/json": { schema: z.object({ error: z.string() }) },
      },
      description: "Erro interno",
    },
  },
});

musicsRoutes.openapi(getMusicRoute, (c) => {
  const { id } = c.req.valid("param");
  const { lang } = c.req.valid("query");

  try {
    const db = getDb();
    const music = db
      .prepare(
        `SELECT m.*, f.url as url_image FROM musics m LEFT JOIN files f ON m.id_file_image = f.id_file WHERE m.id_music = ? AND m.id_language = ?`,
      )
      .get(parseInt(id, 10), lang) as any;

    if (!music) {
      return c.json({ error: "Música não encontrada" }, 404);
    }

    return c.json(
      {
        id_music: music.id_music,
        name: music.name,
        url_image: music.url_image || null,
        has_music: music.has_music === 1,
        has_instrumental_music: (music.has_instrumental_music === 1 ? 1 : 0) as
          | 0
          | 1,
        has_lyrics: music.has_lyrics === 1,
      },
      200,
    );
  } catch (error) {
    console.error(error);
    return c.json({ error: "Erro ao buscar música" }, 500);
  }
});

export { musicsRoutes };
