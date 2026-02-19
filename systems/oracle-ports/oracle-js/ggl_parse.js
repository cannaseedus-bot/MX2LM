export class ParseError extends Error {
  constructor(code, message, line = 0, col = 0) {
    super(message);
    this.code = code;
    this.line = line;
    this.col = col;
  }
}

export function parseGglToAst(_text, _grammarAbi) {
  throw new ParseError(
    "E_PARSE_UNIMPLEMENTED",
    "parseGglToAst is not implemented for this grammar ABI"
  );
}
