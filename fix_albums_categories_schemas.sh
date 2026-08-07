#!/bin/bash
cat << 'ROUTE' > src/v1/albums/albums.schemas.ts
import { z } from "@hono/zod-openapi";

export const AlbumDetailSchema = z.object({
  id_album: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Nosso Sol é Jesus" }),
  url_image: z.string().nullable().openapi({ example: "https://api.louvorja.com.br/file/covers/1992.bmp" }),
});

export const AlbumsListResponseSchema = z.object({
  current_page: z.number().openapi({ example: 1 }),
  per_page: z.number().openapi({ example: 20 }),
  total: z.number().openapi({ example: 700 }),
  data: z.array(AlbumDetailSchema),
});
ROUTE

cat << 'ROUTE' > src/v1/categories/categories.schemas.ts
import { z } from "@hono/zod-openapi";

export const CategoryDetailSchema = z.object({
  id_category: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Diversas" }),
  albums: z.array(z.number()).openapi({ example: [674, 683] }),
});

export const CategoriesListResponseSchema = z.object({
  current_page: z.number().openapi({ example: 1 }),
  per_page: z.number().openapi({ example: 20 }),
  total: z.number().openapi({ example: 50 }),
  data: z.array(CategoryDetailSchema),
});
ROUTE
