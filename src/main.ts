import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are provided
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: ['http://localhost:4000', 'https://cfi-web-app.vercel.app'],
    credentials: true,
  });
  const port = process.env.PORT || 8080; // Use the PORT provided by Elastic Beanstalk
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
