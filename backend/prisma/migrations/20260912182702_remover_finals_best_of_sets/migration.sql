-- Coluna nasceu morta: a categoria ja tem semifinalBestOfSets e finalBestOfSets, que e onde o
-- formulario grava e o gerador de chave le. Esta nunca chegou a ser preenchida nem consultada.
ALTER TABLE "Tournament" DROP COLUMN "finalsBestOfSets";
