export enum AdminErrorCode {
  USER_ALREADY_BLOCKED = 'USER_ALREADY_BLOCKED',
  USER_ALREADY_ACTIVE = 'USER_ALREADY_ACTIVE',
  TOURNAMENT_ALREADY_DELETED = 'TOURNAMENT_ALREADY_DELETED',
  MAINTENANCE_ALREADY_ON = 'MAINTENANCE_ALREADY_ON',
  MAINTENANCE_ALREADY_OFF = 'MAINTENANCE_ALREADY_OFF',
}

export const AdminErrorMessages: Record<AdminErrorCode, string> = {
  [AdminErrorCode.USER_ALREADY_BLOCKED]: 'User is already blocked',
  [AdminErrorCode.USER_ALREADY_ACTIVE]: 'User is already active',
  [AdminErrorCode.TOURNAMENT_ALREADY_DELETED]: 'Tournament is already deleted',
  [AdminErrorCode.MAINTENANCE_ALREADY_ON]: 'Maintenance mode is already ON',
  [AdminErrorCode.MAINTENANCE_ALREADY_OFF]: 'Maintenance mode is already OFF',
};
