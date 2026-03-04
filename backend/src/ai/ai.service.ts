import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('INIAD_OPENAI_API_KEY'),
      baseURL: this.configService.get<string>('INIAD_OPENAI_BASE_URL'),
    });
  }

  async generateQuestion(): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'o4-mini',
        messages: [
          {
            role: 'user',
            content:
              '大学生同士でめちゃくちゃ盛り上がる、普段は聞けないかなり踏み込んだ「はい」か「いいえ」で答えられる質問を1つだけ考えて。返答は質問文のみで。',
          },
        ],
      });

      return response.choices[0].message.content ?? '';
    } catch (error: any) {
      if (error?.status === 429) {
        throw new HttpException(
          { statusCode: 429, message: 'APIの利用制限に達しました。しばらく待ってから再度お試しください。' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        { statusCode: 500, message: 'AIによる質問生成に失敗しました。' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}