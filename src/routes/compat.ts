import { Hono } from "hono";
import { getDb } from "../db/connection.js";

export const compatRoutes = new Hono();

// Legado: Retorna apenas o raw do banco (sem paginação) para sync offline do App
compatRoutes.get("/json_db/musics", (c) => {
  const lang = c.req.query("lang") || "pt";
  const db = getDb();
  const res = db
    .prepare("SELECT * FROM musics WHERE id_language = ?")
    .all(lang);
  return c.json(res);
});

compatRoutes.get("/json_db/albums", (c) => {
  const lang = c.req.query("lang") || "pt";
  const db = getDb();
  const res = db
    .prepare("SELECT * FROM albums WHERE id_language = ?")
    .all(lang);
  return c.json(res);
});

// Legado: Rotas públicas antigas que devolvem com campo "data" pra clientes web legados
compatRoutes.get("/:lang/musics", (c) => {
  const lang = c.req.param("lang") || "pt";
  const db = getDb();
  const res = db
    .prepare("SELECT * FROM musics WHERE id_language = ?")
    .all(lang);
  return c.json({ data: res });
});

compatRoutes.get("/:lang/albums", (c) => {
  const lang = c.req.param("lang") || "pt";
  const db = getDb();
  const res = db
    .prepare("SELECT * FROM albums WHERE id_language = ?")
    .all(lang);
  return c.json({ data: res });
});

compatRoutes.get("/:lang/categories", (c) => {
  const lang = c.req.param("lang") || "pt";
  const db = getDb();
  const res = db
    .prepare("SELECT * FROM categories WHERE id_language = ?")
    .all(lang);
  return c.json({ data: res });
});
