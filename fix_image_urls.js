const fs = require('fs');

// Função para injetar mapeamento manual nas rotas pra formatar URL
function patchRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Transformar os dados puros do banco na estrutura esperada
  content = content.replace(
    /const res = db\.prepare\((.*?)\)\.all\(lang, perPage, offset\);/s,
    `const dbRes = db.prepare($1).all(lang, perPage, offset) as any[];
    const res = dbRes.map(row => ({
      ...row,
      url_image: row.id_file_image ? \`https://cdn.louvorja.com.br/images/\${row.id_file_image}\` : null
    }));`
  );
  
  fs.writeFileSync(filePath, content);
}

patchRoute('src/v1/musics/musics.routes.ts');
patchRoute('src/v1/albums/albums.routes.ts');
patchRoute('src/v1/categories/categories.routes.ts');

