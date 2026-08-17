import {
  PrismaClient,
  RegistrationStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const TOURNAMENT_ID = process.argv[2];

if (!TOURNAMENT_ID) {
  console.error('Uso: npx ts-node --compiler-options {"module":"CommonJS"} prisma/register-teams.ts <tournament-id>');
  process.exit(1);
}

async function main() {
  // Find category
  const categories = await prisma.tournamentCategory.findMany({
    where: { tournamentId: TOURNAMENT_ID },
  });
  if (categories.length === 0) {
    console.error('Nenhuma categoria encontrada para o torneio.');
    process.exit(1);
  }
  const categoryId = categories[0].id;

  // Get all teams ordered by creation
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: 'asc' },
    take: 12,
    include: { members: true },
  });

  if (teams.length < 12) {
    console.error(`Precisa de 12 times, encontrou ${teams.length}.`);
    process.exit(1);
  }

  // Register first 11
  for (let i = 0; i < 11; i++) {
    const team = teams[i];
    const captain = team.members.find((m) => m.isCaptain);
    const other = team.members.find((m) => !m.isCaptain);

    const reg = await prisma.registration.create({
      data: {
        tournamentId: TOURNAMENT_ID,
        categoryId,
        teamId: team.id,
        userId: team.ownerId,
        status: RegistrationStatus.CONFIRMED,
        paidAt: new Date(),
      },
    });

    if (captain) {
      await prisma.registrationMember.create({
        data: { registrationId: reg.id, teamMemberId: captain.id, isCaptain: true },
      });
    }
    if (other) {
      await prisma.registrationMember.create({
        data: { registrationId: reg.id, teamMemberId: other.id, isCaptain: false },
      });
    }

    console.log(`  ${team.name} inscrito`);
  }

  // Show unregistered team
  const last = teams[11];
  const captain = last.members.find((m) => m.isCaptain);
  const captainUser = captain?.userId ? await prisma.user.findUnique({ where: { id: captain.userId } }) : null;

  console.log('');
  console.log('11 times inscritos. NAO inscrito:');
  console.log(`  Time: ${last.name}`);
  console.log(`  Email do capitao: ${captainUser?.email ?? 'desconhecido'}`);
  console.log('  Senha: 123456');
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
