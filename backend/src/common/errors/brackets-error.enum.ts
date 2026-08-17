export enum BracketsErrorCode {
  BRACKET_NOT_FOUND = 'BRACKET_NOT_FOUND',
  BRACKET_ALREADY_GENERATED = 'BRACKET_ALREADY_GENERATED',
  BRACKET_TOO_EARLY = 'BRACKET_TOO_EARLY',
  NO_CONFIRMED_TEAMS = 'NO_CONFIRMED_TEAMS',
  INVALID_BRACKET_TYPE = 'INVALID_BRACKET_TYPE',
  TOURNAMENT_NOT_READY = 'TOURNAMENT_NOT_READY',
  INVALID_TEAM_COUNT = 'INVALID_TEAM_COUNT',
}

export const BracketsErrorMessages: Record<BracketsErrorCode, string> = {
  [BracketsErrorCode.BRACKET_NOT_FOUND]: 'Bracket not found',
  [BracketsErrorCode.BRACKET_ALREADY_GENERATED]: 'Bracket already generated for this category',
  [BracketsErrorCode.BRACKET_TOO_EARLY]: 'Bracket can only be generated at most 2 days before the tournament date',
  [BracketsErrorCode.NO_CONFIRMED_TEAMS]: 'No confirmed teams to generate bracket',
  [BracketsErrorCode.INVALID_BRACKET_TYPE]: 'Invalid bracket type',
  [BracketsErrorCode.TOURNAMENT_NOT_READY]: 'Tournament is not ready for bracket generation',
  [BracketsErrorCode.INVALID_TEAM_COUNT]: 'Not enough teams to generate bracket (minimum 2)',
};
