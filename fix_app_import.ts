import fs from "fs";

let content = fs.readFileSync("src/app.ts", "utf-8");
// Limpar todas as sujeiras de createCompatRoutes que eu deixei no app.ts
content = content.replace(
  /import \{ createCompatRoutes \} from "\.\/routes\/compat\.js";/g,
  "",
);
content = content.replace(/createCompatRoutes\(app\);/g, "");
content = content.replace(
  /import \{ compatRoutes \} from "\.\/routes\/compat\.js";/g,
  "",
);
content = content.replace(/app\.route\("\/", compatRoutes\);/g, "");

// Injetar bonitinho
content = content.replace(
  /import \{ categoriesRoutes \} from "\.\/v1\/categories\/categories\.routes\.js";/,
  'import { categoriesRoutes } from "./v1/categories/categories.routes.js";\nimport { compatRoutes } from "./routes/compat.js";',
);
content = content.replace(
  /app\.route\("\/v1\/categories", categoriesRoutes\);/,
  'app.route("/v1/categories", categoriesRoutes);\n  app.route("/", compatRoutes);',
);

fs.writeFileSync("src/app.ts", content);
