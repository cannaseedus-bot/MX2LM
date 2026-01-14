#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ASX.PY — single-file CLI (stdlib only)
--------------------------------------
Edge-native "$1 cloud" publisher + cPanel capability surface.

What it does (today):
- asx init                       : create a minimal ASX app skeleton (index.html/manifest.json/sw.js + tapes/)
- asx deploy                     : upload app to cPanel (infer/pack optional, upload, publish routes)
- asx cpanel exec                : call any cPanel UAPI endpoint (module/function) deterministically
- asx fs list/read/write/upload  : common Fileman actions
- asx mysql setup                : create db + user + grant (via cPanel Mysql UAPI)
- asx mysql exec                 : run SQL (via a PHP bridge you deploy)
- asx mysql migrate              : run migrations from a folder (ordered)
- asx route addon-domain         : attach addon domain + document root (cPanel)
- asx route cloudflare-attach    : add Cloudflare DNS record (optional)
- asx mesh connect               : connect to mesh WebSocket bootstrap
- asx token issue/verify         : mint/verify local capability envelopes (HMAC, deterministic)
- asx test                       : basic self-tests + optional golden vectors stub harness
- global flags: --json / --quiet / --config / --insecure

Notes:
- cPanel API uses HTTPS :2083 and Authorization header: "cpanel USER:API_TOKEN"
- This CLI uses only Python standard library (urllib, json, hmac, hashlib, etc.)
- For MySQL queries: shared hosting won't let you call MySQL remotely reliably.
  Use the included PHP bridge pattern (asx deploy can upload it).

