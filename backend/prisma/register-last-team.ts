import { PrismaClient, RegistrationStatus } from '@prisma/client';

const prisma = new PrismaClient();
const TOURNAMENT_NAME = process.argv[2] ?? 'Copa Ilha de Verão 2025';

async function main() {
  const tournament = await prisma.tournament.findFirst({
    where: { name: TOURNAMENT_NAME },
    include: { categories: true, registrations: true },
  });

  if (!tournament) {
    console.error(`Torneio "${TOURNAMENT_NAME}" nao encontrado.`);
    process.exit(1);
  }
  if (tournament.categories.length === 0) {
    console.error('Torneio nao tem categoria.');
    process.exit(1);
  }

  const category = tournament.categories[0];
  const registeredTeamIds = new Set(tournament.registrations.map((r) => r.teamId));

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: 'asc' },
    include: { members: true },
  });

  const pendingTeam = teams.find((t) => !registeredTeamIds.has(t.id));

  if (!pendingTeam) {
    console.log(`Nenhum time pendente — todas as vagas de "${tournament.name}" ja estao preenchidas.`);
    return;
  }

  const captain = pendingTeam.members.find((m) => m.isCaptain);
  if (!captain) {
    console.error(`Time "${pendingTeam.name}" nao tem capitao.`);
    process.exit(1);
  }

  const reg = await prisma.registration.create({
    data: {
      tournamentId: tournament.id,
      categoryId: category.id,
      teamId: pendingTeam.id,
      userId: pendingTeam.ownerId,
      status: RegistrationStatus.CONFIRMED,
      paidAt: new Date(),
    },
  });
  await prisma.registrationMember.create({
    data: { registrationId: reg.id, teamMemberId: captain.id, isCaptain: true },
  });

  console.log(`  ${pendingTeam.name} inscrito e confirmado em "${tournament.name}".`);
  console.log('  Todas as vagas preenchidas. Ja da pra gerar a chave (dentro da janela de data).');
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
