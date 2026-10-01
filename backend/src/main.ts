import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsOrigin } from './config/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: corsOrigin,
  });
  await app.listen(process.env.PORT ?? 8000);
}
void bootstrap();
