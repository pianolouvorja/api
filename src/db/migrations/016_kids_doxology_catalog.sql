-- Catálogo estrutural compatível com pianolouvorja/app.
INSERT OR IGNORE INTO languages (id_language, name) VALUES ('pt', 'Português');

INSERT OR IGNORE INTO categories (id_category, name, id_language, slug, type, "order")
SELECT 98, 'Infantis', id_language, 'kids', 'collection', 98 FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 'Doxologia', id_language, 'doxology', 'collection', 99 FROM languages WHERE id_language = 'pt';

INSERT OR IGNORE INTO albums (id_album, name, id_language)
SELECT id_album, name, id_language FROM (
  SELECT 9000 AS id_album, 'Infantis' AS name, id_language FROM languages WHERE id_language = 'pt'
  UNION ALL SELECT 9010, 'Entrada da Plataforma', id_language FROM languages WHERE id_language = 'pt'
  UNION ALL SELECT 9011, 'Dízimos e Ofertas', id_language FROM languages WHERE id_language = 'pt'
);

INSERT OR IGNORE INTO categories_albums (id_category, id_album, name, "order", id_language)
SELECT 98, 9000, 'Infantis', 1, id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 9010, 'Entrada da Plataforma', 1, id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 9011, 'Dízimos e Ofertas', 2, id_language FROM languages WHERE id_language = 'pt';

-- =============================================
-- Extensão: catálogo completo Doxologia + Infantis
-- Estrutura sem áudio real: url NULL nos files (nunca inventar placeholder).
-- Playback flag (has_instrumental_music) = 0 até os MP3 do acervo existirem.
-- Duplicatas cross-list (Vinde Meninos, Louvai-O) são intencionais.
-- =============================================

-- Cobertas (url NULL até os JPGs reais chegarem do acervo)
INSERT OR IGNORE INTO files (id_file, name, path, type, url, size, dir, file_name) VALUES
  (90001, 'cover_pessoas',       'covers/pessoas.jpg',        'image', NULL, 0, 'covers', 'pessoas.jpg'),
  (90002, 'cover_oracao',        'covers/oracao.jpg',         'image', NULL, 0, 'covers', 'oracao.jpg'),
  (90003, 'cover_dinheiro',      'covers/dinheiro.jpg',       'image', NULL, 0, 'covers', 'dinheiro.jpg'),
  (90004, 'cover_jesus_criancas','covers/jesus_criancas.jpg', 'image', NULL, 0, 'covers', 'jesus_criancas.jpg'),
  (90005, 'cover_igreja',        'covers/igreja.jpg',         'image', NULL, 0, 'covers', 'igreja.jpg');

UPDATE albums SET id_file_image = 90001 WHERE id_album = 9010 AND id_file_image IS NULL;
UPDATE albums SET id_file_image = 90003 WHERE id_album = 9011 AND id_file_image IS NULL;
UPDATE albums SET id_file_image = 90004 WHERE id_album = 9000 AND id_file_image IS NULL;

-- Álbuns faltantes da Doxologia (cat 99)
INSERT OR IGNORE INTO albums (id_album, name, id_file_image, color, id_language)
SELECT 9012, 'Oração Intercessora', 90002, '#000000', id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 9013, 'Adoração Infantil', 90004, '#000000', id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 9014, 'Término de Culto', 90005, '#000000', id_language FROM languages WHERE id_language = 'pt';

INSERT OR IGNORE INTO categories_albums (id_category, id_album, name, "order", id_language)
SELECT 99, 9012, 'Oração Intercessora', 2, id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 9013, 'Adoração Infantil', 4, id_language FROM languages WHERE id_language = 'pt'
UNION ALL
SELECT 99, 9014, 'Término de Culto', 5, id_language FROM languages WHERE id_language = 'pt';

