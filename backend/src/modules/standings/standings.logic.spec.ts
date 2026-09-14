import {
  buildStandings,
  placementsFromGroupsThenElimination,
  placementsFromDoubleElimination,
  placementsFromRoundRobin,
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

describe('placementsFromGroupsThenElimination', () => {
  const jogo = (a: string, b: string, vencedor: string, round: number, group: number | null) => ({
    teamAId: a, teamBId: b, winnerId: vencedor,
    scoreTeamA: vencedor === a ? 2 : 0, scoreTeamB: vencedor === a ? 0 : 2,
    sets: [{ scoreA: 21, scoreB: 15 }, { scoreA: 21, scoreB: 15 }],
    round, group,
  });

  // Regressao: o gerador numera grupo a partir de 1 e mata-mata a partir de 101. Tratar tudo
  // como eliminatoria dava 2^(102-1) de colocacao e estourava o inteiro de 64 bits no banco.
  it('nao mede a fase de grupos pela distancia da final', () => {
    const posicoes = placementsFromGroupsThenElimination(
      [
        jogo('a', 'b', 'a', 1, 0),
        jogo('c', 'd', 'c', 1, 1),
        jogo('a', 'c', 'a', 101, null),
      ],
      3,
    );

    for (const p of posicoes.values()) {
      expect(Number.isSafeInteger(p)).toBe(true);
      expect(p).toBeLessThan(100);
    }
  });

  it('coloca quem caiu no grupo depois de quem chegou ao mata-mata', () => {
    const posicoes = placementsFromGroupsThenElimination(
      [
        jogo('a', 'b', 'a', 1, 0),
        jogo('c', 'd', 'c', 1, 1),
        jogo('a', 'c', 'a', 101, null),
      ],
      3,
    );

    expect(posicoes.get('a')).toBe(1);
    expect(posicoes.get('c')).toBe(2);
    // b e d nao passaram do grupo: vem depois dos dois classificados.
    expect(posicoes.get('b')).toBeGreaterThan(2);
    expect(posicoes.get('d')).toBeGreaterThan(2);
  });
});

describe('placementsFromRoundRobin', () => {
  const jogo = (a: string, b: string, vencedor: string, label?: string) => ({
    teamAId: a, teamBId: b, winnerId: vencedor,
    scoreTeamA: vencedor === a ? 2 : 0, scoreTeamB: vencedor === a ? 0 : 2,
    sets: [{ scoreA: 21, scoreB: 15 }, { scoreA: 21, scoreB: 15 }],
    label: label ?? null,
  });

  // Regressao: o playoff entrava na tabela e inflava o numero de jogos de cada time.
  it('ignora o playoff ao montar a classificacao', () => {
    const posicoes = placementsFromRoundRobin(
      [jogo('a', 'b', 'a'), jogo('a', 'c', 'a'), jogo('b', 'c', 'b')],
      3,
    );
    expect(posicoes.get('a')).toBe(1);
    expect(posicoes.size).toBe(3);
  });

  // Quem venceu a final e campeao mesmo sem ter liderado a fase classificatoria.
  it('deixa o playoff decidir o podio', () => {
    const posicoes = placementsFromRoundRobin(
      [
        jogo('a', 'b', 'a'),
        jogo('a', 'c', 'a'),
        jogo('b', 'c', 'b'),
        jogo('b', 'a', 'b', 'FINAL'),
      ],
      3,
    );
    expect(posicoes.get('b')).toBe(1);
    expect(posicoes.get('a')).toBe(2);
  });
});

describe('placementsFromDoubleElimination', () => {
  const jogo = (a: string, b: string, vencedor: string, round: number) => ({
    teamAId: a, teamBId: b, winnerId: vencedor,
    scoreTeamA: vencedor === a ? 2 : 0, scoreTeamB: vencedor === a ? 0 : 2,
    sets: [], round,
  });

  // Na eliminacao dupla o time cai so na segunda derrota, entao a ordem sai de quando cada um
  // foi eliminado — nao da "distancia da final".
  it('ordena por quando o time foi eliminado', () => {
    const posicoes = placementsFromDoubleElimination([
      jogo('a', 'b', 'a', 1),
      jogo('c', 'd', 'c', 1),
      jogo('b', 'd', 'b', 2),
      jogo('a', 'c', 'a', 3),
      jogo('a', 'b', 'a', 4),
    ]);

    expect(posicoes.get('a')).toBe(1);
    // d caiu primeiro (rodada 2), b por ultimo (rodada 4).
    expect(posicoes.get('b')!).toBeLessThan(posicoes.get('d')!);
  });

  it('nao coloca ninguem sem partida decidida', () => {
    expect(placementsFromDoubleElimination([]).size).toBe(0);
  });
});
