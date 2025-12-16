import React, { useMemo } from "react";
import { Handle, Position, useStore } from "reactflow";

const selectNodes = (s) => s.getNodes();
console.log("safasafasafasafasafasafasafasafasafasafasafasafasafa")
const selectEdges = (s) => s.edges;

export default function KeyNode({ id, data }) {
  const nodes = useStore(selectNodes);
  const edges = useStore(selectEdges);

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

      {showXor && (
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, fontWeight: "bold" }}>XOR bits:</label>
          <input
            value={data.bits || ""}
            onChange={(e) => data.onChange?.(id, { bits: e.target.value })}
            style={{
              width: "100%",
              padding: "3px 6px",
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid #999",
              marginTop: 4,
              marginRight: 4,
              background: "white",
            }}
          />
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