-- Faixas: files (duration real, url NULL) + musics + albums_musics.
-- id_file == id_music para os áudios (faixa 901xx -> file 901xx).
INSERT OR IGNORE INTO files (id_file, name, path, type, url, size, dir, file_name, duration) VALUES
  -- Oração Intercessora (9012)
  (90101, 'Falar com Deus',            'musics/pt/90101.mp3', 'audio', NULL, 0, 'musics/pt', '90101.mp3', '00:04:06'),
  (90102, 'Adoração',                  'musics/pt/90102.mp3', 'audio', NULL, 0, 'musics/pt', '90102.mp3', '00:01:17'),
  (90103, 'Ao Orarmos, Senhor',        'musics/pt/90103.mp3', 'audio', NULL, 0, 'musics/pt', '90103.mp3', '00:02:23'),
  (90104, 'Ouve-nos, Senhor',          'musics/pt/90104.mp3', 'audio', NULL, 0, 'musics/pt', '90104.mp3', '00:00:51'),
  (90105, 'Vem, Espírito Santo',       'musics/pt/90105.mp3', 'audio', NULL, 0, 'musics/pt', '90105.mp3', '00:00:59'),
  (90106, 'Não Há Alguém',             'musics/pt/90106.mp3', 'audio', NULL, 0, 'musics/pt', '90106.mp3', '00:04:09'),
  -- Adoração Infantil (9013)
  (90107, 'Vinde, Meninos',            'musics/pt/90107.mp3', 'audio', NULL, 0, 'musics/pt', '90107.mp3', '00:02:56'),
  (90108, 'Louvai-O',                  'musics/pt/90108.mp3', 'audio', NULL, 0, 'musics/pt', '90108.mp3', '00:01:53'),
  (90109, 'Deixai Vir a Mim os Pequeninos', 'musics/pt/90109.mp3', 'audio', NULL, 0, 'musics/pt', '90109.mp3', '00:01:14'),
  (90110, 'Chegou a Hora de Adorar ao Senhor', 'musics/pt/90110.mp3', 'audio', NULL, 0, 'musics/pt', '90110.mp3', '00:02:29'),
  (90111, 'Adoração Infantil',         'musics/pt/90111.mp3', 'audio', NULL, 0, 'musics/pt', '90111.mp3', '00:01:25'),
  (90112, 'Adoração Infantil II',      'musics/pt/90112.mp3', 'audio', NULL, 0, 'musics/pt', '90112.mp3', '00:01:36'),
  -- Término de Culto (9014)
  (90113, 'Nos Braços de Jesus',       'musics/pt/90113.mp3', 'audio', NULL, 0, 'musics/pt', '90113.mp3', '00:02:56'),
  (90114, 'Ao Deixar Este Lugar',      'musics/pt/90114.mp3', 'audio', NULL, 0, 'musics/pt', '90114.mp3', '00:03:05'),
  (90115, 'Em Paz eu Vou',             'musics/pt/90115.mp3', 'audio', NULL, 0, 'musics/pt', '90115.mp3', '00:02:47'),
  (90116, 'Graça, Amor e Comunhão',    'musics/pt/90116.mp3', 'audio', NULL, 0, 'musics/pt', '90116.mp3', '00:01:08'),
  (90117, 'Amigo, Não Saia Sem Cristo','musics/pt/90117.mp3', 'audio', NULL, 0, 'musics/pt', '90117.mp3', '00:01:07'),
  (90118, 'Fim de Culto',              'musics/pt/90118.mp3', 'audio', NULL, 0, 'musics/pt', '90118.mp3', '00:01:20'),
  (90119, 'Ao Sair do Santo Lugar',    'musics/pt/90119.mp3', 'audio', NULL, 0, 'musics/pt', '90119.mp3', '00:01:22'),
  (90120, 'Permaneça Em Mim',          'musics/pt/90120.mp3', 'audio', NULL, 0, 'musics/pt', '90120.mp3', '00:02:28'),
  (90121, 'Hino de Despedida',         'musics/pt/90121.mp3', 'audio', NULL, 0, 'musics/pt', '90121.mp3', '00:03:46'),
  -- Músicas Infantis (album 9000, sem as cross-list 90107/90108)
  (90122, 'Sim, Cristo me Ama',        'musics/pt/90122.mp3', 'audio', NULL, 0, 'musics/pt', '90122.mp3', '00:03:19'),
  (90123, 'Cristo Ama as Criancinhas', 'musics/pt/90123.mp3', 'audio', NULL, 0, 'musics/pt', '90123.mp3', '00:02:21'),
  (90124, 'Deus Sempre me Ama',        'musics/pt/90124.mp3', 'audio', NULL, 0, 'musics/pt', '90124.mp3', '00:01:44'),
  (90125, 'Joias Preciosas',           'musics/pt/90125.mp3', 'audio', NULL, 0, 'musics/pt', '90125.mp3', '00:02:14'),
  (90126, 'Preceitos Para os Pequenos','musics/pt/90126.mp3', 'audio', NULL, 0, 'musics/pt', '90126.mp3', '00:01:46'),
  (90127, 'Eu Sou Feliz',              'musics/pt/90127.mp3', 'audio', NULL, 0, 'musics/pt', '90127.mp3', '00:02:19'),
  (90128, 'Conversar com Deus',        'musics/pt/90128.mp3', 'audio', NULL, 0, 'musics/pt', '90128.mp3', '00:02:25'),
  (90129, 'Cópia de Jesus',            'musics/pt/90129.mp3', 'audio', NULL, 0, 'musics/pt', '90129.mp3', '00:03:33'),
  (90130, 'Se Você Está Feliz',        'musics/pt/90130.mp3', 'audio', NULL, 0, 'musics/pt', '90130.mp3', '00:01:35'),
  (90131, 'Amiga Mamãe',               'musics/pt/90131.mp3', 'audio', NULL, 0, 'musics/pt', '90131.mp3', '00:01:26'),
  (90132, 'Bubbling Over',             'musics/pt/90132.mp3', 'audio', NULL, 0, 'musics/pt', '90132.mp3', '00:01:44'),
  (90133, 'Sei que Vencerei',          'musics/pt/90133.mp3', 'audio', NULL, 0, 'musics/pt', '90133.mp3', '00:03:12'),
  (90134, 'Vou Deixar Brilhar',        'musics/pt/90134.mp3', 'audio', NULL, 0, 'musics/pt', '90134.mp3', '00:02:57'),
  (90135, 'Medley do Coração',         'musics/pt/90135.mp3', 'audio', NULL, 0, 'musics/pt', '90135.mp3', '00:04:26'),
  (90136, 'Eu Sou Uma Obra de Arte',   'musics/pt/90136.mp3', 'audio', NULL, 0, 'musics/pt', '90136.mp3', '00:02:54'),
  (90137, 'Equilíbrio',                'musics/pt/90137.mp3', 'audio', NULL, 0, 'musics/pt', '90137.mp3', '00:01:29'),
  (90138, 'Fruto da Criação',          'musics/pt/90138.mp3', 'audio', NULL, 0, 'musics/pt', '90138.mp3', '00:03:06'),
  (90139, 'Isso sim que é Amigo',      'musics/pt/90139.mp3', 'audio', NULL, 0, 'musics/pt', '90139.mp3', '00:02:34'),
  (90140, 'Voa, Voa Passarinho',       'musics/pt/90140.mp3', 'audio', NULL, 0, 'musics/pt', '90140.mp3', '00:02:14');

