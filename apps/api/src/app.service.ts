import { Injectable } from '@nestjs/common';

/**
 * Root application service.
 * Provides basic application functionality.
 */
@Injectable()
export class AppService {
  /**
   * Returns a greeting message.
   * @returns Greeting string
   */
  getHello(): string {
    return 'Hello World!!';
  }
}
