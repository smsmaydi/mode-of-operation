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

  const generateRandomAscii = (length) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  };

  const { cipherType, targetBlockId } = useMemo(() => {
    const outgoing = edges.filter((e) => e.source === id);

    const toBlock = outgoing
      .map((e) => {
        const t = nodes.find((n) => n.id === e.target);
        return { edge: e, target: t };
      })
      .filter((x) => x.target && x.target.type === "blockcipher");


    if (toBlock.length === 0) return { cipherType: "xor", targetBlockId: null };

    const chosen = toBlock[0].target;
    return {
      cipherType: chosen.data?.cipherType || "xor",
      targetBlockId: chosen.id,
    };
  }, [edges, nodes, id]);

  const showXor = cipherType === "xor";
  const showAes = cipherType === "aes";
  const showDes = cipherType === "des";

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
              🎲 128
            </button>
            <button 
              onClick={() => data.onChange?.(id, { bits: generateRandomBits(256) })}
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
              🎲 256
            </button>
          </div>
        </div>
      )}

      {showAes && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, fontWeight: "bold" }}>AES key:</label>
          <input
            value={data.keyText || ""}
            onChange={(e) => data.onChange?.(id, { keyText: e.target.value })}
            placeholder="passphrase"
            style={{
              width: "100%",
              padding: "3px 6px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid #999",
              marginTop: 4,
              background: "white",
            }}
          />
          <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
            <button 
              onClick={() => data.onChange?.(id, { keyText: generateRandomHex(128) })}
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
              🎲 128
            </button>
            <button 
              onClick={() => data.onChange?.(id, { keyText: generateRandomHex(256) })}
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
              🎲 256
            </button>
          </div>
        </div>
      )}

      {showDes && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, fontWeight: "bold" }}>DES key (8 chars):</label>
          <input
            value={data.keyText || ""}
            onChange={(e) => data.onChange?.(id, { keyText: e.target.value })}
            placeholder="8 characters"
            style={{
              width: "100%",
              padding: "3px 6px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid #999",
              marginTop: 4,
              background: "white",
            }}
          />
          <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
            <button 
              onClick={() => data.onChange?.(id, { keyText: generateRandomAscii(8) })}
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
              🎲 8 chars
            </button>
          </div>
          {(data.keyText || "").length !== 8 && (
            <div style={{ fontSize: 11, color: "#900", marginTop: 4 }}>
              Key length must be exactly 8 characters
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(KeyNode);
 