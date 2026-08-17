import {
  PrismaClient,
  Role,
  TournamentStatus,
  TournamentEventType,
  TournamentType,
  TournamentFormat,
  TournamentModality,
  RegistrationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = '123456';

async function main() {
  console.log('Seeding database...\n');

  const hash = await bcrypt.hash(PASSWORD, 10);

  // Super Admin (also the tournament organizer below)
  await prisma.user.upsert({
    where: { email: 'admin@toqueplay.com' },
    update: { name: 'Super Admin', password: hash, role: Role.SUPER_ADMIN, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE' },
    create: { email: 'admin@toqueplay.com', name: 'Super Admin', password: hash, role: Role.SUPER_ADMIN, isEmailVerified: true, isFirstAccess: false },
  });

  // 24 athletes (2 per team × 12 teams)
  for (let i = 1; i <= 24; i++) {
    const padded = String(i).padStart(2, '0');
    await prisma.user.upsert({
      where: { email: `atleta${padded}@seed.toqueplay.com` },
      update: { name: `Atleta ${padded}`, password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE' },
      create: { email: `atleta${padded}@seed.toqueplay.com`, name: `Atleta ${padded}`, password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false },
    });
  }

  // seed01 (atleta01) gets a real saved location so the "perto de você" /
  // live-match-nearby features have someone to test against.
  const SEED01_LAT = -29.8291836;
  const SEED01_LNG = -51.1485094;
  await prisma.user.update({
    where: { email: 'atleta01@seed.toqueplay.com' },
    data: { latitude: SEED01_LAT, longitude: SEED01_LNG },
  });

  const teamNames = [
    'Trovao', 'Furacao', 'Tsunami', 'Relampago', 'Avalanche', 'Tempestade',
    'Vulcao', 'Ciclone', 'Tornado', 'Maremoto', 'Glaciador', 'Fenix',
  ];

  for (let i = 0; i < 12; i++) {
    const a1email = `atleta${String(i * 2 + 1).padStart(2, '0')}@seed.toqueplay.com`;
    const a2email = `atleta${String(i * 2 + 2).padStart(2, '0')}@seed.toqueplay.com`;
    const a1 = await prisma.user.findUnique({ where: { email: a1email } });
    const a2 = await prisma.user.findUnique({ where: { email: a2email } });
    if (!a1 || !a2) continue;

    await prisma.team.create({
      data: {
        name: teamNames[i],
        description: 'Time gerado pelo seed',
        sport: 'VOLEI',
        ownerId: a1.id,
        members: {
          create: [
            { userId: a1.id, isCaptain: true, isGuest: false },
            { userId: a2.id, isCaptain: false, isGuest: false },
          ],
        },
      },
    });
    console.log(`  ${teamNames[i]} criado (capitao: atleta${String(i * 2 + 1).padStart(2, '0')})`);
  }

  // ─── One tournament: REGISTRATION_OPEN, missing exactly one team ──────────
  const admin = await prisma.user.findUnique({ where: { email: 'admin@toqueplay.com' } });
  const teams = await prisma.team.findMany({ orderBy: { createdAt: 'asc' } });

  if (admin && teams.length >= 9) {
    const stageDate = new Date(Date.now() + 14 * 86400_000);

    const tournament = await prisma.tournament.create({
      data: {
        name: 'Copa Ilha de Verão 2025',
        description: 'Torneio de vôlei de praia gerado pelo seed — inscrições abertas.',
        ownerId: admin.id,
        eventType: TournamentEventType.SINGLE,
        status: TournamentStatus.REGISTRATION_OPEN,
        isPublished: true,
        stages: {
          create: [{
            name: 'Etapa Única',
            date: stageDate,
            maxTeams: 8,
            street: 'R. Laurentino Juliano',
            number: '204',
            neighborhood: 'Paraíso',
            city: 'Sapucaia do Sul',
            state: 'RS',
            latitude: SEED01_LAT,
            longitude: SEED01_LNG,
          }],
        },
        categories: {
          create: [{
            type: TournamentType.MIX,
            format: TournamentFormat.PAIR,
            modality: TournamentModality.BEACH,
            minMembers: 2,
            maxMembers: 2,
            registrationPrice: 120,
          }],
        },
      },
      include: { categories: true },
    });
    const category = tournament.categories[0];

    // All 8 slots filled: CONFIRMED + paid, ready to generate the bracket
    // and test the tournament live right away.
    const registeredTeams = teams.slice(0, 8);

    for (const team of registeredTeams) {
      const owner = await prisma.teamMember.findFirst({ where: { teamId: team.id, isCaptain: true } });
      if (!owner) continue;
      const reg = await prisma.registration.create({
        data: {
          tournamentId: tournament.id,
          categoryId: category.id,
          teamId: team.id,
          userId: team.ownerId,
          status: RegistrationStatus.CONFIRMED,
          paidAt: new Date(),
        },
      });
      await prisma.registrationMember.create({ data: { registrationId: reg.id, teamMemberId: owner.id, isCaptain: true } });
    }

    // Referee pool: atleta17 (captain of Tornado, team #9 — not competing in
    // this tournament's 8 registered slots) is invited as a tournament referee
    // but NOT pre-confirmed — log in as them, generate the code as the
    // organizer, and enter it as atleta17 to test the real invite+code flow.
    const refereeUser = await prisma.user.findUnique({ where: { email: 'atleta17@seed.toqueplay.com' } });
    if (refereeUser) {
      await prisma.tournamentReferee.upsert({
        where: { tournamentId_userId: { tournamentId: tournament.id, userId: refereeUser.id } },
        update: { codeConfirmed: false },
        create: { tournamentId: tournament.id, userId: refereeUser.id },
      });
    }

    console.log('');
    console.log(`  Torneio: ${tournament.name} (REGISTRATION_OPEN)`);
    console.log(`  8/8 vagas preenchidas — todos os times confirmados e pagos.`);
    console.log(`  Organizador: admin@toqueplay.com`);
    console.log(`  Árbitro pré-confirmado no torneio: atleta17@seed.toqueplay.com`);
  }

  console.log('');
  console.log('Seed completo!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Senha para todos: ${PASSWORD}`);
  console.log('Admin:     admin@toqueplay.com');
  console.log('Atletas:   atleta01@seed.toqueplay.com ate atleta24@seed.toqueplay.com');
  console.log('Times:     12 duplas (capitao = atleta impar)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
