# K’UHUL π Grammar v1 (Frozen)

This document captures the frozen π micro-language as designed for MX2LM. π is the deterministic math kernel that feeds metric and geometry evaluation inside ASX-R; it does not provide control, orchestration, or legality authority.

## Role in the stack
- **Scope:** Deterministic numeric, vector, tensor, and geometry computation that always lowers to AST.
- **Position:** Embedded inside ASX-R folds, subordinate to XCFE and subject to ASX-R legality.
- **Purpose:** Supply math used by legality checks (metrics, geometry, physics-style evaluations) without deciding legality itself.

## Core constraints
- No implicit state; no ambient time; no side effects.
- Pure expressions only; replay-deterministic evaluation.
- Always lowerable to AST nodes.
- SCXQ2-compatible numeric streams.
- Disallows runtime-dependent loop bounds, IO, randomness, hidden epsilon, or interpreter-defined shortcuts.

## Expression and evaluation semantics
- **Typing is structural.** Scalars, vectors, and matrices carry explicit dimensions that must align before evaluation. Shape errors are illegal and fail compilation (e.g., `dot` requires equal vector lengths; `cross` requires 3D vectors only; matrix rows must be uniform length).
- **Associativity and precedence.** Binary arithmetic operators are left-associative; `^` binds tighter than `*` and `/`, which bind tighter than `+` and `-`. Dot/cross are treated as function-like infix operators with the same precedence as multiplication.
- **Literals are strict.** Numeric literals are IEEE-754 compatible but must be canonicalized (no implicit thousands separators, no trailing underscores). Vector and matrix literals may only contain other literals or identifiers—no side-effecting expressions are permitted in literal construction.
- **Deterministic failure.** Any illegal operation (divide-by-zero, invalid shape, NaN) must halt evaluation with a deterministic fault code that is replayable in traces.
- **Normalization step.** Before execution, programs are lowered to an AST with constant folding where safe, algebraic simplification that preserves determinism, and explicit type annotations for each node.

## Structural borrowing from Python (for familiarity, not authority)
- **Statement granularity mirrors Python’s simple statements.** Each line hosts exactly one `pi_stmt`; there are no multi-target assignments, chained comparisons, or inline blocks. Newlines terminate statements instead of indentation-based suites.
- **Assignment is single-target like Python’s basic form.** Destructuring, augmented assignment (`+=`, `*=`), and walrus binding (`:=`) are forbidden. Only `ident = pi_expr` is legal.
- **Expression precedence follows Python’s high-level ordering.** Exponentiation binds tighter than multiplicative operators, which bind tighter than additive operators—matching Python’s mental model while preserving π’s deterministic infix-to-call lowering.
- **Boolean-style assertions mimic Python’s `assert` shape without side effects.** Assertions are positional (`assert <lhs> <cmp> <rhs>`) but never accept message arguments or truthy coercion; they simply evaluate both sides and raise deterministically on failure.
- **Whitespace is insignificant.** Unlike Python, indentation and spacing carry zero semantic weight; only the parsed tokens matter, eliminating layout-dependent ambiguity.

## Canonical grammar (EBNF)

```ebnf
# K’UHUL π Grammar v1 (Frozen)

pi_program     ::= pi_stmt+ ;

pi_stmt        ::= pi_assign
                 | pi_expr
                 | pi_assert ;

pi_assign      ::= ident "=" pi_expr ;

pi_expr        ::= pi_literal
                 | ident
                 | pi_call
                 | pi_expr pi_op pi_expr
                 | "(" pi_expr ")" ;

pi_call        ::= ident "(" pi_args? ")" ;

pi_args        ::= pi_expr ( "," pi_expr )* ;

pi_op          ::= "+" | "-" | "*" | "/"
                 | "^"
                 | "dot" | "cross" ;

pi_literal     ::= number
                 | vector
                 | matrix ;

vector         ::= "[" pi_expr ( "," pi_expr )* "]" ;
matrix         ::= "[" vector ( "," vector )* "]" ;

pi_assert      ::= "assert" pi_expr pi_cmp pi_expr ;

pi_cmp         ::= "<" | "<=" | "==" | ">=" | ">" ;
```

### Notes on the EBNF
- **No unary operators.** Negation must be expressed explicitly (`0 - x`). This avoids accidental implicit coercions.
- **Explicit parentheses.** Ambiguity is resolved through parentheses; relying on reader precedence rules is discouraged but deterministic.
- **Assertions are first-class statements.** `assert` does not short-circuit or mutate state; it simply evaluates both sides and raises if the comparison fails.

