import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Establecer prefijo global para los endpoints
  app.setGlobalPrefix('api');

  // Habilitar CORS para permitir peticiones desde el frontend
  app.enableCors();

  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

  const puerto = process.env.PORT ?? 3001;
  await app.listen(puerto);
  console.log(`Aplicación backend corriendo en: http://localhost:${puerto}/api`);
}
bootstrap();
