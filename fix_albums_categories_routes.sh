#!/bin/bash
cat << 'ROUTE' > src/v1/albums/albums.routes.ts
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getDb } from "../../db/connection.js";
import { AlbumsListResponseSchema, AlbumDetailSchema } from "./albums.schemas.js";

const albumsRoutes = new OpenAPIHono();

const listAlbumsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["albums"],
  summary: "Lista todos os álbuns",
  description: "Lista álbuns disponíveis, filtrados por idioma.",
  request: {
    query: z.object({
      lang: z.string().default("pt"),
      page: z.string().default("1"),
      per_page: z.string().default("20"),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: AlbumsListResponseSchema } }, description: "Lista de álbuns paginada" },
    500: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "Erro interno" },
  },
});

albumsRoutes.openapi(listAlbumsRoute, (c) => {
  const { lang, page, per_page } = c.req.valid("query");
  const pageNum = parseInt(page || "1", 10);
  const perPage = parseInt(per_page || "20", 10);
  const offset = (pageNum - 1) * perPage;

  try {
    const db = getDb();
    const { count } = db.prepare(`SELECT COUNT(*) as count FROM albums WHERE id_language = ?`).get(lang) as { count: number };
    const albums = db.prepare(`SELECT id_album, name FROM albums WHERE id_language = ? LIMIT ? OFFSET ?`).all(lang, perPage, offset) as any[];

    return c.json({
      current_page: pageNum,
      per_page: perPage,
      total: count,
      data: albums.map((a) => ({
        id_album: a.id_album,
        name: a.name,
        url_image: null,
      })),
    }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Erro ao buscar álbuns" }, 500);
  }
});

const getAlbumRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["albums"],
  summary: "Busca um álbum pelo ID",
  request: {
    params: z.object({ id: z.string().openapi({ description: "ID do Álbum", example: "1" }) }),
    query: z.object({ lang: z.string().default("pt") }),
  },
  responses: {
    200: { content: { "application/json": { schema: AlbumDetailSchema } }, description: "Detalhes do álbum" },
    404: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "Álbum não encontrado" },
    500: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "Erro interno" },
  },
});

albumsRoutes.openapi(getAlbumRoute, (c) => {
  const { id } = c.req.valid("param");
  const { lang } = c.req.valid("query");

  try {
    const db = getDb();
    const album = db.prepare(`SELECT id_album, name FROM albums WHERE id_album = ? AND id_language = ?`).get(parseInt(id, 10), lang) as any;

    if (!album) {
      return c.json({ error: "Álbum não encontrado" }, 404);
    }

    return c.json({
      id_album: album.id_album,
      name: album.name,
      url_image: null,
    }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Erro ao buscar álbum" }, 500);
  }
});

export { albumsRoutes };
ROUTE

cat << 'ROUTE' > src/v1/categories/categories.routes.ts
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getDb } from "../../db/connection.js";
import { CategoriesListResponseSchema, CategoryDetailSchema } from "./categories.schemas.js";

const categoriesRoutes = new OpenAPIHono();

const listCategoriesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["categories"],
  summary: "Lista todas as categorias",
  description: "Lista as categorias de álbuns disponíveis para um idioma.",
  request: {
    query: z.object({
      lang: z.string().default("pt"),
      page: z.string().default("1"),
      per_page: z.string().default("20"),
    }),
  },
  responses: {
    200: { content: { "application/json": { schema: CategoriesListResponseSchema } }, description: "Lista de categorias paginada" },
    500: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "Erro interno" },
  },
});

categoriesRoutes.openapi(listCategoriesRoute, (c) => {
  const { lang, page, per_page } = c.req.valid("query");
  const pageNum = parseInt(page || "1", 10);
  const perPage = parseInt(per_page || "20", 10);
  const offset = (pageNum - 1) * perPage;

  try {
    const db = getDb();
    const { count } = db.prepare(`SELECT COUNT(*) as count FROM categories WHERE id_language = ?`).get(lang) as { count: number };
    const categories = db.prepare(`SELECT id_category, name FROM categories WHERE id_language = ? LIMIT ? OFFSET ?`).all(lang, perPage, offset) as any[];

    const resultData = categories.map((cat) => {
      // Como não existe id_language em categories_albums, buscamos apenas os álbuns daquela categoria 
      // (a tabela original categories já filtrou o idioma)
      const albumsData = db.prepare(`SELECT id_album FROM categories_albums WHERE id_category = ?`).all(cat.id_category) as { id_album: number }[];
      return {
        id_category: cat.id_category,
        name: cat.name,
        albums: albumsData.map(a => a.id_album)
      };
    });

    return c.json({
      current_page: pageNum,
      per_page: perPage,
      total: count,
      data: resultData
    }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Erro ao buscar categorias" }, 500);
  }
});

const getCategoryRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["categories"],
  summary: "Busca uma categoria pelo ID",
  request: {
    params: z.object({ id: z.string().openapi({ description: "ID da Categoria", example: "1" }) }),
    query: z.object({ lang: z.string().default("pt") }),
  },
  responses: {
    200: { content: { "application/json": { schema: CategoryDetailSchema } }, description: "Detalhes da categoria" },
    404: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "Categoria não encontrada" },
    500: { content: { "application/json": { schema: z.object({ error: z.string() }) } }, description: "Erro interno" },
  },
});

categoriesRoutes.openapi(getCategoryRoute, (c) => {
  const { id } = c.req.valid("param");
  const { lang } = c.req.valid("query");

  try {
    const db = getDb();
    const cat = db.prepare(`SELECT id_category, name FROM categories WHERE id_category = ? AND id_language = ?`).get(parseInt(id, 10), lang) as any;

    if (!cat) {
      return c.json({ error: "Categoria não encontrada" }, 404);
    }

    const albumsData = db.prepare(`SELECT id_album FROM categories_albums WHERE id_category = ?`).all(cat.id_category) as { id_album: number }[];

    return c.json({
      id_category: cat.id_category,
      name: cat.name,
      albums: albumsData.map(a => a.id_album)
    }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Erro ao buscar categoria" }, 500);
  }
});

export { categoriesRoutes };
ROUTE
