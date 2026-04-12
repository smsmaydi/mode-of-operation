import React, { useCallback, useState, useEffect } from "react";
import {
  textToHex,
  hexToText,
  encryptedHexToBits,
  encryptedBitsToHex,
  bitsValueToHexPreview,
} from "../../utils/plaintextSidebarUtils";

const fieldStyle = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--node-field-bg)",
  color: "var(--node-field-text)",
  boxSizing: "border-box",
};

const labelStyle = { fontSize: 11, fontWeight: 600, marginBottom: 4, display: "block" };

/**
 * Cryptographically random bit string of exact length (fallback if `crypto.getRandomValues` is missing).
 * @param {number} length — number of bits (e.g. 64, 128)
 * @returns {string} only `'0'` and `'1'`
 */
function randomBits(length) {
  const bytes = new Uint8Array(Math.ceil(length / 8));
  if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  let result = "";
  for (let i = 0; i < length; i++) {
    const byte = bytes[Math.floor(i / 8)];
    const bit = (byte >> (7 - (i % 8))) & 1;
    result += bit ? "1" : "0";
  }
  return result;
}

/**
 * Left sidebar: all user-editable inputs for the lecture graph.
 *
 * Writes through to React Flow node data via callbacks (`onPatchP1` → node `p1`, etc.).
 * Sections: block algorithm, plaintext/ciphertext, key, and mode-specific IV (CBC) or nonce/counter (CTR).
 *
 * @param {object} props
 * @param {"ecb"|"cbc"|"ctr"|string} props.mode — current operation mode
 * @param {object} [props.plaintextData] — `p1` node `.data` (text, bits, decrypt, …)
 * @param {object} [props.keyData] — `k1` node `.data` (`bits`, `keyText`)
 * @param {object} [props.ivData] — CBC IV bits (`iv1`)
 * @param {object} [props.ctrData] — CTR nonce + counter (`ctr1`)
 * @param {"xor"|"aes"} props.blockCipherType — per–block cipher selection
 * @param {function("xor"|"aes"): void} [props.onSetBlockCipherType]
 * @param {number} [props.selectedBlockIndex] — for AES step-by-step block label
 * @param {function(): void} [props.onOpenAesSteps]
 * @param {boolean} [props.aesStepsAvailable]
 * @param {function(Object): void} [props.onPatchP1]
 * @param {function(Object): void} [props.onPatchK1]
 * @param {function(Object): void} [props.onPatchIv]
 * @param {function(Object): void} [props.onPatchCtr]
 */
