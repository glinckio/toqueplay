import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TOURNAMENT_NAME = process.argv[2] ?? 'Copa Ilha de Verão 2025';
const REFEREE_EMAIL = process.argv[3] ?? 'atleta17@seed.toqueplay.com';

async function main() {
  const tournament = await prisma.tournament.findFirst({ where: { name: TOURNAMENT_NAME } });
  const refereeUser = await prisma.user.findUnique({ where: { email: REFEREE_EMAIL } });

  if (!tournament || !refereeUser) {
    console.error('Torneio ou usuário não encontrado.');
    process.exit(1);
  }

  const updated = await prisma.tournamentReferee.updateMany({
    where: { tournamentId: tournament.id, userId: refereeUser.id },
    data: { codeConfirmed: false },
  });

  console.log(`${updated.count} convite(s) de árbitro resetado(s) para "${REFEREE_EMAIL}" em "${tournament.name}".`);
  console.log('Agora precisa gerar o código como organizador e entrar com ele como esse árbitro pra testar o fluxo de verdade.');
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
