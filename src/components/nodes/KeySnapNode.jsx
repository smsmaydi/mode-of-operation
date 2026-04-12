import React, { useMemo } from "react";
import { Handle, Position, useStore } from "reactflow";

const selectNodes = (s) => s.getNodes();
const selectEdges = (s) => s.edges;

/** Read-only key copy next to each BlockCipher; value comes from the master Key node (e.g. k1). */
function KeySnapNode({ id, data }) {
  const nodes = useStore(selectNodes);
  const edges = useStore(selectEdges);
  const showLabels = !!data?.showHandleLabels;
  const sourceKeyId = data?.sourceKeyId || "k1";

  const sourceKey = useMemo(
    () => nodes.find((n) => n.id === sourceKeyId),
    [nodes, sourceKeyId]
  );

  const cipherType = useMemo(() => {
    const out = edges.filter((e) => e.source === id);
    for (const e of out) {
      const t = nodes.find((n) => n.id === e.target);
      if (t?.type === "blockcipher") return (t.data?.cipherType || "xor").toLowerCase();
    }
    return "xor";
  }, [edges, nodes, id]);

  const showXor = cipherType === "xor";
  const showAes = cipherType === "aes";

  const bits = sourceKey?.data?.bits || "";
  const keyText = sourceKey?.data?.keyText || "";

  const formatAesKeyTwoLines = (str) => {
    if (typeof str !== "string") return "";
    const c = str.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "").slice(0, 32);
    const g1 = c.slice(0, 8);
    const g2 = c.slice(8, 16);
    const g3 = c.slice(16, 24);
    const g4 = c.slice(24, 32);
    const line1 = (g1 + " " + g2).trim();
    const line2 = (g3 + " " + g4).trim();
    return line2 ? `${line1}\n${line2}` : line1 || "—";
  };

  return (
    <div
      style={{
        padding: 8,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--node-key-bg)",
        color: "var(--node-key-text)",
        minWidth: 148,
        maxWidth: 176,
        position: "relative",
      }}
    >
      <Handle type="source" position={Position.Right} id="out" style={{ background: "var(--edge-key)", top: "50%" }} />

      {showLabels && (
        <div style={{ position: "absolute", top: "42%", right: -22, fontSize: 9, color: "var(--edge-key)" }}>out</div>
      )}

      <strong style={{ fontSize: 12 }}>Key</strong>

      {showXor && (
        <div
          className="nodrag"
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            wordBreak: "break-all",
            maxHeight: 56,
            overflow: "auto",
            padding: "4px 6px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            background: "var(--node-field-bg)",
            color: "var(--node-field-text)",
          }}
        >
          {bits || "—"}
        </div>
      )}

      {showAes && (
        <pre
          className="nodrag"
          style={{
            marginTop: 6,
            marginBottom: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            maxHeight: 48,
            overflow: "auto",
            padding: "4px 6px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            background: "var(--node-field-bg)",
            color: "var(--node-field-text)",
          }}
        >
          {(() => {
            const b = String(bits).replace(/[^01]/g, "");
            if (b.length) {
              const head = b.slice(0, 48);
              return b.length > 48 ? `${head}…` : head;
            }
            return formatAesKeyTwoLines(keyText) || "—";
          })()}
        </pre>
      )}
    </div>
  );
}

export default React.memo(KeySnapNode);