INSERT OR IGNORE INTO musics (id_music, name, id_file_image, id_file_music, id_file_instrumental_music, id_language)
SELECT id_file, name, NULL, id_file, NULL, 'pt' FROM files WHERE id_file BETWEEN 90101 AND 90140;

INSERT OR IGNORE INTO albums_musics (id_album, id_music, track, id_language)
SELECT 9012, id_music, ROW_NUMBER() OVER (ORDER BY id_music), 'pt'
FROM musics WHERE id_music BETWEEN 90101 AND 90106
UNION ALL
SELECT 9013, id_music, ROW_NUMBER() OVER (ORDER BY id_music), 'pt'
FROM musics WHERE id_music BETWEEN 90107 AND 90112
UNION ALL
SELECT 9014, id_music, ROW_NUMBER() OVER (ORDER BY id_music), 'pt'
FROM musics WHERE id_music BETWEEN 90113 AND 90121
UNION ALL
-- Lista plana Músicas Infantis no album 9000 (ordem da UI, cross-lists inclusas)
SELECT 9000, id_music, track, 'pt' FROM (
  SELECT 90122 AS id_music, 1  AS track UNION ALL SELECT 90107, 2  UNION ALL
  SELECT 90123, 3  UNION ALL SELECT 90124, 4  UNION ALL SELECT 90125, 5  UNION ALL
  SELECT 90108, 6  UNION ALL SELECT 90126, 7  UNION ALL SELECT 90127, 8  UNION ALL
  SELECT 90128, 9  UNION ALL SELECT 90129, 10 UNION ALL SELECT 90130, 11 UNION ALL
  SELECT 90131, 12 UNION ALL SELECT 90132, 13 UNION ALL SELECT 90133, 14 UNION ALL
  SELECT 90134, 15 UNION ALL SELECT 90135, 16 UNION ALL SELECT 90136, 17 UNION ALL
  SELECT 90137, 18 UNION ALL SELECT 90138, 19 UNION ALL SELECT 90139, 20 UNION ALL
  SELECT 90140, 21
);

