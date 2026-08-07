const fs = require('fs');

function fixMusics(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Trocar o map fajuto pela query SQL de verdade com LEFT JOIN
  const query = `
    SELECT 
      m.*,
      f_image.url as url_image
    FROM musics m
    LEFT JOIN files f_image ON m.id_file_image = f_image.id_file
    WHERE m.id_language = ? 
    LIMIT ? OFFSET ?
  `.trim().replace(/\n\s+/g, ' '); // Uma linha pra nao quebrar sed

  content = content.replace(
    /const res = db\.prepare\("SELECT \* FROM musics WHERE id_language = \? LIMIT \? OFFSET \?"\)\.all\(lang, perPage, offset\)\.map.*?\);/s,
    `const res = db.prepare("${query}").all(lang, perPage, offset);`
  );
  fs.writeFileSync(filePath, content);
}

function fixAlbums(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const query = `
    SELECT 
      a.*,
      f_image.url as url_image
    FROM albums a
    LEFT JOIN files f_image ON a.id_file_image = f_image.id_file
    WHERE a.id_language = ? 
    LIMIT ? OFFSET ?
  `.trim().replace(/\n\s+/g, ' ');

  content = content.replace(
    /const res = db\.prepare\("SELECT \* FROM albums WHERE id_language = \? LIMIT \? OFFSET \?"\)\.all\(lang, perPage, offset\)\.map.*?\);/s,
    `const res = db.prepare("${query}").all(lang, perPage, offset);`
  );
  fs.writeFileSync(filePath, content);
}

function fixCategories(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const query = `
    SELECT 
      c.*,
      f_image.url as url_image
    FROM categories c
    LEFT JOIN files f_image ON c.id_file_image = f_image.id_file
    WHERE c.id_language = ? 
    LIMIT ? OFFSET ?
  `.trim().replace(/\n\s+/g, ' ');

  content = content.replace(
    /const res = db\.prepare\("SELECT \* FROM categories WHERE id_language = \? LIMIT \? OFFSET \?"\)\.all\(lang, perPage, offset\)\.map.*?\);/s,
    `const res = db.prepare("${query}").all(lang, perPage, offset);`
  );
  fs.writeFileSync(filePath, content);
}

fixMusics('src/v1/musics/musics.routes.ts');
fixAlbums('src/v1/albums/albums.routes.ts');
fixCategories('src/v1/categories/categories.routes.ts');
