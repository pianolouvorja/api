const fs = require('fs');

function patchAlbums(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /const res = db\.prepare\(.*?\)\.all\(lang, perPage, offset\);/s,
    `const res = db.prepare("SELECT * FROM albums WHERE id_language = ? LIMIT ? OFFSET ?").all(lang, perPage, offset).map((row: any) => ({...row, url_image: row.id_file_image ? "https://cdn.louvorja.com.br/images/" + row.id_file_image + ".jpg" : null}));`
  );
  fs.writeFileSync(filePath, content);
}

function patchCategories(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /const res = db\.prepare\(.*?\)\.all\(lang, perPage, offset\);/s,
    `const res = db.prepare("SELECT * FROM categories WHERE id_language = ? LIMIT ? OFFSET ?").all(lang, perPage, offset).map((row: any) => ({...row, url_image: row.id_file_image ? "https://cdn.louvorja.com.br/images/" + row.id_file_image + ".jpg" : null}));`
  );
  fs.writeFileSync(filePath, content);
}

patchAlbums('src/v1/albums/albums.routes.ts');
patchCategories('src/v1/categories/categories.routes.ts');
