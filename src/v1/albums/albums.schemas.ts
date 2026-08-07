import { z } from "@hono/zod-openapi";

export const AlbumDetailSchema = z.object({
  id_album: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Nosso Sol é Jesus" }),
  url_image: z
    .string()
    .nullable()
    .openapi({ example: "https://api.louvorja.com.br/file/covers/1992.bmp" }),
});

export const AlbumsListResponseSchema = z.object({
  current_page: z.number().openapi({ example: 1 }),
  per_page: z.number().openapi({ example: 20 }),
  total: z.number().openapi({ example: 700 }),
  data: z.array(AlbumDetailSchema),
});
