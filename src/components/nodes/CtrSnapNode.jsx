import React, { useMemo } from "react";
import { Handle, Position, useStore } from "reactflow";
import { incrementCtrCounterBits64 } from "../../utils/computeGraph";

const selectNodes = (s) => s.getNodes();

/** Sağ uçtaki bitler (blok +1 → …00000001 gibi); sol `…` ile kısaltılır. */
const CTR_COUNTER_TAIL_BITS = 8;

function formatCounterAbbrev(bits) {
  if (!bits || !/^[01]+$/.test(bits)) return "—";
  if (bits.length <= CTR_COUNTER_TAIL_BITS) return bits;
  return `…${bits.slice(-CTR_COUNTER_TAIL_BITS)}`;
}

/**
 * Read-only CTR copy inside each block cluster; nonce/counter base from master node (panel).
 * Counter shown is base + blockIndex (same as BlockCipher).
 */
function CtrSnapNode({ data }) {
  const nodes = useStore(selectNodes);
  const showLabels = !!data?.showHandleLabels;
  const sourceCtrId = data?.sourceCtrId || "ctr1";
  const blockIndex =
    typeof data?.blockIndex === "number" ? data.blockIndex : 0;

  const master = useMemo(
    () => nodes.find((n) => n.id === sourceCtrId),
    [nodes, sourceCtrId]
  );

  const nonceBits = master?.data?.nonceBits || "";
  const counterBits = master?.data?.counterBits || "";

  const displayCounter = useMemo(
    () => incrementCtrCounterBits64(counterBits, blockIndex),
    [counterBits, blockIndex]
  );

  const counterShort = useMemo(
    () => formatCounterAbbrev(displayCounter),
    [displayCounter]
  );

  const previewNonce = (bits, max = 20) => {
    if (!bits) return "—";
    return bits.length > max ? `${bits.slice(0, max)}…` : bits;
  };

  return (
    <div
      style={{
        padding: "6px 8px",
        border: "1px solid var(--edge-ctr-input)",
        borderRadius: "var(--radius-sm)",
        background: "color-mix(in srgb, var(--accent-soft) 85%, transparent)",
        color: "var(--text)",
        minWidth: 118,
        maxWidth: 176,
        position: "relative",
        fontSize: 9,
      }}
    >
      <Handle type="source" position={Position.Bottom} id="out" style={{ background: "var(--edge-ctr-input)", left: "50%" }} />

      {showLabels && (
        <div style={{ position: "absolute", bottom: -12, left: "42%", fontSize: 8, color: "var(--edge-ctr-input)" }}>out</div>
      )}

      <strong style={{ fontSize: 10, letterSpacing: "0.02em" }}>Nonce + Counter</strong>
      <div className="nodrag" style={{ marginTop: 6, fontFamily: "var(--font-mono)", wordBreak: "break-all", lineHeight: 1.25 }}>
        <span style={{ color: "var(--text-muted)" }}>N:</span> {previewNonce(nonceBits)}
      </div>
      <div
        className="nodrag"
        style={{
          marginTop: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          lineHeight: 1.35,
          letterSpacing: "0.03em",
          padding: "4px 6px",
          borderRadius: 4,
          border: "1px solid var(--border)",
          background: "var(--node-field-bg)",
          color: "var(--node-field-text)",
        }}
        title={displayCounter}
      >
        <span style={{ color: "var(--text-muted)" }}>C:</span> {counterShort}
      </div>
    </div>
  );
}

export default React.memo(CtrSnapNode);
