import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvantsGateway } from './game/game.gateway';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService, EvantsGateway],
})
export class AppModule {}