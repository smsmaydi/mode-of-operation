import React from "react";

/**
 * Compact per-block trace: ECB vs CBC chaining (XOR demo).
 * Rows show plaintext block → (CBC: XOR chain) → ciphertext block.
 */
export default function BlockChainPanel({ rows, mode, onClose }) {
  if (!rows?.length) return null;

  const rowClass =
    mode === "cbc"
      ? "block-chain-panel__row block-chain-panel__row--cbc"
      : "block-chain-panel__row block-chain-panel__row--ecb";

  return (
    <div className="block-chain-panel">
      <div className="block-chain-panel__header">
        <strong>
          Block chain ({mode.toUpperCase()}, 1 byte / block)
        </strong>
        <button
          type="button"
          className="block-chain-panel__close"
          onClick={onClose}
        >
          Hide
        </button>
      </div>
      <div className="block-chain-panel__intro">
        {mode === "cbc"
          ? "Block i: plaintext byte ⊕ (IV for i=0, else previous ciphertext byte) → XOR with key → ciphertext. This matches the CBC chaining idea (e.g. defuse.ca diagram)."
          : "Each block is encrypted independently; no input from the previous ciphertext."}
      </div>
      <div className="block-chain-panel__rows">
        {rows.map((row) => (
          <div key={row.i} className={rowClass}>
            <span className="block-chain-panel__idx">#{row.i + 1}</span>
            <span title="Plaintext block (byte)">P: {row.mHex}</span>
            {mode === "cbc" && (
              <span title="After XOR with IV or previous C">
                ⊕ in: {row.xoredHex ?? "—"}
              </span>
            )}
            <span title="Ciphertext block (byte)">C: {row.cHex}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
