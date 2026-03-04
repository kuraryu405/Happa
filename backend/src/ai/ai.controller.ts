import { Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('question')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  async generateQuestion() {
    const question = await this.aiService.generateQuestion();
    return { question };
  }
}