## AST lowering rules
- Every surface π program must lower to a typed AST where each node records: operator, operand list, inferred type, and optional normalization metadata (e.g., constant-folded scalars).
- Calls are resolved against the fixed registry at compile-time. Unknown identifiers are illegal; shadowing or runtime late-binding is disallowed.
- Infix operators are rewritten to canonical function forms (e.g., `a + b` → `add(a, b)`), enabling uniform evaluation and hashing.
- Matrices lower to nested vector nodes; rectangularity is validated during lowering, not deferred to execution.
- Lowered ASTs must be hashable; any change in whitespace or source formatting must not affect the AST hash, guaranteeing replayability.

### Worked example: glyph surface → AST → bytecode
This illustrates the deterministic lowering pipeline from a glyph-oriented K’UHUL source into an AST and optimized bytecode. The bytecode is schematic; actual opcodes are implementation-defined but must be derivable from the AST without ambiguity.

**K’UHUL source (glyphs)**
```text
// K'uhul Source
[Pop main]
[Wo "Hello"]→[Ch'en msg]
[Yax msg]→[Sek print]
[Xul]
```

**Generated AST**
```json
{
  "type": "Program",
  "functions": [
    {
      "type": "Function",
      "name": "main",
      "body": [
        { "type": "Operation", "glyph": "Wo", "args": ["Hello"] },
        { "type": "Operation", "glyph": "Ch'en", "args": ["msg"] },
        { "type": "Operation", "glyph": "Yax", "args": ["msg"] },
        { "type": "Operation", "glyph": "Sek", "args": ["print"] }
      ]
    }
  ]
}
```

**Optimized bytecode (illustrative)**
```text
0x01 0x04 0x6d 0x61 0x69 0x6e        # Pop main
0x02 0x02 0x05 0x48 0x65 0x6c 0x6c 0x6f # Wo "Hello"
0x03 0x03 0x03 0x6d 0x73 0x67        # Ch'en msg
0x04 0x03 0x03 0x6d 0x73 0x67        # Yax msg
0x05 0x03 0x05 0x70 0x72 0x69 0x6e 0x74 # Sek print
0x0E                                 # Xul
```

### Worked example: 3D text render (glyphs → AST → effect scopes)
This shows a slightly richer glyph script that prepares 3D text, animates, and renders. The same deterministic lowering rules apply; nothing executes until XCFE admits the scheduled ops under their laws/effect scopes.

**K’UHUL source (glyphs)**
```text
[Pop render_3d_text]
[Wo "K'uhul"] → [Ch'en text]
[Wo "three-container"] → [Ch'en container]

[Yax container] → [Sek init_threejs] → [Ch'en scene]

[Yax text] → [Yax scene] → [Sek create_text_3d] → [Ch'en text_obj]

[K'ayab' animate]
[Yax text_obj] → [Sek rotate 0 0.01 0]
[Yax scene] → [Sek render]
[Kumk'u animate]

[Xul]
```

**Lowered AST (schematic)**
```json
{
  "functions": [
    {
      "name": "render_3d_text",
      "body": [
        { "op": "Wo", "args": ["K'uhul"] },
        { "op": "Ch'en", "args": ["text"] },
        { "op": "Wo", "args": ["three-container"] },
        { "op": "Ch'en", "args": ["container"] },
        { "op": "Yax", "args": ["container"] },
        { "op": "Sek", "args": ["init_threejs"] },
        { "op": "Ch'en", "args": ["scene"] },
        { "op": "Yax", "args": ["text"] },
        { "op": "Yax", "args": ["scene"] },
        { "op": "Sek", "args": ["create_text_3d"] },
        { "op": "Ch'en", "args": ["text_obj"] },
        {
          "op": "K'ayab'",
          "args": ["animate"],
          "body": [
            { "op": "Yax", "args": ["text_obj"] },
            { "op": "Sek", "args": ["rotate", 0, 0.01, 0] },
            { "op": "Yax", "args": ["scene"] },
            { "op": "Sek", "args": ["render"] }
          ]
        },
        { "op": "Kumk'u", "args": ["animate"] }
      ]
    }
  ]
}
```

**Effect perspective**
- `init_threejs`, `create_text_3d`, and `render` map to UI/DOM/Canvas effects; they must be allowed by the active law (or bridged).
- The animation loop (`K'ayab'…Kumk'u`) is declarative schedule, not implicit mutation; each tick still flows through XCFE gating and π collapse.
- Compared with verbose imperative loops in Pygame/Three.js/OpenGL, the glyph form stays structural: the lowering to bytecode is deterministic, and side effects are governed by lattice + law, not by ad-hoc runtime callbacks.

### Option A — string energy → gravity (SVG-3D) with K’UHUL host
This is a fast, visual frame law you can run immediately: a string (polyline) falls toward a center via energy minimization (tension + bending + central potential) and renders every tick as SVG-3D. Motion emerges from gradients—no force API or velocity state.

