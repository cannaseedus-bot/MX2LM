import { createHash } from "crypto";

export function sha256Hex(data) {
  const hash = createHash("sha256");
  hash.update(Buffer.from(data));
  return hash.digest("hex");
}
