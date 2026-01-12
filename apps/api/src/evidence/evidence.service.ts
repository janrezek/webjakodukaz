import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { randomUUID } from 'crypto';
import { captureScreenshot } from '@webjakodukaz/capture';
import { S3Service } from '../storage/s3.service';
import { HashService } from '../common/hash.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvidenceStatus, ArtifactType } from '@prisma/client';

/**
 * Service responsible for managing evidence capture and retrieval operations.
 * Handles the complete workflow from capturing web pages to storing evidence
 * with integrity hashes in the database and S3 storage.
 */
@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);
  private readonly rawPrefix: string;

  /**
   * Creates an instance of EvidenceService.
   * @param config Configuration service for accessing environment variables
   * @param s3Service Service for S3 storage operations
   * @param hashService Service for creating integrity hashes
   * @param prisma Prisma service for database operations
   */
  constructor(
    private readonly config: ConfigService,
    private readonly s3Service: S3Service,
    private readonly hashService: HashService,
    private readonly prisma: PrismaService,
  ) {
    const rawPrefix = this.config.get<string>('S3_RAW_PREFIX')!;
    this.rawPrefix = rawPrefix.replace(/\/+$/, '');
  }

  /**
   * Captures a web page as evidence by taking a screenshot and storing it with metadata.
   * This method performs the complete evidence capture workflow:
   * 1. Generates a unique evidence ID
   * 2. Captures a screenshot of the provided URL
   * 3. Creates integrity hashes for the screenshot and evidence
   * 4. Uploads the screenshot to S3
   * 5. Saves evidence and artifact records to the database in a transaction
   * 6. Generates a pre-signed download URL for the screenshot
   *
   * @param dto Data transfer object containing the URL to capture and optional note
   * @returns Promise resolving to evidence response with metadata, hashes, and download URL
   * @throws Error if screenshot capture, S3 upload, or database operation fails
   */
  async capture(dto: CreateEvidenceDto) {
    const evidenceId = `ev_${randomUUID()}`;
    const timestamp = Date.now();

    // 1) Capture screenshot
    this.logger.debug(`Capturing screenshot for URL: ${dto.url}`);
    const png = await captureScreenshot(dto.url);

    // 2) Create hash of the screenshot for integrity verification
    const screenshotHash = this.hashService.createHash(png);
    this.logger.debug(`Screenshot hash: ${screenshotHash}`);

    // 3) Upload to S3
    const key = `${this.rawPrefix}/${evidenceId}/screenshot-full.png`;
    await this.s3Service.upload(key, png, 'image/png');

    // 4) Create evidence hash (integrity hash combining all evidence data)
    const evidenceHash = this.hashService.createEvidenceHash(
      evidenceId,
      dto.url,
      screenshotHash,
      timestamp,
    );
    this.logger.debug(`Evidence hash: ${evidenceHash}`);

    // 5) Save to database in transaction
    const evidence = await this.prisma.$transaction(async (tx) => {
      // Create evidence record
      const evidenceRecord = await tx.evidence.create({
        data: {
          evidenceId,
          url: dto.url,
          note: dto.note ?? null,
          timestamp: BigInt(timestamp),
          evidenceHash,
          status: EvidenceStatus.DONE,
        },
      });

      // Create artifact record for screenshot
      await tx.evidenceArtifact.create({
        data: {
          evidenceId: evidenceRecord.id,
          path: 'screenshot-full.png',
          name: 'screenshot-full.png',
          type: ArtifactType.FILE,
          hash: screenshotHash,
          s3Key: key,
          size: BigInt(png.length),
          mimeType: 'image/png',
        },
      });

      return evidenceRecord;
    });

    // 6) Generate pre-signed download URL
    const { url: downloadUrl, expiresInSeconds } =
      await this.s3Service.getPresignedUrl(key);

    return {
      evidenceId: evidence.evidenceId,
      status: evidence.status,
      url: evidence.url,
      note: evidence.note,
      timestamp: Number(evidence.timestamp),
      hash: {
        screenshot: screenshotHash,
        evidence: evidence.evidenceHash,
      },
      artifact: {
        type: 'SCREENSHOT_FULL',
        key,
        downloadUrl,
        expiresInSeconds,
      },
    };
  }

  /**
   * Retrieves a single evidence record by its evidence ID.
   * Includes all associated artifacts with pre-signed download URLs.
   *
   * @param evidenceId Unique evidence identifier (format: ev_<uuid>)
   * @returns Promise resolving to evidence details with artifacts, or null if not found
   */
  async findOne(evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { evidenceId },
      include: {
        artifacts: {
          orderBy: { path: 'asc' },
        },
      },
    });

    if (!evidence) {
      return null;
    }

    // Generate pre-signed URLs for artifacts
    const artifactsWithUrls = await Promise.all(
      evidence.artifacts.map(async (artifact) => {
        const { url: downloadUrl, expiresInSeconds } =
          await this.s3Service.getPresignedUrl(artifact.s3Key);

        return {
          id: artifact.id,
          path: artifact.path,
          name: artifact.name,
          type: artifact.type,
          hash: artifact.hash,
          size: Number(artifact.size),
          mimeType: artifact.mimeType,
          downloadUrl,
          expiresInSeconds,
        };
      }),
    );

    return {
      evidenceId: evidence.evidenceId,
      status: evidence.status,
      url: evidence.url,
      note: evidence.note,
      timestamp: Number(evidence.timestamp),
      hash: {
        evidence: evidence.evidenceHash,
      },
      artifacts: artifactsWithUrls,
      createdAt: evidence.createdAt.toISOString(),
      updatedAt: evidence.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieves a paginated list of all evidence records.
   * Results are ordered by creation date (newest first).
   *
   * @param skip Number of records to skip (default: 0)
   * @param take Number of records to return (default: 20)
   * @returns Promise resolving to paginated evidence list with metadata
   */
  async findAll(skip = 0, take = 20) {
    const [evidence, total] = await Promise.all([
      this.prisma.evidence.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          evidenceId: true,
          url: true,
          note: true,
          timestamp: true,
          evidenceHash: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { artifacts: true },
          },
        },
      }),
      this.prisma.evidence.count(),
    ]);

    return {
      data: evidence.map((e) => ({
        evidenceId: e.evidenceId,
        url: e.url,
        note: e.note,
        timestamp: Number(e.timestamp),
        status: e.status,
        artifactCount: e._count.artifacts,
        createdAt: e.createdAt.toISOString(),
      })),
      pagination: {
        skip,
        take,
        total,
        hasMore: skip + take < total,
      },
    };
  }
}
