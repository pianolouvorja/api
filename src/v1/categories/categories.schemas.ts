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
