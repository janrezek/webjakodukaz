import { Module } from '@nestjs/common';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { StorageModule } from '../storage/storage.module';
import { CommonModule } from '../common/common.module';

/**
 * Module for evidence capture and management functionality.
 * Provides endpoints and services for capturing web pages as evidence
 * and retrieving evidence records.
 */
@Module({
  imports: [StorageModule, CommonModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}