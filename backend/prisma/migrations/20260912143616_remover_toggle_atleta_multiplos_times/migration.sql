-- O toggle virou redundante: o formato do torneio ja define a regra.
-- LEAGUE prende o atleta ao time pela competicao inteira; CIRCUIT permite trocar entre etapas,
-- mas nunca dois times na mesma etapa. Nao ha caso em que desligar a regra faca sentido.
ALTER TABLE "Tournament" DROP COLUMN "allowSameAthleteMultipleTeams";
