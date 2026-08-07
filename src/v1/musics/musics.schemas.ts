import { z } from "@hono/zod-openapi";

export const MusicDetailSchema = z.object({
  id_music: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Nosso Sol é Jesus" }),
  url_image: z
    .string()
    .nullable()
    .openapi({
      example: "https://api.louvorja.com.br/file/images/hasd_132B.jpg",
    }),
  has_music: z.boolean().openapi({ example: true }),
  has_instrumental_music: z
    .union([z.literal(0), z.literal(1)])
    .openapi({ example: 1 }),
  has_lyrics: z.boolean().openapi({ example: true }),
});

export const MusicsListResponseSchema = z.object({
  current_page: z.number().openapi({ example: 1 }),
  per_page: z.number().openapi({ example: 20 }),
  total: z.number().openapi({ example: 695 }),
  data: z.array(MusicDetailSchema),
});
