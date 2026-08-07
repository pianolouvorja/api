import { z } from "@hono/zod-openapi";

// === LISTA (GET /v1/albums) ===
export const AlbumListItemSchema = z.object({
  id_album: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Nosso Sol é Jesus" }),
  color: z.string().nullable().openapi({ example: "#C2442D" }),
  url_image: z.string().nullable().openapi({ example: "/covers/1992.bmp" }),
});

export const AlbumsListResponseSchema = z.object({
  data: z.array(AlbumListItemSchema),
  meta: z.object({
    total: z.number().openapi({ example: 69 }),
    per_page: z.number().openapi({ example: 50 }),
    current_page: z.number().openapi({ example: 1 }),
    last_page: z.number().openapi({ example: 2 }),
  }),
});

// === DETALHE (GET /v1/albums/:id) — paridade com /json_db/album_{id} ===

const MusicInAlbumSchema = z.object({
  id_music: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Nosso Sol é Jesus" }),
  has_instrumental_music: z
    .union([z.literal(0), z.literal(1)])
    .openapi({ example: 0 }),
  duration: z.string().nullable().openapi({ example: "00:02:17" }),
  track: z.number().nullable().openapi({ example: 1 }),
});

export const AlbumDetailSchema = z.object({
  id_album: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Nosso Sol é Jesus" }),
  color: z.string().nullable().openapi({ example: "#C2442D" }),
  url_image: z.string().nullable().openapi({ example: "/covers/1992.bmp" }),
  categories: z.array(z.string()).openapi({ example: ["collection.aym"] }),
  musics: z.array(MusicInAlbumSchema),
});
