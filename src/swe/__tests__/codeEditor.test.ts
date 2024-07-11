import { CodeEditor } from '../codeEditor';

describe('CodeEditor', () => {
  let codeEditor: CodeEditor;

  beforeEach(() => {
    codeEditor = new CodeEditor();
  });

  describe('parseAiderInput', () => {
    it('should correctly parse input lines', () => {
      const input = `
SYSTEM This is a system message
USER This is a user message
ASSISTANT This should be ignored
SYSTEM Another system message
USER Another user message
`;
      const expected = [
        'This is a system message',
        'This is a user message',
        'Another system message',
        'Another user message'
      ];
      // @ts-ignore: Accessing private method for testing
      expect(codeEditor['parseAiderInput'](input)).toEqual(expected);
    });

    it('should return an empty array for no matching lines', () => {
      const input = `
ASSISTANT This should be ignored
Some other text
`;
      // @ts-ignore: Accessing private method for testing
      expect(codeEditor['parseAiderInput'](input)).toEqual([]);
    });
  });

  describe('parseAiderOutput', () => {
    it('should correctly parse output lines', () => {
      const input = `
SYSTEM This should be ignored
USER This should also be ignored
ASSISTANT This is an assistant message
ASSISTANT This is another assistant message
Some other text
ASSISTANT Final assistant message
`;
      const expected = [
        'This is an assistant message',
        'This is another assistant message',
        'Final assistant message'
      ];
      // @ts-ignore: Accessing private method for testing
      expect(codeEditor['parseAiderOutput'](input)).toEqual(expected);
    });

    it('should return an empty array for no matching lines', () => {
      const input = `
SYSTEM This should be ignored
USER This should also be ignored
Some other text
`;
      // @ts-ignore: Accessing private method for testing
      expect(codeEditor['parseAiderOutput'](input)).toEqual([]);
    });
  });
});
