/**
 * Canonical Prisma `include` objects shared across services.
 *
 * Usage:
 *   import { TOURNAMENT_INCLUDE } from '../../common/prisma-includes';
 *   const tournament = await prisma.tournament.findUnique({
 *     where: { id },
 *     include: TOURNAMENT_INCLUDE,
 *   });
 *
 * When you need an *additional* include on top of the canonical one, spread it:
 *   include: { ...TOURNAMENT_INCLUDE, refereeCode: true }
 *
 * Avoid changing these in-place — bumping a canonical include impacts every
 * consumer. Open a PR listing affected endpoints instead.
 */

const TEAM_BRIEF = {
  select: { id: true, name: true, avatarUrl: true },
} as const;

const USER_BRIEF = {
  select: { id: true, name: true, email: true, avatarUrl: true },
} as const;

const CATEGORY_BRIEF = {
  select: {
    id: true,
    type: true,
    format: true,
    modality: true,
    registrationPrice: true,
  },
} as const;

const TOURNAMENT_BRIEF = {
  select: { id: true, name: true, status: true },
} as const;

export const TOURNAMENT_INCLUDE = {
  owner: USER_BRIEF,
  categories: true,
  stages: {
    orderBy: { date: 'asc' as const },
    include: { facilities: true },
  },
  sponsors: true,
  _count: {
    select: {
      registrations: true,
      brackets: true,
      athleteStats: true,
    },
  },
} as const;

export const MATCH_INCLUDE = {
  bracket: { select: { id: true, tournamentId: true } },
  teamA: TEAM_BRIEF,
  teamB: TEAM_BRIEF,
  winner: TEAM_BRIEF,
  sets: { orderBy: { setNumber: 'asc' as const } },
} as const;

export const REGISTRATION_INCLUDE = {
  tournament: TOURNAMENT_BRIEF,
  category: CATEGORY_BRIEF,
  team: TEAM_BRIEF,
  user: USER_BRIEF,
  members: {
    include: {
      teamMember: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  },
} as const;

export const FRIENDLY_INCLUDE = {
  requester: USER_BRIEF,
  challenged: USER_BRIEF,
  requesterTeam: TEAM_BRIEF,
  challengedTeam: TEAM_BRIEF,
  match: { select: { id: true, status: true } },
  athletes: {
    include: { teamMember: { include: { user: USER_BRIEF } } },
  },
} as const;

export const TEAM_INCLUDE = {
  owner: USER_BRIEF,
  members: {
    include: {
      user: USER_BRIEF,
    },
  },
  _count: { select: { registrations: true } },
} as const;
