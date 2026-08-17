import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BracketsService } from './brackets.service';
import { GenerateBracketDto } from './dto/generate-bracket.dto';

@ApiTags('Brackets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tournaments')
export class BracketsController {
  constructor(private readonly bracketsService: BracketsService) {}

  @Post(':id/generate-bracket')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar chaveamento para uma categoria' })
  @ApiResponse({ status: 201, description: 'Chaveamento gerado com sucesso' })
  async generateBracket(
    @Param('id') tournamentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateBracketDto,
  ) {
    return this.bracketsService.generateBracket(tournamentId, userId, dto);
  }

  @Public()
  @Get(':id/bracket')
  @ApiOperation({ summary: 'Visualizar chaveamento do torneio' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filtrar por categoria' })
  @ApiResponse({ status: 200, description: 'Chaveamento retornado' })
  async getBracket(
    @Param('id') tournamentId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.bracketsService.getBracket(tournamentId, categoryId);
  }
}
