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

/**
 * Controller handling HTTP requests for evidence capture and retrieval.
 * All endpoints are prefixed with /v1.
 */
@Controller('v1')
export class EvidenceController {
  /**
   * Creates an instance of EvidenceController.
   * @param evidenceService Service for evidence operations
   */
  constructor(private readonly evidenceService: EvidenceService) {}

  /**
   * Endpoint for capturing a web page as evidence.
   * @param dto Data transfer object containing URL
   * @returns Evidence response with metadata, hashes, and download URL
   */
  @Post('capture')
  async capture(@Body() dto: CreateEvidenceDto) {
    return this.evidenceService.capture(dto);
  }

  /**
   * Endpoint for retrieving a paginated list of all evidence records.
   * @param skip Optional query parameter for pagination offset (default: 0)
   * @param take Optional query parameter for page size (default: 20)
   * @returns Paginated list of evidence records
   */
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

  /**
   * Endpoint for retrieving a single evidence record by ID.
   * @param evidenceId Unique evidence identifier (format: ev_<uuid>)
   * @returns Evidence details with all artifacts and download URLs
   * @throws NotFoundException if evidence with the given ID is not found
   */
  @Get('evidence/:evidenceId')
  async findOne(@Param('evidenceId') evidenceId: string) {
    const evidence = await this.evidenceService.findOne(evidenceId);
    if (!evidence) {
      throw new NotFoundException(`Evidence with ID ${evidenceId} not found`);
    }
    return evidence;
  }
}