Authoring rule: deterministic outputs (stable key ordering, stable timestamps only when requested).
"""

from __future__ import annotations

import argparse
import base64
import binascii
import dataclasses
import hashlib
import hmac
import io
import json
import os
import posixpath
import re
import sys
import socket
import ssl
import select
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

# -----------------------------
# Deterministic JSON utilities
# -----------------------------


def jdump(obj: Any, *, pretty: bool = False) -> str:
    if pretty:
        return json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True)
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def now_ms() -> int:
    return int(time.time() * 1000)


def die(msg: str, code: int = 2) -> None:
    sys.stderr.write(msg.rstrip() + "\n")
    raise SystemExit(code)


def ensure_dir(p: str) -> None:
    os.makedirs(p, exist_ok=True)


def read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_text(path: str, s: str) -> None:
    ensure_dir(os.path.dirname(path) or ".")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)


def read_bytes(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def write_bytes(path: str, b: bytes) -> None:
    ensure_dir(os.path.dirname(path) or ".")
    with open(path, "wb") as f:
        f.write(b)


def stable_sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "app"


# -----------------------------
# Output Controller
# -----------------------------


@dataclass
class Out:
    json_mode: bool
    quiet: bool

    def emit(self, payload: Any, *, pretty: bool = True) -> None:
        if self.quiet:
            return
        if self.json_mode:
            sys.stdout.write(jdump(payload, pretty=pretty) + "\n")
        else:
            if isinstance(payload, str):
                sys.stdout.write(payload.rstrip() + "\n")
            else:
                sys.stdout.write(jdump(payload, pretty=True) + "\n")


# -----------------------------
# Config
# -----------------------------


DEFAULT_CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".asx", "config.json")


def load_config(path: str) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {}
    try:
        return json.loads(read_text(path))
    except Exception as e:
        die(f"Config parse error: {path}\n{e}")


def save_config(path: str, cfg: Dict[str, Any]) -> None:
    ensure_dir(os.path.dirname(path))
    write_text(path, jdump(cfg, pretty=True) + "\n")


# -----------------------------
# cPanel Client (UAPI)
# -----------------------------


@dataclass
class CPanelAuth:
    host: str
    user: str
    token: str
    port: int = 2083
    verify_tls: bool = True

    def base_url(self) -> str:
        return f"https://{self.host}:{self.port}"


class HttpError(Exception):
    def __init__(self, status: int, body: bytes):
        super().__init__(f"HTTP {status}")
        self.status = status
        self.body = body


def _make_ssl_context(verify_tls: bool):
    if verify_tls:
        return None
    import ssl

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def http_request(
    url: str,
    method: str = "GET",
    headers: Optional[Dict[str, str]] = None,
    query: Optional[Dict[str, Any]] = None,
    body: Optional[bytes] = None,
    timeout: int = 60,
    verify_tls: bool = True,
) -> Tuple[int, Dict[str, str], bytes]:
    headers = headers or {}
    if query:
        qs = urllib.parse.urlencode([(k, str(v)) for k, v in query.items() if v is not None])
        url = url + ("&" if "?" in url else "?") + qs

    req = urllib.request.Request(url=url, data=body, method=method)
    for k, v in headers.items():
        req.add_header(k, v)

    ctx = _make_ssl_context(verify_tls)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            status = getattr(resp, "status", 200)
            resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            data = resp.read()
            return status, resp_headers, data
    except urllib.error.HTTPError as e:
        data = e.read() if hasattr(e, "read") else b""
        raise HttpError(getattr(e, "code", 0) or 0, data)
    except urllib.error.URLError as e:
        raise RuntimeError(f"URL error: {e}")


def multipart_form_data(fields: Dict[str, str], files: List[Tuple[str, str, bytes]]) -> Tuple[bytes, str]:
    boundary = "----asxpy-" + hashlib.sha256(b"asx-multipart").hexdigest()[:24]
    bio = io.BytesIO()

    def w(s: str) -> None:
        bio.write(s.encode("utf-8"))

    for name, value in fields.items():
        w(f"--{boundary}\r\n")
        w(f'Content-Disposition: form-data; name="{name}"\r\n\r\n')
        w(value)
        w("\r\n")

    for fieldname, filename, content in files:
        w(f"--{boundary}\r\n")
        w(
            f'Content-Disposition: form-data; name="{fieldname}"; filename="{filename}"\r\n'
        )
        w("Content-Type: application/octet-stream\r\n\r\n")
        bio.write(content)
        w("\r\n")

    w(f"--{boundary}--\r\n")
    body = bio.getvalue()
    return body, f"multipart/form-data; boundary={boundary}"


def _recv_exact(sock: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise RuntimeError("socket_closed")
        buf += chunk
    return buf


def ws_handshake(sock: socket.socket, host: str, path: str, headers: Optional[Dict[str, str]] = None) -> None:
    key = base64.b64encode(os.urandom(16)).decode("ascii")
    hdrs = {
        "Host": host,
        "Upgrade": "websocket",
        "Connection": "Upgrade",
        "Sec-WebSocket-Key": key,
        "Sec-WebSocket-Version": "13",
    }
    if headers:
        hdrs.update(headers)
    req = f"GET {path} HTTP/1.1\r\n" + "\r\n".join(f"{k}: {v}" for k, v in hdrs.items()) + "\r\n\r\n"
    sock.sendall(req.encode("utf-8"))
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += sock.recv(4096)
        if not resp:
            raise RuntimeError("handshake_failed")
    status_line = resp.split(b"\r\n", 1)[0].decode("utf-8", errors="replace")
    if "101" not in status_line:
        raise RuntimeError(f"handshake_failed: {status_line}")


def ws_send_text(sock: socket.socket, text: str) -> None:
    payload = text.encode("utf-8")
    fin_opcode = 0x81
    mask_bit = 0x80
    length = len(payload)
    header = bytearray()
    header.append(fin_opcode)
    if length < 126:
        header.append(mask_bit | length)
    elif length < (1 << 16):
        header.append(mask_bit | 126)
        header.extend(length.to_bytes(2, "big"))
    else:
        header.append(mask_bit | 127)
        header.extend(length.to_bytes(8, "big"))
    mask = os.urandom(4)
    header.extend(mask)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    sock.sendall(header + masked)


def ws_recv_text(sock: socket.socket) -> Optional[str]:
    first2 = _recv_exact(sock, 2)
    b1, b2 = first2[0], first2[1]
    opcode = b1 & 0x0F
    masked = bool(b2 & 0x80)
    length = b2 & 0x7F
    if length == 126:
        length = int.from_bytes(_recv_exact(sock, 2), "big")
    elif length == 127:
        length = int.from_bytes(_recv_exact(sock, 8), "big")
    mask = _recv_exact(sock, 4) if masked else b""
    payload = _recv_exact(sock, length) if length else b""
    if masked:
        payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    if opcode == 0x8:
        return None
    if opcode != 0x1:
        return None
    return payload.decode("utf-8", errors="replace")


class CPanelClient:
    def __init__(self, auth: CPanelAuth):
        self.auth = auth

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"cpanel {self.auth.user}:{self.auth.token}",
            "User-Agent": "asx.py/1.0 (stdlib)",
            "Accept": "application/json",
        }

    def uapi(
        self,
        module: str,
        function: str,
        params: Optional[Dict[str, Any]] = None,
        method: str = "GET",
    ) -> Dict[str, Any]:
        url = (
            f"{self.auth.base_url()}/execute/"
            f"{urllib.parse.quote(module)}/{urllib.parse.quote(function)}"
        )
        try:
            status, _, data = http_request(
                url,
                method=method,
                headers=self._headers(),
                query=params or {},
                body=None if method == "GET" else (jdump(params or {}, pretty=False).encode("utf-8")),
                timeout=120,
                verify_tls=self.auth.verify_tls,
            )
        except HttpError as e:
            body = e.body
            try:
                parsed = json.loads(body.decode("utf-8", errors="replace"))
            except Exception:
                parsed = {
                    "error": "http_error",
                    "status": e.status,
                    "body": body.decode("utf-8", errors="replace"),
                }
            raise RuntimeError(
                jdump({"uapi_error": True, "status": e.status, "response": parsed}, pretty=True)
            )

        if status < 200 or status >= 300:
            raise RuntimeError(f"Unexpected HTTP status: {status}")

        try:
            payload = json.loads(data.decode("utf-8", errors="replace"))
        except Exception:
            payload = {"raw": data.decode("utf-8", errors="replace")}

        return payload

    def fs_list(self, dir_path: str) -> Dict[str, Any]:
        return self.uapi("Fileman", "list_files", {"dir": dir_path})

    def fs_mkdir(self, dir_path: str) -> Dict[str, Any]:
        return self.uapi("Fileman", "mkdir", {"dir": dir_path})

    def fs_get(self, file_path: str) -> bytes:
        res = self.uapi("Fileman", "get_file_content", {"path": file_path})
        content = (((res or {}).get("data") or {}).get("content"))
        if content is None:
            raise RuntimeError("Could not read file content (unexpected response)")
        return content.encode("utf-8")

    def fs_put_text(self, file_path: str, text: str) -> Dict[str, Any]:
        return self.uapi(
            "Fileman", "save_file_content", {"path": file_path, "content": text}, method="POST"
        )

    def fs_upload(self, dir_path: str, filename: str, content: bytes) -> Dict[str, Any]:
        url = f"{self.auth.base_url()}/execute/Fileman/upload_files"
        body, ctype = multipart_form_data(fields={"dir": dir_path}, files=[("file", filename, content)])
        headers = self._headers()
        headers["Content-Type"] = ctype
        headers["Accept"] = "application/json"
        try:
            status, _, data = http_request(
                url,
                method="POST",
                headers=headers,
                body=body,
                timeout=180,
                verify_tls=self.auth.verify_tls,
            )
        except HttpError as e:
            raise RuntimeError(
                f"Upload failed HTTP {e.status}: {e.body.decode('utf-8', errors='replace')}"
            )
        if status < 200 or status >= 300:
            raise RuntimeError(
                f"Upload failed HTTP {status}: {data.decode('utf-8', errors='replace')}"
            )
        try:
            return json.loads(data.decode("utf-8", errors="replace"))
        except Exception:
            return {"raw": data.decode("utf-8", errors="replace")}


# -----------------------------
# Token envelopes (HMAC)
# -----------------------------


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")


def b64url_decode(s: str) -> bytes:
    pad = "=" * ((4 - (len(s) % 4)) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("ascii"))


def hmac_sign(secret: bytes, msg: bytes) -> bytes:
    return hmac.new(secret, msg, hashlib.sha256).digest()


def token_issue(secret_hex: str, claims: Dict[str, Any]) -> str:
    secret = binascii.unhexlify(secret_hex)
    header = {"alg": "HS256", "typ": "ASX-JWT-LITE"}
    h = b64url(jdump(header, pretty=False).encode("utf-8"))
    p = b64url(jdump(claims, pretty=False).encode("utf-8"))
    sig = b64url(hmac_sign(secret, f"{h}.{p}".encode("utf-8")))
    return f"{h}.{p}.{sig}"


def token_verify(secret_hex: str, token: str) -> Dict[str, Any]:
    secret = binascii.unhexlify(secret_hex)
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("bad_token_format")
    h, p, s = parts
    exp_sig = b64url(hmac_sign(secret, f"{h}.{p}".encode("utf-8")))
    if not hmac.compare_digest(exp_sig, s):
        raise ValueError("bad_signature")
    claims = json.loads(b64url_decode(p).decode("utf-8"))
    return claims


# -----------------------------
# Minimal ASX App Skeleton
# -----------------------------


DEFAULT_INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="theme-color" content="#020712"/>
  <title>ASX App</title>
  <link rel="manifest" href="manifest.json"/>
  <style>
    :root{--bg:#020409;--panel:#050a14;--border:#16f2aa;--accent:#00ffd0}
    body{margin:0;background:var(--bg);color:#e7fff7;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial}
    .wrap{max-width:980px;margin:32px auto;padding:16px}
    .card{background:var(--panel);border:1px solid rgba(22,242,170,.25);border-radius:16px;padding:16px}
    .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
    .btn{background:transparent;border:1px solid rgba(22,242,170,.55);color:#e7fff7;border-radius:12px;padding:10px 12px;cursor:pointer}
    .btn:hover{border-color:var(--accent);box-shadow:0 0 0 2px rgba(0,255,208,.14)}
    code{color:#9fffe6}
    .small{opacity:.85;font-size:13px}
    pre{white-space:pre-wrap;background:#0007;border-radius:12px;padding:12px;border:1px solid rgba(22,242,170,.18)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="row">
        <h1 style="margin:0;font-size:22px;">ASX App Shell</h1>
        <button class="btn" id="ping">Ping SW</button>
      </div>
      <p class="small">Runtime: <code>sw.js</code> + <code>tapes/</code> + IDB. Server is static + routing.</p>
      <pre id="out">ready</pre>
    </div>
  </div>
  <script>
    (async ()=>{
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('./sw.js', {scope:'./'});
      }
      const out=document.getElementById('out');
      document.getElementById('ping').onclick=async()=>{
        const res=await fetch('./api/ping.json?_=' + Date.now()).catch(()=>null);
        out.textContent=res?await res.text():'ping failed';
      };
    })();
  </script>
</body>
</html>
"""

