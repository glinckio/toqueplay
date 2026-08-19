// Synchronous useApi mock — calls fetcher directly and returns result as data.
// Service mocks use mockReturnValue (not mockResolvedValue) so the fetcher
// returns the value synchronously, making data available on first render.
jest.mock("@/hooks/useApi", () => ({
  useApi: (fetcher) => {
    let data = null;
    try { data = fetcher(); } catch {}
    return { data, loading: false, error: null, refetch: jest.fn() };
  },
}));

// ─── Home ────────────────────────────────────────────────────────────────────
jest.mock("@/services/homeService", () => ({
  homeService: {
    getDashboard: jest.fn().mockReturnValue({
      liveMatches: [{
        id: "live-1",
        tournament: { id: "t1", name: "Copa Verão" },
        round: "Semifinal", court: "Quadra 1", currentSet: 3,
        teamA: { id: "ta", name: "Silva & Rocha", initials: "SR" },
        teamB: { id: "tb", name: "Costa & Lima", initials: "CL" },
        scoreA: 2, scoreB: 1, setScores: "21-19, 18-21, 15-12",
        status: "IN_PROGRESS",
      }],
      nearbyTournaments: [
        { id: "n1", name: "Copa Praia Grande", coverUrl: null, categoryFormat: "Dupla Masculina", distance: 5.2, date: "2026-08-15", city: "Praia Grande" },
        { id: "n2", name: "Circuito Litoral", coverUrl: null, categoryFormat: "Dupla Feminina", distance: 12.0, date: "2026-08-20", city: "Santos" },
      ],
      myTournaments: [
        { id: "m1", name: "Circuito Litoral · Et. 2", coverUrl: null, date: "2026-08-22", categoryFormat: "Dupla Masculina", registrationStatus: "confirmed" },
      ],
      unreadNotifications: 0,
    }),
    getFeed: jest.fn().mockReturnValue([]),
  },
}));

// ─── Tournaments ─────────────────────────────────────────────────────────────
jest.mock("@/services/tournamentsService", () => ({
  tournamentsService: {
    create: jest.fn().mockReturnValue({}),
    update: jest.fn().mockReturnValue({}),
    findOne: jest.fn().mockReturnValue({
      id: "t1", name: "Copa Verão 2026", status: "REGISTRATION_OPEN",
      description: "Torneio de vôlei de praia do litoral paulista.",
      coverUrl: null, bannerUrl: null, date: "2026-07-12T08:00:00", endDate: null,
      registrationDeadline: null, address: "Rua da Praia, 100",
      city: "Praia Grande", state: "SP", latitude: null, longitude: null,
      maxTeams: 16, entryFee: 50, prizePot: 850,
      rules: "3 sets de 21 pontos\nMelhor de 3",
      organizerId: "o1",
      organizer: { id: "o1", name: "Marcos Costa", avatarUrl: null },
      categories: [{ id: "c1", name: "Masc Dupla", format: "Dupla Masculina", type: "BEACH", bracketType: "SINGLE_ELIMINATION", maxTeams: 16, minPlayers: 2, maxPlayers: 2 }],
      _count: { registrations: 3 },
      type: "BEACH", modality: "MALE_DOUBLES", eventType: "SINGLE",
      createdAt: "2026-01-01", updatedAt: "2026-01-01",
    }),
    findOnePublic: jest.fn().mockReturnValue({}),
    explore: jest.fn().mockReturnValue({
      data: [
        { id: "t1", name: "Copa Verão 2026", status: "REGISTRATION_OPEN", coverUrl: null, date: "2026-07-12T00:00:00", city: "Praia Grande", state: "SP", address: null, categories: [{ id: "c1", format: "Dupla Masculina", name: "Masc Dupla" }], _count: { registrations: 8 }, maxTeams: 16 },
        { id: "t2", name: "Liga Inverno", status: "FINISHED", coverUrl: null, date: "2025-08-01T00:00:00", city: "Santos", state: "SP", address: null, categories: [{ id: "c2", format: "Dupla Masculina", name: "Masc Dupla" }], _count: { registrations: 16 }, maxTeams: 16 },
      ],
      total: 2,
    }),
    findMine: jest.fn().mockReturnValue([
      { id: "1", name: "Copa Verão Beach 2026", status: "OPEN", date: "2026-08-15T00:00:00", city: "Praia Grande", state: "SP", _count: { registrations: 12 } },
      { id: "2", name: "Circuito Indoor SP", status: "DRAFT", date: null, city: "São Paulo", state: "SP", _count: { registrations: 0 } },
      { id: "3", name: "Liga Municipal Vôlei", status: "IN_PROGRESS", date: "2026-08-10T00:00:00", city: "Guarujá", state: "SP", _count: { registrations: 8 } },
    ]),
    list: jest.fn().mockReturnValue({ data: [], total: 0 }),
    visitorNearby: jest.fn().mockReturnValue([]),
    publish: jest.fn().mockReturnValue({}),
    saveDraft: jest.fn().mockReturnValue({}),
    start: jest.fn().mockReturnValue({}),
    complete: jest.fn().mockReturnValue({}),
    remove: jest.fn().mockReturnValue(undefined),
    updateStructure: jest.fn().mockReturnValue({}),
    getSummary: jest.fn().mockReturnValue({}),
    getBracket: jest.fn().mockReturnValue([]),
    generateRefereeCode: jest.fn().mockReturnValue({ refereeCode: "", expiresAt: "" }),
    getBanners: jest.fn().mockReturnValue([]),
  },
}));

