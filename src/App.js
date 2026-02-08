import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  useEdgesState,
  useNodesState,
  Controls,
  Background,
  MiniMap,
} from "reactflow";


import { encryptFileAES, decryptFileAES } from "./utils/aesFile";
import { encryptFileDES, decryptFileDES } from "./utils/desFile";
import { fileToPixelBytes } from "./components/crypto/imageToBytes";

import "reactflow/dist/style.css";
import "reactflow/dist/base.css";
import { xorImageFileWithKey, xorRgbaBytesWithKey } from "./utils/imageXor";
import { rgbaBytesToPngDataUrl } from "./utils/bytesToDataUrl";


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

export default function App() {
  const [mode, setMode] = useState("ecb");
  const [showHandleLabels, setShowHandleLabels] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const initial = useMemo(() => buildPreset(mode), [mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [showFirst8, setShowFirst8] = useState(false);
  const [first8Trace, setFirst8Trace] = useState([]);

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
   * Encrypts an image using XOR operation with ECB or CBC mode.
   * ECB: plaintext ⊕ key
   * CBC: plaintext ⊕ previous_ciphertext (or IV for first block) ⊕ key
   * Takes the image and key from the block cipher node, performs XOR encryption,
   * then updates both the cipher node and connected ciphertext output node with the result.
   */
  const onRunXor = useCallback(async (blockId, currentNodes, currentEdges, currentMode) => {
    const block = currentNodes.find((n) => n.id === blockId);
    
    if (!block) return;

    console.log("🎯 onRunXor - block.data:", block.data);
    console.log("   plaintextFile:", block.data.plaintextFile);
    console.log("   encryptedImageFile:", block.data.encryptedImageFile);
    console.log("   isDecryptMode:", block.data.isDecryptMode);
    console.log("   keyBits:", block.data.keyBits);
    console.log("   keyBits type:", typeof block.data.keyBits);
    console.log("   keyBits is string?", typeof block.data.keyBits === 'string');
    console.log("   mode:", currentMode);

    // Check if decrypt mode
    const isDecrypt = block.data.isDecryptMode;
    const fileInput = isDecrypt ? block.data.encryptedImageFile : block.data.plaintextFile;
    const keyBits = block.data.keyBits;

    if (!fileInput || !keyBits) {
      alert("Missing image or key!");
      return;
    }

    // Ensure keyBits is a string
    if (typeof keyBits !== 'string') {
      console.log("❌ keyBits is not a string! Converting...", keyBits);
      alert("Key bits format is invalid!");
      return;
    }

    // Convert File object to pixel bytes
    const input = await fileToPixelBytes(fileInput, { width: 256, height: 256 });

    // Find output edge (to ciphertext node)
    const outEdge = currentEdges.find((e) => e.source === blockId && e.sourceHandle === "out");
    const ctId = outEdge?.target;

    // For CBC mode: find previous ciphertext or IV
    let prevBytes = null;
    if (currentMode === 'cbc') {
      // Look for XOR node connected to BlockCipher
      const xorEdge = currentEdges.find((e) => e.target === blockId && e.targetHandle === "xor");
      
      if (xorEdge) {
        // Found XOR node, get IV from the XOR node's inputs
        const xorNode = currentNodes.find((n) => n.id === xorEdge.source);
        console.log("🔍 CBC Mode - XOR node found:", xorNode?.id);
        
        if (xorNode) {
          // Find IV or prevCipher connected to XOR node
          const ivEdge = currentEdges.find((e) => e.target === xorNode.id && e.targetHandle === "pc");
          if (ivEdge) {
            const ivNode = currentNodes.find((n) => n.id === ivEdge.source);
            console.log("🔍 IV/PrevCipher node found:", ivNode?.type, ivNode?.id);
            
            if (ivNode) {
              if (ivNode.type === 'iv') {
                // IV node: convert bits to bytes
                const ivBits = ivNode.data.bits || "";
                console.log("🔍 IV bits:", ivBits);
                const clean = ivBits.replace(/\s+/g, "");
                if (/^[01]+$/.test(clean) && clean.length % 8 === 0) {
                  prevBytes = new Uint8Array(clean.length / 8);
                  for (let i = 0; i < prevBytes.length; i++) {
                    prevBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
                  }
                  console.log("✅ IV bytes created:", Array.from(prevBytes.slice(0, 4)));
                } else {
                  console.log("❌ Invalid IV bits format");
                }
              } else if (ivNode.type === 'ciphertext' && ivNode.data.xorBytes) {
                // Previous ciphertext: use xorBytes directly
                prevBytes = ivNode.data.xorBytes;
                console.log("✅ Previous ciphertext bytes:", Array.from(prevBytes.slice(0, 4)));
              }
            }
          }
        }
      } else {
        // Old flow: direct prevCipher connection to BlockCipher (fallback)
        const prevEdge = currentEdges.find((e) => e.target === blockId && e.targetHandle === "prevCipher");
        console.log("🔍 CBC Mode - Looking for prevCipher edge:", prevEdge);
        
        if (prevEdge) {
          const prevNode = currentNodes.find((n) => n.id === prevEdge.source);
          console.log("🔍 prevNode found:", prevNode?.type, prevNode?.id);
          
          if (prevNode) {
            if (prevNode.type === 'iv') {
              // IV node: convert bits to bytes
              const ivBits = prevNode.data.bits || "";
              console.log("🔍 IV bits:", ivBits);
              const clean = ivBits.replace(/\s+/g, "");
              if (/^[01]+$/.test(clean) && clean.length % 8 === 0) {
                prevBytes = new Uint8Array(clean.length / 8);
                for (let i = 0; i < prevBytes.length; i++) {
                  prevBytes[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
                }
                console.log("✅ IV bytes created:", Array.from(prevBytes.slice(0, 4)));
              } else {
                console.log("❌ Invalid IV bits format");
              }
            } else if (prevNode.type === 'ciphertext' && prevNode.data.xorBytes) {
              // Previous ciphertext: use xorBytes directly
              prevBytes = prevNode.data.xorBytes;
              console.log("✅ Previous ciphertext bytes:", Array.from(prevBytes.slice(0, 4)));
            } else {
              console.log("❌ prevNode type not IV or ciphertext, or no xorBytes");
            }
          }
        } else {
          console.log("❌ No prevCipher edge found");
        }
      }
    }

    console.log("🔍 Final prevBytes:", prevBytes ? Array.from(prevBytes.slice(0, 4)) : null);

    // Perform XOR encryption
    let outBytes;
    if (currentMode === 'cbc' && prevBytes) {
      console.log("🔐 CBC XOR: plaintext ⊕ prevBytes ⊕ key");
      console.log("   Input first 4 pixels:", input.slice(0, 16));
      console.log("   PrevBytes first 16:", Array.from(prevBytes.slice(0, 16)));
      console.log("   KeyBits:", keyBits?.slice(0, 32));
      
      // CBC: plaintext ⊕ prevBytes ⊕ key
      // First: XOR with prevBytes (Uint8Array ⊕ Uint8Array)
      const withPrev = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        withPrev[i] = input[i] ^ prevBytes[i % prevBytes.length];
      }
      console.log("   After XOR with prevBytes, first 4 pixels:", withPrev.slice(0, 16));
      
      // Second: XOR with key (Uint8Array ⊕ bit string)
      outBytes = xorRgbaBytesWithKey(withPrev, keyBits);
      console.log("   After XOR with key, first 4 pixels:", outBytes.slice(0, 16));
    } else {
      console.log("🔐 ECB XOR: plaintext ⊕ key (or CBC without prevBytes)");
      console.log("   Input first 4 pixels:", input.slice(0, 16));
      console.log("   KeyBits:", keyBits?.slice(0, 32));
      
      // ECB or CBC without prevBytes: plaintext ⊕ key
      outBytes = xorRgbaBytesWithKey(input, keyBits);
      console.log("   Output first 4 pixels:", outBytes.slice(0, 16));
    }

    const outUrl = rgbaBytesToPngDataUrl(outBytes, 256, 256);

    console.log("✅ XOR Complete - ctId:", ctId, "mode:", currentMode, "hasPrevBytes:", !!prevBytes);

    // Update nodes with result
    setNodes((nds) => nds.map((n) => {
      if (n.id === blockId) {
        return { ...n, data: { ...n.data, preview: outUrl, xorBytes: outBytes } };
      }
      if (ctId && n.id === ctId) {
        return { ...n, data: { ...n.data, result: outUrl, xorBytes: outBytes } };
      }
      return n;
    }));
  }, [setNodes]);


  /**
   * Main cipher execution handler.
   * Routes to the appropriate cipher (XOR, AES, or DES) based on the block's settings.
   * Supports both image and text encryption modes.
   */
  const onRunCipher = useCallback(
    (blockId) => {
      setNodes((currentNodes) => {
        console.log("onRunCipher fired", blockId);

        const block = currentNodes.find((n) => n.id === blockId);
        console.log("block found?", !!block, block?.data);
        if (!block) return currentNodes;

        const cipherType = block.data?.cipherType || "xor";
        const isImageMode = !!block.data?.plaintextFile || !!block.data?.encryptedImageFile;
        const isEncryptedInput = !!block.data?.encryptedImageFile;

        console.log("cipherType =", cipherType);
        console.log("isImageMode =", isImageMode);

        if (cipherType === "xor") {
          onRunXor(blockId, currentNodes, edges, mode); // ← Pass mode!
          return currentNodes;
        }

        if (isImageMode) {
          const file = isEncryptedInput ? block.data.encryptedImageFile : block.data.plaintextFile;
          // For AES/DES, we need keyText, but we have keyBits from Key node
          // Use keyBits directly as passphrase for AES
          // For DES, convert first 64 bits to 8 characters
          const keyBits = block.data.keyBits || "";
          let keyText = block.data.keyText || "";

          try {
            if (cipherType === "aes") {
              // Use keyBits as passphrase if no keyText provided
              const passphrase = keyText || keyBits;
              if (!passphrase) throw new Error("Missing AES key");
              
              const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
              const ctId = outEdge?.target;

              if (isEncryptedInput) {
                decryptFileAES(file, passphrase).then(({ url }) => {
                  setNodes((nds) => nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
                    }
                    return n;
                  }));
                }).catch(err => {
                  alert("AES decryption error: The key may be incorrect or the file may be corrupted. ");
                });
              } else {
                encryptFileAES(file, passphrase).then(({ previewUrl, encryptedBlobUrl }) => {
                  setNodes((nds) => nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
                    }
                    return n;
                  }));
                }).catch(err => {
                  alert("AES encryption error: " + err.message);
                });
              }
            } else if (cipherType === "des") {
              // For DES: convert first 64 bits to 8 characters, or use keyText
              if (!keyText && keyBits) {
                if (keyBits.length < 64) {
                  throw new Error("DES requires at least 64 bits. Please generate 128 or 256 bit key.");
                }
                keyText = "";
                for (let i = 0; i < 8; i++) {
                  const byte = keyBits.slice(i * 8, i * 8 + 8);
                  keyText += String.fromCharCode(parseInt(byte, 2));
                }
              }
              
              if (!keyText || keyText.length !== 8) {
                throw new Error("DES key must be exactly 8 characters");
              }
              
              const outEdge = edges.find((e) => e.source === blockId && e.sourceHandle === "out");
              const ctId = outEdge?.target;

              if (isEncryptedInput) {
                decryptFileDES(file, keyText).then(({ url }) => {
                  setNodes((nds) => nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: url, encryptedBlobUrl: undefined } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: url, encryptedBlobUrl: undefined } };
                    }
                    return n;
                  }));
                }).catch(err => {
                  alert("DES decryption error: " + err.message);
                });
              } else {
                encryptFileDES(file, keyText).then(({ previewUrl, encryptedBlobUrl }) => {
                  setNodes((nds) => nds.map((n) => {
                    if (n.id === blockId) {
                      return { ...n, data: { ...n.data, preview: previewUrl, encryptedBlobUrl } };
                    }
                    if (ctId && n.id === ctId) {
                      return { ...n, data: { ...n.data, result: previewUrl, encryptedBlobUrl } };
                    }
                    return n;
                  }));
                }).catch(err => {
                  alert("DES encryption error: " + err.message);
                });
              }
            }
          } catch (e) {
            alert(String(e?.message || e));
          }
        } else {
          alert("AES/DES text mode not implemented yet");
        }
        
        return currentNodes;
      });
    },
    [onRunXor, setNodes, edges, mode]
  );


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
                
                return computeGraphValues(next, preset.edges, m);
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
                return computeGraphValues(next, preset.edges, m);
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
                return computeGraphValues(next, preset.edges, m);
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
                return computeGraphValues(next, preset.edges, m);
              });
            },
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
        // Inject mode into all nodes' data
        return updated.map(n => ({
          ...n,
          data: { ...n.data, mode, showHandleLabels }
        }));
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
        // Inject mode into all nodes' data
        return updated.map(n => ({
          ...n,
          data: { ...n.data, mode, showHandleLabels }
        }));
      });
    },
    [onEdgesChange, edges, mode]
  );

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