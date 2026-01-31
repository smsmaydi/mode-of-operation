import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  useEdgesState,
  useNodesState,
  Controls,
  Background,
  MiniMap,
} from "reactflow";


import { encryptFileAES } from "./utils/aesFile";
import { encryptFileDES } from "./utils/desFile";

import "reactflow/dist/style.css";
import { xorImageFileWithKey, xorRgbaBytesWithKey } from "./utils/imageXor";
import { rgbaBytesToPngDataUrl } from "./utils/bytesToDataUrl";


import ModeMenu from "./components/layout/ModeMenu";
import NodePalette from "./components/palette/NodePalette";

import PlaintextNode from "./components/nodes/PlaintextNode";
import KeyNode from "./components/nodes/KeyNode";
import BlockCipherNode from "./components/nodes/BlockCipherNode";
import CiphertextNode from "./components/nodes/CiphertextNode";
import IVNode from "./components/nodes/IVNode";

import { computeGraphValues } from "./utils/computeGraph";
import { buildPreset } from "./utils/presets";
import { makeIsValidConnection } from "./utils/validators";
import { ecbFirstNTrace, ecbFirstNTraceFromBytes } from "./utils/ecbTrace";

const nodeTypes = {
  plaintext: PlaintextNode,
  key: KeyNode,
  blockcipher: BlockCipherNode,
  ciphertext: CiphertextNode,
  iv: IVNode,
};

