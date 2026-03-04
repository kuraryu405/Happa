import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const QUESTION_PROMPT =
  '大学生同士でめちゃくちゃ盛り上がる、普段は聞けないかなり踏み込んだ「はい」か「いいえ」で答えられる質問を1つだけ考えて。返答は質問文のみで。';

@Injectable()
export class AiService {
  private readonly iniadClient: OpenAI;
  private readonly geminiClient: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.iniadClient = new OpenAI({
      apiKey: this.configService.get<string>('INIAD_OPENAI_API_KEY'),
      baseURL: this.configService.get<string>('INIAD_OPENAI_BASE_URL'),
    });
    this.geminiClient = new OpenAI({
      apiKey: this.configService.get<string>('GEMINI_API_KEY'),
      baseURL: this.configService.get<string>('GEMINI_BASE_URL'),
    });
  }

  async generateQuestion(): Promise<string> {
    try {
      return await this.callIniad();
    } catch (iniadError: any) {
      if (iniadError?.status !== 429) {
        throw new HttpException(
          { statusCode: 500, message: 'AIによる質問生成に失敗しました。' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      try {
        return await this.callGemini();
      } catch {
        throw new HttpException(
          { statusCode: 429, message: 'APIの利用制限に達しました。しばらく待ってから再度お試しください。' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  private async callIniad(): Promise<string> {
    const response = await this.iniadClient.chat.completions.create({
      model: 'o4-mini',
      messages: [{ role: 'user', content: QUESTION_PROMPT }],
    });
    return response.choices[0].message.content ?? '';
  }

  private async callGemini(): Promise<string> {
    const response = await this.geminiClient.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: QUESTION_PROMPT }],
    });
    return response.choices[0].message.content ?? '';
  }
}