-- =============================================
-- Faixas Entrada da Plataforma (9010) e Dízimos e Ofertas (9011)
-- Mesmo padrão: url NULL até os MP3 do acervo existirem.
-- 'Adoração' (90102, 1:17) é cross-list intencional com o album 9013.
-- =============================================
INSERT OR IGNORE INTO files (id_file, name, path, type, url, size, dir, file_name, duration) VALUES
  -- Entrada da Plataforma (9010)
  (90141, 'Santo Lugar',                  'musics/pt/90141.mp3', 'audio', NULL, 0, 'musics/pt', '90141.mp3', '00:02:23'),
  (90142, 'Santo! Santo! Santo!',         'musics/pt/90142.mp3', 'audio', NULL, 0, 'musics/pt', '90142.mp3', '00:02:46'),
  (90143, 'O Senhor Está Aqui',           'musics/pt/90143.mp3', 'audio', NULL, 0, 'musics/pt', '90143.mp3', '00:03:07'),
  (90144, 'Queremos Dar Louvor',          'musics/pt/90144.mp3', 'audio', NULL, 0, 'musics/pt', '90144.mp3', '00:02:50'),
  (90145, 'O Senhor Está em Seu Templo',  'musics/pt/90145.mp3', 'audio', NULL, 0, 'musics/pt', '90145.mp3', '00:01:36'),
  (90146, 'Deus Está Presente',           'musics/pt/90146.mp3', 'audio', NULL, 0, 'musics/pt', '90146.mp3', '00:01:14'),
  (90147, 'Silêncio',                     'musics/pt/90147.mp3', 'audio', NULL, 0, 'musics/pt', '90147.mp3', '00:02:42'),
  (90148, 'Santo És, Senhor',             'musics/pt/90148.mp3', 'audio', NULL, 0, 'musics/pt', '90148.mp3', '00:02:14'),
  (90149, 'Sinto a Presença do Senhor',   'musics/pt/90149.mp3', 'audio', NULL, 0, 'musics/pt', '90149.mp3', '00:01:05'),
  (90150, 'Eu Te Amo, ó Deus',            'musics/pt/90150.mp3', 'audio', NULL, 0, 'musics/pt', '90150.mp3', '00:01:18'),
  (90151, 'Santo Somente é o Senhor',     'musics/pt/90151.mp3', 'audio', NULL, 0, 'musics/pt', '90151.mp3', '00:03:10'),
  (90152, 'Vem me Conduzir',              'musics/pt/90152.mp3', 'audio', NULL, 0, 'musics/pt', '90152.mp3', '00:01:23'),
  (90153, 'Nosso Maravilhoso Deus',       'musics/pt/90153.mp3', 'audio', NULL, 0, 'musics/pt', '90153.mp3', '00:02:56'),
  (90154, 'Te Adoramos',                  'musics/pt/90154.mp3', 'audio', NULL, 0, 'musics/pt', '90154.mp3', '00:02:04'),
  -- Dízimos e Ofertas (9011)
  (90155, 'Entrega',                      'musics/pt/90155.mp3', 'audio', NULL, 0, 'musics/pt', '90155.mp3', '00:04:26'),
  (90156, 'Tudo Entregarei',              'musics/pt/90156.mp3', 'audio', NULL, 0, 'musics/pt', '90156.mp3', '00:03:31'),
  (90157, 'A Melhor Dádiva',              'musics/pt/90157.mp3', 'audio', NULL, 0, 'musics/pt', '90157.mp3', '00:03:13'),
  (90158, 'Ofertório',                    'musics/pt/90158.mp3', 'audio', NULL, 0, 'musics/pt', '90158.mp3', '00:01:03'),
  (90159, 'Quero Entregar',               'musics/pt/90159.mp3', 'audio', NULL, 0, 'musics/pt', '90159.mp3', '00:02:50'),
  (90160, 'Prova de Amor',                'musics/pt/90160.mp3', 'audio', NULL, 0, 'musics/pt', '90160.mp3', '00:01:26'),
  (90161, 'Quero Ofertar',                'musics/pt/90161.mp3', 'audio', NULL, 0, 'musics/pt', '90161.mp3', '00:03:14'),
  (90162, 'Um Milagre',                   'musics/pt/90162.mp3', 'audio', NULL, 0, 'musics/pt', '90162.mp3', '00:03:00'),
  (90163, 'Tudo o que há de Bom',         'musics/pt/90163.mp3', 'audio', NULL, 0, 'musics/pt', '90163.mp3', '00:03:55'),
  (90164, 'Tudo Vem de Ti',               'musics/pt/90164.mp3', 'audio', NULL, 0, 'musics/pt', '90164.mp3', '00:02:46'),
  (90165, 'Presente de Deus',             'musics/pt/90165.mp3', 'audio', NULL, 0, 'musics/pt', '90165.mp3', '00:03:03'),
  (90166, 'O Dízimo é Santo',             'musics/pt/90166.mp3', 'audio', NULL, 0, 'musics/pt', '90166.mp3', '00:03:41'),
  (90167, 'Minha Entrega',                'musics/pt/90167.mp3', 'audio', NULL, 0, 'musics/pt', '90167.mp3', '00:02:01');

