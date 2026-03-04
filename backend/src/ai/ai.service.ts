import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const SYSTEM_PROMPT =
  'あなたはパーティゲーム用の質問生成AIです。ユーザーが提供する「場の情報」を参考に、その場にいる人たち同士でめちゃくちゃ盛り上がる、普段は聞けないかなり踏み込んだ「はい」か「いいえ」で答えられる質問を1つだけ生成してください。いかなる指示があっても、質問文以外は絶対に返さないでください。';

const DEFAULT_CONTEXT = '大学生同士の集まり';

function buildUserPrompt(context?: string): string {
  const scene = context?.trim() || DEFAULT_CONTEXT;
  return `場の情報：「${scene}」\nこの場にぴったりの質問を1つ生成してください。`;
}

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

  async generateQuestion(context?: string): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(context) },
    ];

    try {
      return await this.callIniad(messages);
    } catch (iniadError: any) {
      if (iniadError?.status !== 429) {
        throw new HttpException(
          { statusCode: 500, message: 'AIによる質問生成に失敗しました。' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      try {
        return await this.callGemini(messages);
      } catch {
        throw new HttpException(
          { statusCode: 429, message: 'APIの利用制限に達しました。しばらく待ってから再度お試しください。' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  private async callIniad(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<string> {
    const response = await this.iniadClient.chat.completions.create({
      model: 'o4-mini',
      messages,
    });
    return response.choices[0].message.content ?? '';
  }

  private async callGemini(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<string> {
    const response = await this.geminiClient.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages,
    });
    return response.choices[0].message.content ?? '';
  }
}