**KHL frame law (`STRING_GRAVITY_FRAME.khl`)**
```khl
@Wo {
  // World / potential
  world.G   = context.G   ?? 1.0
  world.M   = context.M   ?? 10.0
  world.eps = context.eps ?? 0.01
  world.c   = context.center ?? [0, 0, 0]

  // String parameters
  string.k     = context.k     ?? 1.0   // tension
  string.b     = context.b     ?? 0.2   // bending
  string.step  = context.step  ?? 0.015 // gradient step
  string.p     = context.points // array of vec3

  // Render
  render.color = context.color ?? [255,255,255]
}

@Sek {
  let grad = physics.string_energy_gradient {
    points: string.p,
    center: world.c,
    G: world.G,
    M: world.M,
    eps: world.eps,
    k: string.k,
    b: string.b
  }

  string.p = vec3.sub(string.p, vec3.mul(grad, string.step))

  svg3d.polyline {
    id: "quantum-string",
    points: string.p,
    stroke: render.color,
    width: 2
  }
}

@Collapse {
  emit.frame { points: string.p }
}
```

**JS host intrinsic (`physics.string_energy_gradient`)**
```js
function stringEnergyGradient({ points, center, G, M, eps, k, b }) {
  const n = points.length;
  const grad = points.map(() => [0,0,0]);
  const sub = (a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const add = (a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const mul = (a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const norm = (a)=>Math.sqrt(a[0]**2+a[1]**2+a[2]**2)+1e-9;

  for (let i=0;i<n-1;i++){
    const d = sub(points[i+1], points[i]);
    grad[i]     = add(grad[i], mul(d, -2*k));
    grad[i+1]   = add(grad[i+1], mul(d,  2*k));
  }

  for (let i=1;i<n-1;i++){
    const curv = add(sub(points[i-1], mul(points[i],2)), points[i+1]);
    grad[i-1] = add(grad[i-1], mul(curv,  b));
    grad[i]   = add(grad[i],   mul(curv, -2*b));
    grad[i+1] = add(grad[i+1], mul(curv,  b));
  }

  for (let i=0;i<n;i++){
    const r = sub(points[i], center);
    const d = norm(r) + eps;
    const f = -G*M/(d*d*d);
    grad[i] = add(grad[i], mul(r, f));
  }

  return grad;
}
const physics = { string_energy_gradient: stringEnergyGradient };
```

**Minimal SVG-3D polyline renderer**
```js
function svg3dPolyline({ id, points, stroke, width }) {
  const svg = document.getElementById("svg");
  let path = document.getElementById(id);
  if (!path) {
    path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("id", id);
    path.setAttribute("fill","none");
    svg.appendChild(path);
  }
  const proj = p => {
    const z = p[2] + 6;
    return [400 + (p[0]/z)*400, 300 - (p[1]/z)*400];
  };
  let d = "";
  points.forEach((p,i)=>{
    const [x,y] = proj(p);
    d += (i===0?`M ${x} ${y}`:` L ${x} ${y}`);
  });
  path.setAttribute("d", d);
  path.setAttribute("stroke", `rgb(${stroke.join(",")})`);
  path.setAttribute("stroke-width", width);
}
```

**Frame loop (`K'ayab'/Kumk'u`)**
```js
const initialPoints = Array.from({length:32}, (_,i)=>[
  Math.sin(i*0.2)*1.5,
  Math.cos(i*0.2)*1.5,
  i*0.05 - 0.8
]);

KUHUL.register("string_gravity", STRING_GRAVITY_FRAME_KHL);

function animate(){
  KUHUL.run("string_gravity", {
    points: initialPoints,
    center: [0,0,0],
    G: 1.0, M: 12.0,
    k: 0.9, b: 0.25,
    step: 0.02,
    color: [0,255,200]
  });
  requestAnimationFrame(animate);
}
animate();
```

**Live knobs**
- `M`: stronger attraction
- `b`: stiffer string
- `k`: tighter string
- `step`: faster descent (tune for stability)
- `center`: move attractor for orbital motion

**Why it fits π/XCFE**
- Pure gradient descent; no hidden state or force integrator.
- Effects stay on UI/SVG-3D; network/crypto/etc. would require a bridge law.
- Deterministic: same inputs → same frame, traceable under π collapse.

### Geometry-first invariant (string as embedded curve)
Gravity-like pull is captured as **action/energy minimization** on a 3D curve (the string). The energy functional can be decomposed as:
- **Tension:** \(E_t = \sum_i \|p_{i+1}-p_i\|^2\) (shorten the string).
- **Bending:** \(E_b = \sum_i \|p_{i+1}-2p_i+p_{i-1}\|^2\) (smooth the string).
- **Potential:** \(E_g = \sum_i -\frac{G M}{\|p_i-c\|+\epsilon}\) (gravity-like attractor).

