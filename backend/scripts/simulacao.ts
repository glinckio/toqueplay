/**
 * Simulação ponta a ponta dos três formatos de competição.
 *
 * Roda contra o banco e os serviços de verdade — sem mock. Cobre:
 *   - torneio único (uma etapa) em cada tipo de chaveamento
 *   - liga (chave única, várias datas) com round robin e grupos+mata-mata
 *   - circuito (várias etapas, times diferentes por etapa) com tabela acumulada e final
 *
 * As partidas são jogadas pelo fluxo real de arbitragem: o placar de cada set é gravado e o
 * encerramento passa por `finishSet`/`finishMatch`, para os ganchos de avanço de chave e de
 * recálculo de colocação rodarem como rodariam em produção.
 *
 * Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/simulacao.ts
 */
import { Test } from '@nestjs/testing';
import {
  BracketType,
  MatchStatus,
  PrismaClient,
  TournamentEventType,
  TournamentFormat,
  TournamentModality,
  TournamentType,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';
import { TournamentsService } from '../src/modules/tournaments/tournaments.service';
import { RegistrationsService } from '../src/modules/registrations/registrations.service';
import { BracketsService } from '../src/modules/brackets/brackets.service';
import { MatchesService } from '../src/modules/matches/matches.service';
import { StandingsService } from '../src/modules/standings/standings.service';
import { StorageService } from '../src/modules/storage/storage.service';

/** Tudo que a simulação cria leva este prefixo, para poder limpar sem tocar em dado real. */
const TAG = '[SIM]';

const log = (msg: string) => console.log(msg);
const secao = (titulo: string) => {
  console.log('');
  console.log('━'.repeat(78));
  console.log(titulo);
  console.log('━'.repeat(78));
};

let falhas = 0;
function checar(descricao: string, condicao: boolean, detalhe?: string) {
  if (condicao) {
    log(`  ✓ ${descricao}`);
  } else {
    falhas++;
    log(`  ✗ ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  }
}

async function main() {
  // Storage e notificacoes falam com servicos externos (MinIO, push) que nao interessam aqui e
  // nao sobem numa maquina de dev. O resto e tudo real: banco, servicos e regras.
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(StorageService)
    .useValue({
      uploadFile: async () => 'http://sim/arquivo',
      deleteFile: async () => undefined,
      extractKeyFromUrl: () => null,
    })
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const prisma = app.get(PrismaService) as unknown as PrismaClient;
  const tournaments = app.get(TournamentsService);
  const registrations = app.get(RegistrationsService);
  const brackets = app.get(BracketsService);
  const matches = app.get(MatchesService);
  const standings = app.get(StandingsService);

  await limpar(prisma);

  const { organizador, arbitro, times } = await criarBase(prisma);

  const ctx = { prisma, tournaments, registrations, brackets, matches, standings, organizador, arbitro, times };

  await simularTorneioUnico(ctx, BracketType.SINGLE_ELIMINATION, 4);
  await simularTorneioUnico(ctx, BracketType.ROUND_ROBIN, 4);
  await simularTorneioUnico(ctx, BracketType.GROUPS_THEN_ELIMINATION, 8);
  await simularTorneioUnico(ctx, BracketType.DOUBLE_ELIMINATION, 4);

  await simularLiga(ctx);
  await simularCircuito(ctx);

  secao('RESULTADO');
  if (falhas === 0) {
    log('  Todas as verificações passaram.');
  } else {
    log(`  ${falhas} verificação(ões) falharam.`);
  }

  await app.close();
  process.exit(falhas === 0 ? 0 : 1);
}

/** Remove o que uma execução anterior deixou, para a simulação ser repetível. */
async function limpar(prisma: PrismaClient) {
  const antigos = await prisma.tournament.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  const ids = antigos.map((t) => t.id);
  if (ids.length > 0) {
    await prisma.match.deleteMany({ where: { bracket: { tournamentId: { in: ids } } } });
    await prisma.bracket.deleteMany({ where: { tournamentId: { in: ids } } });
    await prisma.registration.deleteMany({ where: { tournamentId: { in: ids } } });
    await prisma.stagePlacement.deleteMany({ where: { tournamentId: { in: ids } } });
    // AthleteStats e RESTRICT: sem apagar antes, o torneio nao sai.
    await prisma.athleteStats.deleteMany({ where: { tournamentId: { in: ids } } });
    await prisma.tournamentPointsRule.deleteMany({ where: { tournamentId: { in: ids } } });
    await prisma.tournamentReferee.deleteMany({ where: { tournamentId: { in: ids } } });
    await prisma.tournamentStage.deleteMany({ where: { tournamentId: { in: ids } } });
    await prisma.tournamentCategory.deleteMany({ where: { tournamentId: { in: ids } } });
    await prisma.tournament.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.teamMember.deleteMany({ where: { team: { name: { startsWith: TAG } } } });
  await prisma.team.deleteMany({ where: { name: { startsWith: TAG } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@sim.local' } } });
}

async function criarBase(prisma: PrismaClient) {
  const organizador = await prisma.user.create({
    data: { name: 'Organizador Sim', email: 'org@sim.local', password: 'x', isEmailVerified: true },
  });
  const arbitro = await prisma.user.create({
    data: { name: 'Árbitro Sim', email: 'arb@sim.local', password: 'x', isEmailVerified: true },
  });

  // 12 duplas: o suficiente para 8 no mata-mata com grupos e ainda sobrar para o circuito.
  const times: { id: string; ownerId: string; memberIds: string[] }[] = [];
  for (let i = 1; i <= 12; i++) {
    const dono = await prisma.user.create({
      data: { name: `Capitão ${i}`, email: `cap${i}@sim.local`, password: 'x', isEmailVerified: true },
    });
    const parceiro = await prisma.user.create({
      data: { name: `Parceiro ${i}`, email: `par${i}@sim.local`, password: 'x', isEmailVerified: true },
    });
    const team = await prisma.team.create({
      data: {
        name: `${TAG} Dupla ${i}`,
        ownerId: dono.id,
        members: {
          create: [
            { userId: dono.id, isCaptain: true, cpf: cpfFake(i * 2 - 1) },
            { userId: parceiro.id, isCaptain: false, cpf: cpfFake(i * 2) },
          ],
        },
      },
      include: { members: true },
    });
    times.push({ id: team.id, ownerId: dono.id, memberIds: team.members.map((m) => m.id) });
  }

  log(`Base criada: 1 organizador, 1 árbitro, ${times.length} duplas.`);
  return { organizador, arbitro, times };
}

/** CPF sintético só para diferenciar atletas; não precisa passar em validação de dígito aqui. */
const cpfFake = (n: number) => String(10000000000 + n);

type Ctx = {
  prisma: PrismaClient;
  tournaments: TournamentsService;
  registrations: RegistrationsService;
  brackets: BracketsService;
  matches: MatchesService;
  standings: StandingsService;
  organizador: { id: string };
  arbitro: { id: string };
  times: { id: string; ownerId: string; memberIds: string[] }[];
};

/** Monta torneio até ficar pronto para gerar chave, com N etapas. */
async function montarTorneio(
  ctx: Ctx,
  nome: string,
  eventType: TournamentEventType,
  etapas: number,
  extra: Record<string, unknown> = {},
) {
  const t = await ctx.tournaments.create(ctx.organizador.id, {
    name: `${TAG} ${nome}`,
    description: 'Simulação',
  } as any);

  // Publicar exige etapa a pelo menos 1 semana no futuro; gerar chave exige que ela esteja a
  // no maximo 2 dias. As duas regras convivem na vida real porque o tempo passa — aqui a data e
  // aproximada por `chegarADataDaEtapa` na hora de gerar.
  const hoje = new Date();
  const stages = Array.from({ length: etapas }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + 10 + i * 30);
    // Publicar exige local em todas as etapas.
    return {
      name: `Etapa ${i + 1}`,
      date: d.toISOString(),
      maxTeams: 16,
      address: `Praia ${i + 1}, 100`,
      city: 'Santos',
      state: 'SP',
    };
  });

  await ctx.tournaments.updateStructure(t.id, ctx.organizador.id, {
    eventType,
    stages,
    categories: [
      {
        type: TournamentType.MALE,
        format: TournamentFormat.PAIR,
        modality: TournamentModality.BEACH,
        minMembers: 2,
        maxMembers: 2,
        bestOfSets: 3,
      },
    ],
    ...extra,
  } as any);

  await ctx.tournaments.publish(t.id, ctx.organizador.id);
  await ctx.tournaments.openRegistration(t.id, ctx.organizador.id);

  const completo = await ctx.prisma.tournament.findUniqueOrThrow({
    where: { id: t.id },
    include: { stages: { orderBy: { date: 'asc' } }, categories: true },
  });

  // O árbitro precisa estar confirmado: partida de torneio só é apitada por ele.
  await ctx.prisma.tournamentReferee.create({
    data: { tournamentId: t.id, userId: ctx.arbitro.id, codeConfirmed: true },
  });

  return completo;
}

/** Simula a chegada do dia da etapa: sem isso o gerador recusa por "cedo demais". */
async function chegarADataDaEtapa(ctx: Ctx, stageId: string) {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  await ctx.prisma.tournamentStage.update({ where: { id: stageId }, data: { date: ontem } });
}

async function inscrever(ctx: Ctx, tournamentId: string, categoryId: string, stageId: string, quantos: number, offset = 0) {
  const inscritos: string[] = [];
  for (let i = offset; i < offset + quantos; i++) {
    const time = ctx.times[i % ctx.times.length];
    const reg = await ctx.registrations.registerTeam(tournamentId, time.ownerId, {
      teamId: time.id,
      categoryId,
      stageId,
      memberIds: time.memberIds,
    } as any);
    await ctx.registrations.confirmRegistration(tournamentId, reg.id, ctx.organizador.id);
    inscritos.push(time.id);
  }
  return inscritos;
}

/**
 * Joga todas as partidas que já têm os dois times definidos, repetindo até a chave parar de
 * produzir novos confrontos. É assim que o mata-mata avança: a rodada seguinte só ganha times
 * quando a anterior termina.
 */
async function jogarTudo(ctx: Ctx, tournamentId: string, stageId: string) {
  let jogadas = 0;
  for (let volta = 0; volta < 20; volta++) {
    const pendentes = await ctx.prisma.match.findMany({
      where: {
        bracket: { tournamentId, stageId },
        status: { in: [MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS] },
        teamAId: { not: null },
        teamBId: { not: null },
      },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    });
    if (pendentes.length === 0) break;

    for (const m of pendentes) {
      await jogarPartida(ctx, m.id, volta + jogadas);
      jogadas++;
    }
  }
  return jogadas;
}

/** Joga uma partida inteira: 2 sets a 0 para um lado, alternando quem vence a cada chamada. */
async function jogarPartida(ctx: Ctx, matchId: string, semente: number) {
  const antes = await ctx.prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  if (antes.status === MatchStatus.SCHEDULED) {
    await ctx.matches.startMatch(matchId, ctx.arbitro.id);
  }

  const vencedorA = semente % 2 === 0;

  for (let setNumber = 1; setNumber <= 2; setNumber++) {
    const set = await ctx.prisma.matchSet.findFirst({ where: { matchId, setNumber } });
    if (!set) continue;
    // Placar gravado direto; o encerramento passa pelo serviço para os ganchos rodarem.
    await ctx.prisma.matchSet.update({
      where: { id: set.id },
      data: { scoreA: vencedorA ? 21 : 15, scoreB: vencedorA ? 15 : 21 },
    });
    await ctx.matches.finishSet(matchId, ctx.arbitro.id, { setNumber } as any);
  }

  const depois = await ctx.prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  if (depois.status !== MatchStatus.FINISHED) {
    await ctx.matches.finishMatch(matchId, ctx.arbitro.id);
  }
}

async function simularTorneioUnico(ctx: Ctx, tipo: BracketType, times: number) {
  secao(`TORNEIO ÚNICO · ${tipo} · ${times} duplas`);

  const t = await montarTorneio(ctx, `Único ${tipo}`, TournamentEventType.SINGLE, 1);
  const stage = t.stages[0];
  const cat = t.categories[0];

  await inscrever(ctx, t.id, cat.id, stage.id, times);
  await ctx.tournaments.closeRegistration(t.id, ctx.organizador.id);
  await chegarADataDaEtapa(ctx, stage.id);

  await ctx.brackets.generateBracket(t.id, ctx.organizador.id, {
    categoryId: cat.id,
    type: tipo,
    stageId: stage.id,
    ...(tipo === BracketType.GROUPS_THEN_ELIMINATION ? { groupsCount: 2 } : {}),
  } as any);

  const geradas = await ctx.prisma.match.count({ where: { bracket: { tournamentId: t.id } } });
  checar(`chave gerada (${geradas} partidas)`, geradas > 0);

  const jogadas = await jogarTudo(ctx, t.id, stage.id);
  checar(`partidas disputadas (${jogadas})`, jogadas > 0);

  const colocacoes = await ctx.standings.computeStagePlacements(stage.id, cat.id);
  const campeao = colocacoes.filter((c) => c.position === 1);
  checar('existe exatamente um campeão', campeao.length === 1, `achei ${campeao.length}`);
  checar('campeão pontuou 100', campeao[0]?.points === 100, `pontos=${campeao[0]?.points}`);

  if (tipo === BracketType.SINGLE_ELIMINATION && times === 4) {
    const terceiros = colocacoes.filter((c) => c.position === 3);
    checar('dois times dividem o 3º lugar', terceiros.length === 2, `achei ${terceiros.length}`);
    checar('não existe 4º lugar', !colocacoes.some((c) => c.position === 4));
  }

  if (tipo === BracketType.ROUND_ROBIN) {
    const posicoes = colocacoes.map((c) => c.position).sort((a, b) => a - b);
    checar('classificação completa e sem empate', JSON.stringify(posicoes) === JSON.stringify([1, 2, 3, 4]), posicoes.join(','));
  }
}

async function simularLiga(ctx: Ctx) {
  for (const tipo of [BracketType.ROUND_ROBIN, BracketType.GROUPS_THEN_ELIMINATION] as const) {
    secao(`LIGA · ${tipo} · 6 duplas`);

    const t = await montarTorneio(ctx, `Liga ${tipo}`, TournamentEventType.LEAGUE, 1, {
      matchesPerDay: 4,
    });
    const stage = t.stages[0];
    const cat = t.categories[0];

    await inscrever(ctx, t.id, cat.id, stage.id, 6);
    await ctx.tournaments.closeRegistration(t.id, ctx.organizador.id);
    await chegarADataDaEtapa(ctx, stage.id);

    await ctx.brackets.generateBracket(t.id, ctx.organizador.id, {
      categoryId: cat.id,
      type: tipo,
      stageId: stage.id,
      ...(tipo === BracketType.GROUPS_THEN_ELIMINATION ? { groupsCount: 2 } : {}),
    } as any);

    // Calendário: o organizador informa as datas, o sistema distribui.
    const preview = await ctx.brackets.previewSchedule(t.id);
    checar(
      `calendário calculado (${preview.totalMatches} partidas → ${preview.datesNeeded} dias)`,
      preview.datesNeeded === Math.ceil(preview.totalMatches / 4),
    );

    const datas = Array.from({ length: preview.datesNeeded }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + 7 * (i + 1));
      return d.toISOString();
    });
    const agendado = await ctx.brackets.scheduleMatches(t.id, ctx.organizador.id, { dates: datas } as any);
    checar(`partidas agendadas (${agendado.scheduled})`, agendado.scheduled === preview.totalMatches);

    // Faltando data, precisa falhar inteiro em vez de agendar pela metade.
    let recusou = false;
    try {
      await ctx.brackets.scheduleMatches(t.id, ctx.organizador.id, { dates: [datas[0]] } as any);
    } catch {
      recusou = true;
    }
    checar('recusa agendar com datas de menos', recusou);

    await jogarTudo(ctx, t.id, stage.id);

    const bracket = await ctx.prisma.bracket.findFirstOrThrow({ where: { tournamentId: t.id } });
    const grupos = await ctx.standings.getGroupStandings(bracket.id);

    if (tipo === BracketType.ROUND_ROBIN) {
      checar('tabela de classificação montada', grupos.length >= 1 && grupos[0].rows.length === 6, `grupos=${grupos.length}`);
      const linhas = grupos[0].rows;
      const ordenado = linhas.every((r, i) => i === 0 || linhas[i - 1].wins >= r.wins);
      checar('tabela ordenada por vitórias', ordenado);
      const somaJogos = linhas.reduce((acc, r) => acc + r.played, 0);
      checar('todos jogaram 5 partidas', linhas.every((r) => r.played === 5), `soma=${somaJogos}`);
      const pontosValidos = linhas.every((r) => r.leaguePoints === r.wins * 3);
      checar('pontuação 3 por vitória (nenhum set decisivo)', pontosValidos);
    } else {
      checar('dois grupos na fase classificatória', grupos.length === 2, `achei ${grupos.length}`);
    }

    // Eliminação dupla é bloqueada na liga: o total de partidas não é previsível.
    let bloqueou = false;
    try {
      await ctx.brackets.generateBracket(t.id, ctx.organizador.id, {
        categoryId: cat.id,
        type: BracketType.DOUBLE_ELIMINATION,
        stageId: stage.id,
      } as any);
    } catch {
      bloqueou = true;
    }
    checar('liga recusa eliminação dupla', bloqueou);
  }
}

async function simularCircuito(ctx: Ctx) {
  secao('CIRCUITO · 3 etapas · times diferentes por etapa');

  const t = await montarTorneio(ctx, 'Circuito', TournamentEventType.CIRCUIT, 3, {
    finalStageTeamCount: 4,
  });
  const cat = t.categories[0];

  // Cada etapa recebe um conjunto parcialmente diferente — é o que diferencia circuito de liga.
  const inscritosPorEtapa = [
    { stage: t.stages[0], offset: 0, quantos: 4 },
    { stage: t.stages[1], offset: 2, quantos: 4 },
    { stage: t.stages[2], offset: 4, quantos: 4 },
  ];

  for (const [i, plano] of inscritosPorEtapa.entries()) {
    // Cada etapa tem o proprio ciclo: reabre inscricao, recebe os times daquela etapa e fecha.
    if (i > 0) await ctx.tournaments.openRegistration(t.id, ctx.organizador.id);
    await inscrever(ctx, t.id, cat.id, plano.stage.id, plano.quantos, plano.offset);
    await ctx.tournaments.closeRegistration(t.id, ctx.organizador.id);
    await chegarADataDaEtapa(ctx, plano.stage.id);

    await ctx.brackets.generateBracket(t.id, ctx.organizador.id, {
      categoryId: cat.id,
      type: BracketType.SINGLE_ELIMINATION,
      stageId: plano.stage.id,
    } as any);

    const jogadas = await jogarTudo(ctx, t.id, plano.stage.id);
    await ctx.standings.computeStagePlacements(plano.stage.id, cat.id);
    checar(`etapa ${i + 1}: chave própria gerada e disputada (${jogadas} partidas)`, jogadas > 0);
  }

  const chaves = await ctx.prisma.bracket.count({ where: { tournamentId: t.id } });
  checar('três chaves independentes, uma por etapa', chaves === 3, `achei ${chaves}`);

  const tabela = await ctx.standings.getTournamentStandings(t.id);
  const linhas = tabela.categories[0].rows;
  checar('tabela acumulada tem linhas', linhas.length > 0, `${linhas.length} times`);

  const ordenada = linhas.every((r, i) => i === 0 || linhas[i - 1].total >= r.total);
  checar('tabela ordenada por pontos', ordenada);

  const parcial = linhas.find((r) => Object.keys(r.byStage).length < 3);
  checar(
    'quem não jogou uma etapa não tem linha nela',
    !!parcial,
    parcial ? `${parcial.team.name} jogou ${Object.keys(parcial.byStage).length}/3` : 'todos jogaram tudo',
  );

  const somaConfere = linhas.every(
    (r) => r.total === Object.values(r.byStage).reduce((acc, e) => acc + e.points, 0),
  );
  checar('total bate com a soma das etapas', somaConfere);

  const classificados = await ctx.standings.getFinalStageQualifiers(t.id);
  const q = classificados[0].qualifiers;
  checar('final do circuito leva os 4 melhores', q.length === 4, `achei ${q.length}`);
  checar('cabeça de chave na ordem da tabela', q[0].seed === 1 && q[0].points >= q[1].points);

  // A pontuação não pode mudar no meio: a chave já foi gerada.
  let travou = false;
  try {
    await ctx.standings.replacePointsRules(t.id, [{ placement: 1, points: 999 }]);
  } catch {
    travou = true;
  }
  checar('tabela de pontos travada após a chave existir', travou);

  log('');
  log('  Tabela acumulada:');
  for (const [i, r] of linhas.entries()) {
    const porEtapa = t.stages
      .map((s) => (r.byStage[s.id] ? String(r.byStage[s.id].points).padStart(3) : '  —'))
      .join(' ');
    log(`   ${String(i + 1).padStart(2)}. ${r.team.name.replace(TAG + ' ', '').padEnd(10)} ${porEtapa}  =${String(r.total).padStart(4)}`);
  }
}

main().catch((err) => {
  console.error('Simulação abortou:', err);
  process.exit(1);
});
