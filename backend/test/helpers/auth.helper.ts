import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/common/prisma.service';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  accessToken: string;
}

export async function createTestUser(
  prisma: PrismaService,
  jwtService: JwtService,
  configService: ConfigService,
  overrides: { email?: string; name?: string } = {},
): Promise<TestUser> {
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const name = overrides.name || 'Test User';

  const user = await prisma.user.create({
    data: {
      email,
      name,
      isEmailVerified: true,
      isFirstAccess: false,
    },
  });

  const payload = { sub: user.id, email: user.email };
  const accessToken = jwtService.sign(payload, {
    secret: configService.get<string>('JWT_SECRET'),
  });

  return { id: user.id, email: user.email, name: user.name, accessToken };
}

export async function cleanupDatabase(prisma: PrismaService) {
  await prisma.friendly.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.pointEvent.deleteMany();
  await prisma.matchSet.deleteMany();
  await prisma.match.deleteMany();
  await prisma.bracket.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.stageFacility.deleteMany();
  await prisma.tournamentStage.deleteMany();
  await prisma.tournamentCategory.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.user.deleteMany();
}