// ─── Teams ───────────────────────────────────────────────────────────────────
jest.mock("@/services/teamsService", () => ({
  teamsService: {
    list: jest.fn().mockReturnValue([
      {
        id: "team-1", name: "Silva & Rocha", ownerId: "u1", description: "Dupla · Areia",
        stats: { tournaments: 3, wins: 2, winRate: 67 },
        members: [
          { id: "m1", isCaptain: true, user: { id: "u1", name: "Lucas Costa", username: "lucascosta", email: "lucas@email.com" } },
          { id: "m2", isCaptain: false, user: { id: "u2", name: "Rafael Silva", username: "rafaelsilva", email: "rafael@email.com" } },
        ],
        _count: { members: 2 },
      },
      {
        id: "team-2", name: "Vôlei Norte", ownerId: "u3", description: "Dupla · Areia",
        stats: { tournaments: 1, wins: 0, winRate: 0 },
        members: [
          { id: "m3", isCaptain: true, user: { id: "u3", name: "Pedro Lima", username: "pedrolima", email: "pedro@email.com" } },
          { id: "m4", isCaptain: false, user: { id: "u4", name: "Ana Costa", username: "anacosta", email: "ana@email.com" } },
        ],
        _count: { members: 2 },
      },
    ]),
    findOne: jest.fn().mockReturnValue({
      id: "team-1", name: "Silva & Rocha", description: "Dupla · Areia",
      stats: { tournaments: 3, wins: 2, winRate: 67 },
      members: [
        { id: "m1", isCaptain: true, user: { id: "u1", name: "Lucas Costa", username: "lucascosta", email: "lucas@email.com" } },
        { id: "m2", isCaptain: false, user: { id: "u2", name: "Rafael Silva", username: "rafaelsilva", email: "rafael@email.com" } },
      ],
    }),
    create: jest.fn().mockReturnValue({}),
    update: jest.fn().mockReturnValue({}),
    remove: jest.fn().mockReturnValue(undefined),
    listMembers: jest.fn().mockReturnValue([]),
    addMember: jest.fn().mockReturnValue({}),
    removeMember: jest.fn().mockReturnValue(undefined),
    getPendingInvitations: jest.fn().mockReturnValue([
      { id: "inv-1", team: { id: "t3", name: "Beach Titans" }, inviter: { name: "João Ferreira", username: "joaoferreira" } },
    ]),
    acceptInvitation: jest.fn().mockReturnValue({}),
    rejectInvitation: jest.fn().mockReturnValue({}),
  },
}));