DEFAULT_MANIFEST = {
    "name": "ASX App",
    "short_name": "ASX",
    "start_url": "./",
    "display": "standalone",
    "background_color": "#020409",
    "theme_color": "#020712",
    "icons": [],
}

DEFAULT_SW_JS = """/* ASX sw.js — minimal deterministic shell
   - caches static
   - serves /api/ping.json
   - leaves app logic to tapes + runtime expansion
*/
const CACHE = "asx-cache-v1";
const ASSETS = ["./","./index.html","./manifest.json","./sw.js","./tapes/app.tape.json"];

self.addEventListener("install",(e)=>{
  e.waitUntil((async()=>{
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate",(e)=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch",(e)=>{
  const url = new URL(e.request.url);
  if (url.pathname.endsWith("/api/ping.json")) {
    const payload = JSON.stringify({ ok:true, ts: Date.now() });
    e.respondWith(new Response(payload,{headers:{"content-type":"application/json"}}));
    return;
  }
  e.respondWith((async()=>{
    const c = await caches.open(CACHE);
    const hit = await c.match(e.request);
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (e.request.method==="GET" && url.origin===self.location.origin && res.ok) {
        c.put(e.request, res.clone());
      }
      return res;
    } catch {
      return hit || new Response("offline",{status:503});
    }
  })());
});
"""

DEFAULT_HTACCESS = """# ASX .htaccess — routing + cache + compression
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ index.html [L]
</IfModule>

# ================================
# Cache headers
# ================================
<IfModule mod_headers.c>
  <FilesMatch "\\.(html|css|js|json|svg|png|jpg|jpeg|gif|ico|webp)$">
    Header set Cache-Control "public, max-age=31536000"
  </FilesMatch>
</IfModule>

# ================================
# Compression
# ================================
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE \
    text/plain \
    text/css \
    application/javascript \
    application/json \
    image/svg+xml
</IfModule>

<IfModule mod_brotli.c>
  AddOutputFilterByType BROTLI_COMPRESS \
    text/plain \
    text/css \
    application/javascript \
    application/json \
    image/svg+xml
</IfModule>
"""

DEFAULT_TAPE = {
    "@context": "xjson://tape/app/v1",
    "n": "app.tape",
    "d": "Minimal starter tape",
    "@routes": {"/": {"view": "home"}},
    "views": {"home": {"type": "card", "title": "Hello ASX", "body": "tapes are your app brain"}},
}


# -----------------------------
# MySQL Bridge (PHP) — optional
# -----------------------------


