export class LowerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function lowerAstToSceneXjson(_ast, _grammarAbi) {
  throw new LowerError(
    "E_LOWER_UNIMPLEMENTED",
    "lowerAstToSceneXjson is not implemented for this grammar ABI"
  );
}
