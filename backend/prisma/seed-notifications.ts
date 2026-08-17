import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_EMAIL = process.argv[2] ?? 'atleta01@seed.toqueplay.com';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    console.error(`Usuário "${TARGET_EMAIL}" não encontrado.`);
    process.exit(1);
  }

  const tournament = await prisma.tournament.findFirst({ orderBy: { createdAt: 'desc' } });
  const team = await prisma.team.findFirst({ orderBy: { createdAt: 'asc' } });
  const opponentTeam = await prisma.team.findFirst({ orderBy: { createdAt: 'asc' }, skip: 1 });

  const tournamentId = tournament?.id ?? null;
  const teamId = team?.id ?? null;
  const tournamentName = tournament?.name ?? 'Copa Ilha de Verão 2025';
  const teamName = team?.name ?? 'Trovão';
  const opponentName = opponentTeam?.name ?? 'Furacão';

  // One row per notification "type" the backend actually emits today
  // (grepped every notificationService.createNotification/sendToUsers call site),
  // with the same title/body templates used in production.
  const notifications = [
    {
      title: 'Inscrição Confirmada!',
      body: `Sua inscrição no torneio "${tournamentName}" foi confirmada.`,
      type: 'REGISTRATION_CONFIRMED',
      referenceId: tournamentId,
    },
    {
      title: 'Chaveamento Gerado!',
      body: `O chaveamento do torneio "${tournamentName}" foi gerado. Confira!`,
      type: 'BRACKET_GENERATED',
      referenceId: tournamentId,
    },
    {
      title: 'Nova Solicitação de Amistoso',
      body: `Seu time recebeu uma solicitação de amistoso de ${opponentName}!`,
      type: 'FRIENDLY_REQUEST',
      referenceId: null,
    },
    {
      title: 'Amistoso Aceito!',
      body: `O amistoso ${teamName} vs ${opponentName} foi confirmado!`,
      type: 'FRIENDLY_ACCEPTED',
      referenceId: null,
    },
    {
      title: 'Amistoso Recusado',
      body: `O time adversário recusou a solicitação de amistoso do seu time ${teamName}.`,
      type: 'FRIENDLY_REJECTED',
      referenceId: null,
    },
    {
      title: 'Set Encerrado',
      body: 'Set 2 encerrado! Placar: 21 x 18',
      type: 'MATCH_SET',
      referenceId: null,
    },
    {
      title: 'Partida Encerrada',
      body: `Partida finalizada! Vencedor: ${teamName} (2 x 1)`,
      type: 'MATCH_FINISH',
      referenceId: null,
    },
    {
      title: 'Convite para time',
      body: `Você foi convidado para o time "${teamName}"`,
      type: 'TEAM_INVITE',
      referenceId: teamId,
    },
    {
      title: 'Torneio Iniciado!',
      body: `O torneio "${tournamentName}" começou! Acompanhe os jogos.`,
      type: 'TOURNAMENT_STARTED',
      referenceId: tournamentId,
    },
    {
      title: 'Convite de Árbitro',
      body: `Você foi adicionado como árbitro do torneio ${tournamentName}.`,
      type: 'REFEREE_ASSIGNED',
      referenceId: tournamentId,
    },
    {
      title: 'Torneio Finalizado!',
      body: `O torneio "${tournamentName}" foi finalizado. Confira o resultado!`,
      type: 'TOURNAMENT_COMPLETED',
      referenceId: tournamentId,
    },
  ];

  const types = notifications.map((n) => n.type);
  await prisma.notification.deleteMany({ where: { userId: user.id, type: { in: types } } });

  for (const n of notifications) {
    await prisma.notification.create({ data: { userId: user.id, ...n } });
  }

  console.log(`${notifications.length} notificações (todos os tipos) criadas para ${TARGET_EMAIL}.`);
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
