const { PrismaClient, RegistrationStatus } = require('@prisma/client');
const prisma = new PrismaClient();

const TOURNAMENT_ID = process.argv[2];

async function main() {
  if (!TOURNAMENT_ID) {
    console.error('Uso: node prisma/register-teams.js <tournament-id>');
    process.exit(1);
  }

  const categories = await prisma.tournamentCategory.findMany({
    where: { tournamentId: TOURNAMENT_ID },
  });
  if (categories.length === 0) {
    console.error('Nenhuma categoria encontrada.');
    process.exit(1);
  }
  const categoryId = categories[0].id;

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: 'asc' },
    take: 12,
    include: { members: true },
  });

  if (teams.length < 12) {
    console.error(`Precisa de 12 times, encontrou ${teams.length}.`);
    process.exit(1);
  }

  for (let i = 0; i < 11; i++) {
    const team = teams[i];
    const captain = team.members.find(m => m.isCaptain);
    const other = team.members.find(m => !m.isCaptain);

    const reg = await prisma.registration.create({
      data: {
        tournamentId: TOURNAMENT_ID,
        categoryId,
        teamId: team.id,
        userId: team.ownerId,
        status: RegistrationStatus.CONFIRMED,
        paymentStatus: 'PAID',
        paymentMethod: 'SEED',
        paidAt: new Date(),
      },
    });

    if (captain) await prisma.registrationMember.create({ data: { registrationId: reg.id, teamMemberId: captain.id, isCaptain: true } });
    if (other) await prisma.registrationMember.create({ data: { registrationId: reg.id, teamMemberId: other.id, isCaptain: false } });

    console.log(`  ${team.name} inscrito`);
  }

  const last = teams[11];
  const captain = last.members.find(m => m.isCaptain);
  const captainUser = captain ? await prisma.user.findUnique({ where: { id: captain.userId } }) : null;

  console.log('');
  console.log('11 times inscritos. NAO inscrito:');
  console.log(`  Time: ${last.name}`);
  console.log(`  Email: ${captainUser?.email ?? '?'}`);
  console.log('  Senha: 123456');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