MYSQL_BRIDGE_PHP = r"""<?php
// asx_mysql_bridge.php — minimal PDO bridge for ASX CLI (shared hosting friendly)
// SECURITY MODEL:
// - expects an HMAC token (ASX-JWT-LITE) in Authorization: Bearer <token>
// - validates signature + scopes (mysql:exec) + optional db allowlist
// - executes ONLY a restricted query set unless you choose otherwise
//
// You MUST set ASX_SECRET_HEX and DB creds below.

header('Content-Type: application/json; charset=utf-8');

$ASX_SECRET_HEX = getenv('ASX_SECRET_HEX') ?: '';
$DB_HOST = getenv('ASX_DB_HOST') ?: 'localhost';
$DB_NAME = getenv('ASX_DB_NAME') ?: '';
$DB_USER = getenv('ASX_DB_USER') ?: '';
$DB_PASS = getenv('ASX_DB_PASS') ?: '';

function b64url_decode($s){
  $pad = str_repeat('=', (4 - (strlen($s) % 4)) % 4);
  return base64_decode(strtr($s.$pad, '-_', '+/'));
}
function json_fail($code,$msg){
  http_response_code($code);
  echo json_encode(['ok'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
  exit;
}
function hmac_sha256($key,$msg){
  return hash_hmac('sha256',$msg,$key,true);
}
function token_verify($secret_hex,$token){
  $parts = explode('.',$token);
  if(count($parts)!==3) return null;
  [$h,$p,$s]=$parts;
  $secret = hex2bin($secret_hex);
  if($secret===false) return null;
  $sig = rtrim(strtr(base64_encode(hmac_sha256($secret, "$h.$p")), '+/', '-_'), '=');
  if(!hash_equals($sig,$s)) return null;
  $claims = json_decode(b64url_decode($p), true);
  return $claims ?: null;
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if(!preg_match('/Bearer\s+(.+)/i',$auth,$m)) json_fail(401,'missing_bearer');
$token = trim($m[1]);

if(!$ASX_SECRET_HEX) json_fail(500,'ASX_SECRET_HEX_not_set');
$claims = token_verify($ASX_SECRET_HEX, $token);
if(!$claims) json_fail(401,'bad_token');

$scopes = $claims['scopes'] ?? [];
if(!is_array($scopes) || !in_array('mysql:exec',$scopes)) json_fail(403,'missing_scope_mysql_exec');

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if(!$body) json_fail(400,'bad_json');

$sql = $body['sql'] ?? '';
$params = $body['params'] ?? [];
if(!is_string($sql)) json_fail(400,'sql_missing');

try {
  $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";
  $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);

  $stmt = $pdo->prepare($sql);
  $stmt->execute(is_array($params)?$params:[]);
  $rows = [];
  if (preg_match('/^\s*select/i', $sql)) {
    $rows = $stmt->fetchAll();
  }
  echo json_encode(['ok'=>true,'rows'=>$rows,'rowcount'=>$stmt->rowCount()], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
} catch(Exception $e){
  json_fail(500,'pdo_error');
}
"""


# -----------------------------
# Deploy helpers
# -----------------------------


def walk_files(root: str) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    root_abs = os.path.abspath(root)
    for dirpath, _, filenames in os.walk(root_abs):
        for fn in filenames:
            ap = os.path.join(dirpath, fn)
            rel = os.path.relpath(ap, root_abs)
            rel_posix = rel.replace(os.sep, "/")
            out.append((ap, rel_posix))
    out.sort(key=lambda x: x[1])
    return out


def infer_stub(app_dir: str) -> Dict[str, Any]:
    files = walk_files(app_dir)
    manifest = []
    for ap, rel in files:
        b = read_bytes(ap)
        manifest.append({"path": rel, "sha256": stable_sha256(b), "bytes": len(b)})
    return {
        "@context": "xjson://asx/deploy/infer/v1",
        "app_dir": os.path.abspath(app_dir).replace("\\", "/"),
        "files": manifest,
        "summary": {
            "count": len(manifest),
            "bytes_total": sum(x["bytes"] for x in manifest),
        },
    }


def upload_tree(cp: CPanelClient, local_dir: str, remote_dir: str, out: Out) -> Dict[str, Any]:
    uploaded = []
    for ap, rel in walk_files(local_dir):
        rdir = remote_dir.rstrip("/")
        parts = rel.split("/")
        if len(parts) > 1:
            subdir = "/".join([rdir] + parts[:-1])
            try:
                cp.fs_mkdir(subdir)
            except Exception:
                pass

        content = read_bytes(ap)
        res = cp.fs_upload(
            rdir + ("" if rel == "" else "/" + "/".join(parts[:-1]) if len(parts) > 1 else ""),
            parts[-1],
            content,
        )
        uploaded.append({"path": rel, "bytes": len(content), "sha256": stable_sha256(content)})
        if not out.quiet and not out.json_mode:
            sys.stdout.write(f"uploaded {rel}\n")
    return {"uploaded": uploaded, "count": len(uploaded)}


# -----------------------------
# Commands
# -----------------------------


