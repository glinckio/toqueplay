-- DropForeignKey
ALTER TABLE "AthleteStats" DROP CONSTRAINT "AthleteStats_teamId_fkey";

-- DropForeignKey
ALTER TABLE "AthleteStats" DROP CONSTRAINT "AthleteStats_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "AthleteStats" DROP CONSTRAINT "AthleteStats_userId_fkey";

-- DropForeignKey
ALTER TABLE "Bracket" DROP CONSTRAINT "Bracket_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Bracket" DROP CONSTRAINT "Bracket_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "DeviceToken" DROP CONSTRAINT "DeviceToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "EmailVerification" DROP CONSTRAINT "EmailVerification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Friendly" DROP CONSTRAINT "Friendly_challengedId_fkey";

-- DropForeignKey
ALTER TABLE "Friendly" DROP CONSTRAINT "Friendly_challengedTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Friendly" DROP CONSTRAINT "Friendly_matchId_fkey";

-- DropForeignKey
ALTER TABLE "Friendly" DROP CONSTRAINT "Friendly_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "Friendly" DROP CONSTRAINT "Friendly_requesterTeamId_fkey";

-- DropForeignKey
ALTER TABLE "FriendlyAthlete" DROP CONSTRAINT "FriendlyAthlete_friendlyId_fkey";

-- DropForeignKey
ALTER TABLE "FriendlyAthlete" DROP CONSTRAINT "FriendlyAthlete_teamMemberId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_bracketId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_nextMatchId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamAId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_teamBId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_winnerId_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_matchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchSet" DROP CONSTRAINT "MatchSet_matchId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "PointEvent" DROP CONSTRAINT "PointEvent_matchId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_userId_fkey";

-- DropForeignKey
ALTER TABLE "RegistrationMember" DROP CONSTRAINT "RegistrationMember_registrationId_fkey";

-- DropForeignKey
ALTER TABLE "RegistrationMember" DROP CONSTRAINT "RegistrationMember_teamMemberId_fkey";

-- DropForeignKey
ALTER TABLE "Sponsor" DROP CONSTRAINT "Sponsor_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "StageFacility" DROP CONSTRAINT "StageFacility_stageId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "TeamInvitation" DROP CONSTRAINT "TeamInvitation_invitedUserId_fkey";

-- DropForeignKey
ALTER TABLE "TeamInvitation" DROP CONSTRAINT "TeamInvitation_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "Tournament" DROP CONSTRAINT "Tournament_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentCategory" DROP CONSTRAINT "TournamentCategory_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentReferee" DROP CONSTRAINT "TournamentReferee_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentReferee" DROP CONSTRAINT "TournamentReferee_userId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentStage" DROP CONSTRAINT "TournamentStage_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_chatId_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_senderId_fkey";

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_teamAId_fkey";

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_teamBId_fkey";

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_teamId_fkey";

-- DropForeignKey
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_userId_fkey";

