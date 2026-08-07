import { z } from "@hono/zod-openapi";

export const BibleBookSchema = z.object({
  id_bible_book: z.number().openapi({ example: 1 }),
  name: z.string().openapi({ example: "Gênesis" }),
  chapters: z.number().openapi({ example: 50 }),
});

export const BibleChapterSchema = z.object({
  id_bible_chapter: z.number().openapi({ example: 1 }),
  id_bible_book: z.number().openapi({ example: 1 }),
  chapter: z.number().openapi({ example: 1 }),
  verses: z.array(
    z.object({
      verse: z.number().openapi({ example: 1 }),
      text: z
        .string()
        .openapi({ example: "No princípio, criou Deus os céus e a terra." }),
    }),
  ),
});
