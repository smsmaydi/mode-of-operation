/** Horizontal step between block column anchors; keep ≥ CLUSTER_W + gap so frames do not overlap. */
const INTER_CLUSTER_GAP = 56;
/** Slight horizontal offset so columns sit more centered with the sidebar. */
const X0 = 108;
/** Per-block cluster padding (parent frame around chunk → ciphertext). */
const CLUSTER_PAD_L = 14;
const CLUSTER_PAD_T = 10;
const CLUSTER_PAD_R = 22;
/** Vertical nudge: whole pipeline sits a bit lower. */
const Y_SHIFT = 24;
/** Approximate BlockCipher card height (px); modest vertical drop (tighter clusters than 1.5×). */
const BLOCK_CIPHER_CARD_H = 80;
const BLOCK_CIPHER_DROP_Y = Math.round(BLOCK_CIPHER_CARD_H * 1.15);
/** Layout inside cluster: XOR / block column — compressed height for smaller Block N frames. */
const Y_PCH = -78 + Y_SHIFT;
const Y_XOR = 6 + Y_SHIFT;
const Y_B = 96 + Y_SHIFT + BLOCK_CIPHER_DROP_Y;
const Y_C = 232 + Y_SHIFT + BLOCK_CIPHER_DROP_Y;
/** World-anchor only: parentX = xAbs − KEY_SNAP_LEFT − pad (keeps cl-* position stable vs column step). */
const KEY_SNAP_LEFT = 188;
/** Nudge XOR node downward (px) under plaintext chunk. */
const XOR_DROP_Y = 50;
/**
 * CTR: reserved height at top of cluster for Nonce+Counter snap (above pch / xor / cipher column).
 * Also shifts BlockCipher, XOR, Ciphertext, Key rows down by this amount.
 */
const CTR_TOP_RESERVE = 102;
/** Extra cluster frame height in CTR so the shifted stack still fits. */
const CTR_CLUSTER_EXTRA_H = CTR_TOP_RESERVE + 36;
/** Nominal Key snap node width — used so BlockCipher sits KEY_BLOCK_GAP px to the right of Key’s right edge. */
const KEY_SNAP_NODE_W = 172;
/** Minimum horizontal gap Key ↔ pipeline column when cluster is too narrow for space-around. */
const KEY_BLOCK_GAP = 100;
const KEY_SNAP_DX = 0;
const KEY_SNAP_DY = 0;

/** Nominal width of the stacked column (chunk / xor / block / cipher) for layout math. */
const PIPELINE_COL_W = 180;

const COL_NUDGE = 8;
const REL_X_KS = Math.max(6, CLUSTER_PAD_L - COL_NUDGE);
/** Cluster frame width: key track + min gap + pipeline column + right inset. */
const CLUSTER_W =
  REL_X_KS + KEY_SNAP_NODE_W + KEY_BLOCK_GAP + PIPELINE_COL_W + CLUSTER_PAD_R;
const COL = CLUSTER_W + INTER_CLUSTER_GAP;
/** Shorter frame: fits pipeline without oversized empty margin (ECB/CBC). */
const CLUSTER_H = 498 + BLOCK_CIPHER_DROP_Y;
const CLUSTER_H_CTR = CLUSTER_H + CTR_CLUSTER_EXTRA_H;

/**
 * Removes generated per-block nodes/edges (`pch-*`, `xor-*`, `b-*`, `c-*`, `ks-*`, `cs-*`, `cl-*`).
 * Leaves masters such as `p1`, `k1`, `iv1`, `ctr1` intact so a fresh pipeline can be merged in.
 *
 * @param {import("reactflow").Node[]} nodes
 * @param {import("reactflow").Edge[]} edges
 * @returns {{ nodes: import("reactflow").Node[], edges: import("reactflow").Edge[] }}
 */