-- AlterTable
ALTER TABLE "AthleteStats" DROP CONSTRAINT "AthleteStats_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
DROP COLUMN "teamId",
ADD COLUMN     "teamId" UUID NOT NULL,
DROP COLUMN "tournamentId",
ADD COLUMN     "tournamentId" UUID NOT NULL,
ADD CONSTRAINT "AthleteStats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Bracket" DROP CONSTRAINT "Bracket_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tournamentId",
ADD COLUMN     "tournamentId" UUID NOT NULL,
DROP COLUMN "categoryId",
ADD COLUMN     "categoryId" UUID NOT NULL,
ADD CONSTRAINT "Bracket_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "DeviceToken" DROP CONSTRAINT "DeviceToken_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "EmailVerification" DROP CONSTRAINT "EmailVerification_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Friendly" DROP CONSTRAINT "Friendly_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "requesterId",
ADD COLUMN     "requesterId" UUID NOT NULL,
DROP COLUMN "requesterTeamId",
ADD COLUMN     "requesterTeamId" UUID,
DROP COLUMN "challengedId",
ADD COLUMN     "challengedId" UUID,
DROP COLUMN "challengedTeamId",
ADD COLUMN     "challengedTeamId" UUID,
DROP COLUMN "matchId",
ADD COLUMN     "matchId" UUID,
ADD CONSTRAINT "Friendly_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "FriendlyAthlete" DROP CONSTRAINT "FriendlyAthlete_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "friendlyId",
ADD COLUMN     "friendlyId" UUID NOT NULL,
DROP COLUMN "teamMemberId",
ADD COLUMN     "teamMemberId" UUID NOT NULL,
ADD CONSTRAINT "FriendlyAthlete_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Match" DROP CONSTRAINT "Match_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "bracketId",
ADD COLUMN     "bracketId" UUID,
DROP COLUMN "teamAId",
ADD COLUMN     "teamAId" UUID,
DROP COLUMN "teamBId",
ADD COLUMN     "teamBId" UUID,
DROP COLUMN "nextMatchId",
ADD COLUMN     "nextMatchId" UUID,
DROP COLUMN "winnerId",
ADD COLUMN     "winnerId" UUID,
DROP COLUMN "friendlyId",
ADD COLUMN     "friendlyId" UUID,
ADD CONSTRAINT "Match_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "matchId",
ADD COLUMN     "matchId" UUID NOT NULL,
ADD CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MatchSet" DROP CONSTRAINT "MatchSet_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "matchId",
ADD COLUMN     "matchId" UUID NOT NULL,
ADD CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "Notification_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PointEvent" DROP CONSTRAINT "PointEvent_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "matchId",
ADD COLUMN     "matchId" UUID NOT NULL,
ADD CONSTRAINT "PointEvent_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Registration" DROP CONSTRAINT "Registration_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tournamentId",
ADD COLUMN     "tournamentId" UUID NOT NULL,
DROP COLUMN "categoryId",
ADD COLUMN     "categoryId" UUID NOT NULL,
DROP COLUMN "teamId",
ADD COLUMN     "teamId" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "Registration_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RegistrationMember" DROP CONSTRAINT "RegistrationMember_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "registrationId",
ADD COLUMN     "registrationId" UUID NOT NULL,
DROP COLUMN "teamMemberId",
ADD COLUMN     "teamMemberId" UUID NOT NULL,
ADD CONSTRAINT "RegistrationMember_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Sponsor" DROP CONSTRAINT "Sponsor_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tournamentId",
ADD COLUMN     "tournamentId" UUID NOT NULL,
ADD CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "StageFacility" DROP CONSTRAINT "StageFacility_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "stageId",
ADD COLUMN     "stageId" UUID NOT NULL,
ADD CONSTRAINT "StageFacility_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Team" DROP CONSTRAINT "Team_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "ownerId",
ADD COLUMN     "ownerId" UUID NOT NULL,
ADD CONSTRAINT "Team_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TeamInvitation" DROP CONSTRAINT "TeamInvitation_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "teamId",
ADD COLUMN     "teamId" UUID NOT NULL,
DROP COLUMN "invitedUserId",
ADD COLUMN     "invitedUserId" UUID NOT NULL,
ADD CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "teamId",
ADD COLUMN     "teamId" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID,
ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Tournament" DROP CONSTRAINT "Tournament_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "ownerId",
ADD COLUMN     "ownerId" UUID NOT NULL,
ADD CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TournamentCategory" DROP CONSTRAINT "TournamentCategory_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tournamentId",
ADD COLUMN     "tournamentId" UUID NOT NULL,
ADD CONSTRAINT "TournamentCategory_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TournamentReferee" DROP CONSTRAINT "TournamentReferee_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tournamentId",
ADD COLUMN     "tournamentId" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "TournamentReferee_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TournamentStage" DROP CONSTRAINT "TournamentStage_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "tournamentId",
ADD COLUMN     "tournamentId" UUID NOT NULL,
ADD CONSTRAINT "TournamentStage_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "actorId",
ADD COLUMN     "actorId" UUID,
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "chatId",
ADD COLUMN     "chatId" UUID NOT NULL,
DROP COLUMN "senderId",
ADD COLUMN     "senderId" UUID NOT NULL,
ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "chats" DROP CONSTRAINT "chats_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "teamId",
ADD COLUMN     "teamId" UUID,
DROP COLUMN "teamAId",
ADD COLUMN     "teamAId" UUID,
DROP COLUMN "teamBId",
ADD COLUMN     "teamBId" UUID,
ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "data_subject_requests" DROP CONSTRAINT "data_subject_requests_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID,
ADD CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "logs" DROP CONSTRAINT "logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "security_incidents" DROP CONSTRAINT "security_incidents_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_consents" DROP CONSTRAINT "user_consents_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "AthleteStats_userId_idx" ON "AthleteStats"("userId");

-- CreateIndex
CREATE INDEX "AthleteStats_tournamentId_idx" ON "AthleteStats"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteStats_userId_teamId_tournamentId_key" ON "AthleteStats"("userId", "teamId", "tournamentId");

