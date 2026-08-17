import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationService } from '../../common/services/notification.service';
import { AppError } from '../../common/errors/app-error';
import { assertImageFile } from '../../common/utils/file-validation';
import { parseDate } from '../../common/utils/date';
import { canTransition } from './tournament-state-chart';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { AddSponsorsDto } from './dto/add-sponsors.dto';
import { QueryTournamentsDto } from './dto/query-tournaments.dto';
import { ExploreQueryDto } from './dto/explore-query.dto';
import { TournamentStatus, TournamentEventType } from '@prisma/client';

const OWNER_INCLUDE = {
  select: { id: true, name: true, email: true, avatarUrl: true },
};

const FULL_INCLUDE = {
  owner: OWNER_INCLUDE,
  categories: true,
  stages: { orderBy: { date: 'asc' as const }, include: { facilities: true } },
  sponsors: true,
  _count: { select: { registrations: true } },
};

@Injectable()
export class TournamentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private notificationService: NotificationService,
  ) {}

  async create(userId: string, dto: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: userId,
      },
      include: FULL_INCLUDE,
    });
  }

  async update(tournamentId: string, userId: string, dto: CreateTournamentDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { stages: true },
    });
    if (!tournament || tournament.ownerId !== userId) {
      throw AppError.notTournamentOwner();
    }
    this.ensureEditable(tournament);
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { name: dto.name, description: dto.description },
      include: FULL_INCLUDE,
    });
  }

  async updateStructure(
    tournamentId: string,
    userId: string,
    dto: UpdateStructureDto,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { stages: true },
    });
    if (!tournament || tournament.ownerId !== userId) {
      throw AppError.notTournamentOwner();
    }
    this.ensureDraft(tournament.status);
    this.ensureEditable(tournament);

    if (dto.eventType === TournamentEventType.CIRCUIT && (!dto.stages || dto.stages.length === 0)) {
      throw AppError.circuitRequiresStages();
    }

    // Geocode addresses that don't already have coordinates (best-effort — a
    // stage without lat/lng just won't show up in "perto de você"/nearby features).
    const geocodedStages = await this.geocodeStages(dto.stages ?? []);

    return this.prisma.$transaction(async (tx) => {
      await tx.stageFacility.deleteMany({ where: { stage: { tournamentId } } });
      await tx.tournamentStage.deleteMany({ where: { tournamentId } });
      await tx.tournamentCategory.deleteMany({ where: { tournamentId } });

      return tx.tournament.update({
        where: { id: tournamentId },
        data: {
          eventType: dto.eventType,
          stages: dto.stages
            ? {
                create: geocodedStages.map((s) => ({
                  name: s.name,
                  date: parseDate(s.date) ?? new Date(),
                  startTime: s.startTime ? parseDate(s.startTime) ?? undefined : undefined,
                  maxTeams: s.maxTeams,
                  street: s.street,
                  number: s.number,
                  neighborhood: s.neighborhood,
                  cep: s.cep,
                  address: s.address ?? composeStageAddress(s),
                  city: s.city,
                  state: s.state,
                  latitude: s.latitude,
                  longitude: s.longitude,
                  regionRadius: s.regionRadius,
                  facilities: s.facilities
                    ? {
                        createMany: {
                          data: s.facilities.map((f) => ({
                            name: f.name,
                            available: f.available ?? true,
                          })),
                        },
                      }
                    : undefined,
                })),
              }
            : undefined,
          categories: dto.categories
            ? { createMany: { data: dto.categories.map((c) => ({
                ...c,
                startTime: c.startTime ? new Date(c.startTime) : undefined,
                registrationDeadline: c.registrationDeadline ? new Date(c.registrationDeadline) : undefined,
              })) } }
            : undefined,
        },
        include: FULL_INCLUDE,
      });
    });
  }

  /**
   * Fills in latitude/longitude for stages that don't already have it, via
   * Nominatim (OpenStreetMap) geocoding. Sequential with a delay between
   * requests to respect Nominatim's 1 req/s usage policy. Best-effort: a
   * stage that fails to geocode just keeps null coordinates.
   */
  private async geocodeStages(stages: import('./dto/update-structure.dto').StageDto[]) {
    const result: typeof stages = [];
    for (const stage of stages) {
      if (stage.latitude != null && stage.longitude != null) {
        result.push(stage);
        continue;
      }
      const query = buildGeocodeQuery(stage);
      if (!query) {
        result.push(stage);
        continue;
      }
      const coords = await this.geocodeAddress(query);
      result.push(coords ? { ...stage, latitude: coords.latitude, longitude: coords.longitude } : stage);
      // Nominatim usage policy: max 1 request/second.
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    return result;
  }

  private async geocodeAddress(query: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ToquePlay/1.0 (contato@toqueplay.com)',
          'Accept-Language': 'pt-BR',
        },
      });
      if (!response.ok) return null;
      const results = (await response.json()) as { lat: string; lon: string }[];
      if (!results.length) return null;
      const latitude = parseFloat(results[0].lat);
      const longitude = parseFloat(results[0].lon);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
      return { latitude, longitude };
    } catch {
      return null;
    }
  }

  async addStageFacilities(
    tournamentId: string,
    stageId: string,
    userId: string,
    facilities: { name: string; available?: boolean }[],
  ) {
    const tournament = await this.verifyOwnership(tournamentId, userId);
    this.ensureDraft(tournament.status);

    const stage = await this.prisma.tournamentStage.findFirst({
      where: { id: stageId, tournamentId },
    });
    if (!stage) {
      throw AppError.stageNotFound();
    }

    await this.prisma.stageFacility.createMany({
      data: facilities.map((f) => ({
        stageId,
        name: f.name,
        available: f.available ?? true,
      })),
    });

    return this.prisma.tournamentStage.findUnique({
      where: { id: stageId },
      include: { facilities: true },
    });
  }

  async removeStageFacility(
    tournamentId: string,
    stageId: string,
    facilityId: string,
    userId: string,
  ) {
    await this.verifyOwnership(tournamentId, userId);

    const facility = await this.prisma.stageFacility.findFirst({
      where: { id: facilityId, stage: { tournamentId } },
    });

    if (!facility) {
      throw AppError.facilityNotFound();
    }

    await this.prisma.stageFacility.delete({ where: { id: facilityId } });
  }

  async addSponsors(
    tournamentId: string,
    userId: string,
    dto: AddSponsorsDto,
  ) {
    const tournament = await this.verifyOwnership(tournamentId, userId);
    this.ensureDraft(tournament.status);

    await this.prisma.sponsor.createMany({
      data: dto.sponsors.map((s) => ({
        tournamentId,
        name: s.name,
        logoUrl: s.logoUrl,
        description: s.description,
      })),
    });

    return this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { sponsors: true },
    });
  }

  async removeSponsor(
    tournamentId: string,
    sponsorId: string,
    userId: string,
  ) {
    await this.verifyOwnership(tournamentId, userId);

    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id: sponsorId, tournamentId },
    });

    if (!sponsor) {
      throw AppError.sponsorNotFound();
    }

    await this.prisma.sponsor.delete({ where: { id: sponsorId } });
  }

  async getSummary(tournamentId: string, userId: string) {
    await this.verifyOwnership(tournamentId, userId);

    return this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: FULL_INCLUDE,
    });
  }

  async publish(tournamentId: string, userId: string) {
    const tournament = await this.verifyOwnership(tournamentId, userId);

    if (!canTransition(tournament.status, TournamentStatus.PUBLISHED)) {
      throw AppError.tournamentAlreadyPublished();
    }

    const tournamentWithRelations = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { stages: true, categories: true },
    });

    if (!tournamentWithRelations) {
      throw AppError.tournamentNotFound();
    }

    const missing: string[] = [];
    if (!tournamentWithRelations.name) missing.push('name');
    if (tournamentWithRelations.stages.length === 0) missing.push('at least one stage');
    if (tournamentWithRelations.categories.length === 0) missing.push('at least one category');
    const stagesWithoutLocation = tournamentWithRelations.stages.some(
      (s) => !s.city && !s.address && !s.street,
    );
    if (stagesWithoutLocation) missing.push('location on all stages (city or address)');

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    minDate.setHours(0, 0, 0, 0);
    for (const stage of tournamentWithRelations.stages) {
      const stageDate = new Date(stage.date);
      stageDate.setHours(0, 0, 0, 0);
      if (stageDate < minDate) {
        throw AppError.stageDateTooSoon();
      }
    }

    if (missing.length > 0) {
      throw AppError.publishMissingFields();
    }

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.PUBLISHED, isPublished: true },
      include: FULL_INCLUDE,
    });
  }

  async startTournament(tournamentId: string, userId: string) {
    const tournament = await this.verifyOwnership(tournamentId, userId);

    if (!canTransition(tournament.status, TournamentStatus.IN_PROGRESS)) {
      throw AppError.tournamentNotReady();
    }

    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.IN_PROGRESS },
      include: FULL_INCLUDE,
    });

    // Notify all registered athletes
    const userIds = await this.notificationService.getRegisteredAthleteUserIds(tournamentId);
    if (userIds.length > 0) {
      await this.notificationService.sendToUsers(userIds, {
        title: 'Torneio Iniciado!',
        body: `O torneio "${updated.name}" começou! Acompanhe os jogos.`,
        type: 'TOURNAMENT_STARTED',
        referenceId: tournamentId,
      });
    }

    return updated;
  }

  async generateRefereeCode(tournamentId: string, userId: string) {
    const tournament = await this.verifyOwnership(tournamentId, userId);

    if (tournament.status !== TournamentStatus.BRACKET_GENERATED && tournament.status !== TournamentStatus.IN_PROGRESS) {
      throw AppError.tournamentNotReady();
    }

    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (t?.refereeCode) {
      return { code: t.refereeCode };
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { refereeCode: code },
    });

    return { code };
  }

  async enterRefereeCode(userId: string, code: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        refereeCode: code,
        status: { in: [TournamentStatus.BRACKET_GENERATED, TournamentStatus.IN_PROGRESS] },
      },
    });

    if (!tournament) {
      throw AppError.invalidRefereeCode();
    }

    // Only referees the organizer already invited (via addReferee) may confirm the code
    const invited = await this.prisma.tournamentReferee.findUnique({
      where: { tournamentId_userId: { tournamentId: tournament.id, userId } },
    });
    if (!invited) {
      throw AppError.refereeNotInvited();
    }

    await this.prisma.tournamentReferee.update({
      where: { tournamentId_userId: { tournamentId: tournament.id, userId } },
      data: { codeConfirmed: true },
    });

    return { tournamentId: tournament.id, tournamentName: tournament.name };
  }

  async addReferee(tournamentId: string, organizerId: string, email: string) {
    await this.verifyOwnership(tournamentId, organizerId);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw AppError.userNotFound();

    const result = await this.prisma.tournamentReferee.upsert({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
      update: {},
      create: { tournamentId, userId: user.id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    // Notify the referee
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { name: true },
    });
    await this.notificationService.createNotification(
      user.id,
      'Convite de Árbitro',
      `Você foi adicionado como árbitro do torneio ${tournament?.name ?? ''}.`,
      'REFEREE_ASSIGNED',
      tournamentId,
    );

    return result;
  }

  async removeReferee(tournamentId: string, organizerId: string, refereeId: string) {
    await this.verifyOwnership(tournamentId, organizerId);
    await this.prisma.tournamentReferee.delete({
      where: { id: refereeId },
    });
  }

  async completeTournament(tournamentId: string, userId: string) {
    const tournament = await this.verifyOwnership(tournamentId, userId);

    if (!canTransition(tournament.status, TournamentStatus.FINISHED)) {
      throw AppError.tournamentNotInProgress();
    }

    // Check all matches in all brackets are finished
    const pendingMatches = await this.prisma.match.count({
      where: {
        bracket: { tournamentId },
        status: { notIn: ['FINISHED', 'WALKOVER'] },
      },
    });
    if (pendingMatches > 0) {
      throw AppError.tournamentHasPendingMatches();
    }

    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.FINISHED },
      include: FULL_INCLUDE,
    });

    // Notify all registered athletes
    const userIds = await this.notificationService.getRegisteredAthleteUserIds(tournamentId);
    if (userIds.length > 0) {
      await this.notificationService.sendToUsers(userIds, {
        title: 'Torneio Finalizado!',
        body: `O torneio "${updated.name}" foi finalizado. Confira o resultado!`,
        type: 'TOURNAMENT_COMPLETED',
        referenceId: tournamentId,
      });
    }

    return updated;
  }

  async getReferees(tournamentId: string) {
    return this.prisma.tournamentReferee.findMany({
      where: { tournamentId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  async findRefereeTournaments(userId: string) {
    // Only tournaments where the referee code was actually confirmed —
    // being invited alone must not grant match access.
    const refs = await this.prisma.tournamentReferee.findMany({
      where: { userId, codeConfirmed: true },
      include: {
        tournament: {
          include: {
            stages: { orderBy: { date: 'asc' }, take: 1 },
            _count: { select: { brackets: true } },
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });
    return refs.map((r) => ({
      ...r.tournament,
      invitedAt: r.invitedAt,
    }));
  }

  async saveAsDraft(tournamentId: string, userId: string) {
    const tournament = await this.verifyOwnership(tournamentId, userId);

    if (!canTransition(tournament.status, TournamentStatus.DRAFT)) {
      throw AppError.tournamentNotDraft();
    }

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.DRAFT, isPublished: false },
      include: FULL_INCLUDE,
    });
  }

  async findAll(query: QueryTournamentsDto) {
    const where: any = {};
    if (query.status) where.status = query.status;

    if (query.city || query.state) {
      where.stages = {
        some: {
          ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }),
          ...(query.state && { state: query.state }),
        },
      };
    }

    if (query.categoryType || query.categoryFormat || query.categoryModality) {
      where.categories = {
        some: {
          ...(query.categoryType && { type: query.categoryType }),
          ...(query.categoryFormat && { format: query.categoryFormat }),
          ...(query.categoryModality && { modality: query.categoryModality }),
        },
      };
    }

    return this.prisma.tournament.findMany({
      where,
      include: {
        owner: OWNER_INCLUDE,
        categories: true,
        _count: { select: { categories: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(userId: string) {
    return this.prisma.tournament.findMany({
      where: { ownerId: userId },
      include: {
        owner: OWNER_INCLUDE,
        stages: { orderBy: { date: 'asc' } },
        _count: { select: { categories: true, registrations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: FULL_INCLUDE,
    });

    if (!tournament) {
      throw AppError.tournamentNotFound();
    }

    return tournament;
  }

  async cancel(tournamentId: string, userId: string) {
    const tournament = await this.verifyOwnership(tournamentId, userId);

    if (!canTransition(tournament.status, TournamentStatus.CANCELLED)) {
      throw AppError.tournamentCannotCancel();
    }

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.CANCELLED },
      include: FULL_INCLUDE,
    });
  }

  async verifyOwnership(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw AppError.tournamentNotFound();
    }

    if (tournament.ownerId !== userId) {
      throw AppError.notTournamentOwner();
    }

    return tournament;
  }

  async explore(query: ExploreQueryDto) {
    const where: any = {
      status: { notIn: [TournamentStatus.DRAFT, TournamentStatus.CANCELLED] },
    };

    if (query.status) where.status = query.status;

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.city || query.state) {
      where.stages = {
        some: {
          ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }),
          ...(query.state && { state: query.state }),
        },
      };
    }

    if (query.type || query.format || query.modality) {
      where.categories = {
        some: {
          ...(query.type && { type: query.type }),
          ...(query.format && { format: query.format }),
          ...(query.modality && { modality: query.modality }),
        },
      };
    }

    if (query.dateFrom || query.dateTo) {
      where.stages = where.stages || { some: {} };
      where.stages.some.date = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }

    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      where.categories = where.categories || { some: {} };
      where.categories.some.registrationPrice = {
        ...(query.priceMin !== undefined && { gte: query.priceMin }),
        ...(query.priceMax !== undefined && { lte: query.priceMax }),
      };
    }

    // Proximity filter
    if (query.latitude && query.longitude) {
      const radius = query.radius || 50;
      const kmPerDegreeLat = 111;
      const kmPerDegreeLng = 111 * Math.cos((query.latitude * Math.PI) / 180);
      const latDelta = radius / kmPerDegreeLat;
      const lngDelta = radius / kmPerDegreeLng;

      where.stages = where.stages || { some: {} };
      where.stages.some.latitude = {
        gte: query.latitude - latDelta,
        lte: query.latitude + latDelta,
      };
      where.stages.some.longitude = {
        gte: query.longitude - lngDelta,
        lte: query.longitude + lngDelta,
      };
    }

    const limit = query.limit || 20;
    const cursorObj = query.cursor ? { id: query.cursor } : undefined;

    return this.prisma.tournament.findMany({
      where,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        status: true,
        createdAt: true,
        stages: { select: { date: true, street: true, number: true, neighborhood: true, city: true, state: true, maxTeams: true }, orderBy: { date: 'asc' } },
        categories: { select: { type: true, format: true, modality: true, registrationPrice: true } },
        owner: OWNER_INCLUDE,
        _count: { select: { registrations: true } },
        registrations: {
          select: { team: { select: { id: true, name: true, avatarUrl: true } } },
          take: 6,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursorObj && { skip: 1, cursor: cursorObj }),
    });
  }

  async exploreWithNearby(query: ExploreQueryDto & { latitude?: number; longitude?: number }) {
    const { latitude, longitude, ...filters } = query;

    const nearbyLimit = 3;
    const allLimit = query.limit || 20;

    let nearby: any[] = [];

    // Fetch nearby if user has location
    if (latitude && longitude) {
      const radius = query.radius || 100;
      const kmPerDegreeLat = 111;
      const kmPerDegreeLng = 111 * Math.cos((latitude * Math.PI) / 180);
      const latDelta = radius / kmPerDegreeLat;
      const lngDelta = radius / kmPerDegreeLng;

      const nearbyWhere: any = {
        status: { notIn: [TournamentStatus.DRAFT, TournamentStatus.CANCELLED] },
        stages: {
          some: {
            latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
            longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
          },
        },
      };

      // Apply same filters
      if (filters.search) nearbyWhere.name = { contains: filters.search, mode: 'insensitive' };
      if (filters.type || filters.format || filters.modality) {
        nearbyWhere.categories = {
          some: {
            ...(filters.type && { type: filters.type }),
            ...(filters.format && { format: filters.format }),
            ...(filters.modality && { modality: filters.modality }),
          },
        };
      }

      nearby = await this.prisma.tournament.findMany({
        where: nearbyWhere,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          stages: { select: { date: true, street: true, number: true, neighborhood: true, city: true, state: true, latitude: true, longitude: true, maxTeams: true }, orderBy: { date: 'asc' } },
          categories: { select: { type: true, format: true, modality: true, registrationPrice: true } },
          owner: OWNER_INCLUDE,
          _count: { select: { registrations: true } },
          registrations: { select: { team: { select: { id: true, name: true, avatarUrl: true } } }, take: 6 },
        },
        orderBy: { createdAt: 'desc' },
        take: nearbyLimit,
      });

      // Calculate distance for each nearby
      nearby = nearby.map((t: any) => {
        const s = t.stages?.[0];
        let distanceKm = null;
        if (s?.latitude && s?.longitude) {
          const dLat = (s.latitude - latitude) * 111;
          const dLng = (s.longitude - longitude) * 111 * Math.cos((latitude * Math.PI) / 180);
          distanceKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
        }
        return { ...t, distanceKm };
      });
    }

    // Fetch all, excluding nearby IDs
    const nearbyIds = nearby.map((t: any) => t.id);

    const allWhere: any = {
      status: { notIn: [TournamentStatus.DRAFT, TournamentStatus.CANCELLED] },
      ...(nearbyIds.length > 0 && { id: { notIn: nearbyIds } }),
    };

    if (filters.search) allWhere.name = { contains: filters.search, mode: 'insensitive' };
    if (filters.city || filters.state) {
      allWhere.stages = {
        some: {
          ...(filters.city && { city: { equals: filters.city, mode: 'insensitive' } }),
          ...(filters.state && { state: filters.state }),
        },
      };
    }
    if (filters.type || filters.format || filters.modality) {
      allWhere.categories = {
        some: {
          ...(filters.type && { type: filters.type }),
          ...(filters.format && { format: filters.format }),
          ...(filters.modality && { modality: filters.modality }),
        },
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      allWhere.stages = allWhere.stages || { some: {} };
      allWhere.stages.some.date = {
        ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
        ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
      };
    }

    const all = await this.prisma.tournament.findMany({
      where: allWhere,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        status: true,
        createdAt: true,
        stages: { select: { date: true, street: true, number: true, neighborhood: true, city: true, state: true, maxTeams: true }, orderBy: { date: 'asc' } },
        categories: { select: { type: true, format: true, modality: true, registrationPrice: true } },
        owner: OWNER_INCLUDE,
        _count: { select: { registrations: true } },
        registrations: { select: { team: { select: { id: true, name: true, avatarUrl: true } } }, take: 6 },
      },
      orderBy: { createdAt: 'desc' },
      take: allLimit + 1,
    });

    const hasMore = all.length > allLimit;
    const allData = hasMore ? all.slice(0, -1) : all;

    return {
      nearby,
      all: allData,
      hasMore,
      nextCursor: hasMore ? allData[allData.length - 1]?.id : null,
    };
  }

  // Visitor mode (no login): only tournaments with a stage happening TODAY,
  // within a small radius — someone standing at the venue right now, not a
  // general "explore" browse.
  async findVisitorNearby(latitude: number, longitude: number, radius = 1) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return [];
    }

    const kmPerDegreeLat = 111;
    const kmPerDegreeLng = 111 * Math.cos((latitude * Math.PI) / 180);
    const latDelta = radius / kmPerDegreeLat;
    const lngDelta = radius / kmPerDegreeLng;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const stages = await this.prisma.tournamentStage.findMany({
      where: {
        latitude: { not: null, gte: latitude - latDelta, lte: latitude + latDelta },
        longitude: { not: null, gte: longitude - lngDelta, lte: longitude + lngDelta },
        date: { gte: todayStart, lte: todayEnd },
        tournament: {
          status: {
            in: [
              TournamentStatus.PUBLISHED,
              TournamentStatus.REGISTRATION_OPEN,
              TournamentStatus.REGISTRATION_CLOSED,
              TournamentStatus.BRACKET_GENERATED,
              TournamentStatus.IN_PROGRESS,
            ],
          },
        },
      },
      select: {
        city: true,
        state: true,
        street: true,
        number: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        date: true,
        tournament: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            categories: { select: { modality: true }, take: 1 },
          },
        },
      },
    });

    return stages
      .map((s) => {
        const dLat = (s.latitude! - latitude) * kmPerDegreeLat;
        const dLng = (s.longitude! - longitude) * kmPerDegreeLng;
        const distanceKm = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 10) / 10;
        return {
          id: s.tournament.id,
          name: s.tournament.name,
          description: s.tournament.description,
          status: s.tournament.status,
          modality: s.tournament.categories[0]?.modality,
          city: s.city,
          state: s.state,
          address: [s.street, s.number].filter(Boolean).join(', ') + (s.neighborhood ? ` — ${s.neighborhood}` : ''),
          date: s.date,
          distanceKm,
        };
      })
      .filter((t) => t.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async getPublicDetails(tournamentId: string, userId?: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        owner: OWNER_INCLUDE,
        categories: {
          include: {
            registrations: {
              where: { status: { in: ['CONFIRMED', 'PENDING_CONFIRMATION'] } },
              select: { id: true, status: true, team: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
        stages: { include: { facilities: true }, orderBy: { date: 'asc' } },
        sponsors: true,
        brackets: {
          include: {
            matches: {
              include: {
                teamA: { select: { id: true, name: true, avatarUrl: true } },
                teamB: { select: { id: true, name: true, avatarUrl: true } },
                winner: { select: { id: true, name: true } },
              },
              orderBy: [{ round: 'asc' }, { position: 'asc' }],
            },
          },
        },
      },
    });

    if (!tournament) {
      throw AppError.tournamentNotFound();
    }

    // Add A/B/C suffix for teams with multiple registrations
    for (const cat of tournament.categories) {
      const teamCount: Record<string, number> = {};
      const teamIndex: Record<string, number> = {};
      for (const reg of cat.registrations) {
        const tid = reg.team.id;
        teamCount[tid] = (teamCount[tid] ?? 0) + 1;
      }
      for (const reg of cat.registrations) {
        const tid = reg.team.id;
        if (teamCount[tid] > 1) {
          teamIndex[tid] = (teamIndex[tid] ?? 0) + 1;
          const suffix = String.fromCharCode(64 + teamIndex[tid]); // A=65
          (reg as any).teamDisplayName = `${reg.team.name} ${suffix}`;
        } else {
          (reg as any).teamDisplayName = reg.team.name;
        }
      }
    }

    // Check if logged-in user has a registration
    let userRegistration = null;
    if (userId) {
      userRegistration = await this.prisma.registration.findFirst({
        where: { tournamentId, userId },
        select: { id: true, status: true, category: { select: { type: true, format: true } } },
      });
    }

    return { ...tournament, userRegistration };
  }

  private ensureDraft(status: TournamentStatus) {
    if (status !== TournamentStatus.DRAFT) {
      throw AppError.tournamentNotDraft();
    }
  }

  private ensureEditable(tournament: { status: TournamentStatus; stages?: { date: Date }[] }) {
    if (tournament.status === TournamentStatus.DRAFT) {
      return;
    }
    if (
      tournament.status === TournamentStatus.IN_PROGRESS ||
      tournament.status === TournamentStatus.FINISHED ||
      tournament.status === TournamentStatus.CANCELLED
    ) {
      throw AppError.tournamentCannotCancel();
    }

    const earliestStage = tournament.stages?.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )[0];

    if (earliestStage) {
      const stageDate = new Date(earliestStage.date);
      stageDate.setHours(0, 0, 0, 0);
      const limit = new Date();
      limit.setDate(limit.getDate() + 3);
      limit.setHours(0, 0, 0, 0);
      if (stageDate < limit) {
        throw AppError.tournamentTooCloseToEdit();
      }
    }
  }

  async getBanners() {
    const publicUrl = process.env.MINIO_PUBLIC_URL;
    const bucket = process.env.MINIO_BUCKET ?? 'toqueplay';
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const host = process.env.MINIO_ENDPOINT ?? 'localhost';
    const port = process.env.MINIO_PORT ?? '9000';
    const baseUrl = publicUrl ? `${publicUrl}/${bucket}` : `${protocol}://${host}:${port}/${bucket}`;

    // Default banner keys shipped with the app
    const defaultKeys = [
      'banners/WhatsApp Image 2026-06-10 at 12.04.25 AM.jpeg',
      'banners/WhatsApp Image 2026-06-10 at 12.10.36 AM.jpeg',
      'banners/WhatsApp Image 2026-06-10 at 12.10.46 AM.jpeg',
      'banners/WhatsApp Iamage 2026-06-10 at 12.04.25 AM.jpeg',
    ];

    return defaultKeys.map((key) => `${baseUrl}/${key}`);
  }

  async uploadCover(tournamentId: string, userId: string, file: Express.Multer.File) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.ownerId !== userId) {
      throw AppError.notTournamentOwner();
    }

    await assertImageFile(file, 10 * 1024 * 1024);

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `tournaments/${tournamentId}/cover-${Date.now()}.${ext}`;

    // Delete old cover
    if (tournament.imageUrl) {
      const oldKey = this.storage.extractKeyFromUrl(tournament.imageUrl);
      if (oldKey) await this.storage.deleteFile(oldKey);
    }

    const imageUrl = await this.storage.uploadFile(file.buffer, key, file.mimetype);
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { imageUrl },
      include: FULL_INCLUDE,
    });
  }

  async setBannerUrl(tournamentId: string, userId: string, imageUrl: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.ownerId !== userId) {
      throw AppError.notTournamentOwner();
    }
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { imageUrl },
      include: FULL_INCLUDE,
    });
  }
}

function composeStageAddress(stage: {
  street?: string;
  number?: string;
  neighborhood?: string;
}): string | undefined {
  const parts = [stage.street, stage.number, stage.neighborhood].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function buildGeocodeQuery(stage: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}): string | undefined {
  const parts = [stage.street, stage.number, stage.neighborhood, stage.city, stage.state, stage.cep].filter(Boolean);
  return parts.length > 0 ? `${parts.join(', ')}, Brasil` : undefined;
}