export function stripDynamicPipeline(nodes, edges) {
  const re = /^(pch|xor|b|c|ks|cs|cl)-\d+$/;
  const keepIds = new Set(nodes.filter((n) => !re.test(n.id)).map((n) => n.id));
  const nextNodes = nodes.filter((n) => keepIds.has(n.id));
  const nextEdges = edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target));
  return { nodes: nextNodes, edges: nextEdges };
}

/**
 * How many byte-wide blocks the pipeline should spawn from the plaintext node (`p1`).
 * Text: one block per UTF-8 byte; bits: length / 8 (padded); image / ciphertext file → 1.
 *
 * @param {import("reactflow").Node | undefined} ptNode — node with `type === "plaintext"` (or compatible data)
 * @returns {number} ≥ 1
 */
export function countByteBlocksFromPlaintext(ptNode) {
  if (!ptNode?.data) return 1;
  if (ptNode.data.isDecryptMode) return 1;
  const t = ptNode.data.inputType;
  if (t === "image" || t === "encrypted" || t === "encryptedFile") return 1;
  if (t === "text") {
    const s = ptNode.data.value && String(ptNode.data.value).trim() !== "" ? ptNode.data.value : "";
    if (!s) return 1;
    const bytes = new TextEncoder().encode(s);
    return Math.max(1, bytes.length);
  }
  if (t === "bits") {
    const bits = String(ptNode.data.value || "").replace(/\s+/g, "").replace(/[^01]/g, "");
    if (!bits) return 1;
    const padded = bits.length % 8 ? bits + "0".repeat(8 - (bits.length % 8)) : bits;
    return Math.max(1, padded.length / 8);
  }
  return 1;
}

/**
 * Like flex `space-around` on the row [KeySnap | pipeline column] inside the cluster inner width:
 * edge = (inner − keyW − colW) / 4, gap between key and column = 2×edge.
 */
function clusterChildBase(i, xAbs) {
  const parentX = xAbs - KEY_SNAP_LEFT - CLUSTER_PAD_L;
  const parentY = Y_PCH - CLUSTER_PAD_T;
  const wInner = CLUSTER_W - CLUSTER_PAD_L - CLUSTER_PAD_R;
  const free = wInner - KEY_SNAP_NODE_W - PIPELINE_COL_W;
  let relXKs;
  let relXBlock;
  if (free <= 0) {
    relXKs = Math.max(6, CLUSTER_PAD_L - COL_NUDGE);
    relXBlock = relXKs + KEY_SNAP_NODE_W + KEY_BLOCK_GAP;
  } else {
    const edge = free / 4;
    const gapBetween = free / 2;
    relXKs = CLUSTER_PAD_L + edge;
    relXBlock = relXKs + KEY_SNAP_NODE_W + gapBetween;
  }
  /** Plaintext chunk, XOR, BlockCipher, Ciphertext share one vertical column (left edges aligned). */
  const relXColumn = relXBlock;
  return { parentX, parentY, relXBlock, relXColumn, relXKs };
}

/**
 * Build per-block nodes + edges. Plaintext master stays p1; chunks pch-0..pch-(n-1).
 * Each block is wrapped in parent `cl-i` with `extent: 'parent'` on children.
 * @param {"cbc"|"ecb"|"ctr"} chainMode
 */
