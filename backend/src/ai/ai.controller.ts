import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('question')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  async generateQuestion(@Body() body: { context?: string }) {
    const question = await this.aiService.generateQuestion(body.context);
    return { question };
  }
}