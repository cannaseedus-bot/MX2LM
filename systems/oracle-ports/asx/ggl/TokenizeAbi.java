package asx.ggl;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.regex.Pattern;

public final class TokenizeAbi {
  private TokenizeAbi() {}

  public static final class Err {
    public final String code;
    public final String msg;
    public final int col;

    public Err(String code, String msg, int col) {
      this.code = code;
      this.msg = msg;
      this.col = col;
    }
  }

  @SuppressWarnings("unchecked")
  public static Err check(String text, Object tokenizerAbi) {
    if (!(tokenizerAbi instanceof Map)) {
      return null;
    }
    Map<String, Object> abi = (Map<String, Object>) tokenizerAbi;

    Object allowedRegex = abi.get("allowed_regex");
    if (allowedRegex instanceof String) {
      Pattern re = Pattern.compile((String) allowedRegex, Pattern.DOTALL);
      if (!re.matcher(text).matches()) {
        return new Err("E_TOKEN_ALLOWED_REGEX", "input contains characters outside tokenizer allowed_regex", 0);
      }
    }

    Set<String> disallowed = new HashSet<>();
    Object disallowedChars = abi.get("disallowed_chars");
    if (disallowedChars instanceof List) {
      for (Object item : (List<Object>) disallowedChars) {
        if (item != null) {
          disallowed.add(item.toString());
        }
      }
    }

    for (int i = 0; i < text.length(); i++) {
      String ch = text.substring(i, i + 1);
      if (disallowed.contains(ch)) {
        return new Err("E_TOKEN_DISALLOWED_CHAR", "disallowed character at index " + i, i + 1);
      }
    }

    Object reserved = abi.get("reserved_codepoints");
    if (reserved instanceof List) {
      List<List<Number>> ranges = (List<List<Number>>) reserved;
      for (int i = 0; i < text.length(); i++) {
        int code = text.codePointAt(i);
        for (List<Number> range : ranges) {
          if (range.size() >= 2) {
            int start = range.get(0).intValue();
            int end = range.get(1).intValue();
            if (start <= code && code <= end) {
              String msg = String.format("reserved codepoint U+%04X at index %d", code, i);
              return new Err("E_TOKEN_RESERVED_CODEPOINT", msg, i + 1);
            }
          }
        }
      }
    }

    return null;
  }
}
