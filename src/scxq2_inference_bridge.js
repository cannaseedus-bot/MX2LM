/* ============================================================
   SCXQ2 → Neural Bridge Adapter
   Bridges SCXQ2 packs into the SVG-3D ↔ GGL inference runtime
   ============================================================ */

(function (global) {
  const MAX_OUTPUT_UNITS_DEFAULT = 1 << 20;

  function base64ToUint8Array(b64) {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function uint8ToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function decodeUTF16LE(bytes, maxUnits = MAX_OUTPUT_UNITS_DEFAULT) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const codeUnits = [];
    const limit = Math.min(maxUnits, Math.floor(bytes.byteLength / 2));

    for (let i = 0; i < limit; i++) {
      codeUnits.push(view.getUint16(i * 2, true));
    }

    return String.fromCharCode(...codeUnits);
  }

  function encodeUTF16LE(text) {
    const buf = new ArrayBuffer(text.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < text.length; i++) {
      view.setUint16(i * 2, text.charCodeAt(i), true);
    }
    return new Uint8Array(buf);
  }

  function scxq2PackVerify(pack) {
    if (!pack || typeof pack !== 'object') {
      return { ok: false, error: { code: 'invalid_pack', details: 'Pack missing or not an object' } };
    }

    if (!pack.dict || typeof pack.dict.dict !== 'string') {
      return { ok: false, error: { code: 'invalid_dict', details: 'dict.dict string required' } };
    }

    if (!Array.isArray(pack.blocks) || pack.blocks.length === 0) {
      return { ok: false, error: { code: 'no_blocks', details: 'blocks array required' } };
    }

    const invalidBlock = pack.blocks.find(
      (b) => typeof b !== 'object' || typeof b.b64 !== 'string'
    );
    if (invalidBlock) {
      return { ok: false, error: { code: 'invalid_block', details: 'Each block requires b64 string' } };
    }

    return { ok: true };
  }

  function selectBlock(pack, laneId) {
    if (!laneId) return pack.blocks[0];
    return pack.blocks.find((b) => b.lane_id === laneId) || pack.blocks[0];
  }

  function scxq2DecodeUtf16(dict, bytes, options = {}) {
    const maxUnits = options.maxOutputUnits || MAX_OUTPUT_UNITS_DEFAULT;
    try {
      return { ok: true, value: decodeUTF16LE(bytes, maxUnits), dict };
    } catch (err) {
      return { ok: false, kind: err.message || 'decode_failed' };
    }
  }

  function ccCompressSync(text, { dict, laneId }) {
    const encoded = encodeUTF16LE(text);
    const b64 = uint8ToBase64(encoded);

    return {
      dict: dict || { dict: '' },
      blocks: [
        {
          b64,
          lane_id: laneId || 'lane0',
          encoding: 'utf16le',
          length: text.length
        }
      ],
      meta: {
        format: 'scxq2.pack',
        generated_at: Date.now()
      }
    };
  }

  /**
   * Authoritative inference entry
   * SCXQ2 → Neural Bridge → SCXQ2
   */
  async function runInferenceFromSCXQ2({
    inputPack,
    laneId = null,
    bridge,
    direction,
    policy = {}
  }) {
    const verdict = scxq2PackVerify(inputPack, policy);
    if (!verdict.ok) {
      throw new Error(`SCXQ2_VERIFY_FAIL: ${verdict.error.code}`);
    }

    const block = selectBlock(inputPack, laneId);
    const decoded = scxq2DecodeUtf16(
      inputPack.dict.dict,
      base64ToUint8Array(block.b64),
      { maxOutputUnits: policy.maxOutputUnits }
    );

    if (!decoded.ok) {
      throw new Error(`SCXQ2_DECODE_FAIL: ${decoded.kind}`);
    }

    const sourceText = decoded.value;

    if (!bridge) {
      throw new Error('NEURAL_BRIDGE_UNAVAILABLE');
    }

    let resultText = '';
    if (direction === 'svg3d_to_ggl') {
      const r = await bridge.translateSVG3DtoGGL(sourceText);
      resultText = r?.target?.expression || r?.target?.command || '';
    } else if (direction === 'ggl_to_svg3d') {
      const r = await bridge.translateGGLtoSVG3D(sourceText);
      resultText = r?.target?.command || r?.target?.expression || '';
    } else {
      throw new Error('INVALID_DIRECTION');
    }

    if (!resultText) {
      throw new Error('EMPTY_INFERENCE_RESULT');
    }

    return ccCompressSync(resultText, {
      dict: inputPack.dict,
      laneId: block?.lane_id || laneId || 'lane0'
    });
  }

  global.runInferenceFromSCXQ2 = runInferenceFromSCXQ2;
})(typeof window !== 'undefined' ? window : globalThis);

