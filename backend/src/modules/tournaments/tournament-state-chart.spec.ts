import { TournamentStatus } from '@prisma/client';
import { canTransition, TERMINAL_STATUSES } from './tournament-state-chart';

describe('tournament-state-chart', () => {
  describe('canTransition', () => {
    it('allows the canonical lifecycle', () => {
      expect(canTransition(TournamentStatus.DRAFT, TournamentStatus.PUBLISHED)).toBe(true);
      expect(canTransition(TournamentStatus.PUBLISHED, TournamentStatus.REGISTRATION_OPEN)).toBe(true);
      expect(canTransition(TournamentStatus.REGISTRATION_OPEN, TournamentStatus.REGISTRATION_CLOSED)).toBe(true);
      expect(canTransition(TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.BRACKET_GENERATED)).toBe(true);
      expect(canTransition(TournamentStatus.BRACKET_GENERATED, TournamentStatus.IN_PROGRESS)).toBe(true);
      expect(canTransition(TournamentStatus.IN_PROGRESS, TournamentStatus.FINISHED)).toBe(true);
    });

    it('allows CANCELLED from any non-terminal state', () => {
      expect(canTransition(TournamentStatus.DRAFT, TournamentStatus.CANCELLED)).toBe(true);
      expect(canTransition(TournamentStatus.PUBLISHED, TournamentStatus.CANCELLED)).toBe(true);
      expect(canTransition(TournamentStatus.REGISTRATION_OPEN, TournamentStatus.CANCELLED)).toBe(true);
      expect(canTransition(TournamentStatus.REGISTRATION_CLOSED, TournamentStatus.CANCELLED)).toBe(true);
      expect(canTransition(TournamentStatus.BRACKET_GENERATED, TournamentStatus.CANCELLED)).toBe(true);
      expect(canTransition(TournamentStatus.IN_PROGRESS, TournamentStatus.CANCELLED)).toBe(true);
    });

    it('rejects skipping steps', () => {
      expect(canTransition(TournamentStatus.DRAFT, TournamentStatus.IN_PROGRESS)).toBe(false);
      expect(canTransition(TournamentStatus.PUBLISHED, TournamentStatus.FINISHED)).toBe(false);
      expect(canTransition(TournamentStatus.REGISTRATION_OPEN, TournamentStatus.BRACKET_GENERATED)).toBe(false);
    });

    it('rejects re-opening a finished/cancelled tournament', () => {
      expect(canTransition(TournamentStatus.FINISHED, TournamentStatus.PUBLISHED)).toBe(false);
      expect(canTransition(TournamentStatus.FINISHED, TournamentStatus.DRAFT)).toBe(false);
      expect(canTransition(TournamentStatus.CANCELLED, TournamentStatus.DRAFT)).toBe(false);
      expect(canTransition(TournamentStatus.CANCELLED, TournamentStatus.PUBLISHED)).toBe(false);
      expect(canTransition(TournamentStatus.CANCELLED, TournamentStatus.CANCELLED)).toBe(false);
    });

    it('allows PUBLISHED → DRAFT (revert)', () => {
      expect(canTransition(TournamentStatus.PUBLISHED, TournamentStatus.DRAFT)).toBe(true);
    });

    it('treats FINISHED and CANCELLED as terminal', () => {
      expect(TERMINAL_STATUSES).toContain(TournamentStatus.FINISHED);
      expect(TERMINAL_STATUSES).toContain(TournamentStatus.CANCELLED);
      // No outgoing transitions from terminals
      for (const target of Object.values(TournamentStatus)) {
        expect(canTransition(TournamentStatus.FINISHED, target)).toBe(false);
        expect(canTransition(TournamentStatus.CANCELLED, target)).toBe(false);
      }
    });
  });
});
