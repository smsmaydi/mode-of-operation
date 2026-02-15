import React, { useMemo } from "react";
import { Handle, Position, useStore } from "reactflow";

const selectNodes = (s) => s.getNodes();
const selectEdges = (s) => s.edges;

function KeyNode({ id, data }) {
  const nodes = useStore(selectNodes);
  const edges = useStore(selectEdges);
  const showLabels = !!data?.showHandleLabels;

  const generateRandomBits = (length) => {
    const bytes = new Uint8Array(Math.ceil(length / 8));
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let result = "";
    for (let i = 0; i < length; i++) {
      const byte = bytes[Math.floor(i / 8)];
      const bit = (byte >> (7 - (i % 8))) & 1;
      result += bit ? "1" : "0";
    }
    return result;
  };

  const generateRandomHex = (bits) => {
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const { cipherType } = useMemo(() => {
    const outgoing = edges.filter((e) => e.source === id);

    const toBlock = outgoing
      .map((e) => {
        const t = nodes.find((n) => n.id === e.target);
        return { edge: e, target: t };
      })
      .filter((x) => x.target && x.target.type === "blockcipher");


    if (toBlock.length === 0) return { cipherType: "xor", targetBlockId: null };

    const chosen = toBlock[0].target;
    return { cipherType: chosen.data?.cipherType || "xor" };
  }, [edges, nodes, id]);

  const showXor = cipherType === "xor";
  const showAes = cipherType === "aes";

  const formatHexPairs = (str) => {
    if (typeof str !== "string") return "";
    const cleaned = str.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");
    return cleaned.replace(/(.{2})/g, "$1 ").trim();
  };
  /** AES key: 32 hex chars as two lines, 8 chars + space + 8 chars per line */
  const formatAesKeyTwoLines = (str) => {
    if (typeof str !== "string") return "";
    const c = str.replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "").slice(0, 32);
    const g1 = c.slice(0, 8);
    const g2 = c.slice(8, 16);
    const g3 = c.slice(16, 24);
    const g4 = c.slice(24, 32);
    const line1 = (g1 + " " + g2).trim();
    const line2 = (g3 + " " + g4).trim();
    return line2 ? line1 + "\n" + line2 : line1 || "";
  };
  const unformatHexPairs = (str) =>
    (str || "").replace(/\s/g, "").replace(/[^0-9a-fA-F]/g, "");

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid #333",
        borderRadius: 6,
        background: "LightBlue",
        minWidth: 200,
      }}
    >
      <strong>Key</strong>

      <Handle type="source" position={Position.Right} id="out" style={{ background: "#000" }} />
      {showLabels && (
        <div style={{ position: "absolute", top: "46%", right: -24, fontSize: 10, color: "#111" }}>
          out
        </div>
      )}

      {showXor && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, fontWeight: "bold" }}>XOR bits:</label>
          <input
            value={data.bits || ""}
            onChange={(e) => {
              const filtered = e.target.value.replace(/[^01]/g, '');
              data.onChange?.(id, { bits: filtered });
            }}
            className="nodrag"
            placeholder="Only 0 and 1"
            style={{
              width: "100%",
              padding: "3px 6px",
              fontSize: 10,
              borderRadius: 4,
              border: "1px solid #999",
              marginTop: 4,
              background: "white",
              fontFamily: "monospace"
            }}
          />
          <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
            <button 
              onClick={() => data.onChange?.(id, { bits: generateRandomBits(128) })}
              className="nodrag"
              style={{ 
                flex: 1, 
                padding: '4px', 
                fontSize: 10, 
                cursor: 'pointer',
                borderRadius: 4,
                border: '1px solid #999',
                background: '#fff'
              }}
            >
              🎲 128 bit
            </button>
          </div>
        </div>
      )}

      {showAes && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>AES key (hex):</div>
          <textarea
            value={formatAesKeyTwoLines(data.keyText || "")}
            onChange={(e) => data.onChange?.(id, { keyText: unformatHexPairs(e.target.value) })}
            placeholder={"12345678 12345678\n12345678 12345678"}
            rows={2}
            style={{
              width: "100%",
              padding: "4px 6px",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              borderRadius: 4,
              border: "1px solid #999",
              background: "white",
              resize: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => data.onChange?.(id, { keyText: generateRandomHex(128) })}
              className="nodrag"
              style={{
                padding: "4px 10px",
                fontSize: 10,
                cursor: "pointer",
                borderRadius: 4,
                border: "1px solid #999",
                background: "#fff",
              }}
            >
              🎲 128 bit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(KeyNode);
 