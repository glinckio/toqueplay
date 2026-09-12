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
