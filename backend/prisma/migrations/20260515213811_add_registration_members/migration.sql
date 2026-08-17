-- CreateTable
CREATE TABLE "RegistrationMember" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,

    CONSTRAINT "RegistrationMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistrationMember_registrationId_idx" ON "RegistrationMember"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationMember_registrationId_teamMemberId_key" ON "RegistrationMember"("registrationId", "teamMemberId");

-- AddForeignKey
ALTER TABLE "RegistrationMember" ADD CONSTRAINT "RegistrationMember_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMember" ADD CONSTRAINT "RegistrationMember_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
