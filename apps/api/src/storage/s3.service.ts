import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Result of an S3 upload operation.
 */
export interface UploadResult {
  /** S3 object key (path) */
  key: string;
  /** S3 bucket name */
  bucket: string;
}

/**
 * Result of a pre-signed URL generation operation.
 */
export interface PresignedUrlResult {
  /** Pre-signed URL for downloading the file */
  url: string;
  /** Expiration time in seconds */
  expiresInSeconds: number;
}

/**
 * Service for managing S3 storage operations.
 * Handles file uploads and generation of pre-signed URLs for secure file access.
 */
@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly logger = new Logger(S3Service.name);

  private readonly bucket: string;
  private readonly expires: number;

  /**
   * Creates an instance of S3Service.
   * Initializes S3 client with credentials from environment variables.
   * @param config Configuration service for accessing environment variables
   */
  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('S3_REGION')!;
    const accessKeyId = this.config.get<string>('S3_ACCESS_KEY_ID')!;
    const secretAccessKey = this.config.get<string>('S3_SECRET_ACCESS_KEY')!;

    this.bucket = this.config.get<string>('S3_BUCKET')!;
    this.expires = this.config.get<number>('S3_PRESIGN_EXPIRES_SECONDS')!;

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(
      `S3 ready: region=${region}, bucket=${this.bucket}, presignExpires=${this.expires}s`,
    );
  }

  /**
   * Uploads a file to S3
   * @param key S3 object key
   * @param body File content (Buffer)
   * @param contentType MIME type of the file
   * @returns Upload result with key and bucket
   */
  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    this.logger.debug(`Uploaded file to S3: ${key}`);

    return {
      key,
      bucket: this.bucket,
    };
  }

  /**
   * Generates a presigned URL for downloading a file from S3
   * @param key S3 object key
   * @returns Presigned URL and expiration time
   */
  async getPresignedUrl(key: string): Promise<PresignedUrlResult> {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: this.expires },
    );

    return {
      url,
      expiresInSeconds: this.expires,
    };
  }

  /**
   * Gets the configured S3 bucket name.
   * @returns The S3 bucket name configured for this service
   */
  getBucket(): string {
    return this.bucket;
  }
}
