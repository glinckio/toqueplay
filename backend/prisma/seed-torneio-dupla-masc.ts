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
  console.log('Seeding torneio dupla masculino (12 times)...\n');

  const hash = await bcrypt.hash(PASSWORD, 10);

  // ─── Organizador ────────────────────────────────────────────────────
  const organizador = await prisma.user.upsert({
    where: { email: 'organizador-masc@seed.toqueplay.com' },
    update: { name: 'Carlos Organizador', password: hash, role: Role.ORGANIZADOR, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE', avatarUrl: 'https://i.pravatar.cc/150?u=organizador-masc' },
    create: { email: 'organizador-masc@seed.toqueplay.com', name: 'Carlos Organizador', password: hash, role: Role.ORGANIZADOR, isEmailVerified: true, isFirstAccess: false, avatarUrl: 'https://i.pravatar.cc/150?u=organizador-masc' },
  });
  console.log(`  Organizador: ${organizador.email}`);

  // ─── Árbitro ────────────────────────────────────────────────────────
  const arbitro = await prisma.user.upsert({
    where: { email: 'arbitro-masc@seed.toqueplay.com' },
    update: { name: 'Roberto Árbitro', password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE', avatarUrl: 'https://i.pravatar.cc/150?u=arbitro-masc' },
    create: { email: 'arbitro-masc@seed.toqueplay.com', name: 'Roberto Árbitro', password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, avatarUrl: 'https://i.pravatar.cc/150?u=arbitro-masc' },
  });
  console.log(`  Árbitro: ${arbitro.email}`);

  // ─── 24 atletas (2 por time × 12 times) ─────────────────────────────
  const athletes: { id: string; email: string }[] = [];
  for (let i = 1; i <= 24; i++) {
    const padded = String(i).padStart(2, '0');
    const email = `masc${padded}@seed.toqueplay.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: `Jogador Masc ${padded}`, password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE', avatarUrl: `https://i.pravatar.cc/150?u=masc${padded}` },
      create: { email, name: `Jogador Masc ${padded}`, password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, avatarUrl: `https://i.pravatar.cc/150?u=masc${padded}` },
    });
    athletes.push({ id: user.id, email: user.email });
  }

  // ─── 12 times ───────────────────────────────────────────────────────
  const teamNames = [
    'Dragões', 'Lobos', 'Falcões', 'Tubarões',
    'Panteras', 'Águias', 'Leões', 'Cobras',
    'Tigres', 'Gavião', 'Raposas', 'Pumas',
  ];

  const teams: { id: string; name: string; ownerId: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const a1 = athletes[i * 2];
    const a2 = athletes[i * 2 + 1];

    const team = await prisma.team.create({
      data: {
        name: teamNames[i],
        description: 'Time seed dupla masculino',
        sport: 'VOLEI',
        avatarUrl: `https://api.dicebear.com/9.x/initials/png?seed=${teamNames[i]}&size=150`,
        ownerId: a1.id,
        members: {
          create: [
            { userId: a1.id, isCaptain: true, isGuest: false },
            { userId: a2.id, isCaptain: false, isGuest: false },
          ],
        },
      },
    });
    teams.push({ id: team.id, name: team.name, ownerId: a1.id });
    console.log(`  Time ${teamNames[i]} criado (${a1.email} + ${a2.email})`);
  }

  // Backfill avatarUrl for teams created in previous seed runs
  const teamsWithoutAvatar = await prisma.team.findMany({ where: { avatarUrl: null } });
  for (const t of teamsWithoutAvatar) {
    await prisma.team.update({
      where: { id: t.id },
      data: { avatarUrl: `https://api.dicebear.com/9.x/initials/png?seed=${t.name}&size=150` },
    });
  }
  if (teamsWithoutAvatar.length > 0) {
    console.log(`  Backfill: ${teamsWithoutAvatar.length} times atualizados com avatarUrl`);
  }

  // ─── Torneio dupla masculino ────────────────────────────────────────
  // CEP 93220-220 → Rua Laurentino Juliano, Paraíso, Sapucaia do Sul - RS
  const stageDate = new Date();
  stageDate.setHours(12, 0, 0, 0);

  const tournament = await prisma.tournament.create({
    data: {
      name: 'Copa Sapucaia Masculina 2025',
      description: 'Torneio de vôlei de praia dupla masculino — seed.',
      ownerId: organizador.id,
      eventType: TournamentEventType.SINGLE,
      status: TournamentStatus.REGISTRATION_CLOSED,
      isPublished: true,
      stages: {
        create: [{
          name: 'Etapa Única',
          date: stageDate,
          maxTeams: 12,
          street: 'Rua Laurentino Juliano',
          number: '100',
          neighborhood: 'Paraíso',
          city: 'Sapucaia do Sul',
          state: 'RS',
          cep: '93220-220',
          latitude: -29.8185,
          longitude: -51.1500,
        }],
      },
      categories: {
        create: [{
          type: TournamentType.MALE,
          format: TournamentFormat.PAIR,
          modality: TournamentModality.BEACH,
          minMembers: 2,
          maxMembers: 2,
          registrationPrice: 100,
        }],
      },
    },
    include: { categories: true },
  });
  const category = tournament.categories[0];

  // ─── Inscrições: 10 CONFIRMED (pagos) + 1 PENDING + 1 sem inscrição
  // Time 12 (Pumas) fica de fora para testar fluxo de inscrição
  for (let i = 0; i < 11; i++) {
    const team = teams[i];
    const isPaid = i < 10;

    const owner = await prisma.teamMember.findFirst({
      where: { teamId: team.id, isCaptain: true },
    });
    if (!owner) continue;

    const reg = await prisma.registration.create({
      data: {
        tournamentId: tournament.id,
        categoryId: category.id,
        teamId: team.id,
        userId: team.ownerId,
        status: isPaid ? RegistrationStatus.CONFIRMED : RegistrationStatus.PENDING_CONFIRMATION,
        paidAt: isPaid ? new Date() : null,
      },
    });
    await prisma.registrationMember.create({
      data: { registrationId: reg.id, teamMemberId: owner.id, isCaptain: true },
    });

    console.log(`  ${team.name}: ${isPaid ? 'CONFIRMED (pago)' : 'PENDING (não pago)'}`);
  }

  // ─── Árbitro do torneio ─────────────────────────────────────────────
  await prisma.tournamentReferee.upsert({
    where: { tournamentId_userId: { tournamentId: tournament.id, userId: arbitro.id } },
    update: { codeConfirmed: false },
    create: { tournamentId: tournament.id, userId: arbitro.id },
  });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Torneio: ${tournament.name}`);
  console.log(`Local:   Rua Laurentino Juliano, Paraíso, Sapucaia do Sul - RS (CEP 93220-220)`);
  console.log(`Times:   11 inscritos (10 pagos, 1 pendente) + 1 sem inscrição (Pumas)`);
  console.log('');
  console.log('Usuários criados:');
  console.log(`  Organizador: organizador-masc@seed.toqueplay.com  (senha: ${PASSWORD})`);
  console.log(`  Árbitro:     arbitro-masc@seed.toqueplay.com      (senha: ${PASSWORD})`);
  console.log(`  Atletas:     masc01@seed.toqueplay.com até masc24@seed.toqueplay.com (senha: ${PASSWORD})`);
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