// ─── Matches ─────────────────────────────────────────────────────────────────
jest.mock("@/services/matchesService", () => ({
  matchesService: {
    refereeEnter: jest.fn().mockReturnValue({
      id: "match-1",
      teamA: { id: "ta", name: "Silva & Rocha", initials: "SR" },
      teamB: { id: "tb", name: "Praia Aces", initials: "PA" },
    }),
    findRefereeMine: jest.fn().mockReturnValue([]),
    findOne: jest.fn().mockReturnValue({
      id: "match-1", tournamentName: "Copa Verão 2026", round: "Semifinal", status: "FINISHED",
      teamA: { id: "ta", name: "Silva & Rocha", initials: "SR" },
      teamB: { id: "tb", name: "Praia Aces", initials: "PA" },
      winnerId: "ta", scoreTeamA: 2, scoreTeamB: 1,
      sets: [
        { setNumber: 1, scoreA: 21, scoreB: 18 },
        { setNumber: 2, scoreA: 18, scoreB: 21 },
        { setNumber: 3, scoreA: 15, scoreB: 12 },
      ],
      stats: {
        totalPoints: { A: 54, B: 51 },
        aces: { A: 8, B: 5 },
        errors: { A: 6, B: 9 },
        blocks: { A: 4, B: 3 },
      },
      duration: 48,
      timeouts: { A: 2, B: 1 },
      cards: { A: 0, B: 1 },
      nextMatch: { round: "Final", opponentName: "Vôlei Norte", scheduledAt: "17:00" },
    }),
    getTimeline: jest.fn().mockReturnValue([]),
    startMatch: jest.fn().mockReturnValue({}),
    registerPoint: jest.fn().mockReturnValue(Promise.resolve({})),
    removePoint: jest.fn().mockReturnValue(Promise.resolve({})),
    finishSet: jest.fn().mockReturnValue(Promise.resolve({})),
    finishMatch: jest.fn().mockReturnValue({}),
    declareWalkover: jest.fn().mockReturnValue({}),
    registerTimeout: jest.fn().mockReturnValue({}),
    registerSubstitution: jest.fn().mockReturnValue({}),
  },
}));

// ─── Friendlies ──────────────────────────────────────────────────────────────
jest.mock("@/services/friendliesService", () => ({
  friendliesService: {
    create: jest.fn().mockReturnValue({}),
    findMine: jest.fn().mockReturnValue([
      { id: "f1", requesterId: undefined, status: "PENDING", date: "2026-08-22T00:00:00", startTime: "16:00", city: "Santos", address: "Arena Santos", modality: "Areia", categoryFormat: "Dupla", requesterTeam: { name: "Meu Time" }, challengedTeam: { name: "Beach Titans" } },
      { id: "f2", requesterId: undefined, status: "ACCEPTED", date: "2026-08-25T00:00:00", startTime: "18:00", city: "SP", address: "Arena SP", modality: "Areia", categoryFormat: "Dupla", requesterTeam: { name: "Meu Time" }, challengedTeam: { name: "Vôlei Sul" } },
      { id: "f3", requesterId: "other-user", status: "PENDING", date: "2026-08-28T00:00:00", startTime: "10:00", city: "RJ", address: "Arena RJ", modality: "Quadra", categoryFormat: "Quarteto", requesterTeam: { name: "Sand Storm" }, challengedTeam: { name: "Meu Time" } },
      { id: "f4", requesterId: "other-user", status: "ACCEPTED", date: "2026-08-30T00:00:00", startTime: "14:00", city: "BH", address: "Arena BH", modality: "Areia", categoryFormat: "Dupla", requesterTeam: { name: "Ace Team" }, challengedTeam: { name: "Meu Time" } },
    ]),
    findOne: jest.fn().mockReturnValue({
      id: "f1", requesterId: undefined, status: "ACCEPTED",
      date: "2026-08-22T00:00:00", startTime: "16:00",
      address: "Arena Santos", city: "Santos", state: "SP",
      modality: "Areia", categoryFormat: "Dupla",
      refereeCode: "483927",
      requesterTeam: { id: "t1", name: "Silva & Rocha" },
      challengedTeam: { id: "t2", name: "Beach Titans" },
      athletes: [
        { side: "REQUESTER", isCaptain: true, teamMember: { user: { name: "Lucas Costa" } } },
        { side: "REQUESTER", isCaptain: false, teamMember: { user: { name: "Rafael Silva" } } },
        { side: "CHALLENGED", isCaptain: true, teamMember: { user: { name: "Pedro Alves" } } },
        { side: "CHALLENGED", isCaptain: false, teamMember: { user: { name: "Marcos Santos" } } },
      ],
    }),
    accept: jest.fn().mockReturnValue({}),
    reject: jest.fn().mockReturnValue({}),
    cancel: jest.fn().mockReturnValue({}),
    selectAthletes: jest.fn().mockReturnValue({}),
    generateRefereeCode: jest.fn().mockReturnValue({ refereeCode: "" }),
    enterRefereeCode: jest.fn().mockReturnValue({}),
  },
}));