Updating by \(\Delta p \propto -\nabla(E_t + E_b + E_g)\) is the “gravity-for-free” step: no explicit force API, just gradient descent on geometry. Anchors or multiple attractors are additive constraints; optional space-mesh deformation (geodesic descent) can extend this to curvature-based motion without changing the π/XCFE determinism story.

### Option A++ — lensing, ribbon render, chat control, SCXQ2 pack (K’UHUL-Physics v1)
This extends the fast path with multiple attractors (lensing), ribbon/tube output, chat-driven parameter patches, deterministic compression, and locked intrinsic signatures.

**KHL frame law (`STRING_LENSING_RIBBON_FRAME.khl`)**
```khl
@Wo {
  world.G   = context.G ?? 1.0
  world.eps = context.eps ?? 0.01
  world.attractors = context.attractors ?? [{ c: [0,0,0], M: 12.0 }]

  string.k    = context.k ?? 0.9
  string.b    = context.b ?? 0.25
  string.step = context.step ?? 0.02
  string.p    = context.points

  torsion = context.torsion ?? 0.0
  collide = context.collide ?? { enabled: false, radius: 0.25, strength: 0.06, skip: 3 }
  tube.radius = context.radius ?? 0.08
  tube.segments = context.segments ?? 12
  render.color = context.color ?? [0,255,200]
}

@Sek {
  let grad = physics.string_energy_gradient_multi {
    points: string.p,
    attractors: world.attractors,
    G: world.G,
    eps: world.eps,
    k: string.k,
    b: string.b,
    collide: collide
  }

  string.p = vec3.sub(string.p, vec3.mul(grad, string.step))

  let tube = svg3d.tube_mesh_ptf {
    points: string.p,
    radius: tube.radius,
    segments: tube.segments,
    torsion: torsion,
    color_mode: "curvature"
  }

  svg3d.mesh2d {
    id: "quantum-tube",
    tris: tube.tris2d,
    triColors: tube.triColors,
    alpha: 0.55
  }
}

@Collapse {
  let packed = scxq2.pack { mode: "SCXQ2", bytes: json.encode({ points: string.p, attractors: world.attractors, G: world.G }) }
  let topo = scxq2.pack { mode: "SCXQ2", bytes: json.encode(svg3d.tube_topology { segments: tube.segments, ringCount: len(string.p) }) }
  emit.frame { points: string.p, packed: packed, topology: topo }
}
```

**JS intrinsic: multi-attractor gradient**
```js
function stringEnergyGradientMulti({ points, attractors, G, eps, k, b }) {
  const n = points.length;
  const grad = points.map(() => [0,0,0]);
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const norm=(a)=>Math.sqrt(a[0]**2+a[1]**2+a[2]**2)+1e-9;

  for (let i=0;i<n-1;i++){
    const d = sub(points[i+1], points[i]);
    grad[i]   = add(grad[i],   mul(d, -2*k));
    grad[i+1] = add(grad[i+1], mul(d,  2*k));
  }

  for (let i=1;i<n-1;i++){
    const curv = add(sub(points[i-1], mul(points[i],2)), points[i+1]);
    grad[i-1] = add(grad[i-1], mul(curv,  b));
    grad[i]   = add(grad[i],   mul(curv, -2*b));
    grad[i+1] = add(grad[i+1], mul(curv,  b));
  }

  for (let i=0;i<n;i++){
    for (const A of attractors) {
      const r = sub(points[i], A.c);
      const d = norm(r) + eps;
      const f = -G*A.M/(d*d*d);
      grad[i] = add(grad[i], mul(r, f));
    }
  }
  return grad;
}

function selfCollisionGradient(points, rColl=0.25, strength=0.06, skip=3) {
  const n = points.length;
  const grad = points.map(()=>[0,0,0]);
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
  const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const norm=(a)=>Math.sqrt(dot(a,a))+1e-9;

  for (let i=0;i<n;i++){
    for (let j=i+skip;j<n;j++){
      const d = sub(points[i], points[j]);
      const dist = norm(d);
      if (dist < rColl) {
        const push = (rColl - dist) / rColl;
        const dir = mul(d, 1.0/dist);
        const f = strength * push * push;
        grad[i] = add(grad[i], mul(dir,  f));
        grad[j] = add(grad[j], mul(dir, -f));
      }
    }
  }
  return grad;
}

function stringEnergyGradientMultiWithCollide({ points, attractors, G, eps, k, b, collide }) {
  const base = stringEnergyGradientMulti({ points, attractors, G, eps, k, b });
  if (collide && collide.enabled) {
    const cg = selfCollisionGradient(points, collide.radius, collide.strength, collide.skip);
    for (let i=0;i<base.length;i++){
      base[i][0]+=cg[i][0]; base[i][1]+=cg[i][1]; base[i][2]+=cg[i][2];
    }
  }
  return base;
}
```

