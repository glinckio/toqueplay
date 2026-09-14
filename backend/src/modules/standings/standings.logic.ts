/**
 * Regras puras de classificacao e pontuacao. Sem Prisma de proposito: e a parte que erra em
 * silencio (um desempate na ordem errada muda quem avanca), entao fica isolada e testavel.
 */

export interface MatchForStandings {
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  /** Sets ganhos por cada lado — e o que `Match.scoreTeamA/B` guarda. */
  scoreTeamA: number;
  scoreTeamB: number;
  /** Pontos de cada set, para o pontos average. */
  sets: { scoreA: number; scoreB: number }[];
}

export interface StandingRow {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  /** Pontos da tabela: 3 para vitoria folgada, 2/1 quando vai ao set decisivo. */
  leaguePoints: number;
  setAverage: number;
  pointAverage: number;
}

const ratio = (won: number, lost: number) => (lost === 0 ? won : won / lost);

/**
 * Pontos CBV/FIVB pelo placar em sets: vitoria sem levar o set decisivo vale 3 e o perdedor
 * leva 0; vitoria no set decisivo vale 2 e o perdedor ainda leva 1.
 *
 * Generalizado por `bestOfSets` para valer tanto no melhor de 5 (3x2) quanto no de 3 (2x1),
 * que e o usual na areia.
 */
export function leaguePointsFor(
  setsWon: number,
  setsLost: number,
  bestOfSets: number,
): { winner: number; loser: number } {
  const setsToWin = Math.ceil(bestOfSets / 2);
  const foiAoDecisivo = Math.max(setsWon, setsLost) === setsToWin && Math.min(setsWon, setsLost) === setsToWin - 1;
  return foiAoDecisivo ? { winner: 2, loser: 1 } : { winner: 3, loser: 0 };
}

export function buildStandings(
  teamIds: string[],
  matches: MatchForStandings[],
  bestOfSets: number,
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const teamId of teamIds) {
    rows.set(teamId, {
      teamId, played: 0, wins: 0, losses: 0,
      setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0,
      leaguePoints: 0, setAverage: 0, pointAverage: 0,
    });
  }

  for (const m of matches) {
    if (!m.teamAId || !m.teamBId || !m.winnerId) continue;
    const a = rows.get(m.teamAId);
    const b = rows.get(m.teamBId);
    if (!a || !b) continue;

    const pontosA = m.sets.reduce((acc, s) => acc + s.scoreA, 0);
    const pontosB = m.sets.reduce((acc, s) => acc + s.scoreB, 0);

    a.played++; b.played++;
    a.setsWon += m.scoreTeamA; a.setsLost += m.scoreTeamB;
    b.setsWon += m.scoreTeamB; b.setsLost += m.scoreTeamA;
    a.pointsWon += pontosA; a.pointsLost += pontosB;
    b.pointsWon += pontosB; b.pointsLost += pontosA;

    const vencedorA = m.winnerId === m.teamAId;
    const { winner, loser } = leaguePointsFor(
      Math.max(m.scoreTeamA, m.scoreTeamB),
      Math.min(m.scoreTeamA, m.scoreTeamB),
      bestOfSets,
    );
    if (vencedorA) {
      a.wins++; b.losses++;
      a.leaguePoints += winner; b.leaguePoints += loser;
    } else {
      b.wins++; a.losses++;
      b.leaguePoints += winner; a.leaguePoints += loser;
    }
  }

  for (const row of rows.values()) {
    row.setAverage = ratio(row.setsWon, row.setsLost);
    row.pointAverage = ratio(row.pointsWon, row.pointsLost);
  }

  return sortStandings([...rows.values()], matches);
}

/**
 * Ordem oficial da CBV: vitorias, sets average, pontos average, confronto direto, sorteio.
 *
 * O confronto direto so entra quando restam exatamente DUAS equipes empatadas — com tres ou mais
 * ele pode formar ciclo (A ganha de B, B de C, C de A) e nao resolve nada. Sorteio nao e
 * automatizado: empate que chega ate ali fica empatado e o organizador decide.
 */
