import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  useEdgesState,
  useNodesState,
  Controls,
  Background,
  MiniMap,
} from "reactflow";

import { fileToPixelBytes } from "./components/crypto/imageToBytes";


import "reactflow/dist/style.css";
import "reactflow/dist/base.css";
import { runCipherHandler, runXorHandler } from "./utils/cipherHandlers";


import ModeMenu from "./components/layout/ModeMenu";
import NodePalette from "./components/palette/NodePalette";

import PlaintextNode from "./components/nodes/PlaintextNode";
import KeyNode from "./components/nodes/KeyNode";
import BlockCipherNode from "./components/nodes/BlockCipherNode";
import CiphertextNode from "./components/nodes/CiphertextNode";
import IVNode from "./components/nodes/IVNode";
import XorPreBlockNode from "./components/nodes/XorPreBlockNode";
import CtrNode from "./components/nodes/CtrNode";
import DecryptNode from "./components/nodes/DecryptNode";

import { computeGraphValues } from "./utils/computeGraph";
import { buildPreset } from "./utils/presets";
import { makeIsValidConnection } from "./utils/validators";
import { ecbFirstNTrace, ecbFirstNTraceFromBytes } from "./utils/ecbTrace";
import SubBytesView from "./components/aes/SubBytesView";

const nodeTypes = {
  plaintext: PlaintextNode,
  key: KeyNode,
  blockcipher: BlockCipherNode,
  ciphertext: CiphertextNode,
  iv: IVNode,
  xor: XorPreBlockNode,
  ctr: CtrNode,
  decrypt: DecryptNode,
};

/** Find plaintext node that feeds this ciphertext (via block or block<-xor). */
function getPlaintextNodeForCiphertext(nodes, edges, ciphertextId) {
  const edgeToCipher = edges.find((e) => e.target === ciphertextId);
  if (!edgeToCipher) return null;
  const blockId = edgeToCipher.source;
  const edgeToBlock = edges.find(
    (e) => e.target === blockId && (e.targetHandle === "plaintext" || e.targetHandle === "xor")
  );
  if (!edgeToBlock) return null;
  if (edgeToBlock.targetHandle === "plaintext") {
    return nodes.find((n) => n.id === edgeToBlock.source);
  }
  const xorId = edgeToBlock.source;
  const edgeToXor = edges.find(
    (e) => e.target === xorId && (e.targetHandle === "pt" || e.targetHandle === "ptLeft" || e.targetHandle === "plaintext")
  );
  if (!edgeToXor) return null;
  return nodes.find((n) => n.id === edgeToXor.source);
}


