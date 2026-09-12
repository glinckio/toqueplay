-- Reestrutura torneios em SINGLE | LEAGUE | CIRCUIT.
--
-- Bracket e Registration passam a pertencer a uma etapa: sem isso o circuito nao consegue
-- gerar a chave da etapa 2 (o unique antigo era [tournamentId, categoryId], ou seja, uma
-- chave por categoria no torneio inteiro).
--
-- As colunas sao NOT NULL de proposito, em vez de nulas: com etapa sempre preenchida o unique
-- funciona de verdade. No Postgres, NULL nao colide com NULL, entao um unique com coluna
-- opcional deixaria passar chaves duplicadas.
--
-- Por isso os dados de chave/inscricao existentes sao descartados (autorizado: o app ainda nao
-- esta em producao). Torneios, times, usuarios e amistosos permanecem.

-- Partidas de chave e seus filhos (sets, eventos, escalacao) caem por cascade.
DELETE FROM "Match" WHERE "bracketId" IS NOT NULL;
DELETE FROM "Bracket";
-- RegistrationMember cai por cascade.
DELETE FROM "Registration";

-- AlterEnum
ALTER TYPE "TournamentEventType" ADD VALUE 'LEAGUE';

-- DropIndex
DROP INDEX "Bracket_tournamentId_categoryId_key";

-- AlterTable
ALTER TABLE "Bracket" ADD COLUMN     "stageId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "stageId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "finalStageTeamCount" INTEGER,
ADD COLUMN     "finalsBestOfSets" INTEGER,
ADD COLUMN     "matchesPerDay" INTEGER;

-- CreateTable
CREATE TABLE "TournamentPointsRule" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "placement" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "TournamentPointsRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagePlacement" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagePlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentPointsRule_tournamentId_idx" ON "TournamentPointsRule"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPointsRule_tournamentId_placement_key" ON "TournamentPointsRule"("tournamentId", "placement");

-- CreateIndex
CREATE INDEX "StagePlacement_tournamentId_idx" ON "StagePlacement"("tournamentId");

-- CreateIndex
CREATE INDEX "StagePlacement_categoryId_idx" ON "StagePlacement"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "StagePlacement_stageId_categoryId_teamId_key" ON "StagePlacement"("stageId", "categoryId", "teamId");

-- CreateIndex
CREATE INDEX "Bracket_stageId_idx" ON "Bracket"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_categoryId_stageId_key" ON "Bracket"("categoryId", "stageId");

-- AddForeignKey
ALTER TABLE "TournamentPointsRule" ADD CONSTRAINT "TournamentPointsRule_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagePlacement" ADD CONSTRAINT "StagePlacement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagePlacement" ADD CONSTRAINT "StagePlacement_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagePlacement" ADD CONSTRAINT "StagePlacement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TournamentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagePlacement" ADD CONSTRAINT "StagePlacement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