export default function App() {
  const [mode, setMode] = useState("ecb");

  const initial = useMemo(() => buildPreset(mode), [mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [showFirst8, setShowFirst8] = useState(false);
  const [first8Trace, setFirst8Trace] = useState([]);

//  React.useEffect(() => {
//   const bc = nodes.filter(n => n.type === "blockcipher")
//                   .map(n => ({ id: n.id, cipherType: n.data?.cipherType, data: n.data }));
//   console.log("BLOCKCIPHER state:", bc);
// }, [nodes]);


  // Run XOR for image 
  const onRunXor = useCallback((blockId) => {
    setNodes((nds) => {
      const block = nds.find((n) => n.id === blockId);
      if (!block) return nds;

      const input = block.data.plaintextFile; // sende bu Uint8Array
      const keyBits = block.data.keyBits;

      if (!input || !keyBits) {
        alert("Missing image or key!");
        return nds;
      }

      // ciphertext node id'sini edge'den bul (blockcipher -> ciphertext)
      const outEdge = edges.find((e) => e.source === blockId); // gerekirse sourceHandle da ekleyeceğiz
      const ctId = outEdge?.target;

      const outBytes = xorRgbaBytesWithKey(input, keyBits);
      const outUrl = rgbaBytesToPngDataUrl(outBytes, 512, 512);

      console.log("ctId:", ctId, "outEdge:", outEdge);

      return nds.map((n) => {
        if (n.id === blockId) {
          return { ...n, data: { ...n.data, preview: outUrl, xorBytes: outBytes } };
        }
        if (ctId && n.id === ctId) {
          return { ...n, data: { ...n.data, preview: outUrl } };
        }
        return n;
      });
    });
  }, [edges, setNodes]);


  const onRunCipher = useCallback(
    async (blockId) => {
      console.log("onRunCipher fired", blockId);

      const block = nodes.find((n) => n.id === blockId);
      console.log("block found?", !!block, block?.data);
      if (!block) return;

      const cipherType = block.data?.cipherType || "xor";
      const isImageMode = !!block.data?.plaintextFile;

      console.log("cipherType =", cipherType);
      console.log("isImageMode =", isImageMode);

      if (cipherType === "xor") {
        onRunXor(blockId);
        return;
      }

      if (isImageMode) {
        const file = block.data.plaintextFile;
        const keyText = block.data.keyText || "";

        try {
          let url = "";
          if (cipherType === "aes") {
            if (!keyText) throw new Error("Missing AES key");
            url = await encryptFileAES(file, keyText);
          } else if (cipherType === "des") {
            url = await encryptFileDES(file, keyText);
            
          }

          setNodes((inner) =>
            computeGraphValues(
              inner.map((n) =>
                n.id === blockId ? { ...n, data: { ...n.data, preview: url } } : n
              ),
              edges
            )
          );
        } catch (e) {
          alert(String(e?.message || e));
        }

        return;
      }

          alert("AES/DES text mode not wired yet");
      },[nodes, onRunXor, setNodes, edges]
    );


  React.useEffect(() => {
  if (!showFirst8) return;

  (async () => {
    try {
      const pt = nodes.find((x) => x.type === "plaintext");
      const keyN = nodes.find((x) => x.type === "key");
      console.log("PLAINTEXT DATA:", pt.data);
      console.log(pt.data.value);
      if (!pt || !keyN) { setFirst8Trace([]); return; }

      // If image/file mode: read real bytes from the file
      if (pt.data?.inputType === "image" && pt.data?.value instanceof File) {
        const buf = await pt.data.value.arrayBuffer();
        console.log(buf);

        const bytes = new Uint8Array(buf);
        console.log(bytes);

        // Key: senin KEY DATA'nda bits var -> text değil
        const keyBits = keyN.data?.bits || "";
        const clean = keyBits.replace(/\s+/g, "");
        if (!/^[01]+$/.test(clean) || clean.length % 8 !== 0) { setFirst8Trace([]); return; }

        const keyBytes = new Uint8Array(clean.length / 8);
        for (let i = 0; i < keyBytes.length; i++) {
          keyBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
        }

        const rows = ecbFirstNTraceFromBytes(bytes, keyBytes, 8, 16);
        setFirst8Trace(rows);
        return;
      }


      // Otherwise use the normal text/bits trace
      const rows = ecbFirstNTrace(nodes, edges, 8);
      setFirst8Trace(rows);
    } catch (e) {
      console.error(e);
      setFirst8Trace([]);
    }
  })();
}, [showFirst8, nodes, edges]);





  // Node delete
  const onNodesDelete = useCallback(
    (deleted) => {
      setNodes((nds) =>
        nds.filter((n) => !deleted.find((d) => d.id === n.id))
      );
      setEdges((eds) =>
        eds.filter(
          (e) => !deleted.find((d) => d.id === e.source || d.id === e.target)
        )
      );
    },
    [setNodes, setEdges]
  );

  // Edge delete
  const onEdgesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((e) => !deleted.find((d) => d.id === e.id)));
    },
    [setEdges]
  );

  // When mode changes, apply preset
  const applyMode = useCallback(
  (m) => {
    setMode(m);
    const preset = buildPreset(m);

    // inject onChange + onRunXor into plaintext/key/blockcipher nodes
    const withHandlers = preset.nodes.map((n) => {
      if (n.type === "plaintext" || n.type === "key") {
        return {
          ...n,
          data: {
            ...n.data,
            onChange: (id, patch) => {
              setNodes((nds) => {
                const next = nds.map((nn) =>
                  nn.id === id
                    ? { ...nn, data: { ...nn.data, ...patch } }
                    : nn
                );
                
                return computeGraphValues(next, preset.edges);
              });
            },
          },
        };
      }

      if (n.type === "blockcipher") {
        return {
          ...n,
          data: {
            ...n.data,
            cipherType: n.data?.cipherType || "xor",
            onChange: (id, patch) => {
              setNodes((nds) => {
                const next = nds.map((nn) =>
                  nn.id === id ? { ...nn, data: { ...nn.data, ...patch } } : nn
                );
                return computeGraphValues(next, preset.edges);
              });
            },
            onRunCipher,
          },
        };
      }
      return n;
    });

    setNodes(computeGraphValues(withHandlers, preset.edges));
    setEdges(preset.edges);
  },
  [setNodes, setEdges, onRunXor]
);


  React.useEffect(() => {
    applyMode(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidConnection = useCallback(
    (params) => {
      const fn = makeIsValidConnection(mode);
      return fn(params, nodes);
    },
    [mode, nodes]
  );

  const onConnect = useCallback(
    (params) => {
      if (!isValidConnection(params)) return;
      setEdges((eds) => {
        const next = addEdge(params, eds);
        // setNodes((nds) => computeGraphValues([...nds], next));
        setNodes((nds) => computeGraphValues(nds, next));
        return next;
      });
    },
    [isValidConnection]
  );

  const onDrop = useCallback(
    (event) => {
      if (mode !== "free") return;
      event.preventDefault();
      const payload = event.dataTransfer.getData("application/reactflow");
      if (!payload) return;
      const { type } = JSON.parse(payload);

      const bounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      const id = `${type}-${Date.now()}`;
      const dataBase = {
        id,
        onChange: (nid, patch) => {
          setNodes((nds) => {
            const next = nds.map((n) =>
              n.id === nid ? { ...n, data: { ...n.data, ...patch } } : n
            );
            return computeGraphValues(next, edges);
          });
        },
        onRunXor,
      };

      const newNode = {
        id,
        type,
        position,
        data:
          type === "plaintext" || type === "key"
            ? { ...dataBase, value: "", bits: "" }
            : { ...dataBase },
      };

      setNodes((nds) => computeGraphValues([...nds, newNode], edges));


    },
    [mode, edges, setNodes, onRunXor]
  );

  const onDragOver = useCallback(
    (event) => {
      if (mode !== "free") return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [mode]
  );

  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      setNodes((nds) => computeGraphValues(nds, edges));

    },
    [onNodesChange, edges]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setNodes((nds) => computeGraphValues(nds, edges));
    },
    [onEdgesChange, edges]
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 220px",
        height: "100vh",
      }}
    >
      <ModeMenu current={mode} onSelect={applyMode} />
      
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{ position: "relative" }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
          <button
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "white",
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #ddd",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              cursor: "pointer",
              zIndex: 10,
              pointerEvents: "all"
            }}
            onClick={() => setShowFirst8((v) => !v)}
          >
            {showFirst8 ? "Hide first 8 blocks" : "Show first 8 blocks"}
          </button>
          {showFirst8 && (
  <div
    style={{
      position: "absolute",
      top: 50,
      left: 10,
      width: 360,
      maxHeight: 260,
      overflow: "auto",
      background: "white",
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: 10,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      fontSize: 12,
      lineHeight: 1.4,
      zIndex: 10,
      pointerEvents: "all" 
    }}
  >
    <div style={{ fontWeight: 700, marginBottom: 8 }}>
      First 8 blocks (preview)
    </div>

    {/* For now demo content: later i will display the real trace here */}
    {first8Trace.length === 0 ? (
      <div style={{ color: "#666" }}>
        No trace yet. (Connect plaintext → blockcipher → ciphertext and set key)
      </div>
    ) : (
      first8Trace.map((row) => (
        <div key={row.i} style={{
          display: "grid",
          gridTemplateColumns: "60px 1fr",
          gap: 8,
          padding: "6px 0",
          borderBottom: row.i === first8Trace.length - 1 ? "none" : "1px solid #eee",
        }}>
          <div style={{ fontWeight: 600 }}>Block {row.i + 1}</div>
          <div style={{ fontFamily: "monospace" }}>
            <div><b>m:</b> {row.mHex}</div>
            <div><b>c:</b> {row.cHex}</div>
          </div>
        </div>
      ))
    )}

  </div>
)}

        </ReactFlow>
      </div>

      {mode === "free" ? (
        <NodePalette />
      ) : (
        <aside
          style={{
            width: 220,
            borderLeft: "1px solid #ddd",
            background: "#fafafa",
            padding: 10,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Description</div>
          {mode === "ecb" && (
            <p>ECB: Each block is encrypted independently (demo XOR).</p>
          )}
        </aside>
      )}
    </div>
  );
}