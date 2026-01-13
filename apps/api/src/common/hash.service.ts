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

}
