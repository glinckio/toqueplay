import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TOURNAMENT_NAME = process.argv[2] ?? 'Copa Ilha de Verão 2025';

async function main() {
  const tournament = await prisma.tournament.findFirst({
    where: { name: TOURNAMENT_NAME },
    include: { stages: true },
  });

  if (!tournament) {
    console.error(`Torneio "${TOURNAMENT_NAME}" nao encontrado.`);
    process.exit(1);
  }
  if (tournament.stages.length === 0) {
    console.error('Torneio nao tem etapa.');
    process.exit(1);
  }

  const today = new Date();

  await prisma.tournamentStage.update({
    where: { id: tournament.stages[0].id },
    data: { date: today },
  });

  console.log(`Etapa de "${tournament.name}" movida para hoje (${today.toISOString()}).`);
  console.log('Agora ja da pra iniciar o torneio pelo app (precisa estar com status BRACKET_GENERATED).');
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