def cmd_config(args, out: Out, cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    if args.action == "get":
        key = args.key
        out.emit({"ok": True, "key": key, "value": cfg.get(key)})
        return
    if args.action == "set":
        cfg[args.key] = args.value
        save_config(cfg_path, cfg)
        out.emit({"ok": True, "set": {args.key: args.value}})
        return
    if args.action == "show":
        out.emit({"ok": True, "config_path": cfg_path, "config": cfg})
        return
    die("unknown config action")


def build_cpanel_from_cfg(cfg: Dict[str, Any], *, insecure: bool) -> CPanelClient:
    host = cfg.get("cpanel_host")
    user = cfg.get("cpanel_user")
    token = cfg.get("cpanel_token")
    port = int(cfg.get("cpanel_port", 2083))
    if not (host and user and token):
        die("Missing cPanel config. Set: cpanel_host, cpanel_user, cpanel_token (and optionally cpanel_port).")
    auth = CPanelAuth(host=str(host), user=str(user), token=str(token), port=port, verify_tls=(not insecure))
    return CPanelClient(auth)


def cmd_init(args, out: Out) -> None:
    app_dir = args.dir
    name = args.name or os.path.basename(os.path.abspath(app_dir))
    ensure_dir(app_dir)
    ensure_dir(os.path.join(app_dir, "tapes"))
    write_text(
        os.path.join(app_dir, "index.html"),
        DEFAULT_INDEX_HTML.replace("<title>ASX App</title>", f"<title>{name}</title>"),
    )
    write_text(
        os.path.join(app_dir, "manifest.json"),
        jdump({**DEFAULT_MANIFEST, "name": name, "short_name": name[:12]}, pretty=True) + "\n",
    )
    write_text(os.path.join(app_dir, "sw.js"), DEFAULT_SW_JS)
    write_text(os.path.join(app_dir, ".htaccess"), DEFAULT_HTACCESS)
    write_text(
        os.path.join(app_dir, "tapes", "app.tape.json"), jdump(DEFAULT_TAPE, pretty=True) + "\n"
    )
    ensure_dir(os.path.join(app_dir, "api"))
    write_text(os.path.join(app_dir, "api", "ping.json"), jdump({"ok": True, "static": True}, pretty=True) + "\n")
    if args.mysql_bridge:
        write_text(os.path.join(app_dir, "asx_mysql_bridge.php"), MYSQL_BRIDGE_PHP)
    out.emit(
        {
            "ok": True,
            "created": [
                "index.html",
                "manifest.json",
                "sw.js",
                ".htaccess",
                "tapes/app.tape.json",
                "api/ping.json",
            ]
            + (["asx_mysql_bridge.php"] if args.mysql_bridge else []),
            "dir": os.path.abspath(app_dir).replace("\\", "/"),
        }
    )


def cmd_cpanel_exec(args, out: Out, cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    cp = build_cpanel_from_cfg(cfg, insecure=args.insecure)
    params = {}
    if args.params:
        try:
            params = json.loads(args.params)
            if not isinstance(params, dict):
                die("--params must be a JSON object")
        except Exception as e:
            die(f"Bad --params JSON: {e}")
    res = cp.uapi(args.module, args.function, params=params, method=args.method.upper())
    out.emit(res)


def cmd_fs(args, out: Out, cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    cp = build_cpanel_from_cfg(cfg, insecure=args.insecure)

    if args.action == "list":
        out.emit(cp.fs_list(args.path))
        return
    if args.action == "mkdir":
        out.emit(cp.fs_mkdir(args.path))
        return
    if args.action == "read":
        b = cp.fs_get(args.path)
        if out.json_mode:
            out.emit({"ok": True, "path": args.path, "content": b.decode("utf-8", errors="replace")})
        else:
            sys.stdout.write(b.decode("utf-8", errors="replace"))
        return
    if args.action == "write":
        content = args.content
        if content is None and args.file:
            content = read_text(args.file)
        if content is None:
            die("fs write requires --content or --file")
        out.emit(cp.fs_put_text(args.path, content))
        return
    if args.action == "upload":
        if not args.file:
            die("fs upload requires --file")
        ap = args.file
        b = read_bytes(ap)
        dir_path = args.path
        filename = args.name or os.path.basename(ap)
        out.emit(cp.fs_upload(dir_path, filename, b))
        return

    die("unknown fs action")


def cmd_mysql(args, out: Out, cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    cp = build_cpanel_from_cfg(cfg, insecure=args.insecure)

    if args.action == "setup":
        db = args.db
        db_user = args.user
        db_pass = args.password
        privileges = args.privileges or "ALL PRIVILEGES"

        prefix = cfg.get("mysql_prefix") or cp.auth.user
        full_db = db if db.startswith(prefix + "_") else f"{prefix}_{db}"
        full_user = db_user if db_user.startswith(prefix + "_") else f"{prefix}_{db_user}"

        steps = []

        def try_uapi(module: str, function: str, params: Dict[str, Any]) -> Dict[str, Any]:
            return cp.uapi(module, function, params)

        try:
            steps.append(
                {
                    "step": "create_database",
                    "module": "Mysql",
                    "function": "create_database",
                    "params": {"name": full_db},
                }
            )
            res_db = try_uapi("Mysql", "create_database", {"name": full_db})
        except Exception:
            res_db = {"warn": "create_database_failed_trying_alt"}
        try:
            steps.append(
                {
                    "step": "create_user",
                    "module": "Mysql",
                    "function": "create_user",
                    "params": {"name": full_user, "password": "***"},
                }
            )
            res_user = try_uapi("Mysql", "create_user", {"name": full_user, "password": db_pass})
        except Exception:
            res_user = {"warn": "create_user_failed"}

        grant_res = {"warn": "grant_not_attempted"}
        try:
            steps.append(
                {
                    "step": "grant",
                    "module": "Mysql",
                    "function": "set_privileges_on_database",
                    "params": {"user": full_user, "database": full_db, "privileges": privileges},
                }
            )
            grant_res = try_uapi(
                "Mysql",
                "set_privileges_on_database",
                {"user": full_user, "database": full_db, "privileges": privileges},
            )
        except Exception:
            try:
                steps.append(
                    {
                        "step": "grant_alt",
                        "module": "Mysql",
                        "function": "set_privileges",
                        "params": {"user": full_user, "database": full_db, "privileges": privileges},
                    }
                )
                grant_res = try_uapi(
                    "Mysql", "set_privileges", {"user": full_user, "database": full_db, "privileges": privileges}
                )
            except Exception:
                grant_res = {"warn": "grant_failed"}

        if args.save:
            cfg["asx_db_name"] = full_db
            cfg["asx_db_user"] = full_user
            cfg["asx_db_pass"] = db_pass
            save_config(cfg_path, cfg)

        out.emit(
            {
                "ok": True,
                "db": {"name": full_db, "user": full_user},
                "results": {"create_db": res_db, "create_user": res_user, "grant": grant_res},
                "steps": steps,
                "saved": bool(args.save),
            }
        )
        return

    if args.action == "exec":
        bridge_url = args.bridge_url or cfg.get("mysql_bridge_url")
        secret_hex = args.secret_hex or cfg.get("asx_secret_hex")
        if not bridge_url:
            die("mysql exec requires --bridge-url or config mysql_bridge_url")
        if not secret_hex:
            die("mysql exec requires --secret-hex or config asx_secret_hex (hex-encoded HMAC secret)")

        claims = {
            "iss": "asx.py",
            "sub": cfg.get("cpanel_user", "user"),
            "scopes": ["mysql:exec"],
            "iat": int(time.time()),
            "exp": int(time.time()) + int(args.ttl),
        }
        tok = token_issue(secret_hex, claims)
        body = {"sql": args.sql, "params": json.loads(args.params) if args.params else []}
        headers = {
            "Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "asx.py/1.0 (stdlib)",
        }
        try:
            status, _, data = http_request(
                bridge_url,
                method="POST",
                headers=headers,
                body=jdump(body, pretty=False).encode("utf-8"),
                timeout=120,
                verify_tls=(not args.insecure),
            )
        except HttpError as e:
            raise RuntimeError(
                f"MySQL bridge HTTP {e.status}: {e.body.decode('utf-8', errors='replace')}"
            )
        out.emit({"status": status, "response": json.loads(data.decode("utf-8", errors="replace"))})
        return

    if args.action == "migrate":
        folder = args.folder
        if not os.path.isdir(folder):
            die(f"Not a directory: {folder}")
        files = [os.path.join(folder, fn) for fn in os.listdir(folder) if fn.lower().endswith(".sql")]
        files.sort()
        results = []
        for fp in files:
            sql = read_text(fp)
            try:
                bridge_url = args.bridge_url or cfg.get("mysql_bridge_url")
                secret_hex = args.secret_hex or cfg.get("asx_secret_hex")
                if not bridge_url or not secret_hex:
                    die("mysql migrate needs bridge-url + secret-hex (args or config)")
                claims = {
                    "iss": "asx.py",
                    "sub": cfg.get("cpanel_user", "user"),
                    "scopes": ["mysql:exec"],
                    "iat": int(time.time()),
                    "exp": int(time.time()) + int(args.ttl),
                }
                tok = token_issue(secret_hex, claims)
                body = {"sql": sql, "params": []}
                headers = {
                    "Authorization": f"Bearer {tok}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "asx.py/1.0 (stdlib)",
                }
                status, _, data = http_request(
                    bridge_url,
                    method="POST",
                    headers=headers,
                    body=jdump(body, pretty=False).encode("utf-8"),
                    timeout=120,
                    verify_tls=(not args.insecure),
                )
                resp = json.loads(data.decode("utf-8", errors="replace"))
                results.append(
                    {
                        "file": os.path.basename(fp),
                        "status": status,
                        "ok": resp.get("ok", False),
                        "rowcount": resp.get("rowcount", None),
                    }
                )
                if not out.json_mode and not out.quiet:
                    sys.stdout.write(f"migrated {os.path.basename(fp)}\n")
            except Exception as e:
                results.append({"file": os.path.basename(fp), "error": str(e)})
        out.emit({"ok": True, "count": len(results), "results": results})
        return

    die("unknown mysql action")


def cloudflare_request(
    method: str,
    path: str,
    token: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    url = f"https://api.cloudflare.com/client/v4{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "asx.py/1.0 (stdlib)",
    }
    body = jdump(payload or {}, pretty=False).encode("utf-8") if payload is not None else None
    status, _, data = http_request(url, method=method, headers=headers, body=body, timeout=120, verify_tls=True)
    if status < 200 or status >= 300:
        raise RuntimeError(f"Cloudflare API error HTTP {status}: {data.decode('utf-8', errors='replace')}")
    return json.loads(data.decode("utf-8", errors="replace"))


def cmd_route(args, out: Out, cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    cp = build_cpanel_from_cfg(cfg, insecure=args.insecure)

    if args.action == "addon-domain":
        domain = args.domain
        root = args.root
        subdomain = args.subdomain or domain.split(".")[0]
        res = cp.uapi(
            "AddonDomain",
            "addaddondomain",
            {"newdomain": domain, "subdomain": subdomain, "dir": root},
            method="POST",
        )
        out.emit({"ok": True, "result": res, "domain": domain, "root": root})
        return

    if args.action == "cloudflare-attach":
        token = args.token
        zone_id = args.zone_id
        record_type = args.record_type
        content = args.content
        name = args.domain
        payload = {
            "type": record_type,
            "name": name,
            "content": content,
            "ttl": args.ttl,
            "proxied": bool(args.proxied),
        }
        res = cloudflare_request("POST", f"/zones/{zone_id}/dns_records", token, payload)
        out.emit({"ok": True, "result": res, "record": payload})
        return

    die("unknown route action")


def cmd_mesh_connect(args, out: Out) -> None:
    url = urllib.parse.urlparse(args.url)
    if url.scheme not in ("ws", "wss"):
        die("mesh connect requires ws:// or wss:// URL")
    host = url.hostname or ""
    port = url.port or (443 if url.scheme == "wss" else 80)
    path = url.path or "/"
    if url.query:
        path += "?" + url.query

    sock = socket.create_connection((host, port), timeout=10)
    if url.scheme == "wss":
        ctx = ssl.create_default_context()
        sock = ctx.wrap_socket(sock, server_hostname=host)

    ws_handshake(sock, host, path, headers={"Origin": args.origin} if args.origin else None)

    payload = args.payload
    if payload:
        ws_send_text(sock, payload)
    elif args.token:
        bootstrap = {
            "@type": "mesh.bootstrap.v1",
            "token": args.token,
            "ts_ms": now_ms(),
        }
        ws_send_text(sock, jdump(bootstrap, pretty=False))

    deadline = time.time() + float(args.listen_seconds)
    messages: List[str] = []
    while time.time() < deadline:
        r, _, _ = select.select([sock], [], [], 0.5)
        if not r:
            continue
        msg = ws_recv_text(sock)
        if msg is None:
            break
        messages.append(msg)
        if args.once:
            break

    sock.close()
    out.emit({"ok": True, "received": messages})

def cmd_token(args, out: Out, cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    secret_hex = args.secret_hex or cfg.get("asx_secret_hex")
    if not secret_hex:
        die("Missing secret. Provide --secret-hex or set asx_secret_hex in config.")
    if args.action == "issue":
        scopes = args.scopes.split(",") if args.scopes else []
        claims = {
            "iss": "asx.py",
            "sub": args.sub or cfg.get("cpanel_user", "user"),
            "scopes": [s.strip() for s in scopes if s.strip()],
            "iat": int(time.time()),
            "exp": int(time.time()) + int(args.ttl),
        }
        if args.aud:
            claims["aud"] = args.aud
        tok = token_issue(secret_hex, claims)
        out.emit({"ok": True, "token": tok, "claims": claims})
        return
    if args.action == "verify":
        claims = token_verify(secret_hex, args.token)
        out.emit({"ok": True, "claims": claims})
        return
    die("unknown token action")


def cmd_deploy(args, out: Out, cfg_path: str) -> None:
    cfg = load_config(cfg_path)
    cp = build_cpanel_from_cfg(cfg, insecure=args.insecure)

    app_dir = args.dir
    if not os.path.isdir(app_dir):
        die(f"Not a directory: {app_dir}")

    remote_root = args.remote or cfg.get("remote_root") or "public_html"
    app_slug = args.app or cfg.get("app_slug") or slugify(os.path.basename(os.path.abspath(app_dir)))
    remote_dir = posixpath.join(remote_root.rstrip("/"), app_slug)

    infer_report = infer_stub(app_dir) if not args.no_infer else {"skipped": True}

    try:
        cp.fs_mkdir(remote_dir)
    except Exception:
        pass

    up = upload_tree(cp, app_dir, remote_dir, out)

    bridge_uploaded = None
    if args.mysql_bridge:
        bridge_local = os.path.join(app_dir, "asx_mysql_bridge.php")
        if os.path.exists(bridge_local):
            b = read_bytes(bridge_local)
            bridge_uploaded = cp.fs_upload(remote_dir, "asx_mysql_bridge.php", b)
        else:
            bridge_uploaded = {"warn": "asx_mysql_bridge.php not found (run asx init --mysql-bridge)"}

    publish = {
        "url_guess": f"https://{cp.auth.host}/{app_slug}/",
        "remote_dir": remote_dir,
        "notes": [
            "If this is a subdomain/addon domain, set document root to this folder.",
            "If you want SPA routing, add an .htaccess rewrite to index.html.",
        ],
    }

    out.emit(
        {
            "ok": True,
            "deploy": {
                "app_dir": os.path.abspath(app_dir).replace("\\", "/"),
                "remote_dir": remote_dir,
                "infer": infer_report,
                "upload": up,
                "mysql_bridge": bridge_uploaded,
                "publish": publish,
            },
        }
    )


def cmd_test(args, out: Out) -> None:
    secret_hex = "00" * 32
    claims = {"sub": "test", "scopes": ["a", "b"], "iat": 0, "exp": 1}
    tok = token_issue(secret_hex, claims)
    v = token_verify(secret_hex, tok)
    ok1 = v["sub"] == "test" and v["scopes"] == ["a", "b"]

    tmp = os.path.join(os.getcwd(), ".asx_test_tmp")
    ensure_dir(tmp)
    write_text(os.path.join(tmp, "a.txt"), "hello\n")
    rep = infer_stub(tmp)
    sha = stable_sha256(jdump(rep, pretty=False).encode("utf-8"))
    ok2 = bool(sha) and rep["summary"]["count"] >= 1

    out.emit(
        {
            "ok": bool(ok1 and ok2),
            "tests": [
                {"name": "token_roundtrip", "ok": ok1},
                {"name": "infer_stub_nonempty", "ok": ok2, "sha256": sha},
            ],
        }
    )


# -----------------------------
# Argparse
# -----------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="asx", add_help=True)
    p.add_argument("--config", default=DEFAULT_CONFIG_PATH, help=f"Config path (default {DEFAULT_CONFIG_PATH})")
    p.add_argument("--json", action="store_true", help="JSON output")
    p.add_argument("--quiet", action="store_true", help="Silence output")
    p.add_argument("--insecure", action="store_true", help="Disable TLS verification (for self-signed cPanel)")
    sub = p.add_subparsers(dest="cmd", required=True)

    pc = sub.add_parser("config", help="Get/set/show config")
    pc_sub = pc.add_subparsers(dest="action", required=True)
    pc_get = pc_sub.add_parser("get")
    pc_get.add_argument("key")
    pc_set = pc_sub.add_parser("set")
    pc_set.add_argument("key")
    pc_set.add_argument("value")
    pc_show = pc_sub.add_parser("show")

    pi = sub.add_parser("init", help="Create minimal ASX app skeleton")
    pi.add_argument("dir", help="App directory")
    pi.add_argument("--name", help="App name/title")
    pi.add_argument("--mysql-bridge", action="store_true", help="Include asx_mysql_bridge.php")

    pd = sub.add_parser("deploy", help="Deploy app to cPanel (upload static shell)")
    pd.add_argument("dir", help="Local app directory")
    pd.add_argument("--remote", help="Remote root (e.g. public_html)")
    pd.add_argument("--app", help="Remote folder name / slug")
    pd.add_argument("--no-infer", action="store_true", help="Skip infer stage")
    pd.add_argument("--mysql-bridge", action="store_true", help="Upload asx_mysql_bridge.php if present")

    pe = sub.add_parser("cpanel", help="cPanel raw UAPI calls")
    pe_sub = pe.add_subparsers(dest="action", required=True)
    pexec = pe_sub.add_parser("exec", help="Execute /execute/<Module>/<function>")
    pexec.add_argument("module")
    pexec.add_argument("function")
    pexec.add_argument("--params", help="JSON object params")
    pexec.add_argument("--method", default="GET", choices=["GET", "POST"])

    pfs = sub.add_parser("fs", help="File operations via Fileman UAPI")
    pfs_sub = pfs.add_subparsers(dest="action", required=True)
    pfs_ls = pfs_sub.add_parser("list")
    pfs_ls.add_argument("path")
    pfs_mk = pfs_sub.add_parser("mkdir")
    pfs_mk.add_argument("path")
    pfs_rd = pfs_sub.add_parser("read")
    pfs_rd.add_argument("path")
    pfs_wr = pfs_sub.add_parser("write")
    pfs_wr.add_argument("path")
    pfs_wr.add_argument("--content")
    pfs_wr.add_argument("--file")
    pfs_up = pfs_sub.add_parser("upload")
    pfs_up.add_argument("path", help="Remote dir")
    pfs_up.add_argument("--file", required=True)
    pfs_up.add_argument("--name")

    pm = sub.add_parser("mysql", help="MySQL provisioning + bridge exec")
    pm_sub = pm.add_subparsers(dest="action", required=True)
    pm_setup = pm_sub.add_parser("setup")
    pm_setup.add_argument("--db", required=True, help="DB name (without prefix ok)")
    pm_setup.add_argument("--user", required=True, help="DB user (without prefix ok)")
    pm_setup.add_argument("--password", required=True, help="DB user password")
    pm_setup.add_argument("--privileges", help="Privileges string (default ALL PRIVILEGES)")
    pm_setup.add_argument("--save", action="store_true", help="Save db creds into config (asx_db_*)")

    pm_exec = pm_sub.add_parser("exec")
    pm_exec.add_argument("--bridge-url", help="URL to asx_mysql_bridge.php")
    pm_exec.add_argument("--secret-hex", help="HMAC secret hex for token signing")
    pm_exec.add_argument("--sql", required=True, help="SQL to execute")
    pm_exec.add_argument("--params", help="JSON array params")
    pm_exec.add_argument("--ttl", default=300, type=int, help="Token TTL seconds")

    pm_mig = pm_sub.add_parser("migrate")
    pm_mig.add_argument("folder", help="Folder containing .sql migrations (lex order)")
    pm_mig.add_argument("--bridge-url", help="URL to asx_mysql_bridge.php")
    pm_mig.add_argument("--secret-hex", help="HMAC secret hex for token signing")
    pm_mig.add_argument("--ttl", default=600, type=int, help="Token TTL seconds")

    pr = sub.add_parser("route", help="Domain + DNS routing helpers")
    pr_sub = pr.add_subparsers(dest="action", required=True)
    pr_addon = pr_sub.add_parser("addon-domain", help="Attach an addon domain (cPanel)")
    pr_addon.add_argument("--domain", required=True, help="Addon domain name")
    pr_addon.add_argument("--root", required=True, help="Document root (e.g. public_html/myapp)")
    pr_addon.add_argument("--subdomain", help="Subdomain prefix (default: first label)")

    pr_cf = pr_sub.add_parser("cloudflare-attach", help="Attach Cloudflare DNS record")
    pr_cf.add_argument("--domain", required=True, help="DNS record name (e.g. app.example.com)")
    pr_cf.add_argument("--zone-id", required=True, help="Cloudflare zone id")
    pr_cf.add_argument("--token", required=True, help="Cloudflare API token")
    pr_cf.add_argument("--record-type", default="A", help="DNS record type (A, AAAA, CNAME)")
    pr_cf.add_argument("--content", required=True, help="Record content (IP or target)")
    pr_cf.add_argument("--ttl", type=int, default=1, help="TTL seconds (1 for auto)")
    pr_cf.add_argument("--proxied", action="store_true", help="Enable Cloudflare proxying")

    pmc = sub.add_parser("mesh", help="Mesh bootstrap helpers")
    pmc_sub = pmc.add_subparsers(dest="action", required=True)
    pmc_connect = pmc_sub.add_parser("connect", help="Connect to mesh WebSocket")
    pmc_connect.add_argument("--url", required=True, help="ws:// or wss:// endpoint")
    pmc_connect.add_argument("--token", help="Auth token for mesh bootstrap")
    pmc_connect.add_argument("--payload", help="Raw payload to send instead of bootstrap JSON")
    pmc_connect.add_argument("--origin", help="Origin header for WebSocket handshake")
    pmc_connect.add_argument("--listen-seconds", default=5, help="Seconds to listen for messages")
    pmc_connect.add_argument("--once", action="store_true", help="Exit after first message")

    pt = sub.add_parser("token", help="Issue/verify ASX-JWT-LITE envelopes")
    pt_sub = pt.add_subparsers(dest="action", required=True)
    pt_i = pt_sub.add_parser("issue")
    pt_i.add_argument("--secret-hex")
    pt_i.add_argument("--sub")
    pt_i.add_argument("--scopes")
    pt_i.add_argument("--aud")
    pt_i.add_argument("--ttl", default=3600, type=int)
    pt_v = pt_sub.add_parser("verify")
    pt_v.add_argument("--secret-hex")
    pt_v.add_argument("token")

    sub.add_parser("test", help="Run minimal self-tests")
    return p


def main(argv: Optional[List[str]] = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    parser = build_parser()
    args = parser.parse_args(argv)
    out = Out(json_mode=bool(args.json), quiet=bool(args.quiet))
    cfg_path = args.config

    try:
        if args.cmd == "config":
            cmd_config(args, out, cfg_path)
        elif args.cmd == "init":
            cmd_init(args, out)
        elif args.cmd == "deploy":
            cmd_deploy(args, out, cfg_path)
        elif args.cmd == "cpanel":
            if args.action == "exec":
                cmd_cpanel_exec(args, out, cfg_path)
            else:
                die("Unknown cpanel action")
        elif args.cmd == "fs":
            cmd_fs(args, out, cfg_path)
        elif args.cmd == "mysql":
            cmd_mysql(args, out, cfg_path)
        elif args.cmd == "route":
            cmd_route(args, out, cfg_path)
        elif args.cmd == "mesh":
            if args.action == "connect":
                cmd_mesh_connect(args, out)
            else:
                die("Unknown mesh action")
        elif args.cmd == "token":
            cmd_token(args, out, cfg_path)
        elif args.cmd == "test":
            cmd_test(args, out)
        else:
            die("Unknown command")
        return 0
    except KeyboardInterrupt:
        return 130
    except SystemExit as e:
        return int(e.code)
    except Exception as e:
        if args.json:
            out.emit({"ok": False, "error": str(e)})
        else:
            sys.stderr.write(str(e).rstrip() + "\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