**JS intrinsic: tube mesh via parallel transport with torsion, curvature coloring, and mesh2d**
```js
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm=(a)=>Math.sqrt(dot(a,a))+1e-9;
const unit=(a)=>{ const d=norm(a); return [a[0]/d,a[1]/d,a[2]/d]; };

function rotateAroundAxis(v, axis, angle){
  const c=Math.cos(angle), s=Math.sin(angle), d=dot(axis,v);
  const axv=cross(axis,v);
  return [
    v[0]*c + axv[0]*s + axis[0]*d*(1-c),
    v[1]*c + axv[1]*s + axis[1]*d*(1-c),
    v[2]*c + axv[2]*s + axis[2]*d*(1-c)
  ];
}

function computePTFrames(points){
  const n=points.length, T=[], N=[], B=[];
  for(let i=0;i<n;i++){
    const p0=points[Math.max(0,i-1)], p1=points[Math.min(n-1,i+1)];
    T[i]=unit(sub(p1,p0));
  }
  const ref=Math.abs(T[0][1])<0.9?[0,1,0]:[1,0,0];
  N[0]=unit(cross(ref,T[0])); B[0]=unit(cross(T[0],N[0]));

  for(let i=1;i<n;i++){
    const v=cross(T[i-1], T[i]); const d=norm(v);
    if (d<1e-6){ N[i]=N[i-1]; B[i]=B[i-1]; continue; }
    const axis=unit(v); const angle=Math.asin(Math.min(1,d));
    N[i]=rotateAroundAxis(N[i-1], axis, angle);
    B[i]=unit(cross(T[i], N[i]));
  }
  return { N, B };
}

function applyTorsionToFrames(frames, torsionPerSegment=0.0){
  const { T, N, B } = frames; let theta=0;
  for(let i=0;i<T.length;i++){
    theta += torsionPerSegment;
    const c=Math.cos(theta), s=Math.sin(theta);
    const n=N[i], b=B[i];
    N[i]=[ n[0]*c + b[0]*s, n[1]*c + b[1]*s, n[2]*c + b[2]*s ];
    B[i]=[ b[0]*c - n[0]*s, b[1]*c - n[1]*s, b[2]*c - n[2]*s ];
  }
  return frames;
}

function curvatureScalar(points){
  const n=points.length, out=new Array(n).fill(0);
  for(let i=1;i<n-1;i++){
    const curv=add(sub(points[i-1], mul(points[i],2)), points[i+1]);
    out[i]=norm(curv);
  }
  out[0]=out[1]; out[n-1]=out[n-2];
  return out;
}
function lerp(a,b,t){ return a+(b-a)*t; }
function clamp01(x){ return Math.max(0, Math.min(1,x)); }
function ramp(t){
  t=clamp01(t); const c1=[0,255,200], c2=[255,0,200];
  return [Math.round(lerp(c1[0],c2[0],t)), Math.round(lerp(c1[1],c2[1],t)), Math.round(lerp(c1[2],c2[2],t))];
}

function tubeMeshPTF({ points, radius=0.08, segments=12, torsion=0.0, camera={pos:[0,0,6]}, color_mode="solid" }) {
  let frames=computePTFrames(points);
  frames=applyTorsionToFrames(frames, torsion);
  const { N, B } = frames;
  const kappa = curvatureScalar(points);
  const kMax = Math.max(...kappa)+1e-9;

  const rings=[];
  for(let i=0;i<points.length;i++){
    const ring=[];
    for(let j=0;j<segments;j++){
      const a=(j/segments)*Math.PI*2;
      const offset=add(mul(N[i], Math.cos(a)*radius), mul(B[i], Math.sin(a)*radius));
      ring.push(add(points[i], offset));
    }
    rings.push(ring);
  }
  const proj=p=>{ const z=p[2]+camera.pos[2]; return [400+(p[0]/z)*400, 300-(p[1]/z)*400]; };
  const tris2d=[], triColors=[];
  for(let i=0;i<rings.length-1;i++){
    const t = color_mode==="curvature" ? kappa[i]/kMax : 0;
    const col = color_mode==="curvature" ? ramp(t) : null;
    for(let j=0;j<segments;j++){
      const j2=(j+1)%segments;
      const a=proj(rings[i][j]), b=proj(rings[i][j2]);
      const c=proj(rings[i+1][j]), d=proj(rings[i+1][j2]);
      tris2d.push([a,b,c]); triColors.push(col);
      tris2d.push([b,d,c]); triColors.push(col);
    }
  }
  return { tris2d, triColors };
}

function svgMesh2D({ id, tris, triColors=null, fill=[0,255,200], alpha=0.6, stroke=null, stroke_width=0 }) {
  const svg=document.getElementById("svg");
  let g=document.getElementById(id);
  if(!g){ g=document.createElementNS("http://www.w3.org/2000/svg","g"); g.setAttribute("id",id); svg.appendChild(g); }
  g.innerHTML="";
  const strokeCss=stroke?`rgba(${stroke[0]},${stroke[1]},${stroke[2]},${alpha})`:"none";
  for (let i=0;i<tris.length;i++) {
    const tri=tris[i];
    const col=triColors && triColors[i]? triColors[i] : fill;
    const fillCss=`rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
    const p=document.createElementNS("http://www.w3.org/2000/svg","path");
    const d=`M ${tri[0][0]} ${tri[0][1]} L ${tri[1][0]} ${tri[1][1]} L ${tri[2][0]} ${tri[2][1]} Z`;
    p.setAttribute("d", d); p.setAttribute("fill", fillCss); p.setAttribute("stroke", strokeCss); p.setAttribute("stroke-width", stroke_width);
    g.appendChild(p);
  }
}