export default function GraphInputsPanel({
  mode,
  plaintextData,
  keyData,
  ivData,
  ctrData,
  blockCipherType,
  onSetBlockCipherType,
  selectedBlockIndex,
  onOpenAesSteps,
  aesStepsAvailable,
  onPatchP1,
  onPatchK1,
  onPatchIv,
  onPatchCtr,
}) {
  const [text, setText] = useState("");
  const [hex, setHex] = useState("");
  const decrypt = !!plaintextData?.isDecryptMode;

  // Lecture UI no longer offers image upload; reset stale `image` state from older sessions.
  useEffect(() => {
    if (plaintextData?.inputType === "image") {
      onPatchP1?.({
        inputType: "text",
        value: "",
        bits: "",
        file: null,
        pixelBytes: undefined,
        width: undefined,
        height: undefined,
        fileTimestamp: undefined,
      });
    }
  }, [plaintextData?.inputType, onPatchP1]);

  // Keep local Text / Hex fields in sync when `p1` is driven from outside (e.g. mode switch).
  useEffect(() => {
    const it = plaintextData?.inputType;
    const v = plaintextData?.value;
    if (it === "text" && typeof v === "string") {
      setText(v);
      setHex(textToHex(v));
    } else if (it === "bits" && typeof v === "string") {
      setHex(bitsValueToHexPreview(v));
      setText(hexToText(bitsValueToHexPreview(v).replace(/\s/g, "")));
    } else if (!decrypt) {
      setText("");
      setHex("");
    }
  }, [plaintextData?.inputType, plaintextData?.value, decrypt]);

  const onTextChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    setHex(textToHex(raw));
    onPatchP1?.({
      inputType: "text",
      value: raw,
      bits: "",
      file: null,
    });
  };

  const onHexChange = (e) => {
    const raw = e.target.value;
    setHex(raw);
    const derived = hexToText(raw);
    setText(derived);
    onPatchP1?.({
      inputType: "text",
      value: derived,
      bits: "",
      file: null,
    });
  };

  const onBitsChange = (e) => {
    const filtered = e.target.value.replace(/[^01]/g, "");
    onPatchP1?.({ inputType: "bits", value: filtered, bits: "" });
  };

  const onEncFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPatchP1?.({
      inputType: "encryptedFile",
      value: file,
      encryptedImageFile: file,
      isDecryptMode: true,
      fileName: file.name,
      fileTimestamp: Date.now(),
      cipherType: "aes",
    });
  };

  const toggleDecrypt = useCallback(
    (next) => {
      if (!next) {
        onPatchP1?.({
          isDecryptMode: false,
          inputType: "text",
          value: "",
          encryptedImageFile: undefined,
        });
      } else {
        onPatchP1?.({
          isDecryptMode: true,
          inputType: "encrypted",
          value: "",
        });
      }
    },
    [onPatchP1]
  );

  if (!plaintextData && !keyData) return null;

  const showIv = mode === "cbc" && ivData != null;
  const showCtr = mode === "ctr" && ctrData != null;

  return (
    <div className="graph-inputs-panel">
      {/* Algorithm select + optional AES step-by-step */}
      {onSetBlockCipherType != null && (
        <section className="graph-inputs-panel__section">
          <div className="graph-inputs-panel__heading">Block cipher</div>
          <label style={labelStyle}>Algorithm</label>
          <select
            className="graph-inputs-panel__select"
            value={blockCipherType === "aes" ? "aes" : "xor"}
            onChange={(e) => onSetBlockCipherType(e.target.value)}
            style={{ ...fieldStyle, cursor: "pointer" }}
          >
            <option value="xor">XOR</option>
            <option value="aes">AES-128</option>
          </select>
          {blockCipherType === "aes" && aesStepsAvailable && onOpenAesSteps && (
            <button
              type="button"
              className="graph-inputs-panel__btn"
              style={{ marginTop: 8 }}
              onClick={onOpenAesSteps}
            >
              AES round steps (block {typeof selectedBlockIndex === "number" ? selectedBlockIndex + 1 : 1})
            </button>
          )}
        </section>
      )}

      {/* Plaintext node (p1): encrypt or decrypt inputs */}
      {plaintextData != null && (
        <section className="graph-inputs-panel__section">
          <div className="graph-inputs-panel__heading">Plaintext</div>
          <label style={{ ...labelStyle, marginTop: 4 }}>
            <input
              type="checkbox"
              checked={decrypt}
              onChange={(e) => toggleDecrypt(e.target.checked)}
            />{" "}
            Decrypt mode
          </label>

          {!decrypt ? (
            <>
              <label style={labelStyle}>Text</label>
              <textarea
                rows={3}
                style={{ ...fieldStyle, resize: "vertical", minHeight: 56 }}
                placeholder="UTF-8 text…"
                value={plaintextData.inputType === "text" ? text : ""}
                onChange={onTextChange}
              />
              <label style={{ ...labelStyle, marginTop: 8 }}>Hex (with text)</label>
              <textarea
                rows={2}
                style={{ ...fieldStyle, resize: "vertical", minHeight: 44 }}
                placeholder="Hex pairs…"
                value={plaintextData.inputType === "text" ? hex : ""}
                onChange={onHexChange}
              />
              <label style={{ ...labelStyle, marginTop: 8 }}>Bits (0/1)</label>
              <textarea
                rows={2}
                style={{ ...fieldStyle, resize: "vertical", minHeight: 44 }}
                placeholder="Binary plaintext…"
                value={plaintextData.inputType === "bits" ? String(plaintextData.value || "") : ""}
                onChange={onBitsChange}
              />
            </>
          ) : (
            <>
              <label style={labelStyle}>Encrypted hex</label>
              <textarea
                rows={2}
                style={{ ...fieldStyle, resize: "vertical" }}
                value={
                  plaintextData.inputType === "encrypted" && typeof plaintextData.value === "string"
                    ? plaintextData.value.replace(/(.{2})/g, "$1 ").trim()
                    : ""
                }
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
                  onPatchP1?.({ inputType: "encrypted", value: cleaned, isDecryptMode: true });
                }}
              />
              <label style={{ ...labelStyle, marginTop: 8 }}>Encrypted bits</label>
              <textarea
                rows={2}
                style={{ ...fieldStyle, resize: "vertical" }}
                value={
                  plaintextData.inputType === "encrypted" && typeof plaintextData.value === "string"
                    ? encryptedHexToBits(plaintextData.value)
                    : ""
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^01]/g, "");
                  onPatchP1?.({
                    inputType: "encrypted",
                    value: encryptedBitsToHex(raw),
                    isDecryptMode: true,
                  });
                }}
              />
              <label style={{ ...labelStyle, marginTop: 8 }}>Encrypted file</label>
              <input type="file" accept="*" onChange={onEncFile} style={{ fontSize: 11 }} />
            </>
          )}
        </section>
      )}

      {/* Key node (k1): XOR bits or AES 128-bit key */}
      {keyData != null && (
        <section className="graph-inputs-panel__section">
          <div className="graph-inputs-panel__heading">Key</div>
          {blockCipherType === "aes" ? (
            <>
              <label style={labelStyle}>AES key (128 bit, 0/1)</label>
              <textarea
                rows={4}
                style={{ ...fieldStyle, resize: "vertical" }}
                placeholder="Up to 128 bits (0/1); shorter strings are padded with zeros"
                value={keyData.bits || ""}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^01]/g, "").slice(0, 128);
                  onPatchK1?.({ bits: filtered, keyText: "" });
                }}
              />
              <button
                type="button"
                className="graph-inputs-panel__btn"
                onClick={() => onPatchK1?.({ bits: randomBits(128), keyText: "" })}
              >
                Random AES key (128 bit)
              </button>
            </>
          ) : (
            <>
              <label style={labelStyle}>XOR bits</label>
              <textarea
                rows={3}
                style={{ ...fieldStyle, resize: "vertical" }}
                placeholder="0 and 1…"
                value={keyData.bits || ""}
                onChange={(e) => onPatchK1?.({ bits: e.target.value.replace(/[^01]/g, "") })}
              />
              <button
                type="button"
                className="graph-inputs-panel__btn"
                onClick={() => onPatchK1?.({ bits: randomBits(128) })}
              >
                Random XOR 128
              </button>
            </>
          )}
        </section>
      )}

      {/* IV node (iv1), CBC only */}
      {showIv && (
        <section className="graph-inputs-panel__section">
          <div className="graph-inputs-panel__heading">IV (CBC)</div>
          <textarea
            rows={3}
            style={{ ...fieldStyle, resize: "vertical", opacity: 0.92 }}
            placeholder="IV bits…"
            readOnly
            value={ivData.bits || ""}
          />
          <button
            type="button"
            className="graph-inputs-panel__btn"
            onClick={() => onPatchIv?.({ bits: randomBits(128) })}
          >
            Random IV 128
          </button>
        </section>
      )}

      {/* CTR master (ctr1): nonce + counter drive all ctrsnap copies */}
      {showCtr && (
        <section className="graph-inputs-panel__section">
          <div className="graph-inputs-panel__heading">Nonce + counter (CTR)</div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 8px" }}>
            Edited here only; each block on the canvas shows a read-only copy.
          </p>
          <label style={labelStyle}>Nonce (bits)</label>
          <textarea
            rows={3}
            style={{ ...fieldStyle, resize: "vertical", opacity: 0.92 }}
            placeholder="Nonce bits…"
            readOnly
            value={ctrData?.nonceBits || ""}
          />
          <button
            type="button"
            className="graph-inputs-panel__btn"
            onClick={() => onPatchCtr?.({ nonceBits: randomBits(64) })}
          >
            Random nonce (64 bit)
          </button>
          <label style={{ ...labelStyle, marginTop: 10 }}>Counter (64 bit)</label>
          <textarea
            rows={2}
            style={{ ...fieldStyle, resize: "vertical", opacity: 0.92 }}
            placeholder="Counter bits…"
            readOnly
            value={ctrData?.counterBits || ""}
          />
          <button
            type="button"
            className="graph-inputs-panel__btn"
            onClick={() => onPatchCtr?.({ counterBits: "0".repeat(64) })}
          >
            Reset counter to zero
          </button>
        </section>
      )}
    </div>
  );
}