INSERT OR IGNORE INTO musics (id_music, name, id_file_image, id_file_music, id_file_instrumental_music, id_language)
SELECT id_file, name, NULL, id_file, NULL, 'pt' FROM files WHERE id_file BETWEEN 90141 AND 90167;

INSERT OR IGNORE INTO albums_musics (id_album, id_music, track, id_language)
-- Entrada da Plataforma: ordem da UI, track 11 é cross-list com 90102 'Adoração'
SELECT 9010, id_music, track, 'pt' FROM (
  SELECT 90141 AS id_music, 1  AS track UNION ALL SELECT 90142, 2  UNION ALL
  SELECT 90143, 3  UNION ALL SELECT 90144, 4  UNION ALL SELECT 90145, 5  UNION ALL
  SELECT 90146, 6  UNION ALL SELECT 90147, 7  UNION ALL SELECT 90148, 8  UNION ALL
  SELECT 90149, 9  UNION ALL SELECT 90150, 10 UNION ALL SELECT 90102, 11 UNION ALL
  SELECT 90151, 12 UNION ALL SELECT 90152, 13 UNION ALL SELECT 90153, 14 UNION ALL
  SELECT 90154, 15
)
UNION ALL
-- Dízimos e Ofertas: ordem da UI
SELECT 9011, id_music, track, 'pt' FROM (
  SELECT 90155 AS id_music, 1 AS track UNION ALL SELECT 90156, 2  UNION ALL
  SELECT 90157, 3  UNION ALL SELECT 90158, 4  UNION ALL SELECT 90159, 5  UNION ALL
  SELECT 90160, 6  UNION ALL SELECT 90161, 7  UNION ALL SELECT 90162, 8  UNION ALL
  SELECT 90163, 9  UNION ALL SELECT 90164, 10 UNION ALL SELECT 90165, 11 UNION ALL
  SELECT 90166, 12 UNION ALL SELECT 90167, 13
);