function svgTubeTopology(segments, ringCount){
  return { type:"asx://tube_topology.v1", segments, ringCount, tri_rule:"quad_strip_two_tris", winding:"a-b-c, b-d-c", proj:{ camZ:6, cx:400, cy:300, scale:400 } };
}
```

**JS intrinsic: SCXQ2-style pack/unpack**
```js
async function scxq2Pack({ mode="SCXQ2", bytes }) {
  const u8 = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  if ("CompressionStream" in window) {
    const cs=new CompressionStream("gzip"); const w=cs.writable.getWriter(); w.write(u8); w.close();
    const buf=await new Response(cs.readable).arrayBuffer(); const out=new Uint8Array(buf);
    return { mode, algo:"gzip", b64: base64Encode(out), raw: u8.length, cmp: out.length };
  }
  return { mode, algo:"none", b64: base64Encode(u8), raw: u8.length, cmp: u8.length };
}

async function scxq2Unpack(packed) {
  const u8=base64Decode(packed.b64);
  if (packed.algo==="gzip" && "DecompressionStream" in window) {
    const ds=new DecompressionStream("gzip"); const w=ds.writable.getWriter(); w.write(u8); w.close();
    const buf=await new Response(ds.readable).arrayBuffer(); return new Uint8Array(buf);
  }
  return u8;
}

function base64Encode(u8){ let s=""; for (let i=0;i<u8.length;i++) s+=String.fromCharCode(u8[i]); return btoa(s); }
function base64Decode(b64){ const s=atob(b64); const u8=new Uint8Array(s.length); for (let i=0;i<s.length;i++) u8[i]=s.charCodeAt(i); return u8; }
```

**Chat hook: JSON patch for gravity parameters**
```js
function applyGravityPatch(sim, patch) {
  if (typeof patch.G === "number") sim.G = patch.G;
  if (typeof patch.eps === "number") sim.eps = patch.eps;
  if (Array.isArray(patch.attractors)) {
    sim.attractors = patch.attractors
      .filter(a => a && Array.isArray(a.c) && a.c.length===3 && typeof a.M==="number")
      .map(a => ({ c: a.c.map(Number), M: Number(a.M) }))
      .slice(0, 8);
  }
}

async function chatToGravityPatch(userText) {
  const prompt = `Return ONLY JSON with optional G, eps, attractors (array of {c:[x,y,z], M}). User: ${userText}`;
  const res = await fetch("/infer", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ prompt, max_tokens: 200, temperature: 0.2 }) });
  const data = await res.json();
  return JSON.parse((data.text || "").trim());
}
```

**Drop-in simulation loop**
```js
const SIM = {
  G: 1.0, eps: 0.01,
  attractors: [{ c:[0,0,0], M:12.0 }, { c:[1.5,0.2,-0.3], M:6.0 }],
  points: Array.from({length:48},(_,i)=>[ Math.sin(i*0.18)*1.6, Math.cos(i*0.18)*1.6, i*0.04 - 0.9 ])
};
const HOST = { physics: { string_energy_gradient_multi }, svg3d: { ribbon_mesh: ribbonMesh, mesh2d: svgMesh2D }, scxq2: { pack: scxq2Pack, unpack: scxq2Unpack } };

