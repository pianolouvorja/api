const fs = require('fs');

function fixMusicsId(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /const row = db\.prepare\("SELECT \* FROM musics WHERE id_music \= \? AND id_language \= \?"\)\.get\(idMusic, lang\);[\s\S]*?if \(!row\) \{/s,
    `const row = db.prepare("SELECT m.*, f_image.url as url_image FROM musics m LEFT JOIN files f_image ON m.id_file_image = f_image.id_file WHERE m.id_music = ? AND m.id_language = ?").get(idMusic, lang);\n    if (!row) {`
  );
  fs.writeFileSync(filePath, content);
}

function fixAlbumsId(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /const row = db\.prepare\("SELECT \* FROM albums WHERE id_album \= \? AND id_language \= \?"\)\.get\(idAlbum, lang\);[\s\S]*?if \(!row\) \{/s,
    `const row = db.prepare("SELECT a.*, f_image.url as url_image FROM albums a LEFT JOIN files f_image ON a.id_file_image = f_image.id_file WHERE a.id_album = ? AND a.id_language = ?").get(idAlbum, lang);\n    if (!row) {`
  );
  fs.writeFileSync(filePath, content);
}

function fixCategoriesId(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /const row = db\.prepare\("SELECT \* FROM categories WHERE id_category \= \? AND id_language \= \?"\)\.get\(idCategory, lang\);[\s\S]*?if \(!row\) \{/s,
    `const row = db.prepare("SELECT c.*, f_image.url as url_image FROM categories c LEFT JOIN files f_image ON c.id_file_image = f_image.id_file WHERE c.id_category = ? AND c.id_language = ?").get(idCategory, lang);\n    if (!row) {`
  );
  fs.writeFileSync(filePath, content);
}

fixMusicsId('src/v1/musics/musics.routes.ts');
fixAlbumsId('src/v1/albums/albums.routes.ts');
fixCategoriesId('src/v1/categories/categories.routes.ts');
