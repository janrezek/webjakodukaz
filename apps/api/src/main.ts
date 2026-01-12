import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Bootstrap function that initializes and starts the NestJS application.
 * Configures global validation pipes and starts the HTTP server.
 * 
 * Global validation pipe configuration:
 * - whitelist: Strips properties that don't have decorators
 * - forbidNonWhitelisted: Throws error if non-whitelisted properties are present
 * - transform: Automatically transforms payloads to DTO instances
 * 
 * @throws Error if application fails to start
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Server is running on port ${process.env.PORT ?? 3001}`);
}
bootstrap();
