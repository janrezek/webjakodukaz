import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class HashService {
  /**
   * Creates a SHA-256 hash of the provided data
   * @param data Data to hash (Buffer or string)
   * @returns Hexadecimal hash string
   */
  createHash(data: Buffer | string): string {
    const hash = createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Creates a hash for evidence integrity verification
   * This combines multiple pieces of evidence data to create a unique hash
   * @param evidenceId Unique evidence identifier
   * @param url The captured URL
   * @param screenshotHash SHA-256 hash of the screenshot
   * @param timestamp Optional timestamp (defaults to current time)
   * @returns Hexadecimal hash string
   */
  createEvidenceHash(
    evidenceId: string,
    url: string,
    screenshotHash: string,
    timestamp?: number,
  ): string {
    const data = JSON.stringify({
      evidenceId,
      url,
      screenshotHash,
      timestamp: timestamp ?? Date.now(),
    });

    return this.createHash(data);
  }
}