async function animate(){
  const frame = await KUHUL.run("string_lensing_ribbon", {
    points: SIM.points,
    attractors: SIM.attractors,
    G: SIM.G, eps: SIM.eps,
    k: 0.9, b: 0.25, step: 0.02,
    ribbon_width: 0.10,
    color: [0,255,200]
  });
  SIM.points = frame.points;
  requestAnimationFrame(animate);
}
animate();
```

**Intrinsic surface (K’UHUL-Physics v1)**
- `physics.string_energy_gradient_multi(input) -> grad[]` — pure, deterministic, no mutation.
- `svg3d.ribbon_mesh({points,width,mode}) -> {tris2d}` — deterministic projection, consistent winding.
- `svg3d.mesh2d({id,tris,fill,alpha,stroke,stroke_width})` — draws triangles; no authority beyond render.
- `scxq2.pack/unpack` — deterministic bytepack; transport-only.
- Chat patch: optional, must sanitize attractors and numeric fields.

**Effect/authority reminders**
- Physics + rendering stay in UI/SVG lanes; network/crypto/IO still require bridge laws.
- Compression is transport-only; legality still governed by XCFE and π collapse.

## Algebraic geometry — minimal, law-first mapping
- **Core intuition:** Algebraic geometry studies solution sets of polynomial equations; algebra (rings, ideals) encodes geometry (varieties).
- **Irreducible objects:** (1) Ring `R` (expression space), (2) Ideal `I ⊂ R` (constraints bundle), (3) Variety `V(I)` (valid states), (4) Quotient `R/I` (functions restricted to that state), (5) Localization `R_f` (local view near `f≠0`).
- **Duality table:** Ring ↔ space; ideal ↔ subspace; quotient ↔ space under law; homomorphism ↔ state map; localization ↔ frame/context; prime ideal ↔ atomic region. This mirrors XCFE/π: constraints define the space, not stored points.
- **Sheaf minimalism:** A sheaf is just a rule for when local data glues globally. Ingredients: regions + local sections + restriction maps. Axioms: (1) locals agree on overlaps; (2) if all overlaps agree, there is a unique global section. Failure to glue signals inconsistency (no global object).
- **Runtime alignment:** Your system already uses this: regions = shards/frames; sections = local state; restrictions = projections; gluing = collapse/merge; non-gluable = invariant violation. Truth is earned via local agreement, not assumed global—matching XCFE legality.
- **Non-goals / guardrails:** “Universal/quantum scripting” layers (paradigm synthesis, quantum branching semantics, superpositions, etc.) are outside π’s authority unless they deterministically lower to AST with no hidden state. Any such DSL must compile into π/AST/XCFE-legal operations; otherwise it is non-compliant and not part of this spec.
- **Quantum tokenization manifests are not part of π.** JSON blobs that describe “quantum tokenization” (entanglement matrices, amplitudes, cross-lingual superpositions, quantum bits, glyph seals, etc.) are informational only unless (a) every field lowers deterministically to π AST, (b) no amplitudes/phases alter execution semantics, and (c) XCFE law authorizes the transport. Otherwise they are non-compliant and have zero authority in this grammar.
- **External KPI/KQL/SQL planes are out-of-scope unless lowered.** Any KPI-like transport or query plane (KPI envelopes, KQL/IDB/SQL bindings, MySQL substrates) has no authority in π unless messages are schema-validated and deterministically lowered to AST/XCFE ops without hidden execution paths. Optional SQL planes remain non-authoritative for semantics.
- **KPI law lives in its own spec.** Refer to the frozen `kpi://spec/v1` for transport/query/artifact rules; embedding KPI text here does not grant execution authority unless it lowers to π/AST under XCFE.
- **Universal AST bridge schemas are independent.** Schemas like `kuhul://schema/bridge/ast-universal/v1` define cross-language AST bridges; they are external law and gain no authority inside π unless the content is schema-validated and lowered to π/AST under XCFE.
- **KUHUL-ES AST schema is external.** The frozen `kuhul://schema/kuhul-es/ast/v2.1` defines KUHUL-ES structure outside this document; it becomes authoritative for π only when its nodes are schema-validated and deterministically lowered to π/AST under XCFE. Inclusion of that schema text here conveys no execution authority.
- **KUHUL-ES grammar v2.1 is external language law.** The normative KUHUL-ES grammar belongs to `@kuhul/es` and remains outside this π spec; it only impacts π when its lowered AST passes XCFE/AST validation.
- **Edge ML narratives are informational only.** Descriptions of machine-learning inference (weights, quantization, edge runtimes, accelerators) have no binding effect on π; they must be ignored unless a concrete, schema-validated lowering into π/AST/XCFE operations is provided.
- **Sandbox contracts and glyph marketing text are non-authoritative.** Sandbox boundary documents (e.g., `kuhul-sandbox.v1.json`) and narrative glyph explanations carry no execution authority in π. They only matter if a schema-validated lowering into π/AST/XCFE operations is supplied and approved by XCFE law.
- **Domain engine indices are declarative only.** Frozen lists of “domain engines” (e.g., KUHUL-π, CC/SCX/SCXQ2, physics, geometry, glyph, temporal, perception) define naming/meaning only and have zero execution authority in π unless explicitly lowered into π/AST/XCFE operations under schema validation.
- **Sandbox/glyph “execution physics” descriptions are non-binding.** Any narrative of phase lattices (Pop/Wo/Sek/Ch'en/Yax/K'ayab'/Kumk'u/Xul) is descriptive only. It does not alter π legality unless formalized, schema-validated, and lowered into π/AST/XCFE ops.
- **Sandbox contracts, GGL specs, and AI/geometric narratives are non-authoritative.** Documents like `kuhul-sandbox.v1.json`, GGL/ECMAScript/AI geometric narratives, or shape/tokenization proposals have zero effect on π law unless a concrete, schema-validated lowering to π/AST under XCFE is provided and approved.

