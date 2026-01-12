import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

/**
 * Module for storage operations.
 * Provides S3 service for file uploads and pre-signed URL generation.
 */
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class StorageModule {}
