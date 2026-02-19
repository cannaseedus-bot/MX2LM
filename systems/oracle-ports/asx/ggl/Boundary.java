package asx.ggl;

public final class Boundary {
  public static final String OPEN = "<GGL>";
  public static final String CLOSE = "</GGL>";

  private Boundary() {}

  public static final class Extract {
    public final boolean ok;
    public final String code;
    public final String msg;
    public final double score;
    public final String inner;

    public Extract(boolean ok, String code, String msg, double score, String inner) {
      this.ok = ok;
      this.code = code;
      this.msg = msg;
      this.score = score;
      this.inner = inner;
    }
  }

  public static Extract extract(String text) {
    int a = text.indexOf(OPEN);
    int b = text.indexOf(CLOSE);
    if (a < 0 || b < 0 || b < a) {
      return new Extract(false, "E_GGL_BOUNDARY", "missing or malformed <GGL>...</GGL> boundary", 0.0, null);
    }
    String inner = text.substring(a + OPEN.length(), b).trim();
    String outside = (text.substring(0, a) + text.substring(b + CLOSE.length())).trim();
    if (!outside.isEmpty()) {
      return new Extract(false, "E_GGL_OUTSIDE_TEXT", "non-empty text outside GGL boundary", 0.05, null);
    }
    return new Extract(true, "OK", "", 0.0, inner);
  }
}
