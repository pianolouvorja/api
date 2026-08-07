const fs = require('fs');

function patchCompatRoutes(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /const compatRoutes = createCompatRoutes\(app\);/s,
    `const compatRoutes = createCompatRoutes\(app as Hono\);`
  );
  fs.writeFileSync(filePath, content);
}

patchCompatRoutes('src/app.ts');
