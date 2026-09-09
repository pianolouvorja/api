-- 017: preenchimento dos assets reais do acervo para as categorias Infantis (98)
-- e Doxologia (99) — áudios vocais/PB, covers e letras.
-- Complementa a 016 (estrutura) com os dados reais: 67 vocais, 45 PB, 5 covers,
-- letras importadas do acervo (import-upstream.ts já grava em lyrics).
-- Tudo idempotente (só atualiza se vazio).

-- Covers: url + tamanho real
UPDATE files SET url = 'covers/pessoas.jpg',        size = 19848 WHERE id_file = 90001 AND IFNULL(url,'') = '';
UPDATE files SET url = 'covers/oracao.jpg',         size = 16033 WHERE id_file = 90002 AND IFNULL(url,'') = '';
UPDATE files SET url = 'covers/dinheiro.jpg',       size = 20961 WHERE id_file = 90003 AND IFNULL(url,'') = '';
UPDATE files SET url = 'covers/jesus_criancas.jpg', size = 22801 WHERE id_file = 90004 AND IFNULL(url,'') = '';
UPDATE files SET url = 'covers/igreja.jpg',         size = 16096 WHERE id_file = 90005 AND IFNULL(url,'') = '';

-- Áudios vocais: url = caminho canônico (o tamanho real é gravado pelo espelho)
UPDATE files SET url = 'musics/pt/' || id_file || '.mp3'
WHERE id_file BETWEEN 90101 AND 90167 AND IFNULL(url,'') = '';

-- Playback (PB): files 990101..990145 (criados pelo script do acervo)
UPDATE files SET url = 'musics/pt/' || (id_file - 900000) || 'i.mp3'
WHERE id_file BETWEEN 990101 AND 990167 AND IFNULL(url,'') = '';
