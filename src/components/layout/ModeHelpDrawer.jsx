import React from "react";

/** Help copy for the ? drawer: English, aligned with ModeMenu + GraphInputsPanel. */
const SECTIONS = {
  ecb: [
    {
      title: "Left panel — Modes",
      lines: [
        "ECB / CBC / Counter mode: pick which block mode the graph demonstrates.",
        "“Show input/output labels”: toggles small labels on node handles (in / out).",
      ],
    },
    {
      title: "Left panel — Block cipher",
      lines: [
        "Algorithm: XOR uses a repeating bit key; AES-128 uses a 128-bit key for the real block cipher.",
        "AES round steps: opens the step-by-step AES view for the currently selected block (when AES and text bits are available).",
      ],
    },
    {
      title: "Left panel — Plaintext",
      lines: [
        "Decrypt mode: when checked, inputs are ciphertext (hex, bits, or file) instead of plaintext.",
        "Text: ordinary UTF-8 message; drives the Plaintext node as character data.",
        "Hex (with text): hex bytes kept in sync with Text (edit either side).",
        "Bits (0/1): raw binary plaintext string (only this field is used when you work in “bits” mode).",
        "In decrypt mode — Encrypted hex / Encrypted bits: paste ciphertext; Encrypted file: pick a ciphertext file.",
      ],
    },
    {
      title: "Left panel — Key",
      lines: [
        "XOR: “XOR bits” is the repeating key as 0/1; “Random XOR 128” fills 128 random bits.",
        "AES-128: “AES key (128 bit, 0/1)” is the only key field; shorter input is padded with zeros to 128 bits. “Random AES key” generates 128 bits. The Key node on the graph mirrors this value.",
      ],
    },
    {
      title: "ECB on the graph",
      lines: [
        "Each block is encrypted on its own with the same key (no chaining from previous ciphertext).",
        "“Show chain strip” (on the canvas): optional byte-level chain view.",
      ],
    },
  ],
  cbc: [
    {
      title: "Left panel — Modes & cipher",
      lines: [
        "Same as ECB: mode buttons, handle labels, Block cipher (Algorithm + AES round steps), Plaintext, and Key sections behave the same way.",
      ],
    },
    {
      title: "Left panel — IV (CBC only)",
      lines: [
        "IV bits: read-only mirror of the initialization vector used for the first block (comes from the IV node on the graph).",
        "Random IV 128: generates a new 128-bit IV and updates the graph.",
      ],
    },
    {
      title: "CBC on the graph",
      lines: [
        "Before the block cipher, plaintext is XORed with the IV (first block) or the previous block’s ciphertext.",
        "Use “Show chain strip” to inspect the byte chain.",
      ],
    },
  ],
  ctr: [
    {
      title: "Left panel — Modes & cipher",
      lines: [
        "Same as ECB: mode buttons, handle labels, Block cipher, Plaintext, and Key sections work like in ECB.",
      ],
    },
    {
      title: "Left panel — Nonce + counter (CTR only)",
      lines: [
        "Nonce (bits): 64-bit nonce; read-only display synced to the CTR node. “Random nonce (64 bit)” replaces it.",
        "Counter (bits): 64-bit block counter; “Reset counter to zero” sets it to all zeros.",
        "Each block uses nonce ‖ counter (counter increments per block on the graph).",
      ],
    },
    {
      title: "CTR on the graph",
      lines: [
        "The block cipher encrypts the counter block; the result is XORed with plaintext to form ciphertext (shown via the XOR node on the graph).",
        "Per-block counter values on nodes may show a shortened preview; hover for full detail where provided.",
      ],
    },
  ],
};

/**
 * Floating `?` control and slide-in panel describing the left sidebar and graph for the active mode.
 *
 * @param {object} props
 * @param {"ecb"|"cbc"|"ctr"} props.mode
 * @param {boolean} props.open
 * @param {() => void} props.onToggle — flip open state (from `?` button)
 * @param {() => void} props.onClose — close only (backdrop, ×)
 */
export default function ModeHelpDrawer({ mode, open, onToggle, onClose }) {
  const sections = SECTIONS[mode] || SECTIONS.ecb;

  return (
    <>
      <button
        type="button"
        className="mode-help-fab"
        aria-expanded={open}
        aria-controls="mode-help-panel"
        title={open ? "Close help" : "Help"}
        onClick={() => onToggle()}
      >
        ?
      </button>
      <div
        className={`mode-help-drawer${open ? " mode-help-drawer--open" : ""}`}
        id="mode-help-panel"
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
      >
        <div className="mode-help-drawer__head">
          <span className="mode-help-drawer__title">Help</span>
          <button type="button" className="mode-help-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="mode-help-drawer__body">
          {sections.map((sec) => (
            <section key={sec.title} className="mode-help-drawer__sec">
              <h3 className="mode-help-drawer__sec-title">{sec.title}</h3>
              <ul className="mode-help-drawer__list">
                {sec.lines.map((line, idx) => (
                  <li key={`${sec.title}-${idx}`}>{line}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      {open ? (
        <button type="button" className="mode-help-backdrop" aria-label="Close help" onClick={onClose} />
      ) : null}
    </>
  );
}
