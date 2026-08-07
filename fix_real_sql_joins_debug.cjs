const fs = require('fs');

function checkMusicsId(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  console.log("Trecho no arquivo:");
  console.log(content.match(/const row = db\.prepare\("SELECT.*?\}\);/s)[0]);
}

checkMusicsId('src/v1/musics/musics.routes.ts');
