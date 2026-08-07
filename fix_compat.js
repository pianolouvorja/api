const fs = require('fs');
let content = fs.readFileSync('src/routes/compat.ts', 'utf-8');

// Trocar export function createCompatRoutes(app: Hono) por const compatRoutes = new Hono();
content = content.replace(/export function createCompatRoutes\(app: Hono\) \{/g, "export const compatRoutes = new Hono();");

// No final do arquivo, o fechamento da função (}) precisa sair.
// E todas as instâncias de "app.get(" viram "compatRoutes.get("
content = content.replace(/app\.get\(/g, "compatRoutes.get(");

// Tirar a ultima chave do arquivo "}" 
content = content.replace(/\}\s*$/, "");

fs.writeFileSync('src/routes/compat.ts', content);
