import {
  buildStandings,
  sortStandings,
  leaguePointsFor,
  placementForEliminationLoss,
  pointsForPlacement,
  DEFAULT_POINTS_RULES,
  MatchForStandings,
  StandingRow,
} from './standings.logic';

const jogo = (
  a: string,
  b: string,
  setsA: number,
  setsB: number,
  sets: [number, number][] = [],
): MatchForStandings => ({
  teamAId: a,
  teamBId: b,
  winnerId: setsA > setsB ? a : b,
  scoreTeamA: setsA,
  scoreTeamB: setsB,
  sets: sets.map(([scoreA, scoreB]) => ({ scoreA, scoreB })),
});

describe('leaguePointsFor', () => {
  it('da 3 x 0 quando a vitoria nao vai ao set decisivo', () => {
    expect(leaguePointsFor(2, 0, 3)).toEqual({ winner: 3, loser: 0 });
    expect(leaguePointsFor(3, 1, 5)).toEqual({ winner: 3, loser: 0 });
  });

  it('da 2 x 1 quando a partida vai ao set decisivo', () => {
    expect(leaguePointsFor(2, 1, 3)).toEqual({ winner: 2, loser: 1 });
    expect(leaguePointsFor(3, 2, 5)).toEqual({ winner: 2, loser: 1 });
  });
});

describe('buildStandings', () => {
  it('conta vitorias, sets e pontos da tabela', () => {
    const tabela = buildStandings(
      ['a', 'b'],
      [jogo('a', 'b', 2, 0, [[21, 15], [21, 18]])],
      3,
    );

    expect(tabela[0]).toMatchObject({
      teamId: 'a', played: 1, wins: 1, losses: 0,
      setsWon: 2, setsLost: 0, pointsWon: 42, pointsLost: 33, leaguePoints: 3,
    });
    expect(tabela[1]).toMatchObject({ teamId: 'b', wins: 0, losses: 1, leaguePoints: 0 });
  });

  it('ordena por vitorias antes de qualquer outro criterio', () => {
    const tabela = buildStandings(
      ['a', 'b', 'c'],
      [jogo('a', 'b', 2, 0), jogo('a', 'c', 2, 0), jogo('b', 'c', 2, 1)],
      3,
    );
    expect(tabela.map((r) => r.teamId)).toEqual(['a', 'b', 'c']);
  });

  // Triangulo em que os tres vencem uma: as vitorias empatam e sobra o sets average.
  it('desempata por sets average', () => {
    const tabela = buildStandings(
      ['a', 'b', 'c'],
      [jogo('a', 'b', 2, 0), jogo('b', 'c', 2, 0), jogo('c', 'a', 2, 1)],
      3,
    );

    expect(tabela.every((r) => r.wins === 1)).toBe(true);
    expect(tabela.map((r) => r.teamId)).toEqual(['a', 'b', 'c']);
    expect(tabela[0].setAverage).toBeGreaterThan(tabela[1].setAverage);
  });

  it('nao quebra quando ninguem jogou ainda', () => {
    const tabela = buildStandings(['a', 'b'], [], 3);
    expect(tabela).toHaveLength(2);
    expect(tabela.every((r) => r.played === 0 && r.leaguePoints === 0)).toBe(true);
  });

  it('ignora partidas sem vencedor definido', () => {
    const tabela = buildStandings(
      ['a', 'b'],
      [{ teamAId: 'a', teamBId: 'b', winnerId: null, scoreTeamA: 0, scoreTeamB: 0, sets: [] }],
      3,
    );
    expect(tabela.every((r) => r.played === 0)).toBe(true);
  });
});

