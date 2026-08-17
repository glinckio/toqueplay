import { TournamentStatus } from '@prisma/client';

/**
 * Allowed state transitions for a Tournament.
 * Any transition not listed here is rejected by the service layer.
 */
const TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  DRAFT: [TournamentStatus.PUBLISHED, TournamentStatus.CANCELLED],
  PUBLISHED: [
    TournamentStatus.REGISTRATION_OPEN,
    TournamentStatus.DRAFT,
    TournamentStatus.CANCELLED,
  ],
  REGISTRATION_OPEN: [
    TournamentStatus.REGISTRATION_CLOSED,
    TournamentStatus.CANCELLED,
  ],
  REGISTRATION_CLOSED: [
    TournamentStatus.BRACKET_GENERATED,
    TournamentStatus.CANCELLED,
  ],
  BRACKET_GENERATED: [
    TournamentStatus.IN_PROGRESS,
    TournamentStatus.CANCELLED,
  ],
  IN_PROGRESS: [
    TournamentStatus.FINISHED,
    TournamentStatus.CANCELLED,
  ],
  FINISHED: [],
  CANCELLED: [],
};

export function canTransition(from: TournamentStatus, to: TournamentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCanTransition(from: TournamentStatus, to: TournamentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid tournament state transition: ${from} → ${to}`,
    );
  }
}

export const TERMINAL_STATUSES: TournamentStatus[] = [
  TournamentStatus.FINISHED,
  TournamentStatus.CANCELLED,
];
