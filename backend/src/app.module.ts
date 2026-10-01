import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './game/game.gateway';
import { AiModule } from './ai/ai.module';
import { AiController } from './ai/ai.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule],
  controllers: [AppController, AiController],
  providers: [AppService, EventsGateway],
})
export class AppModule {}
