import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Service providing database access through Prisma ORM.
 * Uses PostgreSQL adapter for connection management.
 * Automatically connects on module initialization and disconnects on module destruction.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Creates an instance of PrismaService.
   * Initializes Prisma client with PostgreSQL adapter using DATABASE_URL from environment.
   */
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  /**
   * Connects to the database when the module is initialized.
   * Called automatically by NestJS lifecycle hooks.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnects from the database when the module is destroyed.
   * Called automatically by NestJS lifecycle hooks.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
