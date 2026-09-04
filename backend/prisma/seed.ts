import {
  PrismaClient,
  Role,
  TournamentStatus,
  TournamentEventType,
  TournamentType,
  TournamentFormat,
  TournamentModality,
  RegistrationStatus,
  BracketType,
  MatchStatus,
  FriendlyStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = '123456';

// CEP 93220-220 (Novo Hamburgo/RS) reference point used by the emulator's mocked GPS.
const BASE_LAT = -29.6741;
const BASE_LNG = -51.1358;
const KM_PER_DEG_LAT = 111;
const KM_PER_DEG_LNG = 111 * Math.cos((BASE_LAT * Math.PI) / 180);

function pointAtDistanceKm(km: number) {
  return { latitude: BASE_LAT + km / KM_PER_DEG_LAT, longitude: BASE_LNG };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

// Pool of team/athlete names — cycled per tournament so every seeded team has
// a distinct, plausible captain instead of "Time 1", "Time 2"...
const TEAM_NAMES = ['Areia Dourada', 'Furacão da Praia', 'Bloco Central', 'Saque Certo', 'Muralha RS', 'Ponta de Lança', 'Rede Alta', 'Vento Sul'];
const CAPTAIN_NAMES = ['Rafael Souza', 'Bianca Lima', 'Thiago Alves', 'Carla Mendes', 'Diego Farias', 'Juliana Rocha', 'Marcos Vieira', 'Paula Nogueira'];
const PARTNER_NAMES = ['Lucas Pereira', 'Fernanda Dias', 'André Castro', 'Camila Duarte', 'Bruno Teixeira', 'Larissa Prado', 'Felipe Moraes', 'Isabela Ramos'];

/**
 * Registration-open tournaments: teams that actually signed up (some paid,
 * some still waiting confirmation), mirroring a tournament mid-inscription.
 */
async function seedRegistrationOpenTeams(
  tournamentId: string,
  categoryId: string,
  slug: string,
  teamCount: number,
  confirmedCount: number,
) {
  for (let i = 0; i < teamCount; i++) {
    const teamSlug = `${slug}-time-${i}`;
    const captainEmail = `atleta-${teamSlug}@toqueplay.com`;
    const hash = await bcrypt.hash(PASSWORD, 10);

    const captain = await prisma.user.upsert({
      where: { email: captainEmail },
      update: { name: CAPTAIN_NAMES[i % CAPTAIN_NAMES.length], password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE' },
      create: { email: captainEmail, name: CAPTAIN_NAMES[i % CAPTAIN_NAMES.length], password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, avatarUrl: `https://i.pravatar.cc/150?u=${teamSlug}` },
    });

    let team = await prisma.team.findFirst({ where: { name: TEAM_NAMES[i % TEAM_NAMES.length], ownerId: captain.id } });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: TEAM_NAMES[i % TEAM_NAMES.length],
          sport: 'VOLEI',
          ownerId: captain.id,
          members: {
            create: [
              { userId: captain.id, isCaptain: true },
              { guestName: PARTNER_NAMES[i % PARTNER_NAMES.length], isGuest: true },
            ],
          },
        },
        include: { members: true },
      });
    }

    const existingReg = await prisma.registration.findFirst({ where: { tournamentId, teamId: team.id } });
    if (existingReg) continue;

    const members = await prisma.teamMember.findMany({ where: { teamId: team.id } });
    const isConfirmed = i < confirmedCount;

    await prisma.registration.create({
      data: {
        tournamentId,
        categoryId,
        teamId: team.id,
        userId: captain.id,
        status: isConfirmed ? RegistrationStatus.CONFIRMED : RegistrationStatus.PENDING_CONFIRMATION,
        paidAt: isConfirmed ? new Date() : null,
        members: {
          create: members.map((m) => ({ teamMemberId: m.id, isCaptain: m.isCaptain })),
        },
      },
    });
  }
}

/**
 * In-progress tournaments: every team actually paid and confirmed (that's
 * why the event was allowed to start), plus a real single-elimination
 * bracket with the first-round matches scheduled — not an empty shell.
 */