## Evaluation model
- **Pure evaluation.** Execution walks the lowered AST in deterministic order (post-order for expressions). There is no memoization or ambient cache.
- **Deterministic math cores.** All numeric operations use fixed precision and rounding rules; implementations must not substitute hardware-dependent optimizations that change results.
- **No implicit broadcasting.** Vectors and matrices must match exactly in dimension; shape inference never inserts implicit expansion.
- **Traceability.** Each node evaluation emits a trace tuple `(node_id, input_hashes, output_value, fault?)` to support replay and proof material.

## Canonical function set

π functions are enumerated and not runtime-extensible.

### Scalars
- `abs(x)`
- `sqrt(x)`
- `pow(x, y)`
- `min(a, b)`
- `max(a, b)`

### Vectors
- `length(v)`
- `normalize(v)`
- `dot(a, b)`
- `cross(a, b)` (3D only)

### Geometry helpers
- `distance(p, q)`
- `angle(a, b, c)`

### Derived/library forms (must lower to core)
- `mean(v)` → `sum(v) / length(v)`; implementations may include this as sugar but must lower to primitive arithmetic and `length`.
- `sum(v)` → left-folded addition with zero-initialization; must maintain deterministic order.
- `matmul(A, B)` → explicit triple-nested deterministic loops with fixed bounds derived from matrix shapes; no lazy or hardware-fused shortcuts are allowed.

## Non-features
- No IO, randomness, or interpreter shortcuts.
- No loop constructs with runtime-dependent bounds.
- No hidden mutation or ambient clocks.

## Compliance checkpoints
1. **Grammar adherence:** Surface syntax must parse under the canonical EBNF with no vendor-specific extensions.
2. **AST equivalence:** Different source forms that normalize to the same AST must produce identical hashes and evaluation outputs.
3. **Trace determinism:** Running the same program with the same inputs must emit identical traces bit-for-bit.
4. **Shape enforcement:** Any mismatch in vector/matrix dimensions is a compile-time error; runtime shape surprises are forbidden.
5. **Failure fidelity:** Fault conditions (division by zero, invalid comparisons, NaN) must be reflected in traces and never coerced silently.

## Binding, bridging, and effects (how π plugs into the rest of MX2LM)
- **atomic-bind://spec/v1 — binding resolution.** π programs referenced by atomic-scripts bind to projection surfaces via `@bind` entries: `(surface) → (atomic-script ref) → (law context)`. Bindings are declarative, law-aware, pre-runtime, and strictly non-executing. They require versioned rules (`no_execution`, `no_authority`, `law_required`, `deterministic`) and schema-validated `@entries` that name surfaces, scripts, laws, optional scope, and phase. Binding only resolves eligibility; XCFE still gates execution.
- **atomic-bridge://spec/v1 — crossing effect boundaries.** When a π-bearing atomic-script must hand intent across conflicting effect domains (e.g., UI ⟂ network), a bridge pair is mandated: an emitter produces an inert, hashed Bridge Packet under its law; a receiver under another law consumes it and emits a Bridge Result bound by request hash. Channels are constrained (e.g., `memory_queue`, `postmessage`, `mesh_route`), packets/results follow sealed schemas, and invariants forbid mixed-effect privilege escalation or executable payloads.
- **atomic-effect://lattice/v1 — effect algebra.** Every π operator has a required effect signature; effects form a lattice with order, joins, and conflicts (e.g., `ui ⟂ network`, `dom ⟂ cluster`, `process ⟂ ui`). XCFE allow/deny is evaluated over the lattice closure: allow must cover required effects (or supersets), deny wins via closure, and conflicts force separate laws or explicit bridges. This lattice is the formal spine ensuring determinism and auditable enforcement.

## Next formalization steps
1. Emit `asx://layer/kuhul-pi` as a formal XJSON grammar and fixed function registry.
2. Show explicit π → AST lowering blocks.
3. Show π numeric streams → SCXQ2 FIELD/LANE encoding.
4. Bind π evaluation outputs to MFA-1 proof material.
