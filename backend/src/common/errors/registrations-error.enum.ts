export enum RegistrationsErrorCode {
  REGISTRATION_NOT_FOUND = 'REGISTRATION_NOT_FOUND',
  NOT_REGISTRATION_OWNER = 'NOT_REGISTRATION_OWNER',
  TOURNAMENT_NOT_OPEN = 'TOURNAMENT_NOT_OPEN',
  REGISTRATION_DEADLINE_EXPIRED = 'REGISTRATION_DEADLINE_EXPIRED',
  TEAM_SIZE_MISMATCH = 'TEAM_SIZE_MISMATCH',
  NO_SPOTS_AVAILABLE = 'NO_SPOTS_AVAILABLE',
  TEAM_ALREADY_REGISTERED = 'TEAM_ALREADY_REGISTERED',
  REGISTRATION_ALREADY_CANCELLED = 'REGISTRATION_ALREADY_CANCELLED',
  REGISTRATION_ALREADY_CONFIRMED = 'REGISTRATION_ALREADY_CONFIRMED',
  CANNOT_CANCEL_STARTED = 'CANNOT_CANCEL_STARTED',
  CATEGORY_NOT_IN_TOURNAMENT = 'CATEGORY_NOT_IN_TOURNAMENT',
  CANNOT_MODIFY_STARTED = 'CANNOT_MODIFY_STARTED',
}

export const RegistrationsErrorMessages: Record<RegistrationsErrorCode, string> = {
  [RegistrationsErrorCode.REGISTRATION_NOT_FOUND]: 'Registration not found',
  [RegistrationsErrorCode.NOT_REGISTRATION_OWNER]: 'Only the user who registered can perform this action',
  [RegistrationsErrorCode.TOURNAMENT_NOT_OPEN]: 'Tournament is not open for registration',
  [RegistrationsErrorCode.REGISTRATION_DEADLINE_EXPIRED]: 'Registration deadline has expired',
  [RegistrationsErrorCode.TEAM_SIZE_MISMATCH]: 'Team member count does not match category format',
  [RegistrationsErrorCode.NO_SPOTS_AVAILABLE]: 'No spots available in this category',
  [RegistrationsErrorCode.TEAM_ALREADY_REGISTERED]: 'Team is already registered in this category',
  [RegistrationsErrorCode.REGISTRATION_ALREADY_CANCELLED]: 'Registration is already cancelled',
  [RegistrationsErrorCode.REGISTRATION_ALREADY_CONFIRMED]: 'Registration is already confirmed',
  [RegistrationsErrorCode.CANNOT_CANCEL_STARTED]: 'Cannot cancel registration for a tournament that has already started',
  [RegistrationsErrorCode.CATEGORY_NOT_IN_TOURNAMENT]: 'Category does not belong to this tournament',
  [RegistrationsErrorCode.CANNOT_MODIFY_STARTED]: 'Cannot modify registrations once the tournament is in progress or finished — only an admin can do this now',
};
