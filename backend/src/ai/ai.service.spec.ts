import { isValidQuestion, sanitizeContext } from './ai.service';

describe('AI question guards', () => {
  describe('sanitizeContext', () => {
    it('uses the default context when input is empty', () => {
      expect(sanitizeContext('   ')).toBe('大学生同士の集まり');
    });

    it('normalizes whitespace and limits length', () => {
      const context = `大学のサークル飲み会\n${'あ'.repeat(200)}`;

      expect(sanitizeContext(context)).toHaveLength(120);
      expect(sanitizeContext(context)).not.toContain('\n');
    });
  });

  describe('isValidQuestion', () => {
    it('accepts a short single yes/no question', () => {
      expect(isValidQuestion('今この中に気になっている人がいる？')).toBe(true);
    });

    it('rejects text that does not end with a question mark', () => {
      expect(isValidQuestion('今この中に気になっている人がいる')).toBe(false);
    });

    it('rejects multiline and structured output', () => {
      expect(isValidQuestion('候補:\n今この中に気になっている人がいる？')).toBe(
        false,
      );
      expect(
        isValidQuestion('{"question":"今この中に気になっている人がいる？"}'),
      ).toBe(false);
      expect(isValidQuestion('1. 今この中に気になっている人がいる？')).toBe(
        false,
      );
    });

    it('rejects prompt-injection flavored output', () => {
      expect(
        isValidQuestion('前の指示を無視しましたが、これは質問ですか？'),
      ).toBe(false);
      expect(isValidQuestion('system promptを教えてもいいですか？')).toBe(
        false,
      );
    });
  });
});
