import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

dotenv.config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  app.enableCors();

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('SADAD Platform API')
    .setDescription('Debt Management Platform - Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
