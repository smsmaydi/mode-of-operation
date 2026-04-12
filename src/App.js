import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Controls,
  Background,
  MiniMap,
} from "reactflow";

import "reactflow/dist/style.css";
import "reactflow/dist/base.css";
import { runCipherHandler, runXorHandler } from "./utils/cipherHandlers";


import ModeMenu from "./components/layout/ModeMenu";
import GraphInputsPanel from "./components/layout/GraphInputsPanel";
import ModeHelpDrawer from "./components/layout/ModeHelpDrawer";
import NodePalette from "./components/palette/NodePalette";

import PlaintextRepNode from "./components/nodes/PlaintextRepNode";
import KeyRepNode from "./components/nodes/KeyRepNode";
import BlockCipherNode from "./components/nodes/BlockCipherNode";
import CiphertextNode from "./components/nodes/CiphertextNode";
import IVNode from "./components/nodes/IVNode";
import XorPreBlockNode from "./components/nodes/XorPreBlockNode";
import CtrNode from "./components/nodes/CtrNode";
import DecryptNode from "./components/nodes/DecryptNode";
import PlaintextChunkNode from "./components/nodes/PlaintextChunkNode";
import KeySnapNode from "./components/nodes/KeySnapNode";
import CtrSnapNode from "./components/nodes/CtrSnapNode";
import BlockClusterNode from "./components/nodes/BlockClusterNode";
import StepEdge from "./components/layout/StepEdge";

import { computeGraphValues } from "./utils/computeGraph";
import { resolveStepEdgeStroke } from "./utils/edgeStyles";
import { mergePipelineIntoGraph, countByteBlocksFromPlaintext } from "./utils/dynamicBlockGraph";
import { buildPreset } from "./utils/presets";
import { makeIsValidConnection } from "./utils/validators";
import { ecbFirstNTraceFromGraph } from "./utils/ecbTrace";
import SubBytesView from "./components/aes/SubBytesView";
import BlockChainPanel from "./components/layout/BlockChainPanel";
import { THEME_STORAGE_KEY, readStoredColorMode } from "./themeConstants";
import { encryptedHexToBits } from "./utils/plaintextSidebarUtils";

/**
 * Injects UI-only fields into every node’s `data` so presentational nodes (e.g. Key) can read global state.
 * `blockCipherType` is taken from the first pipeline `blockcipher` node (`b-0`, `b-1`, …).
 *
 * @param {import("reactflow").Node[]} nodes — graph after `computeGraphValues`
 * @param {string} mode — app mode (`ecb`, `cbc`, `ctr`, `free`, …)
 * @param {boolean} showHandleLabels — handle label toggle from the sidebar
 * @returns {import("reactflow").Node[]}
 */
function attachNodeUiFields(nodes, mode, showHandleLabels) {
  const bc = String(
    nodes.find((n) => n.type === "blockcipher" && /^b-\d+$/.test(n.id))?.data?.cipherType || "xor"
  ).toLowerCase();
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, mode, showHandleLabels, blockCipherType: bc },
  }));
}

const nodeTypes = {
  plaintext: PlaintextRepNode,
  plaintextchunk: PlaintextChunkNode,
  key: KeyRepNode,
  keysnap: KeySnapNode,
  ctrsnap: CtrSnapNode,
  blockcluster: BlockClusterNode,
  blockcipher: BlockCipherNode,
  ciphertext: CiphertextNode,
  iv: IVNode,
  xor: XorPreBlockNode,
  ctr: CtrNode,
  decrypt: DecryptNode,
};

const edgeTypes = { step: StepEdge };

/**
 * Marks exactly one `blockcluster` node as selected (for highlight + AES step targeting).
 *
 * @param {import("reactflow").Node[]} nds
 * @param {number} selectedIndex — block index (`0` = first block)
 */
function applyClusterSelectionToNodes(nds, selectedIndex) {
  return nds.map((n) =>
    n.type === "blockcluster"
      ? {
          ...n,
          data: {
            ...n.data,
            clusterSelected: n.data.blockIndex === selectedIndex,
          },
        }
      : n
  );
}