async function seedInProgressTournament(tournamentId: string, categoryId: string, slug: string, teamCount: number) {
  const teamIds: string[] = [];

  for (let i = 0; i < teamCount; i++) {
    const teamSlug = `${slug}-time-${i}`;
    const captainEmail = `atleta-${teamSlug}@toqueplay.com`;
    const hash = await bcrypt.hash(PASSWORD, 10);

    const captain = await prisma.user.upsert({
      where: { email: captainEmail },
      update: { name: CAPTAIN_NAMES[i % CAPTAIN_NAMES.length], password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE' },
      create: { email: captainEmail, name: CAPTAIN_NAMES[i % CAPTAIN_NAMES.length], password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, avatarUrl: `https://i.pravatar.cc/150?u=${teamSlug}` },
    });

    let team = await prisma.team.findFirst({ where: { name: TEAM_NAMES[i % TEAM_NAMES.length], ownerId: captain.id } });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: TEAM_NAMES[i % TEAM_NAMES.length],
          sport: 'VOLEI',
          ownerId: captain.id,
          members: {
            create: [
              { userId: captain.id, isCaptain: true },
              { guestName: PARTNER_NAMES[i % PARTNER_NAMES.length], isGuest: true },
            ],
          },
        },
        include: { members: true },
      });
    }

    teamIds.push(team.id);

    const existingReg = await prisma.registration.findFirst({ where: { tournamentId, teamId: team.id } });
    if (existingReg) continue;

    const members = await prisma.teamMember.findMany({ where: { teamId: team.id } });
    await prisma.registration.create({
      data: {
        tournamentId,
        categoryId,
        teamId: team.id,
        userId: captain.id,
        status: RegistrationStatus.CONFIRMED,
        paidAt: new Date(),
        members: {
          create: members.map((m) => ({ teamMemberId: m.id, isCaptain: m.isCaptain })),
        },
      },
    });
  }

  const existingBracket = await prisma.bracket.findUnique({ where: { tournamentId_categoryId: { tournamentId, categoryId } } });
  if (existingBracket) return;

  // Fixed at 4 confirmed teams (power of 2) so the bracket needs no byes:
  // two scheduled semifinals feeding a still-empty final.
  const bracket = await prisma.bracket.create({ data: { tournamentId, categoryId, type: BracketType.SINGLE_ELIMINATION } });

  const final = await prisma.match.create({
    data: { bracketId: bracket.id, round: 2, position: 0, status: MatchStatus.SCHEDULED, bestOfSets: 3 },
  });
  await prisma.match.createMany({
    data: [
      { bracketId: bracket.id, round: 1, position: 0, status: MatchStatus.SCHEDULED, bestOfSets: 3, teamAId: teamIds[0], teamBId: teamIds[1], nextMatchId: final.id },
      { bracketId: bracket.id, round: 1, position: 1, status: MatchStatus.SCHEDULED, bestOfSets: 3, teamAId: teamIds[2], teamBId: teamIds[3], nextMatchId: final.id },
    ],
  });
}

/**
 * Puts one of the seeded IN_PROGRESS tournament's semifinal matches actually
 * live: a confirmed referee assigned, status IN_PROGRESS, a set already
 * open at 0x0 — ready for POST-ing points against via Postman without going
 * through the whole publish → register → close → bracket → start flow.
 */
async function seedLiveRefereeMatch() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const refereeEmail = 'arbitro-teste@toqueplay.com';
  const referee = await prisma.user.upsert({
    where: { email: refereeEmail },
    update: { name: 'Árbitro Teste', password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE' },
    create: { email: refereeEmail, name: 'Árbitro Teste', password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, avatarUrl: 'https://i.pravatar.cc/150?u=arbitro-teste' },
  });

  const tournament = await prisma.tournament.findFirst({ where: { name: 'Torneio Vale do Sinos' } });
  if (!tournament) {
    console.log('  (pulado: torneio "Torneio Vale do Sinos" não encontrado — rode o seed completo primeiro)');
    return;
  }

  await prisma.tournamentReferee.upsert({
    where: { tournamentId_userId: { tournamentId: tournament.id, userId: referee.id } },
    update: { codeConfirmed: true },
    create: { tournamentId: tournament.id, userId: referee.id, codeConfirmed: true },
  });

  const match = await prisma.match.findFirst({
    where: { bracket: { tournamentId: tournament.id }, round: 1, position: 0 },
    include: { teamA: { select: { name: true } }, teamB: { select: { name: true } }, sets: true },
  });
  if (!match) {
    console.log('  (pulado: chaveamento de "Torneio Vale do Sinos" não encontrado)');
    return;
  }

  if (match.status !== MatchStatus.IN_PROGRESS) {
    await prisma.match.update({
      where: { id: match.id },
      data: { status: MatchStatus.IN_PROGRESS, startedAt: new Date(), bestOfSets: match.bestOfSets ?? 3 },
    });
  }
  if (match.sets.length === 0) {
    await prisma.matchSet.create({ data: { matchId: match.id, setNumber: 1, scoreA: 0, scoreB: 0 } });
  }
  const hasStartEvent = await prisma.matchEvent.findFirst({ where: { matchId: match.id, type: 'MATCH_START' } });
  if (!hasStartEvent) {
    await prisma.matchEvent.create({ data: { matchId: match.id, type: 'MATCH_START', setNumber: 1, createdBy: referee.id } });
  }

  console.log('');
  console.log('Árbitro apitando partida ao vivo:');
  console.log(`  Login árbitro .... POST /auth/login  { "email": "${refereeEmail}", "password": "${PASSWORD}" }`);
  console.log(`  Match ID ......... ${match.id}`);
  console.log(`  ${match.teamA?.name ?? 'Time A'} (A)  vs  ${match.teamB?.name ?? 'Time B'} (B)`);
  console.log('  Marcar ponto ..... PATCH /matches/' + match.id + '/point');
  console.log('                     Headers: Authorization: Bearer <accessToken do login>');
  console.log('                     Body:    { "team": "A" }   (ou "B")');
}

