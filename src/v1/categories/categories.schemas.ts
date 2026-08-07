import { z } from "@hono/zod-openapi";

// === Album aninhado dentro de categoria ===
const AlbumInCategorySchema = z.object({
  id_album: z.number().openapi({ example: 727 }),
  name: z.string().openapi({ example: "Meu Lugar no Mundo" }),
  color: z.string().nullable().openapi({ example: "#1D1D1B" }),
  url_image: z.string().nullable().openapi({ example: "/covers/2026.bmp" }),
  subtitle: z.string().nullable().openapi({ example: "2026" }),
  order: z.number().nullable().openapi({ example: 90 }),
});

// === Lista e detalhe usam o mesmo shape (paridade: pt_categories) ===
export const CategorySchema = z.object({
  id_category: z.number().openapi({ example: 6 }),
  name: z.string().openapi({ example: "CDs Oficiais/Ano" }),
  slug: z.string().openapi({ example: "aym" }),
  order: z.number().openapi({ example: 10 }),
  albums: z.array(AlbumInCategorySchema),
});

// Categories NAO tem wrapper de paginacao — retorna array direto
export const CategoriesListResponseSchema = z.array(CategorySchema);