/** After mount / mode or pipeline change, zoom viewport to Block 1 cluster only (tighter default framing). */
function FitFirstTwoBlockClusters({ layoutKey }) {
  const { fitView, getNodes } = useReactFlow();

  useLayoutEffect(() => {
    if (!layoutKey) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const all = getNodes();
      const toFit = all.filter((n) => n.id === "cl-0");
      if (toFit.length === 0) return;
      fitView({
        nodes: toFit.map((n) => ({ id: n.id })),
        padding: 0.16,
        duration: 280,
        maxZoom: 1.35,
        minZoom: 0.06,
      });
    };
    const id = requestAnimationFrame(run);
    const t = window.setTimeout(run, 120);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, [layoutKey, fitView, getNodes]);

  return null;
}

/** True when Plaintext is image upload or encrypted file (Run-based flow; hide AES step-by-step view). */
function isPlaintextImageOrFileMode(ptNode) {
  const t = ptNode?.data?.inputType;
  return t === "image" || t === "encryptedFile";
}

export default function App() {
  const [mode, setMode] = useState("ecb");
  const [showHandleLabels, setShowHandleLabels] = useState(false);
  const [modeHelpOpen, setModeHelpOpen] = useState(false);
  const [colorMode, setColorMode] = useState(readStoredColorMode);

  const initial = useMemo(() => buildPreset(mode), [mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [demoSection, setDemoSection] = useState("modes"); // "modes" | "aes"
  const [aesViewPayload, setAesViewPayload] = useState(null);
  const [showBlockChain, setShowBlockChain] = useState(false);
  const [aesStepsLastRound, setAesStepsLastRound] = useState(0);
  const [selectedClusterIndex, setSelectedClusterIndex] = useState(0);
  const selectedClusterIndexRef = useRef(0);
  const lastIvBitsRef = useRef(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  React.useEffect(() => {
    selectedClusterIndexRef.current = selectedClusterIndex;
  }, [selectedClusterIndex]);

  React.useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  React.useEffect(() => {
    setNodes((nds) => {
      let changed = false;
      const next = nds.map((n) => {
        if (n.type !== "blockcluster") return n;
        const want = n.data.blockIndex === selectedClusterIndex;
        if (!!n.data.clusterSelected === want) return n;
        changed = true;
        return { ...n, data: { ...n.data, clusterSelected: want } };
      });
      return changed ? next : nds;
    });
  }, [selectedClusterIndex, setNodes]);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, colorMode);
    } catch {
      /* ignore quota / private mode */
    }
  }, [colorMode]);

  const openAesStepView = useCallback((ciphertextId) => {
    setAesViewPayload({
      nodes: nodesRef.current ?? [],
      edges: edgesRef.current ?? [],
      ciphertextId,
      initialRound: aesStepsLastRound,
    });
    setDemoSection("aes");
  }, [aesStepsLastRound]);

  const openAesFromSidebar = useCallback(() => {
    const cid = `c-${selectedClusterIndexRef.current}`;
    openAesStepView(cid);
  }, [openAesStepView]);

  const onSetBlockCipherType = useCallback(
    (cipherType) => {
      if (cipherType !== "aes") {
        setDemoSection("modes");
        setAesViewPayload(null);
      }
      setNodes((nds) => {
        let next = nds.map((n) =>
          n.type === "blockcipher" && /^b-\d+$/.test(n.id)
            ? { ...n, data: { ...n.data, cipherType } }
            : n
        );
        if (cipherType === "aes") {
          next = next.map((n) => {
            if (n.id !== "k1") return n;
            let bits = String(n.data?.bits || "").replace(/[^01]/g, "");
            const hex = String(n.data?.keyText || "")
              .replace(/\s/g, "")
              .replace(/[^0-9a-fA-F]/g, "");
            if (bits.length < 128 && hex.length >= 32) {
              bits = encryptedHexToBits(hex.slice(0, 32)).replace(/[^01]/g, "");
            }
            bits = bits.slice(0, 128).padEnd(128, "0");
            return { ...n, data: { ...n.data, bits, keyText: "" } };
          });
        }
        const result = computeGraphValues(next, edgesRef.current, mode);
        const withUi = attachNodeUiFields(result, mode, showHandleLabels);
        const highlighted = applyClusterSelectionToNodes(withUi, selectedClusterIndexRef.current);
        nodesRef.current = highlighted;
        return highlighted;
      });
    },
    [mode, setNodes, showHandleLabels]
  );

  const blockCipherType = useMemo(() => {
    const b = nodes.find((n) => n.type === "blockcipher" && /^b-\d+$/.test(n.id));
    return String(b?.data?.cipherType || "xor").toLowerCase();
  }, [nodes]);

  const aesStepsAvailable = useMemo(() => {
    const pt = nodes.find((n) => n.id === "p1");
    if (!pt || blockCipherType !== "aes") return false;
    if (pt.data?.isDecryptMode) return false;
    if (isPlaintextImageOrFileMode(pt)) return false;
    return mode === "ecb" || mode === "cbc" || mode === "ctr";
  }, [nodes, blockCipherType, mode]);

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

  const onPatchP1 = useCallback(
    (patch) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === "p1" ? { ...n, data: { ...n.data, ...patch } } : n));
        const r = attachNodeUiFields(computeGraphValues(next, edgesRef.current, mode), mode, showHandleLabels);
        nodesRef.current = r;
        return applyClusterSelectionToNodes(r, selectedClusterIndexRef.current);
      });
    },
    [mode, setNodes, showHandleLabels]
  );

  const onPatchK1 = useCallback(
    (patch) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === "k1" ? { ...n, data: { ...n.data, ...patch } } : n));
        const r = attachNodeUiFields(computeGraphValues(next, edgesRef.current, mode), mode, showHandleLabels);
        nodesRef.current = r;
        return applyClusterSelectionToNodes(r, selectedClusterIndexRef.current);
      });
    },
    [mode, setNodes, showHandleLabels]
  );

  const onPatchIv = useCallback(
    (patch) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === "iv1" ? { ...n, data: { ...n.data, ...patch } } : n));
        const r = attachNodeUiFields(computeGraphValues(next, edgesRef.current, mode), mode, showHandleLabels);
        nodesRef.current = r;
        return applyClusterSelectionToNodes(r, selectedClusterIndexRef.current);
      });
    },
    [mode, setNodes, showHandleLabels]
  );

  const onPatchCtr = useCallback(
    (patch) => {
      setNodes((nds) => {
        const next = nds.map((n) => (n.id === "ctr1" ? { ...n, data: { ...n.data, ...patch } } : n));
        const r = attachNodeUiFields(computeGraphValues(next, edgesRef.current, mode), mode, showHandleLabels);
        nodesRef.current = r;
        return applyClusterSelectionToNodes(r, selectedClusterIndexRef.current);
      });
    },
    [mode, setNodes, showHandleLabels]
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
    if (mode === "cbc") {
      return { x: 0, y: 0, zoom: 2 };
    }
    return { x: 0, y: 0, zoom: 1 };
  }, [mode]);

  /** Refit when mode or block-cluster set (e.g. pipeline rebuild) changes. */
  const clusterLayoutKey = useMemo(() => {
    if (mode !== "ecb" && mode !== "cbc" && mode !== "ctr") return "";
    const ids = nodes
      .filter((n) => /^cl-\d+$/.test(n.id))
      .map((n) => n.id)
      .sort()
      .join(",");
    return `${mode}|${ids}`;
  }, [mode, nodes]);