export function sortStandings(rows: StandingRow[], matches: MatchForStandings[]): StandingRow[] {
  const headToHead = (x: StandingRow, y: StandingRow): number => {
    const confronto = matches.find(
      (m) =>
        m.winnerId &&
        ((m.teamAId === x.teamId && m.teamBId === y.teamId) ||
          (m.teamAId === y.teamId && m.teamBId === x.teamId)),
    );
    if (!confronto) return 0;
    if (confronto.winnerId === x.teamId) return -1;
    if (confronto.winnerId === y.teamId) return 1;
    return 0;
  };

  const empatadosAntesDoConfronto = (x: StandingRow, y: StandingRow) =>
    x.wins === y.wins && x.setAverage === y.setAverage && x.pointAverage === y.pointAverage;

  return [...rows].sort((x, y) => {
    if (x.wins !== y.wins) return y.wins - x.wins;
    if (x.setAverage !== y.setAverage) return y.setAverage - x.setAverage;
    if (x.pointAverage !== y.pointAverage) return y.pointAverage - x.pointAverage;

    // So aplica confronto direto se o empate for de dois: conta quantos empatam com x.
    const empatadosComX = rows.filter((r) => empatadosAntesDoConfronto(r, x)).length;
    if (empatadosComX === 2) return headToHead(x, y);
    return 0;
  });
}

/**
 * Colocacao de quem caiu num chaveamento eliminatorio.
 *
 * Quem perde na mesma fase divide a mesma colocacao — e por isso que nao existe 4o nem 6o lugar
 * em mata-mata de 8. Perder na rodada `round` de um total de `totalRounds` da a posicao
 * 2^(totalRounds - round) + 1: final -> 2o, semi -> 3o, quartas -> 5o.
 */
export function placementForEliminationLoss(round: number, totalRounds: number): number {
  return Math.pow(2, totalRounds - round) + 1;
}

/**
 * Pontos de uma colocacao segundo a tabela do organizador.
 *
 * A regra vale da colocacao definida ate a proxima: uma linha em 9o cobre do 9o ao 16o, que e
 * exatamente como as tabelas de circuito sao publicadas. Colocacao sem nenhuma regra abaixo dela
 * vale zero.
 */
export function pointsForPlacement(
  rules: { placement: number; points: number }[],
  placement: number,
): number {
  const aplicavel = rules
    .filter((r) => r.placement <= placement)
    .sort((a, b) => b.placement - a.placement)[0];
  return aplicavel?.points ?? 0;
}

/**
 * Colocacao num round robin.
 *
 * A chave tem duas partes: o todos-contra-todos, que produz a tabela, e um playoff opcional
 * (final e disputa de 3o) criado com `label`. A tabela ordena todo mundo; quando o playoff foi
 * jogado, ele manda no pódio — quem venceu a final e campeao ainda que nao tenha liderado a
 * classificacao.
 */
export function placementsFromRoundRobin(
  matches: (MatchForStandings & { label?: string | null })[],
  bestOfSets: number,
): Map<string, number> {
  const classificatoria = matches.filter((m) => !m.label);
  const times = new Set<string>();
  for (const m of classificatoria) {
    if (m.teamAId) times.add(m.teamAId);
    if (m.teamBId) times.add(m.teamBId);
  }

  const tabela = buildStandings([...times], classificatoria, bestOfSets);
  const posicoes = new Map<string, number>(tabela.map((r, i) => [r.teamId, i + 1]));

  const aplicarDecisao = (label: string, colocacaoVencedor: number) => {
    const jogo = matches.find((m) => m.label === label && m.winnerId);
    if (!jogo) return;
    const perdedor = jogo.winnerId === jogo.teamAId ? jogo.teamBId : jogo.teamAId;
    posicoes.set(jogo.winnerId!, colocacaoVencedor);
    if (perdedor) posicoes.set(perdedor, colocacaoVencedor + 1);
  };

  aplicarDecisao('FINAL', 1);
  aplicarDecisao('TERCEIRO_LUGAR', 3);

  return posicoes;
}

/**
 * Colocacao de todos os times de uma chave puramente eliminatoria.
 *
 * So considera partidas ja decididas: quem ainda joga fica sem colocacao, que e o correto para a
 * tabela parcial de uma etapa em andamento.
 */
export function placementsFromElimination(
  matches: (MatchForStandings & { round: number })[],
): Map<string, number> {
  const posicoes = new Map<string, number>();
  if (matches.length === 0) return posicoes;

  const totalRounds = Math.max(...matches.map((m) => m.round), 1);

  for (const m of matches) {
    if (!m.winnerId) continue;
    const perdedorId = m.winnerId === m.teamAId ? m.teamBId : m.teamAId;
    if (perdedorId) {
      posicoes.set(perdedorId, placementForEliminationLoss(m.round, totalRounds));
    }
    if (m.round === totalRounds) posicoes.set(m.winnerId, 1);
  }

  return posicoes;
}

