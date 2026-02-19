export function abiTokenizeOk(text, tokenizerAbi) {
  if (tokenizerAbi?.allowed_regex) {
    const re = new RegExp(tokenizerAbi.allowed_regex, "s");
    if (!re.test(text) || text.match(re)[0] !== text) {
      return {
        code: "E_TOKEN_ALLOWED_REGEX",
        msg: "input contains characters outside tokenizer allowed_regex",
      };
    }
  }

  const disallowed = new Set(tokenizerAbi?.disallowed_chars || []);
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (disallowed.has(ch)) {
      return {
        code: "E_TOKEN_DISALLOWED_CHAR",
        msg: `disallowed character at index ${i}`,
        col: i + 1,
      };
    }
  }

  const ranges = tokenizerAbi?.reserved_codepoints || [];
  if (ranges.length) {
    for (let i = 0; i < text.length; i += 1) {
      const code = text.codePointAt(i);
      if (ranges.some(([start, end]) => start <= code && code <= end)) {
        return {
          code: "E_TOKEN_RESERVED_CODEPOINT",
          msg: `reserved codepoint U+${code.toString(16).toUpperCase()} at index ${i}`,
          col: i + 1,
        };
      }
    }
  }

  return null;
}
