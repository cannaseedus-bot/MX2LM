export class LegalityError extends Error {
  constructor(code, message, line = 0, col = 0) {
    super(message);
    this.code = code;
    this.line = line;
    this.col = col;
  }
}

export function checkLegality(_ast, _grammarAbi) {
  throw new LegalityError(
    "E_LEGAL_UNIMPLEMENTED",
    "checkLegality is not implemented for this grammar ABI"
  );
}