// ─── Users ───────────────────────────────────────────────────────────────────
jest.mock("@/services/usersService", () => ({
  usersService: {
    getProfile: jest.fn().mockReturnValue({
      id: "u1", name: "Lucas Costa", username: "lucascosta",
      email: "lucas@email.com", phone: "(21) 99999-0000",
      bio: "Jogador de vôlei de praia",
      city: "Rio de Janeiro", state: "RJ",
      avatarUrl: null,
    }),
    getMyStats: jest.fn().mockReturnValue({
      tournaments: 3, wins: 5, winRate: 67, teams: 2,
    }),
    updateProfile: jest.fn().mockReturnValue({}),
    updateLocation: jest.fn().mockReturnValue({}),
    getNotificationPreferences: jest.fn().mockReturnValue({}),
    updateNotificationPreferences: jest.fn().mockReturnValue({}),
    uploadAvatar: jest.fn().mockReturnValue({}),
  },
}));

// ─── Notifications ───────────────────────────────────────────────────────────
jest.mock("@/services/notificationsService", () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 86400000);
  return {
    notificationsService: {
      list: jest.fn().mockReturnValue({
        data: [
          { id: "n1", type: "TOURNAMENT", title: "Inscrição confirmada", body: "Sua inscrição na Copa Verão 2026 foi confirmada.", read: false, createdAt: now.toISOString() },
          { id: "n2", type: "TEAM", title: "Novo convite de time", body: "Beach Titans convidou você para a dupla.", read: false, createdAt: yesterday.toISOString() },
          { id: "n3", type: "FRIENDLY", title: "Amistoso aceito", body: "Seu amistoso contra Vôlei Sul foi aceito.", read: true, createdAt: fourDaysAgo.toISOString() },
        ],
        total: 3,
      }),
      getUnreadCount: jest.fn().mockReturnValue(2),
      markAsRead: jest.fn().mockReturnValue({}),
      markAllAsRead: jest.fn().mockReturnValue({}),
      registerDeviceToken: jest.fn().mockReturnValue({}),
      removeDeviceToken: jest.fn().mockReturnValue({}),
    },
  };
});

// ─── Privacy ─────────────────────────────────────────────────────────────────
jest.mock("@/services/privacyService", () => ({
  privacyService: {
    getConsents: jest.fn().mockReturnValue({
      notificationsPush: true,
      locationDiscovery: false,
      marketingEmail: false,
    }),
    updateConsents: jest.fn().mockReturnValue({}),
    acceptTerms: jest.fn().mockReturnValue({}),
    getDataSummary: jest.fn().mockReturnValue({
      teams: 2, tournaments: 3, matches: 12, friendlies: 5,
    }),
    exportData: jest.fn().mockReturnValue({}),
    deleteAccount: jest.fn().mockReturnValue({}),
    createDpoRequest: jest.fn().mockReturnValue({}),
  },
}));

// ─── Registrations ───────────────────────────────────────────────────────────
jest.mock("@/services/registrationsService", () => ({
  registrationsService: {
    registerTeam: jest.fn().mockReturnValue({}),
    listMine: jest.fn().mockReturnValue([]),
    findOne: jest.fn().mockReturnValue({}),
    cancel: jest.fn().mockReturnValue({}),
    getRegisteredMembers: jest.fn().mockReturnValue([]),
  },
}));

// ─── Reanimated ──────────────────────────────────────────────────────────────
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component) => component || View,
      View,
    },
    useSharedValue: (initialValue) => ({ value: initialValue }),
    useAnimatedStyle: (fn) => (typeof fn === "function" ? fn() : {}),
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withDelay: (_delay, value) => value,
    interpolateColor: () => "#000000",
    Easing: {
      bezier: () => (t) => t,
      inOut: (fn) => fn,
      out: (fn) => fn,
      in: (fn) => fn,
      ease: (t) => t,
    },
    createAnimatedComponent: (component) => component || View,
    View,
    runOnJS: (fn) => fn,
  };
});
