#!/usr/bin/env python3
"""
cloudflare_adapter.py (single-file, stdlib)
- Verify token/zone
- List DNS records
- Upsert DNS record (A/AAAA/CNAME/TXT)
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
import urllib.parse

API = "https://api.cloudflare.com/client/v4"


def die(msg: str, code: int = 2) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(code)


def cf_req(token: str, method: str, path: str, body: dict | None = None) -> dict:
    url = API + path
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "asx-cloudflare-adapter/1.0 (stdlib)",
    }
    if body is not None:
        data = json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8", "replace")
        return json.loads(raw)


def must_ok(resp: dict) -> dict:
    if not resp.get("success"):
        die("Cloudflare API error: " + json.dumps(resp.get("errors", resp), indent=2))
    return resp


def cmd_verify(a: argparse.Namespace) -> None:
    resp = must_ok(cf_req(a.token, "GET", f"/zones/{a.zone}"))
    out = {"ok": True, "zone": resp["result"]["id"], "name": resp["result"]["name"]}
    print(json.dumps(out, indent=2))


def cmd_dns_list(a: argparse.Namespace) -> None:
    q = urllib.parse.urlencode({"per_page": 100, "page": 1})
    resp = must_ok(cf_req(a.token, "GET", f"/zones/{a.zone}/dns_records?{q}"))
    recs = [
        {
            "id": r["id"],
            "type": r["type"],
            "name": r["name"],
            "content": r["content"],
            "proxied": r.get("proxied"),
        }
        for r in resp["result"]
    ]
    print(json.dumps({"ok": True, "records": recs}, indent=2))


def cmd_dns_upsert(a: argparse.Namespace) -> None:
    q = urllib.parse.urlencode({"type": a.type, "name": a.name, "per_page": 100})
    found = must_ok(cf_req(a.token, "GET", f"/zones/{a.zone}/dns_records?{q}"))["result"]
    payload = {"type": a.type, "name": a.name, "content": a.content}
    if a.proxied is not None:
        payload["proxied"] = bool(a.proxied)

    if found:
        rid = found[0]["id"]
        resp = must_ok(cf_req(a.token, "PUT", f"/zones/{a.zone}/dns_records/{rid}", payload))
        print(json.dumps({"ok": True, "action": "updated", "record": resp["result"]}, indent=2))
    else:
        resp = must_ok(cf_req(a.token, "POST", f"/zones/{a.zone}/dns_records", payload))
        print(json.dumps({"ok": True, "action": "created", "record": resp["result"]}, indent=2))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--token", required=True, help="Cloudflare API token (Bearer)")
    p.add_argument("--zone", required=True, help="Cloudflare zone id")
    sub = p.add_subparsers(dest="cmd", required=True)

    v = sub.add_parser("verify")
    v.set_defaults(fn=cmd_verify)

    dl = sub.add_parser("dns-list")
    dl.set_defaults(fn=cmd_dns_list)

    du = sub.add_parser("dns-upsert")
    du.add_argument("--type", required=True, help="A|AAAA|CNAME|TXT")
    du.add_argument("--name", required=True, help="DNS record name (e.g. app.example.com)")
    du.add_argument("--content", required=True, help="Record content (IP or target)")
    du.add_argument("--proxied", type=int, choices=[0, 1], default=None, help="0/1 optional")
    du.set_defaults(fn=cmd_dns_upsert)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
