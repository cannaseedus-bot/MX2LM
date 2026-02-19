package asx.ggl;

import asx.abi.AbiLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class OracleVectorHarness {
  private OracleVectorHarness() {}

  public static void main(String[] args) throws Exception {
    Path vectorsPath = Path.of("specs/oracle_conformance_vectors.csv");
    List<Map<String, String>> vectors = parseCsv(vectorsPath);

    Map<String, Object> tokenizer = new HashMap<>();
    tokenizer.put("allowed_regex", "^[A-Za-z#\\s]+$");
    tokenizer.put("disallowed_chars", List.of("#"));

    AbiLoader abi = AbiLoader.fromObjects("test", tokenizer, Map.of());

    for (Map<String, String> v : vectors) {
      Oracle.Result result = Oracle.verify(v.get("input"), abi, true);
      String expectedCode = v.get("java_expected_code");
      if (expectedCode == null || expectedCode.isEmpty()) {
        expectedCode = v.get("expected_code");
      }

      boolean ok =
          result.stage.equals(v.get("expected_stage"))
              && result.code.equals(expectedCode)
              && result.score == Double.parseDouble(v.get("expected_score"));
      if (!ok) {
        throw new RuntimeException(
            "Vector "
                + v.get("id")
                + " mismatch: got stage="
                + result.stage
                + " code="
                + result.code
                + " score="
                + result.score);
      }
    }

    System.out.println("java oracle vectors passed (" + vectors.size() + " cases)");
  }

  private static List<Map<String, String>> parseCsv(Path path) throws Exception {
    List<String> lines = Files.readAllLines(path);
    String[] headers = lines.get(0).split(",", -1);
    List<Map<String, String>> rows = new ArrayList<>();
    for (int i = 1; i < lines.size(); i++) {
      String line = lines.get(i).trim();
      if (line.isEmpty()) continue;
      String[] cols = line.split(",", -1);
      Map<String, String> row = new HashMap<>();
      for (int c = 0; c < headers.length; c++) {
        row.put(headers[c], c < cols.length ? cols[c] : "");
      }
      rows.add(row);
    }
    return rows;
  }
}