/**
 * Standalone team (captain + guest partner) for friendlies — separate pool
 * from the tournament teams so the two seed concerns don't tangle.
 */
async function ensureFriendlyTeam(slug: string, teamName: string, captainName: string, partnerName: string) {
  const captainEmail = `atleta-amistoso-${slug}@toqueplay.com`;
  const hash = await bcrypt.hash(PASSWORD, 10);

  const captain = await prisma.user.upsert({
    where: { email: captainEmail },
    update: { name: captainName, password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE' },
    create: { email: captainEmail, name: captainName, password: hash, role: Role.ATLETA, isEmailVerified: true, isFirstAccess: false, avatarUrl: `https://i.pravatar.cc/150?u=amistoso-${slug}` },
  });

  let team = await prisma.team.findFirst({ where: { name: teamName, ownerId: captain.id } });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: teamName,
        sport: 'VOLEI',
        ownerId: captain.id,
        members: { create: [{ userId: captain.id, isCaptain: true }, { guestName: partnerName, isGuest: true }] },
      },
    });
  }

  return { captain, team };
}

/**
 * One friendly per FriendlyStatus so every state is exercised in the app:
 * a pending challenge, an accepted match, a rejected one, a cancelled one,
 * and a completed one with a final score.
 */
async function seedFriendlies() {
  const teamA = await ensureFriendlyTeam('praia-sul', 'Praia Sul', 'Gustavo Ferreira', 'Renata Cardoso');
  const teamB = await ensureFriendlyTeam('bora-volei', 'Bora Vôlei', 'Eduardo Barros', 'Vanessa Martins');
  const teamC = await ensureFriendlyTeam('litoral-team', 'Litoral Team', 'Rodrigo Nunes', 'Patrícia Gomes', );
  const teamD = await ensureFriendlyTeam('alta-rede', 'Alta Rede', 'Vinicius Rocha', 'Beatriz Correia');

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@toqueplay.com' } });

  const day = 24 * 60 * 60 * 1000;
  const atTime = (date: Date, hh: number, mm: number) => {
    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  const specs: Array<{
    title: string;
    status: FriendlyStatus;
    date: Date;
    startTime: Date;
    requesterId: string;
    requesterTeamId?: string;
    challengedId?: string;
    challengedTeamId?: string;
    address: string;
    addressNumber: string;
    complement?: string;
    neighborhood: string;
    cep: string;
    city: string;
    scoreTeamA?: number;
    scoreTeamB?: number;
  }> = [
    {
      title: 'Desafio Praia Sul x Você',
      status: FriendlyStatus.PENDING,
      date: new Date(Date.now() + 3 * day),
      startTime: atTime(new Date(Date.now() + 3 * day), 16, 0),
      requesterId: teamA.captain.id,
      requesterTeamId: teamA.team.id,
      challengedId: admin.id,
      address: 'Rua General Osório',
      addressNumber: '450',
      neighborhood: 'Centro',
      cep: '93310-000',
      city: 'Novo Hamburgo',
    },
    {
      title: 'Amistoso confirmado — Você x Bora Vôlei',
      status: FriendlyStatus.ACCEPTED,
      date: new Date(Date.now() + 5 * day),
      startTime: atTime(new Date(Date.now() + 5 * day), 18, 30),
      requesterId: admin.id,
      challengedId: teamB.captain.id,
      challengedTeamId: teamB.team.id,
      address: 'Avenida Feevale',
      addressNumber: '1223',
      complement: 'Arena de Areia',
      neighborhood: 'Vila Nova',
      cep: '93525-075',
      city: 'São Leopoldo',
    },
    {
      title: 'Litoral Team x Alta Rede',
      status: FriendlyStatus.REJECTED,
      date: new Date(Date.now() + 2 * day),
      startTime: atTime(new Date(Date.now() + 2 * day), 15, 0),
      requesterId: teamC.captain.id,
      requesterTeamId: teamC.team.id,
      challengedId: teamD.captain.id,
      challengedTeamId: teamD.team.id,
      address: 'Rua Presidente Vargas',
      addressNumber: '80',
      neighborhood: 'Centro',
      cep: '93900-000',
      city: 'Ivoti',
    },
    {
      title: 'Praia Sul x Litoral Team',
      status: FriendlyStatus.CANCELLED,
      date: new Date(Date.now() + 1 * day),
      startTime: atTime(new Date(Date.now() + 1 * day), 19, 0),
      requesterId: teamA.captain.id,
      requesterTeamId: teamA.team.id,
      challengedId: teamC.captain.id,
      challengedTeamId: teamC.team.id,
      address: 'Avenida Ipiranga',
      addressNumber: '6681',
      complement: 'Bloco B',
      neighborhood: 'Jardim Botânico',
      cep: '90610-000',
      city: 'Porto Alegre',
    },
    {
      title: 'Bora Vôlei x Alta Rede',
      status: FriendlyStatus.COMPLETED,
      date: new Date(Date.now() - 3 * day),
      startTime: atTime(new Date(Date.now() - 3 * day), 17, 0),
      requesterId: teamB.captain.id,
      requesterTeamId: teamB.team.id,
      challengedId: teamD.captain.id,
      challengedTeamId: teamD.team.id,
      address: 'Rua da Praia',
      addressNumber: '210',
      neighborhood: 'Balneário',
      cep: '95520-000',
      city: 'Osório',
      scoreTeamA: 2,
      scoreTeamB: 1,
    },
  ];

  for (const spec of specs) {
    const existing = await prisma.friendly.findFirst({ where: { title: spec.title } });

    const data = {
      title: spec.title,
      status: spec.status,
      date: spec.date,
      startTime: spec.startTime,
      requesterId: spec.requesterId,
      requesterTeamId: spec.requesterTeamId,
      challengedId: spec.challengedId,
      challengedTeamId: spec.challengedTeamId,
      address: spec.address,
      addressNumber: spec.addressNumber,
      complement: spec.complement,
      neighborhood: spec.neighborhood,
      cep: spec.cep,
      city: spec.city,
      state: 'RS',
      modality: 'BEACH',
      categoryFormat: 'PAIR',
      scoreTeamA: spec.scoreTeamA,
      scoreTeamB: spec.scoreTeamB,
    };

    if (existing) {
      await prisma.friendly.update({ where: { id: existing.id }, data });
    } else {
      await prisma.friendly.create({ data });
    }
  }

  console.log(`  ${specs.length} amistosos semeados (um por status: ${specs.map((s) => s.status).join(', ')})`);
}

const NEARBY_TOURNAMENTS = [
  { km: 10, name: 'Copa Sinos de Vôlei de Praia', city: 'Novo Hamburgo', status: TournamentStatus.REGISTRATION_OPEN, teamCount: 5, confirmedCount: 3 },
  { km: 25, name: 'Torneio Vale do Sinos', city: 'São Leopoldo', status: TournamentStatus.IN_PROGRESS, teamCount: 4, confirmedCount: 4 },
  { km: 48, name: 'Circuito Serra Gaúcha Beach', city: 'Ivoti', status: TournamentStatus.REGISTRATION_OPEN, teamCount: 6, confirmedCount: 4 },
  { km: 55, name: 'Aberto Metropolitano de Vôlei', city: 'Porto Alegre', status: TournamentStatus.REGISTRATION_OPEN, teamCount: 3, confirmedCount: 1 },
  { km: 80, name: 'Copa Litoral Norte', city: 'Osório', status: TournamentStatus.IN_PROGRESS, teamCount: 4, confirmedCount: 4 },
  { km: 120, name: 'Torneio Serra Catarinense', city: 'Caxias do Sul', status: TournamentStatus.REGISTRATION_OPEN, teamCount: 4, confirmedCount: 2 },
  { km: 200, name: 'Copa Sul de Vôlei', city: 'Santa Cruz do Sul', status: TournamentStatus.REGISTRATION_OPEN, teamCount: 5, confirmedCount: 5 },
];

async function main() {
  console.log('Seeding database...\n');

  const hash = await bcrypt.hash(PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: 'admin@toqueplay.com' },
    update: { name: 'Super Admin', password: hash, role: Role.SUPER_ADMIN, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE', avatarUrl: 'https://i.pravatar.cc/150?u=admin' },
    create: { email: 'admin@toqueplay.com', name: 'Super Admin', password: hash, role: Role.SUPER_ADMIN, isEmailVerified: true, isFirstAccess: false, avatarUrl: 'https://i.pravatar.cc/150?u=admin' },
  });

  console.log('Seeding torneios próximos (teste de localização, CEP base 93220-220)...');

  for (const t of NEARBY_TOURNAMENTS) {
    const slug = slugify(t.name);
    const ownerEmail = `organizador-${slug}@toqueplay.com`;

    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: { name: `Organizador ${t.city}`, password: hash, role: Role.ORGANIZADOR, isEmailVerified: true, isFirstAccess: false, status: 'ACTIVE' },
      create: { email: ownerEmail, name: `Organizador ${t.city}`, password: hash, role: Role.ORGANIZADOR, isEmailVerified: true, isFirstAccess: false, avatarUrl: `https://i.pravatar.cc/150?u=${slug}` },
    });

    let tournament = await prisma.tournament.findFirst({ where: { name: t.name }, include: { categories: true } });
    const { latitude, longitude } = pointAtDistanceKm(t.km);

    // In-progress events are "happening now": the stage date sits on today.
    // Still-open events are upcoming: stage a couple weeks out.
    const stageDate = t.status === TournamentStatus.IN_PROGRESS
      ? new Date()
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    if (!tournament) {
      tournament = await prisma.tournament.create({
        data: {
          name: t.name,
          description: `Torneio de teste a ~${t.km}km do CEP 93220-220`,
          eventType: TournamentEventType.SINGLE,
          status: t.status,
          isPublished: true,
          ownerId: owner.id,
          categories: {
            create: [
              {
                type: TournamentType.MIX,
                format: TournamentFormat.PAIR,
                modality: TournamentModality.BEACH,
                minMembers: 2,
                maxMembers: 2,
                bestOfSets: 3,
                registrationPrice: 120,
                registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
            ],
          },
          stages: {
            create: [
              {
                name: `Etapa Única — ${t.city}`,
                date: stageDate,
                city: t.city,
                state: 'RS',
                cep: '93220220',
                latitude,
                longitude,
                maxTeams: 16,
              },
            ],
          },
        },
        include: { categories: true },
      });
    } else {
      await prisma.tournament.update({ where: { id: tournament.id }, data: { status: t.status, isPublished: true } });
      await prisma.tournamentStage.updateMany({ where: { tournamentId: tournament.id }, data: { date: stageDate, latitude, longitude } });
      await prisma.tournamentCategory.updateMany({ where: { tournamentId: tournament.id }, data: { registrationPrice: 120 } });
    }

    const categoryId = tournament.categories[0].id;

    if (t.status === TournamentStatus.IN_PROGRESS) {
      await seedInProgressTournament(tournament.id, categoryId, slug, t.teamCount);
    } else {
      await seedRegistrationOpenTeams(tournament.id, categoryId, slug, t.teamCount, t.confirmedCount);
    }

    const regCount = await prisma.registration.count({ where: { tournamentId: tournament.id } });
    console.log(`  ~${String(t.km).padStart(3)}km — ${t.status.padEnd(18)} — ${tournament.name} (${t.city}/RS) — ${regCount} times inscritos`);
  }

  await seedLiveRefereeMatch();

  console.log('');
  console.log('Seeding amistosos (todos os status)...');
  await seedFriendlies();

  console.log('');
  console.log('Seed completo!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Senha: ${PASSWORD}`);
  console.log('Admin: admin@toqueplay.com');
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