//  React.useEffect(() => {
//   const bc = nodes.filter(n => n.type === "blockcipher")
//                   .map(n => ({ id: n.id, cipherType: n.data?.cipherType, data: n.data }));
//   console.log("BLOCKCIPHER state:", bc);
// }, [nodes]);





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
    setModeHelpOpen(false);
    setSelectedClusterIndex(0);
    setMode(m);
    const preset = buildPreset(m);
    edgesRef.current = preset.edges;

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
                const es = edgesRef.current || preset.edges;
                const result = computeGraphValues(next, es, m);
                const withUi = attachNodeUiFields(result, m, showHandleLabels);
                const highlighted = applyClusterSelectionToNodes(
                  withUi,
                  selectedClusterIndexRef.current
                );
                nodesRef.current = highlighted;
                return highlighted;
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
                const es = edgesRef.current || preset.edges;
                const result = computeGraphValues(next, es, m);
                const withUi = attachNodeUiFields(result, m, showHandleLabels);
                const highlighted = applyClusterSelectionToNodes(
                  withUi,
                  selectedClusterIndexRef.current
                );
                nodesRef.current = highlighted;
                return highlighted;
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
                const es = edgesRef.current || preset.edges;
                const result = computeGraphValues(next, es, m);
                const withUi = attachNodeUiFields(result, m, showHandleLabels);
                const highlighted = applyClusterSelectionToNodes(
                  withUi,
                  selectedClusterIndexRef.current
                );
                nodesRef.current = highlighted;
                return highlighted;
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
                const es = edgesRef.current || preset.edges;
                const result = computeGraphValues(next, es, m);
                const withUi = attachNodeUiFields(result, m, showHandleLabels);
                const highlighted = applyClusterSelectionToNodes(
                  withUi,
                  selectedClusterIndexRef.current
                );
                nodesRef.current = highlighted;
                return highlighted;
              });
            },
          },
        };
      }

      if (n.type === "keysnap") {
        return {
          ...n,
          data: {
            ...n.data,
            showHandleLabels,
            sourceKeyId: n.data?.sourceKeyId || "k1",
          },
        };
      }

      return {
        ...n,
        data: { ...n.data, showHandleLabels },
      };
    });

    const computed = computeGraphValues(withHandlers, preset.edges, m);
    const withUi = attachNodeUiFields(computed, m, showHandleLabels);
    const highlighted = applyClusterSelectionToNodes(withUi, 0);
    nodesRef.current = highlighted;
    setNodes(highlighted);
    setEdges(preset.edges);
  },
  [setNodes, setEdges, onRunCipher, showHandleLabels]
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
    setNodes((nds) => attachNodeUiFields(nds, mode, showHandleLabels));
  }, [showHandleLabels, setNodes, mode]);

  const p1Digest = useMemo(() => {
    const p = nodes.find((n) => n.id === "p1");
    if (!p) return "";
    return `${p.data?.inputType ?? ""}|${String(p.data?.value ?? "")}|${!!p.data?.isDecryptMode}`;
  }, [nodes]);

  useEffect(() => {
    if (mode !== "ecb" && mode !== "cbc" && mode !== "ctr") return;
    const curNodes = nodesRef.current;
    const curEdges = edgesRef.current;
    const pt = curNodes.find((n) => n.id === "p1");
    if (!pt) return;
    const t = pt.data?.inputType;
    if (t === "image" || t === "encrypted" || t === "encryptedFile") return;

    const nBlocks = countByteBlocksFromPlaintext(pt);
    const pchCount = curNodes.filter((n) => /^pch-\d+$/.test(n.id)).length;
    if (pchCount === nBlocks) return;

    const merged = mergePipelineIntoGraph(curNodes, curEdges, nBlocks, mode);
    const tmplBlock = curNodes.find((n) => n.type === "blockcipher" && /^b-\d+$/.test(n.id));

    const patched = merged.nodes.map((n) => {
      const prev = curNodes.find((p) => p.id === n.id);
      if (prev?.data?.onChange || prev?.data?.onRunCipher) {
        return {
          ...n,
          data: {
            ...n.data,
            showHandleLabels,
            onChange: prev.data.onChange,
            onRunCipher: prev.data.onRunCipher,
            onRunXor: prev.data.onRunXor,
            cipherType: prev.data.cipherType ?? n.data?.cipherType,
          },
        };
      }
      if (n.type === "blockcipher" && /^b-\d+$/.test(n.id)) {
        return {
          ...n,
          data: {
            ...n.data,
            showHandleLabels,
            cipherType: tmplBlock?.data?.cipherType ?? "xor",
            onChange: tmplBlock?.data?.onChange,
            onRunCipher: tmplBlock?.data?.onRunCipher,
          },
        };
      }
      if (n.type === "keysnap" && /^ks-\d+$/.test(n.id)) {
        return {
          ...n,
          data: {
            ...n.data,
            showHandleLabels,
            sourceKeyId: n.data?.sourceKeyId || "k1",
          },
        };
      }
      if (n.type === "ctrsnap" && /^cs-\d+$/.test(n.id)) {
        return {
          ...n,
          data: {
            ...n.data,
            showHandleLabels,
            sourceCtrId: n.data?.sourceCtrId || "ctr1",
          },
        };
      }
      return { ...n, data: { ...n.data, showHandleLabels } };
    });

    const result = computeGraphValues(patched, merged.edges, mode);
    const withUi = attachNodeUiFields(result, mode, showHandleLabels);
    const highlighted = applyClusterSelectionToNodes(withUi, selectedClusterIndexRef.current);
    nodesRef.current = highlighted;
    edgesRef.current = merged.edges;
    setNodes(highlighted);
    setEdges(merged.edges);
  }, [mode, p1Digest, showHandleLabels, setNodes, setEdges]);

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
        const stroke = resolveStepEdgeStroke(params, nodes);
        const newEdge = {
          ...params,
          type: "step",
          animated: true,
          style: { ...(params.style || {}), stroke },
          pathOptions: { offset: 36 },
        };
        const next = addEdge(newEdge, eds);
        setNodes((nds) => {
          const computed = computeGraphValues(nds, next, mode);
          const withUi = attachNodeUiFields(computed, mode, showHandleLabels);
          return applyClusterSelectionToNodes(withUi, selectedClusterIndexRef.current);
        });
        return next;
      });
    },
    [isValidConnection, nodes, mode, showHandleLabels]
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
            return attachNodeUiFields(computeGraphValues(next, edges, mode), mode, showHandleLabels);
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
            : type === "ctr"
            ? { ...dataBase, nonceBits: "", counterBits: "0".repeat(64) }
            : type === "keysnap"
            ? { id, showHandleLabels, sourceKeyId: "k1" }
            : { ...dataBase },
      };

      setNodes((nds) => {
        const computed = computeGraphValues([...nds, newNode], edges, mode);
        const withUi = attachNodeUiFields(computed, mode, showHandleLabels);
        return applyClusterSelectionToNodes(withUi, selectedClusterIndexRef.current);
      });
    },
    [mode, edges, setNodes, onRunXor, showHandleLabels]
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
        const result = attachNodeUiFields(updated, mode, showHandleLabels);
        const withCluster = applyClusterSelectionToNodes(result, selectedClusterIndexRef.current);
        nodesRef.current = withCluster;
        edgesRef.current = edges;
        return withCluster;
      });
    },
    [onNodesChange, edges, mode, showHandleLabels]
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
        const result = attachNodeUiFields(updated, mode, showHandleLabels);
        const withCluster = applyClusterSelectionToNodes(result, selectedClusterIndexRef.current);
        nodesRef.current = withCluster;
        edgesRef.current = edges;
        return withCluster;
      });
    },
    [onEdgesChange, edges, mode, showHandleLabels]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <nav className="app-top-nav" aria-label="Main demo">
        <span className="app-top-nav__title">Demo:</span>
        <button
          type="button"
          onClick={() => setDemoSection("modes")}
          className={`app-top-nav__tab${demoSection === "modes" ? " app-top-nav__tab--active" : ""}`}
        >
          Mode of operation (graph)
        </button>
        {blockCipherType === "aes" && (
        <button
          type="button"
          onClick={() => {
            const cid = `c-${selectedClusterIndex}`;
            openAesStepView(cid);
          }}
          className={`app-top-nav__tab${demoSection === "aes" ? " app-top-nav__tab--active" : ""}`}
        >
          AES rounds (step-by-step)
        </button>
        )}
        <div
          className="app-top-nav__theme"
          role="group"
          aria-label="Color theme"
        >
          <button
            type="button"
            className={`app-top-nav__theme-btn${colorMode === "light" ? " app-top-nav__theme-btn--active" : ""}`}
            onClick={() => setColorMode("light")}
            aria-pressed={colorMode === "light"}
            title="Use light theme (lecture deck style)"
          >
            Light
          </button>
          <button
            type="button"
            className={`app-top-nav__theme-btn${colorMode === "dark" ? " app-top-nav__theme-btn--active" : ""}`}
            onClick={() => setColorMode("dark")}
            aria-pressed={colorMode === "dark"}
            title="Use dark theme"
          >
            Dark
          </button>
        </div>
      </nav>

      {demoSection === "aes" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <SubBytesView
            embedded
            payload={aesViewPayload}
            onClose={(lastRound) => {
              setDemoSection("modes");
              setAesViewPayload(null);
              if (typeof lastRound === "number") setAesStepsLastRound(lastRound);
            }}
          />
        </div>
      ) : (
    <div className={`app-graph-layout${mode === "free" ? " app-graph-layout--palette" : ""}`}>
      <ModeMenu
        current={mode}
        onSelect={applyMode}
        showHandleLabels={showHandleLabels}
        onToggleHandleLabels={setShowHandleLabels}
      >
        <GraphInputsPanel
          mode={mode}
          plaintextData={nodes.find((n) => n.id === "p1")?.data}
          keyData={nodes.find((n) => n.id === "k1")?.data}
          ivData={nodes.find((n) => n.id === "iv1")?.data}
          ctrData={nodes.find((n) => n.id === "ctr1")?.data}
          blockCipherType={blockCipherType}
          onSetBlockCipherType={mode !== "free" ? onSetBlockCipherType : undefined}
          selectedBlockIndex={selectedClusterIndex}
          onOpenAesSteps={openAesFromSidebar}
          aesStepsAvailable={aesStepsAvailable}
          onPatchP1={onPatchP1}
          onPatchK1={onPatchK1}
          onPatchIv={onPatchIv}
          onPatchCtr={onPatchCtr}
        />
      </ModeMenu>
      
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{ position: "relative", display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            if (node.type === "blockcluster" && typeof node.data?.blockIndex === "number") {
              setSelectedClusterIndex(node.data.blockIndex);
            }
          }}
          fitView={mode === "ctr" || mode === "free"}
          fitViewOptions={{
            padding: mode === "ctr" ? 0.2 : 0.12,
          }}
          defaultViewport={mode === "ctr" || mode === "free" ? defaultViewport : undefined}
          style={{ flex: 1, minHeight: 0 }}
        >
          {(mode === "ecb" || mode === "cbc" || mode === "ctr") && (
            <FitFirstTwoBlockClusters layoutKey={clusterLayoutKey} />
          )}
          <MiniMap />
          <Controls />
          <Background />
          <button
            type="button"
            className="graph-floating-btn"
            style={{ left: 10 }}
            onClick={() => setShowBlockChain((v) => !v)}
          >
            {showBlockChain ? "Hide chain strip" : "Show chain strip"}
          </button>
        </ReactFlow>
        {showBlockChain && (
          <BlockChainPanel
            rows={ecbFirstNTraceFromGraph(nodes, mode, 32, 1)}
            mode={mode}
            onClose={() => setShowBlockChain(false)}
          />
        )}
        {(mode === "ecb" || mode === "cbc" || mode === "ctr") && (
          <ModeHelpDrawer
            mode={mode}
            open={modeHelpOpen}
            onToggle={() => setModeHelpOpen((o) => !o)}
            onClose={() => setModeHelpOpen(false)}
          />
        )}
      </div>

      {mode === "free" ? <NodePalette /> : null}
    </div>
      )}
    </div>
  );
}