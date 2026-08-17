import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthErrorCode } from './auth-error.enum';
import { TeamsErrorCode } from './teams-error.enum';
import { TournamentsErrorCode } from './tournaments-error.enum';
import { RegistrationsErrorCode } from './registrations-error.enum';
import { BracketsErrorCode } from './brackets-error.enum';
import { MatchesErrorCode } from './matches-error.enum';
import { FriendliesErrorCode } from './friendlies-error.enum';
import { ChatErrorCode } from './chat-error.enum';
import { AdminErrorCode } from './admin-error.enum';

function withCode(
  ExceptionClass: typeof HttpException | typeof UnauthorizedException | typeof ConflictException | typeof NotFoundException | typeof BadRequestException,
  code: string,
  status?: HttpStatus,
): HttpException {
  if (status !== undefined) {
    return new HttpException({ code }, status);
  }
  const error = new (ExceptionClass as any)({ code });
  return error;
}

export const AppError = {
  // Auth errors
  emailAlreadyExists: () =>
    withCode(ConflictException, AuthErrorCode.EMAIL_ALREADY_EXISTS),

  invalidPasswordFormat: () =>
    withCode(BadRequestException, AuthErrorCode.INVALID_PASSWORD_FORMAT),

  passwordsDoNotMatch: () =>
    withCode(BadRequestException, AuthErrorCode.PASSWORDS_DO_NOT_MATCH),

  emailNotFound: () =>
    withCode(UnauthorizedException, AuthErrorCode.EMAIL_NOT_FOUND),

  invalidPassword: () =>
    withCode(UnauthorizedException, AuthErrorCode.INVALID_PASSWORD),

  emailNotVerified: () =>
    withCode(UnauthorizedException, AuthErrorCode.EMAIL_NOT_VERIFIED),

  userNotFound: () =>
    withCode(NotFoundException, AuthErrorCode.USER_NOT_FOUND),

  emailAlreadyVerified: () =>
    withCode(BadRequestException, AuthErrorCode.EMAIL_ALREADY_VERIFIED),

  invalidOrExpiredCode: () =>
    withCode(BadRequestException, AuthErrorCode.INVALID_OR_EXPIRED_CODE),

  codeResendCooldown: () =>
    withCode(HttpException, AuthErrorCode.CODE_RESEND_COOLDOWN, HttpStatus.TOO_MANY_REQUESTS),

  invalidGoogleToken: () =>
    withCode(UnauthorizedException, AuthErrorCode.INVALID_GOOGLE_TOKEN),

  invalidRefreshToken: () =>
    withCode(UnauthorizedException, AuthErrorCode.INVALID_REFRESH_TOKEN),

  resetTokenInvalid: () =>
    withCode(BadRequestException, AuthErrorCode.RESET_TOKEN_INVALID),

  resetTokenExpired: () =>
    withCode(BadRequestException, AuthErrorCode.RESET_TOKEN_EXPIRED),

  // LGPD / Consent
  consentRequired: () =>
    withCode(BadRequestException, AuthErrorCode.CONSENT_REQUIRED),
  consentOutdated: () =>
    withCode(BadRequestException, AuthErrorCode.CONSENT_OUTDATED),
  dataExportRateLimited: () =>
    withCode(HttpException, AuthErrorCode.DATA_EXPORT_RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS),
  dataExportNotReady: () =>
    withCode(BadRequestException, AuthErrorCode.DATA_EXPORT_NOT_READY),
  accountDeletionConfirmationRequired: () =>
    withCode(BadRequestException, AuthErrorCode.ACCOUNT_DELETION_CONFIRMATION_REQUIRED),

  // Teams errors
  teamNotFound: () =>
    withCode(NotFoundException, TeamsErrorCode.TEAM_NOT_FOUND),

  notTeamOwner: () =>
    withCode(ForbiddenException, TeamsErrorCode.NOT_TEAM_OWNER),

  memberNotFound: () =>
    withCode(NotFoundException, TeamsErrorCode.MEMBER_NOT_FOUND),

  memberAlreadyInTeam: () =>
    withCode(ConflictException, TeamsErrorCode.MEMBER_ALREADY_IN_TEAM),

  userNotFoundByEmail: () =>
    withCode(NotFoundException, TeamsErrorCode.USER_NOT_FOUND),

  cannotRemoveOwner: () =>
    withCode(BadRequestException, TeamsErrorCode.CANNOT_REMOVE_OWNER),

  guestNameRequired: () =>
    withCode(BadRequestException, TeamsErrorCode.GUEST_NAME_REQUIRED),

  cpfAlreadyInTeam: () =>
    withCode(ConflictException, TeamsErrorCode.CPF_ALREADY_IN_TEAM),

  invalidCpf: () =>
    withCode(BadRequestException, TeamsErrorCode.INVALID_CPF),

  invitationNotFound: () =>
    withCode(NotFoundException, TeamsErrorCode.INVITATION_NOT_FOUND),

  invitationAlreadyPending: () =>
    withCode(ConflictException, TeamsErrorCode.INVITATION_ALREADY_PENDING),

  invitationAlreadyResponded: () =>
    withCode(BadRequestException, TeamsErrorCode.INVITATION_ALREADY_RESPONDED),

  notInvitedUser: () =>
    withCode(ForbiddenException, TeamsErrorCode.NOT_INVITED_USER),

  userAlreadyTeamMember: () =>
    withCode(ConflictException, TeamsErrorCode.USER_ALREADY_TEAM_MEMBER),

  invalidFileType: () =>
    withCode(BadRequestException, TeamsErrorCode.INVALID_FILE_TYPE),

  fileTooLarge: () =>
    withCode(BadRequestException, TeamsErrorCode.FILE_TOO_LARGE),

  // Tournaments errors
  tournamentNotFound: () =>
    withCode(NotFoundException, TournamentsErrorCode.TOURNAMENT_NOT_FOUND),

  notTournamentOwner: () =>
    withCode(ForbiddenException, TournamentsErrorCode.NOT_TOURNAMENT_OWNER),

  tournamentNotDraft: () =>
    withCode(BadRequestException, TournamentsErrorCode.TOURNAMENT_NOT_DRAFT),

  tournamentAlreadyPublished: () =>
    withCode(BadRequestException, TournamentsErrorCode.TOURNAMENT_ALREADY_PUBLISHED),

  tournamentCannotCancel: () =>
    withCode(BadRequestException, TournamentsErrorCode.TOURNAMENT_CANNOT_CANCEL),

  publishMissingFields: () =>
    withCode(BadRequestException, TournamentsErrorCode.PUBLISH_MISSING_FIELDS),

  invalidCoordinates: () =>
    withCode(BadRequestException, TournamentsErrorCode.INVALID_COORDINATES),

  cannotChangeCoreFields: () =>
    withCode(BadRequestException, TournamentsErrorCode.CANNOT_CHANGE_CORE_FIELDS),

  facilityNotFound: () =>
    withCode(NotFoundException, TournamentsErrorCode.FACILITY_NOT_FOUND),

  sponsorNotFound: () =>
    withCode(NotFoundException, TournamentsErrorCode.SPONSOR_NOT_FOUND),

  circuitRequiresStages: () =>
    withCode(BadRequestException, TournamentsErrorCode.CIRCUIT_REQUIRES_STAGES),

  tournamentTooCloseToEdit: () =>
    withCode(BadRequestException, TournamentsErrorCode.TOURNAMENT_TOO_CLOSE_TO_EDIT),

  tournamentNotInProgress: () =>
    withCode(BadRequestException, TournamentsErrorCode.TOURNAMENT_NOT_IN_PROGRESS),

  tournamentHasPendingMatches: () =>
    withCode(BadRequestException, TournamentsErrorCode.TOURNAMENT_HAS_PENDING_MATCHES),

  stageDateTooSoon: () =>
    withCode(BadRequestException, TournamentsErrorCode.STAGE_DATE_TOO_SOON),

  stageNotFound: () =>
    withCode(NotFoundException, TournamentsErrorCode.STAGE_NOT_FOUND),

  refereeNotInvited: () =>
    withCode(ForbiddenException, TournamentsErrorCode.REFEREE_NOT_INVITED),

  // Registrations errors
  registrationNotFound: () =>
    withCode(NotFoundException, RegistrationsErrorCode.REGISTRATION_NOT_FOUND),

  notRegistrationOwner: () =>
    withCode(ForbiddenException, RegistrationsErrorCode.NOT_REGISTRATION_OWNER),

  tournamentNotOpen: () =>
    withCode(BadRequestException, RegistrationsErrorCode.TOURNAMENT_NOT_OPEN),

  registrationDeadlineExpired: () =>
    withCode(BadRequestException, RegistrationsErrorCode.REGISTRATION_DEADLINE_EXPIRED),

  teamSizeMismatch: () =>
    withCode(BadRequestException, RegistrationsErrorCode.TEAM_SIZE_MISMATCH),

  noSpotsAvailable: () =>
    withCode(BadRequestException, RegistrationsErrorCode.NO_SPOTS_AVAILABLE),

  teamAlreadyRegistered: () =>
    withCode(ConflictException, RegistrationsErrorCode.TEAM_ALREADY_REGISTERED),

  registrationAlreadyCancelled: () =>
    withCode(BadRequestException, RegistrationsErrorCode.REGISTRATION_ALREADY_CANCELLED),

  registrationAlreadyConfirmed: () =>
    withCode(BadRequestException, RegistrationsErrorCode.REGISTRATION_ALREADY_CONFIRMED),

  cannotCancelStarted: () =>
    withCode(BadRequestException, RegistrationsErrorCode.CANNOT_CANCEL_STARTED),

  cannotModifyStarted: () =>
    withCode(BadRequestException, RegistrationsErrorCode.CANNOT_MODIFY_STARTED),

  categoryNotInTournament: () =>
    withCode(BadRequestException, RegistrationsErrorCode.CATEGORY_NOT_IN_TOURNAMENT),

  // Brackets errors
  bracketNotFound: () =>
    withCode(NotFoundException, BracketsErrorCode.BRACKET_NOT_FOUND),

  bracketAlreadyGenerated: () =>
    withCode(ConflictException, BracketsErrorCode.BRACKET_ALREADY_GENERATED),

  bracketTooEarly: () =>
    withCode(BadRequestException, BracketsErrorCode.BRACKET_TOO_EARLY),

  noConfirmedTeams: () =>
    withCode(BadRequestException, BracketsErrorCode.NO_CONFIRMED_TEAMS),

  invalidBracketType: () =>
    withCode(BadRequestException, BracketsErrorCode.INVALID_BRACKET_TYPE),

  tournamentNotReady: () =>
    withCode(BadRequestException, BracketsErrorCode.TOURNAMENT_NOT_READY),

  invalidTeamCount: () =>
    withCode(BadRequestException, BracketsErrorCode.INVALID_TEAM_COUNT),

  // Matches errors
  matchNotFound: () =>
    withCode(NotFoundException, MatchesErrorCode.MATCH_NOT_FOUND),

  matchAlreadyStarted: () =>
    withCode(BadRequestException, MatchesErrorCode.MATCH_ALREADY_STARTED),

  matchAlreadyFinished: () =>
    withCode(BadRequestException, MatchesErrorCode.MATCH_ALREADY_FINISHED),

  matchNotInProgress: () =>
    withCode(BadRequestException, MatchesErrorCode.MATCH_NOT_IN_PROGRESS),

  matchNotScheduled: () =>
    withCode(BadRequestException, MatchesErrorCode.MATCH_NOT_SCHEDULED),

  invalidPointTeam: () =>
    withCode(BadRequestException, MatchesErrorCode.INVALID_POINT_TEAM),

  setNotFound: () =>
    withCode(NotFoundException, MatchesErrorCode.SET_NOT_FOUND),

  missingOpponent: () =>
    withCode(BadRequestException, MatchesErrorCode.MISSING_OPPONENT),

  walkoverTeamRequired: () =>
    withCode(BadRequestException, MatchesErrorCode.WALKOVER_TEAM_REQUIRED),

  notMatchReferee: () =>
    withCode(ForbiddenException, MatchesErrorCode.NOT_MATCH_REFEREE),

  playerNotInTeam: () =>
    withCode(BadRequestException, MatchesErrorCode.PLAYER_NOT_IN_TEAM),

  samePlayerSubstitution: () =>
    withCode(BadRequestException, MatchesErrorCode.SAME_PLAYER_SUBSTITUTION),

  scoreNotWinning: () =>
    withCode(BadRequestException, MatchesErrorCode.SCORE_NOT_WINNING),

  duplicateLineupPosition: () =>
    withCode(BadRequestException, MatchesErrorCode.DUPLICATE_LINEUP_POSITION),

  lineupRequired: () =>
    withCode(BadRequestException, MatchesErrorCode.LINEUP_REQUIRED),

  // Friendlies errors
  friendlyNotFound: () =>
    withCode(NotFoundException, FriendliesErrorCode.FRIENDLY_NOT_FOUND),

  notFriendlyRequester: () =>
    withCode(ForbiddenException, FriendliesErrorCode.NOT_FRIENDLY_REQUESTER),

  notFriendlyChallenged: () =>
    withCode(ForbiddenException, FriendliesErrorCode.NOT_FRIENDLY_CHALLENGED),

  friendlyAlreadyResponded: () =>
    withCode(BadRequestException, FriendliesErrorCode.FRIENDLY_ALREADY_RESPONDED),

  friendlyAlreadyCancelled: () =>
    withCode(BadRequestException, FriendliesErrorCode.FRIENDLY_ALREADY_CANCELLED),

  cannotAcceptOwnFriendly: () =>
    withCode(BadRequestException, FriendliesErrorCode.CANNOT_ACCEPT_OWN_FRIENDLY),

  missingChallengedTarget: () =>
    withCode(BadRequestException, FriendliesErrorCode.MISSING_CHALLENGED_TARGET),

  notificationNotFound: () =>
    withCode(NotFoundException, FriendliesErrorCode.NOTIFICATION_NOT_FOUND),

  friendlyNotAccepted: () =>
    withCode(BadRequestException, FriendliesErrorCode.FRIENDLY_NOT_ACCEPTED),

  notChallengedTeamOwner: () =>
    withCode(ForbiddenException, FriendliesErrorCode.NOT_CHALLENGED_TEAM_OWNER),

  invalidAthleteCount: () =>
    withCode(BadRequestException, FriendliesErrorCode.INVALID_ATHLETE_COUNT),

  athleteNotInTeam: () =>
    withCode(BadRequestException, FriendliesErrorCode.ATHLETE_NOT_IN_TEAM),

  invalidRefereeCode: () =>
    withCode(BadRequestException, FriendliesErrorCode.INVALID_REFEREE_CODE),

  notFriendlyParticipant: () =>
    withCode(ForbiddenException, FriendliesErrorCode.NOT_FRIENDLY_PARTICIPANT),
  cannotStartMatchOutsideDay: () =>
    withCode(BadRequestException, FriendliesErrorCode.CANNOT_START_MATCH_OUTSIDE_DAY),
  cannotStartMatchBeforeTime: () =>
    withCode(BadRequestException, FriendliesErrorCode.CANNOT_START_MATCH_BEFORE_TIME),

  // Chat errors
  chatNotFound: () =>
    withCode(NotFoundException, ChatErrorCode.CHAT_NOT_FOUND),

  notChatMember: () =>
    withCode(ForbiddenException, ChatErrorCode.NOT_CHAT_MEMBER),

  // Admin errors
  userAlreadyBlocked: () =>
    withCode(BadRequestException, AdminErrorCode.USER_ALREADY_BLOCKED),

  userAlreadyActive: () =>
    withCode(BadRequestException, AdminErrorCode.USER_ALREADY_ACTIVE),

  tournamentAlreadyDeleted: () =>
    withCode(BadRequestException, AdminErrorCode.TOURNAMENT_ALREADY_DELETED),
};
