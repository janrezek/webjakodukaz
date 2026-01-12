import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Root application controller.
 * Handles requests to the root endpoint.
 */
@Controller()
export class AppController {
  /**
   * Creates an instance of AppController.
   * @param appService Application service
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Root endpoint returning a greeting message.
   * @returns Greeting string
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
