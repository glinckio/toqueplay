import { PrismaClient, FriendlyStatus, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();
const REFEREE_EMAIL = process.argv[2] ?? 'atleta17@seed.toqueplay.com';
// COURT on purpose — the tournament match already covers the BEACH (informational-only)
// substitution path, this one exercises the full lineup + "quem sai / quem entra" picker
// with a real 10-person squad (6 on court, 4 realistically on the bench).
const MODALITY = 'COURT';
const TEAM_A_NAME = 'Quadra Azul (teste)';
const TEAM_B_NAME = 'Quadra Vermelha (teste)';

async function main() {
  const referee = await prisma.user.findUnique({ where: { email: REFEREE_EMAIL } });
  if (!referee) {
    console.error(`Árbitro "${REFEREE_EMAIL}" não encontrado.`);
    process.exit(1);
  }

  // atleta01..10 / atleta11..16,18..21 — 10 a side, skipping 17 (the referee)
  // so the same account never plays and referees at once.
  const sideANums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const sideBNums = [11, 12, 13, 14, 15, 16, 18, 19, 20, 21];
  const emailOf = (n: number) => `atleta${String(n).padStart(2, '0')}@seed.toqueplay.com`;

  const usersA = await prisma.user.findMany({ where: { email: { in: sideANums.map(emailOf) } } });
  const usersB = await prisma.user.findMany({ where: { email: { in: sideBNums.map(emailOf) } } });
  if (usersA.length < 10 || usersB.length < 10) {
    console.error('Não achei os 20 atletas esperados — rode o seed principal primeiro.');
    process.exit(1);
  }

  // Clean up any previous run of this fixture.
  const oldTeams = await prisma.team.findMany({ where: { name: { in: [TEAM_A_NAME, TEAM_B_NAME] } } });
  for (const t of oldTeams) {
    await prisma.friendly.deleteMany({ where: { OR: [{ requesterTeamId: t.id }, { challengedTeamId: t.id }] } });
    await prisma.team.delete({ where: { id: t.id } });
  }

  const { teamA, teamB, friendly, match } = await prisma.$transaction(async (tx) => {
    const teamA = await tx.team.create({
      data: {
        name: TEAM_A_NAME,
        sport: 'VOLEI',
        ownerId: usersA[0].id,
        members: { create: usersA.map((u, i) => ({ userId: u.id, isCaptain: i === 0, isGuest: false })) },
      },
      include: { members: true },
    });
    const teamB = await tx.team.create({
      data: {
        name: TEAM_B_NAME,
        sport: 'VOLEI',
        ownerId: usersB[0].id,
        members: { create: usersB.map((u, i) => ({ userId: u.id, isCaptain: i === 0, isGuest: false })) },
      },
      include: { members: true },
    });

    const captainA = teamA.members.find((m) => m.isCaptain)!;
    const captainB = teamB.members.find((m) => m.isCaptain)!;

    const friendly = await tx.friendly.create({
      data: {
        title: 'Amistoso de teste — substituição (quadra)',
        requesterId: captainA.userId!,
        requesterTeamId: teamA.id,
        challengedId: captainB.userId!,
        challengedTeamId: teamB.id,
        status: FriendlyStatus.ACCEPTED,
        date: new Date(),
        modality: MODALITY,
        categoryFormat: 'SEXTET',
      },
    });

    // Escalate the whole 10-person squad on both sides.
    await tx.friendlyAthlete.createMany({
      data: teamA.members.map((m) => ({ friendlyId: friendly.id, teamMemberId: m.id, side: 'REQUESTER', isCaptain: m.isCaptain })),
    });
    await tx.friendlyAthlete.createMany({
      data: teamB.members.map((m) => ({ friendlyId: friendly.id, teamMemberId: m.id, side: 'CHALLENGED', isCaptain: m.isCaptain })),
    });

    // SCHEDULED, not IN_PROGRESS: no MatchSet pre-created either. This way the
    // referee taps "INICIAR PARTIDA" themselves in the app, which is what
    // triggers the lineup (posições 1-6) modal for set 1.
    const match = await tx.match.create({
      data: {
        friendlyId: friendly.id,
        round: 0,
        position: 0,
        status: MatchStatus.SCHEDULED,
        teamAId: teamA.id,
        teamBId: teamB.id,
        bestOfSets: 3,
        refereeId: referee.id,
      },
    });

    await tx.friendly.update({ where: { id: friendly.id }, data: { matchId: match.id } });

    return { teamA, teamB, friendly, match };
  });

  console.log(`Amistoso agendado (${MODALITY}, 10x10) criado: ${teamA.name} vs ${teamB.name}`);
  console.log(`friendlyId: ${friendly.id}`);
  console.log(`matchId: ${match.id}`);
  console.log(`Árbitro: ${REFEREE_EMAIL} (refereeId já setado — entra direto, sem código)`);
  console.log('Ambos os times têm 10 atletas escalados (FriendlyAthlete).');
  console.log('IMPORTANTE: a partida está SCHEDULED, não iniciada — entre como árbitro e toque em');
  console.log('"INICIAR PARTIDA" para disparar a escalação (posições 1-6). Sem isso, a substituição');
  console.log('não sabe quem está em quadra e mostra o elenco todo nas duas listas.');
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