describe('sortStandings', () => {
  const linha = (over: Partial<StandingRow>): StandingRow => ({
    teamId: 'x', played: 3, wins: 2, losses: 1,
    setsWon: 4, setsLost: 2, pointsWon: 100, pointsLost: 90,
    leaguePoints: 6, setAverage: 2, pointAverage: 1.11,
    ...over,
  });

  it('aplica os criterios na ordem oficial da CBV', () => {
    const ordenada = sortStandings(
      [
        linha({ teamId: 'menos-vitorias', wins: 1 }),
        linha({ teamId: 'pior-pontos', setAverage: 2, pointAverage: 1.0 }),
        linha({ teamId: 'melhor', setAverage: 2, pointAverage: 1.5 }),
        linha({ teamId: 'pior-sets', setAverage: 1.2, pointAverage: 9 }),
      ],
      [],
    );

    expect(ordenada.map((r) => r.teamId)).toEqual([
      'melhor', 'pior-pontos', 'pior-sets', 'menos-vitorias',
    ]);
  });

  // Empate de dois, tudo igual ate ali: quem venceu o confronto fica na frente.
  it('usa confronto direto quando so duas equipes empatam', () => {
    const empatadas = [linha({ teamId: 'perdeu' }), linha({ teamId: 'venceu' })];
    const confronto = [
      {
        teamAId: 'venceu', teamBId: 'perdeu', winnerId: 'venceu',
        scoreTeamA: 2, scoreTeamB: 0, sets: [],
      },
    ];

    expect(sortStandings(empatadas, confronto).map((r) => r.teamId)).toEqual(['venceu', 'perdeu']);
  });

  // Com tres ou mais empatados o confronto direto pode formar ciclo, entao nao e aplicado.
  it('nao usa confronto direto em empate de tres', () => {
    const iguais = ['a', 'b', 'c'].map((teamId) => linha({ teamId }));
    const ciclo = [
      { teamAId: 'a', teamBId: 'b', winnerId: 'a', scoreTeamA: 2, scoreTeamB: 0, sets: [] },
      { teamAId: 'b', teamBId: 'c', winnerId: 'b', scoreTeamA: 2, scoreTeamB: 0, sets: [] },
      { teamAId: 'c', teamBId: 'a', winnerId: 'c', scoreTeamA: 2, scoreTeamB: 0, sets: [] },
    ];

    expect(sortStandings(iguais, ciclo).map((r) => r.teamId)).toEqual(['a', 'b', 'c']);
  });
});

describe('placementForEliminationLoss', () => {
  // Mata-mata de 8 tem 3 rodadas: quartas, semi, final.
  it('divide a colocacao entre quem cai na mesma fase', () => {
    expect(placementForEliminationLoss(3, 3)).toBe(2); // perdeu a final
    expect(placementForEliminationLoss(2, 3)).toBe(3); // perdeu a semi
    expect(placementForEliminationLoss(1, 3)).toBe(5); // perdeu as quartas
  });

  it('nao produz 4o nem 6o lugar', () => {
    const posicoes = [1, 2, 3].map((r) => placementForEliminationLoss(r, 3));
    expect(posicoes).not.toContain(4);
    expect(posicoes).not.toContain(6);
  });
});

describe('pointsForPlacement', () => {
  it('usa a regra exata quando existe', () => {
    expect(pointsForPlacement(DEFAULT_POINTS_RULES, 1)).toBe(100);
    expect(pointsForPlacement(DEFAULT_POINTS_RULES, 5)).toBe(40);
  });

  // Cada linha vale ate a proxima: a do 9o cobre ate o 12o, porque existe uma linha no 13o.
  it('estende a regra ate a proxima faixa', () => {
    expect(pointsForPlacement(DEFAULT_POINTS_RULES, 12)).toBe(20);
    expect(pointsForPlacement(DEFAULT_POINTS_RULES, 16)).toBe(10);
    expect(pointsForPlacement(DEFAULT_POINTS_RULES, 17)).toBe(5);
  });

  it('vale zero quando nao ha regra abaixo da colocacao', () => {
    expect(pointsForPlacement([{ placement: 3, points: 10 }], 1)).toBe(0);
    expect(pointsForPlacement([], 1)).toBe(0);
  });
});
