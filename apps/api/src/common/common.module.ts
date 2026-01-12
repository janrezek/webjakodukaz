import { Module } from '@nestjs/common';
import { HashService } from './hash.service';

/**
 * Module for common utilities and services.
 * Provides hash service for integrity verification.
 */
@Module({
  providers: [HashService],
  exports: [HashService],
})
export class CommonModule {}
