import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { randomUUID } from 'crypto';
import { capturePage } from '@webjakodukaz/capture';
import { S3Service } from '../storage/s3.service';
import { HashService } from '../common/hash.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvidenceStatus, ArtifactType } from '@prisma/client';
import archiver from 'archiver';

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
   * Captures a web page as evidence by taking a screenshot, HTML content and storing it in a ZIP package.
   * The ZIP is the source of truth and contains all files plus a manifest.json.
   * @param dto Data transfer object containing the URL to capture
   * @returns Promise resolving to evidence response with metadata, hashes, and ZIP download URL
   * @throws Error if page capture, ZIP creation, S3 upload, or database operation fails
   */
  async capture(dto: CreateEvidenceDto) {
    const evidenceId = `ev_${randomUUID()}`;
    const timestamp = Date.now();

    this.logger.debug(`Capturing page for URL: ${dto.url}`);
    const { screenshot, html, metadata } = await capturePage(dto.url);

    const screenshotHash = metadata.screenshotHash;
    const htmlHash = metadata.htmlHash;
    this.logger.debug(`Screenshot hash: ${screenshotHash}`);
    this.logger.debug(`HTML hash: ${htmlHash}`);

    const contentFiles = [
      {
        path: 'screenshot-full.png',
        name: 'screenshot-full.png',
        hash: screenshotHash,
        size: screenshot.length,
        mimeType: 'image/png',
      },
      {
        path: 'page.html',
        name: 'page.html',
        hash: htmlHash,
        size: Buffer.byteLength(html, 'utf-8'),
        mimeType: 'text/html',
      },
    ];

    const metadataJson = JSON.stringify(
      {
        ...metadata,
      evidenceId,
      },
      null,
      2,
    );
    const metadataHash = this.hashService.createHash(metadataJson);
    const metadataSize = Buffer.byteLength(metadataJson, 'utf-8');

    const manifestFiles = [
      ...contentFiles,
      {
        path: 'metadata.json',
        name: 'metadata.json',
        hash: metadataHash,
        size: metadataSize,
        mimeType: 'application/json',
      },
    ];
    const manifestJson = JSON.stringify(
      {
        files: manifestFiles.map((f) => ({
          path: f.path,
          name: f.name,
          hash: f.hash,
          size: f.size,
          mimeType: f.mimeType,
        })),
      },
      null,
      2,
    );
    const manifestHash = this.hashService.createHash(manifestJson);
    const manifestSize = Buffer.byteLength(manifestJson, 'utf-8');

    const zipBuffer = await this.createZipPackage({
      screenshot,
      html,
      metadata: metadataJson,
      manifest: manifestJson,
    });

    const zipHash = this.hashService.createHash(zipBuffer);
    const zipSize = zipBuffer.length;
    this.logger.debug(`ZIP hash: ${zipHash}`);
    this.logger.debug(`ZIP size: ${zipSize} bytes`);

    const zipKey = `${this.rawPrefix}/${evidenceId}/package.zip`;
    await this.s3Service.upload(zipKey, zipBuffer, 'application/zip');

    const evidence = await this.prisma.$transaction(async (tx) => {
      const evidenceRecord = await tx.evidence.create({
        data: {
          evidenceId,
          url: dto.url,
          timestamp: BigInt(timestamp),
          zipS3Key: zipKey,
          zipHash,
          zipSize: BigInt(zipSize),
          status: EvidenceStatus.DONE,
        },
      });

      const artifactPromises = contentFiles.map((file) =>
        tx.evidenceArtifact.create({
          data: {
            evidenceId: evidenceRecord.id,
            path: file.path,
            name: file.name,
            type: ArtifactType.FILE,
            hash: file.hash,
            size: BigInt(file.size),
            mimeType: file.mimeType,
          },
        }),
      );

      artifactPromises.push(
        tx.evidenceArtifact.create({
          data: {
            evidenceId: evidenceRecord.id,
            path: 'metadata.json',
            name: 'metadata.json',
            type: ArtifactType.FILE,
            hash: metadataHash,
            size: BigInt(metadataSize),
            mimeType: 'application/json',
          },
        }),
      );

      artifactPromises.push(
        tx.evidenceArtifact.create({
        data: {
          evidenceId: evidenceRecord.id,
            path: 'manifest.json',
            name: 'manifest.json',
          type: ArtifactType.FILE,
            hash: manifestHash,
            size: BigInt(manifestSize),
            mimeType: 'application/json',
        },
        }),
      );

      await Promise.all(artifactPromises);

      return evidenceRecord;
    });

    const { url: downloadUrl, expiresInSeconds } =
      await this.s3Service.getPresignedUrl(zipKey);

    return {
      evidenceId: evidence.evidenceId,
      status: evidence.status,
      url: evidence.url,
      timestamp: Number(evidence.timestamp),
      hash: {
        screenshot: screenshotHash,
        html: htmlHash,
        zip: zipHash,
      },
      package: {
        key: zipKey,
        downloadUrl,
        expiresInSeconds,
        size: zipSize,
      },
    };
  }

  /**
   * Creates a ZIP package containing all evidence files, metadata.json, and manifest.json.
   * Manifest.json is added last and contains hashes of all other files (including metadata.json).
   */
  private async createZipPackage({
    screenshot,
    html,
    metadata,
    manifest,
  }: {
    screenshot: Buffer;
    html: string;
    metadata: string;
    manifest: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.append(screenshot, { name: 'screenshot-full.png' });
      archive.append(html, { name: 'page.html' });
      archive.append(metadata, { name: 'metadata.json' });
      archive.append(manifest, { name: 'manifest.json' });

      archive.finalize();
    });
  }

  /**
   * Retrieves a single evidence record by its evidence ID.
   * Includes all associated artifacts and ZIP package information.
   *
   * @param evidenceId Unique evidence identifier (format: ev_<uuid>)
   * @returns Promise resolving to evidence details with artifacts and ZIP info, or null if not found
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

    const { url: zipDownloadUrl, expiresInSeconds } =
      await this.s3Service.getPresignedUrl(evidence.zipS3Key);

    return {
      evidenceId: evidence.evidenceId,
      status: evidence.status,
      url: evidence.url,
      timestamp: Number(evidence.timestamp),
      hash: {
        zip: evidence.zipHash,
      },
      package: {
        key: evidence.zipS3Key,
        downloadUrl: zipDownloadUrl,
        expiresInSeconds,
        size: Number(evidence.zipSize),
      },
      artifacts: evidence.artifacts.map((artifact) => ({
        id: artifact.id,
        path: artifact.path,
        name: artifact.name,
        type: artifact.type,
        hash: artifact.hash,
        size: Number(artifact.size),
        mimeType: artifact.mimeType,
      })),
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
          timestamp: true,
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
