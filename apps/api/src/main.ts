import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for Next.js
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Global prefix for API routes
  app.setGlobalPrefix('api');
  
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
