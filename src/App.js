import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  useEdgesState,
  useNodesState,
  Controls,
  Background,
  MiniMap,
} from "reactflow";

import "reactflow/dist/style.css";
import { xorImageFileWithKey } from "./utils/imageXor";

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

  // Run XOR for image 
  const onRunXor = useCallback(
    (blockId) => {
      setNodes((nds) => {
        const block = nds.find((n) => n.id === blockId);
        if (!block) return nds;

        const isImageMode = !!block.data.plaintextFile;

        // --- IMAGE MODE ---
        if (isImageMode) {
          const file = block.data.plaintextFile;
          const keyBits = block.data.keyBits;

          if (!file || !keyBits) {
            alert("Missing image or key!");
            return nds;
          }

          
          // Run Xor everytime with current key
          xorImageFileWithKey(file, keyBits)
            .then((url) => {
              setNodes((inner) =>
                computeGraphValues(
                  inner.map((n) =>
                    n.id === blockId
                      ? { ...n, data: { ...n.data, preview: url } }
                      : n
                  ),
                  edges
                )
              );
            })
            .catch((err) => {
              alert("Image XOR failed: " + err);
            });
        }

        // --- TEXT / BITS MODE ---
        else {
          setNodes((inner) => computeGraphValues(inner, edges));
        }

        return nds;
      });
    },
    [setNodes, edges]
  );





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
                // 🔹 sadece graf güncellemesi
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
            onRunXor,
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
        onRunXor, // yeni node’lara da Run XOR bağla
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

      setNodes((nds) => computeGraphValues(nds, edges));

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