/**
 * Colocacao numa chave de grupos + mata-mata.
 *
 * As duas fases nao podem ser tratadas igual: o gerador numera as rodadas de grupo a partir de 1
 * e as do mata-mata a partir de 101, entao medir "distancia da final" sobre todas as partidas
 * faria um time eliminado no grupo receber 2^101 de colocacao.
 *
 * Quem chegou ao mata-mata e colocado por ele. Quem caiu no grupo vem depois, na ordem da
 * classificacao do proprio grupo.
 */
export function placementsFromGroupsThenElimination(
  matches: (MatchForStandings & { round: number; group: number | null })[],
  bestOfSets: number,
): Map<string, number> {
  const mataMata = matches.filter((m) => m.group === null || m.group === undefined);
  const faseDeGrupos = matches.filter((m) => m.group !== null && m.group !== undefined);

  const posicoes = placementsFromElimination(mataMata);

  const noMataMata = new Set<string>();
  for (const m of mataMata) {
    if (m.teamAId) noMataMata.add(m.teamAId);
    if (m.teamBId) noMataMata.add(m.teamBId);
  }

  // Quem nao passou do grupo comeca logo depois de todos os classificados.
  const primeiraColocacaoDeGrupo = noMataMata.size + 1;
  const timesDoGrupo = new Set<string>();
  for (const m of faseDeGrupos) {
    if (m.teamAId) timesDoGrupo.add(m.teamAId);
    if (m.teamBId) timesDoGrupo.add(m.teamBId);
  }

  const eliminados = buildStandings([...timesDoGrupo], faseDeGrupos, bestOfSets).filter(
    (r) => !noMataMata.has(r.teamId),
  );
  eliminados.forEach((r, i) => posicoes.set(r.teamId, primeiraColocacaoDeGrupo + i));

  return posicoes;
}

/**
 * Colocacao na eliminacao dupla.
 *
 * Aqui a formula de "distancia da final" nao vale: o time cai so na segunda derrota, e as duas
 * chaves (vencedores e perdedores) usam numeracao propria. A ordem sai de quando cada time foi
 * eliminado — quem sobreviveu mais tempo fica na frente.
 */
export function placementsFromDoubleElimination(
  matches: (MatchForStandings & { round: number })[],
): Map<string, number> {
  const derrotas = new Map<string, number>();
  const ultimaDerrota = new Map<string, number>();

  const decididas = matches.filter((m) => m.winnerId && m.teamAId && m.teamBId);
  for (const m of decididas) {
    const perdedor = m.winnerId === m.teamAId ? m.teamBId! : m.teamAId!;
    derrotas.set(perdedor, (derrotas.get(perdedor) ?? 0) + 1);
    ultimaDerrota.set(perdedor, Math.max(ultimaDerrota.get(perdedor) ?? 0, m.round));
  }

  const posicoes = new Map<string, number>();
  if (decididas.length === 0) return posicoes;

  // Campeao: quem venceu a ultima partida disputada e nao acumulou duas derrotas.
  const ultimaRodada = Math.max(...decididas.map((m) => m.round));
  const finais = decididas.filter((m) => m.round === ultimaRodada);
  const campeao = finais[finais.length - 1]?.winnerId;
  if (campeao && (derrotas.get(campeao) ?? 0) < 2) posicoes.set(campeao, 1);

  const eliminados = [...ultimaDerrota.entries()]
    .filter(([teamId]) => teamId !== campeao)
    // Eliminado mais tarde = melhor colocado.
    .sort(([, a], [, b]) => b - a);

  eliminados.forEach(([teamId], i) => posicoes.set(teamId, i + 2));
  return posicoes;
}

/** Sugestao inicial, no espirito das tabelas de circuito: cai pela metade a cada faixa. */
export const DEFAULT_POINTS_RULES: { placement: number; points: number }[] = [
  { placement: 1, points: 100 },
  { placement: 2, points: 80 },
  { placement: 3, points: 60 },
  { placement: 5, points: 40 },
  { placement: 7, points: 30 },
  { placement: 9, points: 20 },
  { placement: 13, points: 10 },
  { placement: 17, points: 5 },
];
