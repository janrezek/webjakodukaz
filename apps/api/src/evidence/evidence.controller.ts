import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

@Controller('v1')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post('capture')
  async capture(@Body() dto: CreateEvidenceDto) {
    return this.evidenceService.capture(dto);
  }

  @Get('evidence')
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.evidenceService.findAll(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
  }

  @Get('evidence/:evidenceId')
  async findOne(@Param('evidenceId') evidenceId: string) {
    const evidence = await this.evidenceService.findOne(evidenceId);
    if (!evidence) {
      throw new NotFoundException(`Evidence with ID ${evidenceId} not found`);
    }
    return evidence;
  }
}