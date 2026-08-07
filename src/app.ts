import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { getDbStats } from "./db/connection.js";
import { compatRoutes } from "./routes/compat.js";
import { albumsRoutes } from "./v1/albums/albums.routes.js";
import { bibleRoutes } from "./v1/bible/bible.routes.js";
import { categoriesRoutes } from "./v1/categories/categories.routes.js";
// Rotas OpenAPI (V1)
import { musicsRoutes } from "./v1/musics/musics.routes.js";

// Rotas compativeis (nao-OpenAPI)

import { createRoute, z } from "@hono/zod-openapi";

export function createApp() {
  const app = new OpenAPIHono();

  app.use("*", cors());

  const healthRoute = createRoute({
    method: "get",
    path: "/v1/health",
    tags: ["health"],
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              status: z.string(),
              version: z.string(),
              uptime: z.number(),
              db_size: z.number(),
              tables: z.number(),
            }),
          },
        },
        description: "Healthcheck da API",
      },
    },
  });

  app.openapi(healthRoute, (c) => {
    const stats = getDbStats();
    return c.json(
      {
        status: "ok",
        version: "0.1.0",
        uptime: Math.floor(process.uptime()),
        db_size: stats.sizeBytes,
        tables: stats.tableCount,
      },
      200,
    );
  });

  // Anexar roteadores Zod V1
  app.route("/v1/musics", musicsRoutes);
  app.route("/v1/albums", albumsRoutes);
  app.route("/v1/categories", categoriesRoutes);
  app.route("/", compatRoutes);

  app.route("/v1/bible", bibleRoutes);

  // Registrar especificacao OpenAPI
  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      version: "0.1.0",
      title: "Piano Louvor JA API",
      description:
        "API propria drop-in replacement para api.louvorja.com.br.\n\nFornece catalogo de musicas, hinos, albuns, categorias e biblia.\n\n**Endpoints de compatibilidade** (`/json_db/*`, `/file/*`, `/db/*`) nao aparecem nesta documentacao pois usam path matching dinamico.",
    },
  });

  // Interface Swagger UI
  app.get("/doc", swaggerUI({ url: "/openapi.json" }));

  // Montar rotas compat ao final
  // Bypass temporario de tipagem pro Hono classico

  return app;
}

export default createApp();
