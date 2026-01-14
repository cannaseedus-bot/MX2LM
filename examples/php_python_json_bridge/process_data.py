#!/usr/bin/env python3
import json
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "no input"}))
        return 1

    try:
        data = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        print(json.dumps({"error": "invalid json"}))
        return 1

    data["processed"] = True
    data["source"] = "python"
    print(json.dumps(data))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