export function buildByteBlockPipeline({
  numBlocks,
  chainMode,
  keyId = "k1",
  ivId = "iv1",
  ctrId = "ctr1",
}) {
  if (numBlocks < 1) numBlocks = 1;

  const nodes = [];
  const edges = [];

  for (let i = 0; i < numBlocks; i++) {
    const xAbs = X0 + i * COL;
    const { parentX, parentY, relXBlock, relXColumn, relXKs } = clusterChildBase(i, xAbs);

    const clusterFrameH = chainMode === "ctr" ? CLUSTER_H_CTR : CLUSTER_H;

    nodes.push({
      id: `cl-${i}`,
      type: "blockcluster",
      position: { x: parentX, y: parentY },
      style: { width: CLUSTER_W, height: clusterFrameH },
      data: { blockIndex: i, label: `Block ${i + 1}` },
      draggable: true,
      zIndex: 0,
      selectable: true,
    });

    const pchYRel =
      chainMode === "ctr" ? CLUSTER_PAD_T + CTR_TOP_RESERVE : CLUSTER_PAD_T;

    nodes.push({
      id: `pch-${i}`,
      type: "plaintextchunk",
      position: { x: relXColumn, y: pchYRel },
      parentNode: `cl-${i}`,
      extent: "parent",
      data: { blockIndex: i, sourcePlaintextId: "p1", blockSizeBits: 8 },
      draggable: true,
      zIndex: 1,
    });

    if (chainMode === "ctr") {
      const yCsCtr = CLUSTER_PAD_T;
      const yBlockCtr = Y_XOR - parentY + XOR_DROP_Y + CTR_TOP_RESERVE;
      const yXorCtr = Y_B - parentY + CTR_TOP_RESERVE;
      const yCCtr = Y_C - parentY + CTR_TOP_RESERVE;
      nodes.push(
        {
          id: `cs-${i}`,
          type: "ctrsnap",
          position: { x: relXColumn, y: yCsCtr },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: { sourceCtrId: ctrId, blockIndex: i },
          draggable: true,
          zIndex: 1,
        },
        {
          id: `xor-${i}`,
          type: "xor",
          position: { x: relXColumn, y: yXorCtr },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: {},
          draggable: true,
          zIndex: 1,
        },
        {
          id: `ks-${i}`,
          type: "keysnap",
          position: { x: relXKs + KEY_SNAP_DX, y: yBlockCtr + KEY_SNAP_DY },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: { sourceKeyId: keyId, blockIndex: i },
          draggable: true,
          zIndex: 1,
        },
        {
          id: `b-${i}`,
          type: "blockcipher",
          position: { x: relXBlock, y: yBlockCtr },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: { blockIndex: i, cipherType: "aes" },
          draggable: true,
          zIndex: 1,
        },
        {
          id: `c-${i}`,
          type: "ciphertext",
          position: { x: relXBlock, y: yCCtr },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: {},
          draggable: true,
          zIndex: 1,
        }
      );
      edges.push(
        {
          id: `e-pch-x-${i}`,
          source: `pch-${i}`,
          sourceHandle: "out",
          target: `xor-${i}`,
          targetHandle: "pt",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-plaintext)" },
        },
        {
          id: `e-cs-b-${i}`,
          source: `cs-${i}`,
          sourceHandle: "out",
          target: `b-${i}`,
          targetHandle: "ctr",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-ctr-input)" },
        },
        {
          id: `e-ks-b-${i}`,
          source: `ks-${i}`,
          sourceHandle: "out",
          target: `b-${i}`,
          targetHandle: "key",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-key)" },
        },
        {
          id: `e-b-x-${i}`,
          source: `b-${i}`,
          sourceHandle: "out",
          target: `xor-${i}`,
          targetHandle: "pcTop",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-block-out)" },
        },
        {
          id: `e-x-c-${i}`,
          source: `xor-${i}`,
          sourceHandle: "out",
          target: `c-${i}`,
          targetHandle: "in",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-xor-out)" },
        }
      );
    } else if (chainMode === "cbc") {
      nodes.push(
        {
          id: `xor-${i}`,
          type: "xor",
          position: { x: relXColumn, y: Y_XOR - parentY + XOR_DROP_Y },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: {},
          draggable: true,
          zIndex: 1,
        },
        {
          id: `ks-${i}`,
          type: "keysnap",
          position: { x: relXKs + KEY_SNAP_DX, y: Y_B - parentY + KEY_SNAP_DY },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: { sourceKeyId: keyId, blockIndex: i },
          draggable: true,
          zIndex: 1,
        },
        {
          id: `b-${i}`,
          type: "blockcipher",
          position: { x: relXBlock, y: Y_B - parentY },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: {},
          draggable: true,
          zIndex: 1,
        },
        {
          id: `c-${i}`,
          type: "ciphertext",
          position: { x: relXBlock, y: Y_C - parentY },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: {},
          draggable: true,
          zIndex: 1,
        }
      );
      edges.push(
        {
          id: `e-pch-x-${i}`,
          source: `pch-${i}`,
          sourceHandle: "out",
          target: `xor-${i}`,
          targetHandle: "pt",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-plaintext)" },
        },
        {
          id: `e-x-b-${i}`,
          source: `xor-${i}`,
          sourceHandle: "out",
          target: `b-${i}`,
          targetHandle: "xor",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-xor)" },
        },
        {
          id: `e-ks-b-${i}`,
          source: `ks-${i}`,
          sourceHandle: "out",
          target: `b-${i}`,
          targetHandle: "key",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-key)" },
        },
        {
          id: `e-b-c-${i}`,
          source: `b-${i}`,
          sourceHandle: "out",
          target: `c-${i}`,
          targetHandle: "in",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-block-out)" },
        }
      );
      if (i === 0) {
        edges.push({
          id: `e-iv-x-0`,
          source: ivId,
          sourceHandle: "out",
          target: `xor-0`,
          targetHandle: "pc",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-iv)" },
          hidden: true,
        });
      } else {
        edges.push({
          id: `e-c-x-${i}`,
          source: `c-${i - 1}`,
          sourceHandle: "out",
          target: `xor-${i}`,
          targetHandle: "pc",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-chain)" },
        });
      }
    } else {
      // ECB
      nodes.push(
        {
          id: `ks-${i}`,
          type: "keysnap",
          position: { x: relXKs + KEY_SNAP_DX, y: Y_B - parentY + KEY_SNAP_DY },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: { sourceKeyId: keyId, blockIndex: i },
          draggable: true,
          zIndex: 1,
        },
        {
          id: `b-${i}`,
          type: "blockcipher",
          position: { x: relXBlock, y: Y_B - parentY },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: {},
          draggable: true,
          zIndex: 1,
        },
        {
          id: `c-${i}`,
          type: "ciphertext",
          position: { x: relXBlock, y: Y_C - parentY },
          parentNode: `cl-${i}`,
          extent: "parent",
          data: {},
          draggable: true,
          zIndex: 1,
        }
      );
      edges.push(
        {
          id: `e-pch-b-${i}`,
          source: `pch-${i}`,
          sourceHandle: "out",
          target: `b-${i}`,
          targetHandle: "plaintext",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-chunk-to-block)" },
        },
        {
          id: `e-ks-b-${i}`,
          source: `ks-${i}`,
          sourceHandle: "out",
          target: `b-${i}`,
          targetHandle: "key",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-key)" },
        },
        {
          id: `e-b-c-${i}`,
          source: `b-${i}`,
          sourceHandle: "out",
          target: `c-${i}`,
          targetHandle: "in",
          animated: true,
          type: "step",
          style: { stroke: "var(--edge-block-out)" },
        }
      );
    }
  }

  return { nodes, edges };
}

/**
 * Rebuilds the dynamic multi-block subgraph: strip old `pch|xor|b|c|ks|cs|cl` instances, append a new pipeline.
 *
 * @param {import("reactflow").Node[]} baseNodes — current graph (includes masters + maybe old pipeline)
 * @param {import("reactflow").Edge[]} baseEdges
 * @param {number} numBlocks — target block count from `countByteBlocksFromPlaintext`
 * @param {"ecb"|"cbc"|"ctr"} chainMode
 * @returns {{ nodes: import("reactflow").Node[], edges: import("reactflow").Edge[] }}
 */
export function mergePipelineIntoGraph(baseNodes, baseEdges, numBlocks, chainMode) {
  const { nodes: strippedN, edges: strippedE } = stripDynamicPipeline(baseNodes, baseEdges);
  const { nodes: pipeN, edges: pipeE } = buildByteBlockPipeline({
    numBlocks,
    chainMode,
  });
  return {
    nodes: [...strippedN, ...pipeN],
    edges: [...strippedE, ...pipeE],
  };
}
