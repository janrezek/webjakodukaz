import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvidenceModule } from './evidence/evidence.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Root application module.
 * Configures global modules (Config, Prisma) and imports feature modules.
 * Validates required environment variables on startup.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        S3_REGION: Joi.string().required(),
        S3_ACCESS_KEY_ID: Joi.string().required(),
        S3_SECRET_ACCESS_KEY: Joi.string().required(),
        S3_BUCKET: Joi.string().required(),
        S3_RAW_PREFIX: Joi.string().required(),
        S3_PRESIGN_EXPIRES_SECONDS: Joi.number()
          .integer()
          .positive()
          .required(),
      }),
    }),
    PrismaModule,
    EvidenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