export default function App() {
  const [mode, setMode] = useState("ecb");
  const [showHandleLabels, setShowHandleLabels] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const initial = useMemo(() => buildPreset(mode), [mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [showFirst8, setShowFirst8] = useState(false);
  const [first8Trace, setFirst8Trace] = useState([]);
  const [showAesSubBytesView, setShowAesSubBytesView] = useState(false);
  const [aesViewPayload, setAesViewPayload] = useState(null);
  const [aesStepsLastRound, setAesStepsLastRound] = useState(0);
  const lastIvBitsRef = useRef(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  React.useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const openAesSubBytesView = useCallback((ciphertextId) => {
    const latestNodes = nodesRef.current ?? nodes;
    const latestEdges = edgesRef.current ?? edges;
    setAesViewPayload({
      nodes: latestNodes,
      edges: latestEdges,
      ciphertextId,
      initialRound: aesStepsLastRound,
    });
    setShowAesSubBytesView(true);
  }, [nodes, edges, aesStepsLastRound]);

  /**
   * Encrypts an image using XOR operation with ECB or CBC mode.
   * ECB: plaintext ⊕ key
   * CBC: plaintext ⊕ previous_ciphertext (or IV for first block) ⊕ key
   */
  const onRunXor = useCallback(
    async (blockId, currentNodes, currentEdges, currentMode) => {
      await runXorHandler({
        blockId,
        currentNodes,
        currentEdges,
        currentMode,
        setNodes,
      });
    },
    [setNodes]
  );

  /**
   * Main cipher execution handler.
   * Routes to the appropriate cipher (XOR or AES) based on the block's settings.
   * Supports both image and text encryption modes.
   */
  const onRunCipher = useCallback(
    (blockId) => {
      runCipherHandler({
        blockId,
        edges,
        mode,
        setNodes,
        onRunXor,
      });
    },
    [edges, mode, onRunXor, setNodes]
  );

  React.useEffect(() => {
    if (mode !== "cbc") return;
    const ivNode = nodes.find((n) => n.type === "iv");
    const ivBits = ivNode?.data?.bits || "";
    if (!ivBits || ivBits === lastIvBitsRef.current) return;

    lastIvBitsRef.current = ivBits;

    nodes
      .filter((n) => n.type === "blockcipher")
      .forEach((block) => {
        if (block.data?.cipherType !== "aes") return;

        const keyBits = block.data?.keyBits || "";
        const isHexKey = /^[0-9a-f]+$/i.test(keyBits) && (keyBits.length === 32 || keyBits.length === 64);
        const isBinaryKey = /^[01]+$/.test(keyBits) && keyBits.length >= 8;
        const hasImageInput =
          block.data?.plaintextFile ||
          block.data?.encryptedImageFile ||
          block.data?.inputType === "image" ||
          block.data?.inputType === "encryptedImage";

        if (!hasImageInput || (!isHexKey && !isBinaryKey)) return;
        onRunCipher(block.id);
      });
  }, [mode, nodes, onRunCipher]);

  const defaultViewport = useMemo(() => {
    if (mode === "ecb") {
      return { x: 0, y: 0, zoom: 0.6 };
    }
    return { x: 0, y: 0, zoom: 2 };
  }, [mode]);

//  React.useEffect(() => {
//   const bc = nodes.filter(n => n.type === "blockcipher")
//                   .map(n => ({ id: n.id, cipherType: n.data?.cipherType, data: n.data }));
//   console.log("BLOCKCIPHER state:", bc);
// }, [nodes]);




  /**
   * Generates trace data for the first 8 encryption blocks.
   * Handles both image files (reads actual bytes) and text input.
   * Updates whenever showFirst8 toggle or node/edge data changes.
   */
  React.useEffect(() => {
  if (!showFirst8) return;

  (async () => {
    try {
      const pt = nodes.find((x) => x.type === "plaintext");
      const keyN = nodes.find((x) => x.type === "key");
      console.log("PLAINTEXT DATA:", pt.data);
      console.log(pt.data.value);
      if (!pt || !keyN) { setFirst8Trace([]); return; }

      // If image/file mode: read pixel bytes from the file
      if (pt.data?.inputType === "image" && pt.data?.value instanceof File) {
        // Convert File to pixel bytes (256x256 RGBA)
        const bytes = await fileToPixelBytes(pt.data.value, { width: 256, height: 256 });
        console.log("Pixel bytes:", bytes);

        // Key: senin KEY DATA'nda bits var -> text değil
        const keyBits = keyN.data?.bits || "";
        const clean = keyBits.replace(/\s+/g, "");
        if (!/^[01]+$/.test(clean) || clean.length % 8 !== 0) { setFirst8Trace([]); return; }

        const keyBytes = new Uint8Array(clean.length / 8);
        for (let i = 0; i < keyBytes.length; i++) {
          keyBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
        }

        // For CBC: get IV bytes if available
        let ivBytes = null;
        if (mode === 'cbc') {
          const ivNode = nodes.find((x) => x.type === "iv");
          if (ivNode && ivNode.data?.bits) {
            const ivBits = ivNode.data.bits.replace(/\s+/g, "");
            if (/^[01]+$/.test(ivBits) && ivBits.length % 8 === 0) {
              ivBytes = new Uint8Array(ivBits.length / 8);
              for (let i = 0; i < ivBytes.length; i++) {
                ivBytes[i] = parseInt(ivBits.slice(i * 8, i * 8 + 8), 2);
              }
            }
          }
        }

        const rows = ecbFirstNTraceFromBytes(bytes, keyBytes, 8, 16, mode, ivBytes);
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
}, [showFirst8, nodes, edges, mode]);





  /**
   * Handles node deletion.
   * Removes the selected nodes and any edges connected to them.
   */
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

  /**
   * Handles edge (connection) deletion.
   * Removes the selected connections between nodes.
   */
  const onEdgesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((e) => !deleted.find((d) => d.id === e.id)));
    },
    [setEdges]
  );

  /**
   * Switches between different encryption modes (ECB, CBC, etc.).
   * Loads the preset nodes and edges for the selected mode and injects
   * necessary event handlers (onChange, onRunCipher) into each node.
   */
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
            showHandleLabels,
            onChange: (id, patch) => {
              setNodes((nds) => {
                const next = nds.map((nn) =>
                  nn.id === id
                    ? { ...nn, data: { ...nn.data, ...patch } }
                    : nn
                );
                const result = computeGraphValues(next, preset.edges, m);
                nodesRef.current = result;
                edgesRef.current = preset.edges;
                return result;
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
            showHandleLabels,
            cipherType: n.data?.cipherType || "xor",
            onChange: (id, patch) => {
              setNodes((nds) => {
                const next = nds.map((nn) =>
                  nn.id === id ? { ...nn, data: { ...nn.data, ...patch } } : nn
                );
                const result = computeGraphValues(next, preset.edges, m);
                nodesRef.current = result;
                edgesRef.current = preset.edges;
                return result;
              });
            },
            onRunCipher,
          },
        };
      }

      if (n.type === "iv") {
        return {
          ...n,
          data: {
            ...n.data,
            showHandleLabels,
            onChange: (id, patch) => {
              setNodes((nds) => {
                const next = nds.map((nn) =>
                  nn.id === id ? { ...nn, data: { ...nn.data, ...patch } } : nn
                );
                const result = computeGraphValues(next, preset.edges, m);
                nodesRef.current = result;
                edgesRef.current = preset.edges;
                return result;
              });
            },
          },
        };
      }

      if (n.type === "ctr") {
        return {
          ...n,
          data: {
            nonceBits: n.data?.nonceBits ?? "",
            counterBits: n.data?.counterBits ?? "0".repeat(64),
            ...n.data,
            showHandleLabels,
            onChange: (id, patch) => {
              setNodes((nds) => {
                const next = nds.map((nn) =>
                  nn.id === id ? { ...nn, data: { ...nn.data, ...patch } } : nn
                );
                const result = computeGraphValues(next, preset.edges, m);
                nodesRef.current = result;
                edgesRef.current = preset.edges;
                return result;
              });
            },
          },
        };
      }

      if (n.type === "ciphertext") {
        const edgeIn = preset.edges.find((e) => e.target === n.id);
        const blockId = edgeIn?.source;
        const block = preset.nodes.find((nd) => nd.id === blockId);
        const ptNode = getPlaintextNodeForCiphertext(preset.nodes, preset.edges, n.id);
        const isDecryptMode = !!ptNode?.data?.isDecryptMode;
        const showAesSteps = block?.data?.cipherType === "aes" && !isDecryptMode;
        return {
          ...n,
          draggable: false,
          data: {
            ...n.data,
            showHandleLabels,
            showAesSteps: !!showAesSteps,
            ...(showAesSteps ? { onOpenAesSubBytes: openAesSubBytesView } : {}),
          },
        };
      }

      return {
        ...n,
        data: { ...n.data, showHandleLabels },
      };
    });

    setNodes(computeGraphValues(withHandlers, preset.edges, m));
    setEdges(preset.edges);
  },
  [setNodes, setEdges, onRunCipher, showHandleLabels, openAesSubBytesView]
);


  /**
   * Initializes the app on mount.
   * Applies the default mode preset when the component first loads.
   */
  React.useEffect(() => {
    applyMode(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, showHandleLabels },
      }))
    );
  }, [showHandleLabels, setNodes]);

  /**
   * Validates whether a new connection between nodes is allowed.
   * Checks connection rules based on the current mode and node types.
   */
  const isValidConnection = useCallback(
    (params) => {
      const fn = makeIsValidConnection(mode);
      return fn(params, nodes);
    },
    [mode, nodes]
  );

  /**
   * Handles new edge connections between nodes.
   * Validates the connection, adds it to the graph, and recalculates node values.
   */
  const onConnect = useCallback(
    (params) => {
      if (!isValidConnection(params)) return;
      setEdges((eds) => {
        const next = addEdge(params, eds);
        // setNodes((nds) => computeGraphValues([...nds], next));
        setNodes((nds) => computeGraphValues(nds, next, mode));
        return next;
      });
    },
    [isValidConnection]
  );

  /**
   * Handles drag-and-drop of new nodes onto the canvas.
   * Creates a new node at the drop position with proper handlers and initial data.
   * Only works in 'free' mode.
   */
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
        showHandleLabels,
        onChange: (nid, patch) => {
          setNodes((nds) => {
            const next = nds.map((n) =>
              n.id === nid ? { ...n, data: { ...n.data, ...patch } } : n
            );
            return computeGraphValues(next, edges, mode);
          });
        },
        onRunXor,
      };

      const newNode = {
        id,
        type,
        position,
        ...(type === "ciphertext" ? { draggable: false } : {}),
        data:
          type === "plaintext" || type === "key"
            ? { ...dataBase, value: "", bits: "" }
            : type === "ctr"
            ? { ...dataBase, nonceBits: "", counterBits: "0".repeat(64) }
            : { ...dataBase },
      };

      setNodes((nds) => computeGraphValues([...nds, newNode], edges, mode));


    },
    [mode, edges, setNodes, onRunXor]
  );

  /**
   * Handles drag-over events for the canvas.
   * Prevents default behavior and sets the drag effect to 'move'.
   */
  const onDragOver = useCallback(
    (event) => {
      if (mode !== "free") return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [mode]
  );

  /**
   * Handles any changes to nodes (position, selection, etc.).
   * Applies the changes and recalculates dependent node values.
   */
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      setNodes((nds) => {
        const updated = computeGraphValues(nds, edges, mode);
        const result = updated.map((n) => {
          if (n.type !== "ciphertext") {
            return { ...n, data: { ...n.data, mode, showHandleLabels } };
          }
          const edgeIn = edges.find((e) => e.target === n.id);
          const blockId = edgeIn?.source;
          const block = updated.find((nd) => nd.id === blockId);
          const ptNode = getPlaintextNodeForCiphertext(updated, edges, n.id);
          const isDecryptMode = !!ptNode?.data?.isDecryptMode;
          const showAesSteps = block?.data?.cipherType === "aes" && !isDecryptMode;
          return {
            ...n,
            ...(n.type === "ciphertext" ? { draggable: false } : {}),
            data: {
              ...n.data,
              mode,
              showHandleLabels,
              showAesSteps: !!showAesSteps,
              ...(showAesSteps ? { onOpenAesSubBytes: openAesSubBytesView } : {}),
            },
          };
        });
        nodesRef.current = result;
        edgesRef.current = edges;
        return result;
      });
    },
    [onNodesChange, edges, mode]
  );

  /**
   * Handles any changes to edges (connections).
   * Applies the changes and recalculates dependent node values.
   */
  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setNodes((nds) => {
        const updated = computeGraphValues(nds, edges, mode);
        const result = updated.map((n) => {
          if (n.type !== "ciphertext") {
            return { ...n, data: { ...n.data, mode, showHandleLabels } };
          }
          const edgeIn = edges.find((e) => e.target === n.id);
          const blockId = edgeIn?.source;
          const block = updated.find((nd) => nd.id === blockId);
          const ptNode = getPlaintextNodeForCiphertext(updated, edges, n.id);
          const isDecryptMode = !!ptNode?.data?.isDecryptMode;
          const showAesSteps = block?.data?.cipherType === "aes" && !isDecryptMode;
          return {
            ...n,
            ...(n.type === "ciphertext" ? { draggable: false } : {}),
            data: {
              ...n.data,
              mode,
              showHandleLabels,
              showAesSteps: !!showAesSteps,
              ...(showAesSteps ? { onOpenAesSubBytes: openAesSubBytesView } : {}),
            },
          };
        });
        nodesRef.current = result;
        edgesRef.current = edges;
        return result;
      });
    },
    [onEdgesChange, edges, mode]
  );

  if (showAesSubBytesView) {
    return (
      <SubBytesView
        payload={aesViewPayload}
        onClose={(lastRound) => {
          setShowAesSubBytesView(false);
          setAesViewPayload(null);
          if (typeof lastRound === "number") setAesStepsLastRound(lastRound);
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 220px",
        height: "100vh",
      }}
    >
      <ModeMenu
        current={mode}
        onSelect={applyMode}
        showHandleLabels={showHandleLabels}
        onToggleHandleLabels={setShowHandleLabels}
        isDarkTheme={isDarkTheme}
        onToggleDarkTheme={setIsDarkTheme}
      />
      
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
          fitViewOptions={{ padding: mode === "ecb" ? 0.4 : 0.1 }}
          defaultViewport={defaultViewport}
          className={isDarkTheme ? 'dark' : ''}
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
            borderLeft: `1px solid ${isDarkTheme ? '#333' : '#ddd'}`,
            background: isDarkTheme ? '#1e1e1e' : '#fafafa',
            color: isDarkTheme ? '#fff' : '#000',
            padding: 10,
            transition: 'background-color 0.3s ease'
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