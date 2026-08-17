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

  // Bracket generation is blocked if `now` is more than 2 days before the
  // stage date. Setting the stage 1 day out puts it safely past that cutoff.
  const newDate = new Date(Date.now() + 1 * 86400_000);

  await prisma.tournamentStage.update({
    where: { id: tournament.stages[0].id },
    data: { date: newDate },
  });

  console.log(`Etapa de "${tournament.name}" movida para ${newDate.toISOString()}.`);
  console.log('Agora ja da pra gerar a chave pelo app (dentro da janela de 2 dias antes da etapa).');
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