-- CreateIndex
CREATE INDEX "Bracket_tournamentId_idx" ON "Bracket"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_tournamentId_categoryId_key" ON "Bracket"("tournamentId", "categoryId");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");

-- CreateIndex
CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendly_matchId_key" ON "Friendly"("matchId");

-- CreateIndex
CREATE INDEX "Friendly_requesterId_idx" ON "Friendly"("requesterId");

-- CreateIndex
CREATE INDEX "Friendly_challengedId_idx" ON "Friendly"("challengedId");

-- CreateIndex
CREATE INDEX "Friendly_matchId_idx" ON "Friendly"("matchId");

-- CreateIndex
CREATE INDEX "FriendlyAthlete_friendlyId_idx" ON "FriendlyAthlete"("friendlyId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendlyAthlete_friendlyId_teamMemberId_key" ON "FriendlyAthlete"("friendlyId", "teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_friendlyId_key" ON "Match"("friendlyId");

-- CreateIndex
CREATE INDEX "Match_bracketId_idx" ON "Match"("bracketId");

-- CreateIndex
CREATE INDEX "Match_friendlyId_idx" ON "Match"("friendlyId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_idx" ON "MatchEvent"("matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_createdAt_idx" ON "MatchEvent"("matchId", "createdAt");

-- CreateIndex
CREATE INDEX "MatchSet_matchId_idx" ON "MatchSet"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_matchId_setNumber_key" ON "MatchSet"("matchId", "setNumber");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointEvent_matchId_idx" ON "PointEvent"("matchId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Registration_tournamentId_idx" ON "Registration"("tournamentId");

-- CreateIndex
CREATE INDEX "Registration_userId_idx" ON "Registration"("userId");

-- CreateIndex
CREATE INDEX "RegistrationMember_registrationId_idx" ON "RegistrationMember"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationMember_registrationId_teamMemberId_key" ON "RegistrationMember"("registrationId", "teamMemberId");

-- CreateIndex
CREATE INDEX "Sponsor_tournamentId_idx" ON "Sponsor"("tournamentId");

-- CreateIndex
CREATE INDEX "StageFacility_stageId_idx" ON "StageFacility"("stageId");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");

-- CreateIndex
CREATE INDEX "TeamInvitation_invitedUserId_status_idx" ON "TeamInvitation"("invitedUserId", "status");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_teamId_invitedUserId_key" ON "TeamInvitation"("teamId", "invitedUserId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "Tournament_ownerId_idx" ON "Tournament"("ownerId");

-- CreateIndex
CREATE INDEX "TournamentCategory_tournamentId_idx" ON "TournamentCategory"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentReferee_userId_idx" ON "TournamentReferee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentReferee_tournamentId_userId_key" ON "TournamentReferee"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "TournamentStage_tournamentId_idx" ON "TournamentStage"("tournamentId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "chat_messages_chatId_createdAt_idx" ON "chat_messages"("chatId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chats_teamId_key" ON "chats"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "chats_teamAId_teamBId_key" ON "chats"("teamAId", "teamBId");

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_userId_purpose_version_idx" ON "user_consents"("userId", "purpose", "version");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentReferee" ADD CONSTRAINT "TournamentReferee_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentReferee" ADD CONSTRAINT "TournamentReferee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCategory" ADD CONSTRAINT "TournamentCategory_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentStage" ADD CONSTRAINT "TournamentStage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageFacility" ADD CONSTRAINT "StageFacility_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TournamentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMember" ADD CONSTRAINT "RegistrationMember_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMember" ADD CONSTRAINT "RegistrationMember_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TournamentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendly" ADD CONSTRAINT "Friendly_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendly" ADD CONSTRAINT "Friendly_requesterTeamId_fkey" FOREIGN KEY ("requesterTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendly" ADD CONSTRAINT "Friendly_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendly" ADD CONSTRAINT "Friendly_challengedTeamId_fkey" FOREIGN KEY ("challengedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendly" ADD CONSTRAINT "Friendly_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyAthlete" ADD CONSTRAINT "FriendlyAthlete_friendlyId_fkey" FOREIGN KEY ("friendlyId") REFERENCES "Friendly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendlyAthlete" ADD CONSTRAINT "FriendlyAthlete_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteStats" ADD CONSTRAINT "AthleteStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteStats" ADD CONSTRAINT "AthleteStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteStats" ADD CONSTRAINT "AthleteStats_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

