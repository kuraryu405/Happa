import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { EventsGateway } from '../game/game.gateway';

type GenerateQuestionBody = {
  context?: unknown;
  roomId?: unknown;
  playerId?: unknown;
  playerToken?: unknown;
};

@Controller('question')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Post()
  async generateQuestion(@Body() body: GenerateQuestionBody | null) {
    if (
      !body ||
      typeof body.roomId !== 'string' ||
      typeof body.playerId !== 'string' ||
      typeof body.playerToken !== 'string' ||
      (body.context !== undefined && typeof body.context !== 'string')
    ) {
      throw new BadRequestException('入力が不正です');
    }
    if (
      !this.eventsGateway.canGenerateQuestion(
        body.roomId,
        body.playerId,
        body.playerToken,
      )
    ) {
      throw new ForbiddenException('質問を生成する権限がありません');
    }

    const question = await this.aiService.generateQuestion(body.context);
    return { question };
  }
}
