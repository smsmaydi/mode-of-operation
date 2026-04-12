import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CryptoJS from "crypto-js";
import { AES_SBOX, subByte, byteToSBoxCoord } from "../../utils/aesSBox";
import { getAesViewDataFromGraph } from "../../utils/aesViewData";

// Demo data when graph data is not available
const DEMO_INITIAL_STATE = [
  0x32, 0x88, 0x31, 0xe0, 0x43, 0x5a, 0x31, 0x37, 0xf6, 0x30, 0x98, 0x07,
  0xa8, 0x8d, 0xa2, 0x34,
];
const DEMO_ROUND_KEY = [
  0x2b, 0x28, 0xab, 0x09, 0x7e, 0xae, 0xf7, 0xcf, 0x15, 0xd2, 0x15, 0x4f,
  0x16, 0xa6, 0x88, 0x3c,
];

const CELL_SIZE_SBOX = 22;
const CELL_SIZE_STATE = 44;

/** Byte (0–255) → binary string with space: "0001 1010" */
function byteToBinaryStr(byte) {
  if (typeof byte !== "number" || byte < 0 || byte > 255) return "";
  return byte
    .toString(2)
    .padStart(8, "0")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** AES 4×4 state: row r (0–3) has indices [r, r+4, r+8, r+12] (column-major). */
function getShiftRowIndices(r) {
  return [r, r + 4, r + 8, r + 12];
}

/** Rotate array left by n. */
function rotateLeft(arr, n) {
  if (!arr.length) return [];
  n = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

/** Apply AES ShiftRows to 16-byte state (row r shifts left by r). */
function applyShiftRows(state) {
  const out = [...state];
  for (let r = 1; r <= 3; r++) {
    const idx = getShiftRowIndices(r);
    const rowVals = idx.map((i) => out[i]);
    const rotated = rotateLeft(rowVals, r);
    idx.forEach((i, c) => {
      out[i] = rotated[c];
    });
  }
  return out;
}

// ——— MixColumns (GF(2^8), irreducible 0x11b) ———
/** xtime(x) = 2·x in GF(2^8). */
function xtime(x) {
  const h = (x & 0x80) !== 0;
  return ((x << 1) & 0xff) ^ (h ? 0x1b : 0);
}

/** Multiply by 2 or 3 in GF(2^8). */
function gfMul2(x) {
  return xtime(x);
}
function gfMul3(x) {
  return xtime(x) ^ x;
}

/** AES MixColumns matrix (4×4, standard). Each column of state is multiplied by this matrix. */
const MIX_COLUMNS_MATRIX = [
  [0x02, 0x03, 0x01, 0x01],
  [0x01, 0x02, 0x03, 0x01],
  [0x01, 0x01, 0x02, 0x03],
  [0x03, 0x01, 0x01, 0x02],
];

/** Column c (0–3) in state: indices c*4 .. c*4+3 (column-major). */
function getColumnIndices(c) {
  return [c * 4, c * 4 + 1, c * 4 + 2, c * 4 + 3];
}

/** Mix one column (4 bytes) with the fixed matrix. */
function mixOneColumn(colBytes) {
  const [a, b, c, d] = colBytes;
  return [
    gfMul2(a) ^ gfMul3(b) ^ c ^ d,
    a ^ gfMul2(b) ^ gfMul3(c) ^ d,
    a ^ b ^ gfMul2(c) ^ gfMul3(d),
    gfMul3(a) ^ b ^ c ^ gfMul2(d),
  ];
}

/** Per-row breakdown for one column: coeffs, term values (after ×1/×2/×3), result. */
function getMixColumnDetail(colBytes) {
  const [a, b, c, d] = colBytes;
  const rows = [
    { coeffs: [0x02, 0x03, 0x01, 0x01], terms: [gfMul2(a), gfMul3(b), c, d] },
    { coeffs: [0x01, 0x02, 0x03, 0x01], terms: [a, gfMul2(b), gfMul3(c), d] },
    { coeffs: [0x01, 0x01, 0x02, 0x03], terms: [a, b, gfMul2(c), gfMul3(d)] },
    { coeffs: [0x03, 0x01, 0x01, 0x02], terms: [gfMul3(a), b, c, gfMul2(d)] },
  ];
  return rows.map((r) => ({
    ...r,
    result: r.terms[0] ^ r.terms[1] ^ r.terms[2] ^ r.terms[3],
  }));
}

/** Apply AES MixColumns to full 16-byte state. */
function applyMixColumns(state) {
  const out = [...state];
  for (let c = 0; c < 4; c++) {
    const idx = getColumnIndices(c);
    const col = idx.map((i) => out[i]);
    const mixed = mixOneColumn(col);
    idx.forEach((i, r) => {
      out[i] = mixed[r];
    });
  }
  return out;
}

// ——— AES Key Schedule (Round Key expansion) ———
/** Word = 4 bytes. Key columns: W0=0..3, W1=4..7, W2=8..11, W3=12..15. */
function getKeyWord(key16, wordIndex) {
  const start = wordIndex * 4;
  return [key16[start], key16[start + 1], key16[start + 2], key16[start + 3]];
}

/** RotWord: [a,b,c,d] → [b,c,d,a]. */
function rotWord(word) {
  return [word[1], word[2], word[3], word[0]];
}

/** SubWord: S-Box on each byte. */
function subWord(word, subByteFn) {
  return word.map((b) => subByteFn(b));
}

/** Rcon for round i (AES: first byte only, rest 0). Rcon[1]=0x01, Rcon[2]=0x02, ... */
function rcon(roundIndex) {
  let v = 1;
  for (let i = 1; i < roundIndex; i++) v = xtime(v);
  return [v, 0, 0, 0];
}

/** XOR two 4-byte arrays. */
function xorWords(a, b) {
  return a.map((_, i) => (a[i] ^ b[i]) & 0xff);
}

/** Next 128-bit round key (internal only; key schedule is not shown in the UI). */
function computeNextRoundKey(prevKey16, subByteFn, roundIndex = 1) {
  const W0 = getKeyWord(prevKey16, 0);
  const W1 = getKeyWord(prevKey16, 1);
  const W2 = getKeyWord(prevKey16, 2);
  const W3 = getKeyWord(prevKey16, 3);
  const rotW3 = rotWord(W3);
  const subRotW3 = subWord(rotW3, subByteFn);
  const rconVal = rcon(roundIndex);
  const T = xorWords(subRotW3, rconVal);
  const W4 = xorWords(W0, T);
  const W5 = xorWords(W1, W4);
  const W6 = xorWords(W2, W5);
  const W7 = xorWords(W3, W6);
  return [...W4, ...W5, ...W6, ...W7];
}

/** Expand key to K0..K10 (for whitening + full cipher math only). */
function expandKey(key16, subByteFn) {
  const keys = [key16];
  let prev = key16;
  for (let r = 0; r < 10; r++) {
    const nextKey = computeNextRoundKey(prev, subByteFn, r + 1);
    keys.push(nextKey);
    prev = nextKey;
  }
  return keys;
}

/** One pedagogical round: SubBytes → ShiftRows → MixColumns → AddRoundKey(roundKey). */
function runRoundSubShiftMixArk(state, roundKey) {
  const afterSubBytes = state.map((b) => subByte(b));
  const afterShiftRows = applyShiftRows(afterSubBytes);
  const afterMixColumns = applyMixColumns(afterShiftRows);
  const afterAddRoundKey = afterMixColumns.map((b, i) => (b ^ roundKey[i]) & 0xff);
  return { afterSubBytes, afterShiftRows, afterMixColumns, afterAddRoundKey };
}

/** Round 10: SubBytes → ShiftRows → AddRoundKey(K10). */
function runLastRoundPedagogical(state, k10) {
  const afterSubBytes = state.map((b) => subByte(b));
  const afterShiftRows = applyShiftRows(afterSubBytes);
  const afterAddRoundKey = afterShiftRows.map((b, i) => (b ^ k10[i]) & 0xff);
  return { afterSubBytes, afterShiftRows, afterMixColumns: null, afterAddRoundKey };
}

function SubBytesView({ payload, onClose, embedded = false }) {
  const derived = useMemo(() => {
    const hasPayload = payload?.nodes && payload?.edges && payload?.ciphertextId;
    console.log("[SubBytesView] useMemo derived", { hasPayload, nodesCount: payload?.nodes?.length, edgesCount: payload?.edges?.length, ciphertextId: payload?.ciphertextId });
    const result = hasPayload ? getAesViewDataFromGraph(payload.nodes, payload.edges, payload.ciphertextId) : null;
    console.log("[SubBytesView] getAesViewDataFromGraph result", result ? { stateBytesLen: result.stateBytes?.length, keyBytesLen: result.keyBytes?.length, statePreview: result.stateBytes?.slice(0, 4), keyPreview: result.keyBytes?.slice(0, 4) } : null);
    return result;
  }, [payload]);
  const initialState = useMemo(
    () => (derived?.stateBytes ? [...derived.stateBytes] : [...DEMO_INITIAL_STATE]),
    [derived]
  );
  const roundKey = useMemo(
    () => (derived?.keyBytes ? [...derived.keyBytes] : [...DEMO_ROUND_KEY]),
    [derived]
  );
  const keyValid = roundKey.length === 16 && roundKey.every((b) => b != null && typeof b === "number");
  const allKeys = useMemo(() => (keyValid ? expandKey(roundKey, subByte) : []), [keyValid, roundKey]);
  const whitenedState = useMemo(() => {
    if (!keyValid || allKeys.length !== 11) return null;
    return initialState.map((b, i) => (b ^ allKeys[0][i]) & 0xff);
  }, [keyValid, allKeys, initialState]);

  const roundOutputs = useMemo(() => {
    if (!keyValid || allKeys.length !== 11 || !whitenedState) return [];
    const out = [];
    let state = [...whitenedState];
    for (let r = 0; r < 9; r++) {
      const block = runRoundSubShiftMixArk(state, allKeys[r + 1]);
      out.push(block);
      state = block.afterAddRoundKey;
    }
    out.push(runLastRoundPedagogical(state, allKeys[10]));
    return out;
  }, [keyValid, allKeys, whitenedState]);

  const [activeRound, setActiveRound] = useState(() => payload?.initialRound ?? 0); // 0..9, display as Round 1..10

  const currentRoundInputState =
    activeRound === 0
      ? whitenedState ?? initialState
      : roundOutputs[activeRound - 1]?.afterAddRoundKey ?? Array(16).fill(null);

  const isLastRound = activeRound === 9;
  const completeAllPendingRef = useRef(false);

  // SubBytes input = round entry state (K₀ whitening + round keys are internal only; not shown)
  const subBytesInputState = currentRoundInputState;

  // —— SubBytes ——
  const [subBytesOutput, setSubBytesOutput] = useState(() => Array(16).fill(null));
  const [sbCursor, setSbCursor] = useState(0);
  const [sbPhase, setSbPhase] = useState(0);
  const [sbPlaying, setSbPlaying] = useState(false);
  const sbTimerRef = useRef(null);

  const sbComplete = sbCursor >= 16;
  const sbCurrentByte = sbCursor < 16 && subBytesInputState[sbCursor] != null ? subBytesInputState[sbCursor] : null;
  const sboxCoord = sbCurrentByte != null ? byteToSBoxCoord(sbCurrentByte) : null;

  const sbAdvance = useCallback(() => {
    if (sbCursor >= 16) {
      setSbPlaying(false);
      return;
    }
    if (subBytesInputState[sbCursor] == null) return;
    if (sbPhase === 0) {
      setSbPhase(1);
      return;
    }
    if (sbPhase === 1) {
      setSbPhase(2);
      return;
    }
    setSubBytesOutput((prev) => {
      const next = [...prev];
      next[sbCursor] = subByte(subBytesInputState[sbCursor]);
      return next;
    });
    setSbCursor((c) => c + 1);
    setSbPhase(0);
  }, [sbCursor, sbPhase, subBytesInputState]);

  const handleSbPrev = useCallback(() => {
    setSbPlaying(false);
    if (sbPhase === 2) {
      setSbPhase(1);
      return;
    }
    if (sbPhase === 1) {
      setSbPhase(0);
      return;
    }
    if (sbPhase === 0 && sbCursor > 0) {
      const prevCursor = sbCursor - 1;
      setSubBytesOutput((prev) => {
        const next = [...prev];
        next[prevCursor] = null;
        return next;
      });
      setSbCursor(prevCursor);
      setSbPhase(2);
    }
  }, [sbCursor, sbPhase]);

  useEffect(() => {
    if (!sbPlaying) return;
    const delay = sbPhase === 2 ? 400 : 600;
    const t = setTimeout(sbAdvance, delay);
    sbTimerRef.current = t;
    return () => clearTimeout(t);
  }, [sbPlaying, sbCursor, sbPhase, sbAdvance]);

  const handleSbReset = () => {
    setSbPlaying(false);
    setSbCursor(0);
    setSbPhase(0);
    setSubBytesOutput(Array(16).fill(null));
  };

  const handleShowSbResult = useCallback(() => {
    setSbPlaying(false);
    const full = Array.from({ length: 16 }, (_, i) =>
      subBytesInputState[i] != null ? subByte(subBytesInputState[i]) : null
    );
    setSubBytesOutput(full);
    setSbCursor(16);
    setSbPhase(0);
  }, [subBytesInputState]);

  // —— Shift Rows (input = SubBytes output) ——
  const shiftRowsInputState = subBytesOutput;
  const shiftRowsInputReady = shiftRowsInputState.every((b) => b != null);
  const [shiftRowsWorkingState, setShiftRowsWorkingState] = useState(() => Array(16).fill(null));
  const shiftRowsOutput = useMemo(() => {
    if (!shiftRowsInputReady) return Array(16).fill(null);
    return applyShiftRows(shiftRowsInputState);
  }, [shiftRowsInputReady, shiftRowsInputState]);
  const [srCursor, setSrCursor] = useState(0); // 0=row1, 1=row2, 2=row3, 3=done
  const [srPhase, setSrPhase] = useState(0); // 0=highlight, 1=slide, 2=apply
  const [srPlaying, setSrPlaying] = useState(false);
  const srTimerRef = useRef(null);

  const srComplete = srCursor >= 3;
  const srAdvance = useCallback(() => {
    if (srCursor >= 3) {
      setSrPlaying(false);
      return;
    }
    if (srPhase === 0) {
      setSrPhase(1);
      return;
    }
    if (srPhase === 1) {
      const rowIndex = srCursor; // 0->row1, 1->row2, 2->row3 (row 0 doesn't shift)
      const r = rowIndex + 1; // AES row 1,2,3 (shift by 1,2,3)
      const idx = getShiftRowIndices(r);
      setShiftRowsWorkingState((prev) => {
        const next = [...prev];
        const rowVals = idx.map((i) => next[i]);
        const rotated = rotateLeft(rowVals, r);
        idx.forEach((i, c) => {
          next[i] = rotated[c];
        });
        return next;
      });
      setSrCursor((c) => c + 1);
      setSrPhase(0);
      return;
    }
  }, [srCursor, srPhase]);

  const handleSrPrev = useCallback(() => {
    setSrPlaying(false);
    if (srPhase === 1) {
      setSrPhase(0);
      return;
    }
    if (srPhase === 0 && srCursor > 0 && shiftRowsInputReady) {
      const prevCursor = srCursor - 1;
      const r = prevCursor + 1; // row 1, 2, or 3
      const idx = getShiftRowIndices(r);
      setShiftRowsWorkingState((prev) => {
        const next = [...prev];
        idx.forEach((i, c) => {
          next[i] = shiftRowsInputState[i];
        });
        return next;
      });
      setSrCursor(prevCursor);
    }
  }, [srCursor, srPhase, shiftRowsInputReady, shiftRowsInputState]);

  useEffect(() => {
    if (!srPlaying) return;
    const delay = srPhase === 1 ? 500 : 400;
    const t = setTimeout(srAdvance, delay);
    srTimerRef.current = t;
    return () => clearTimeout(t);
  }, [srPlaying, srCursor, srPhase, srAdvance]);

  useEffect(() => {
    if (!shiftRowsInputReady) {
      setShiftRowsWorkingState(Array(16).fill(null));
      setSrCursor(0);
      setSrPhase(0);
      setSrPlaying(false);
      return;
    }
    setShiftRowsWorkingState([...shiftRowsInputState]);
  }, [shiftRowsInputReady, shiftRowsInputState]);

  const handleCompleteAllSteps = useCallback(() => {
    if (!subBytesInputState?.length || subBytesInputState.some((b) => b == null)) return;
    setSbPlaying(false);
    setSrPlaying(false);
    setMcPlaying(false);
    completeAllPendingRef.current = true;
    const fullSb = subBytesInputState.map((b) => subByte(b));
    setSubBytesOutput(fullSb);
    setSbCursor(16);
    setSbPhase(0);
  }, [subBytesInputState]);

  const handleSrReset = useCallback(() => {
    setSrPlaying(false);
    setSrCursor(0);
    setSrPhase(0);
    if (shiftRowsInputReady) setShiftRowsWorkingState([...shiftRowsInputState]);
  }, [shiftRowsInputReady, shiftRowsInputState]);

  const handleShowSrResult = useCallback(() => {
    setSrPlaying(false);
    if (!shiftRowsInputReady) return;
    setShiftRowsWorkingState(applyShiftRows(shiftRowsInputState));
    setSrCursor(3);
    setSrPhase(0);
  }, [shiftRowsInputReady, shiftRowsInputState]);

  // —— MixColumns (input = Shift Rows output), step = one column at a time ——
  const mixColumnsInputState = shiftRowsOutput;
  const mixColumnsInputReady = shiftRowsInputReady && mixColumnsInputState.every((b) => b != null);
  const [mcOutputState, setMcOutputState] = useState(() => Array(16).fill(null));
  const [mcCursor, setMcCursor] = useState(0); // 0..3 = column index
  const [mcPlaying, setMcPlaying] = useState(false);
  const mcTimerRef = useRef(null);

  const mcComplete = mcCursor >= 4;
  const mcAdvance = useCallback(() => {
    if (mcCursor >= 4) {
      setMcPlaying(false);
      return;
    }
    const idx = getColumnIndices(mcCursor);
    const col = idx.map((i) => mixColumnsInputState[i]);
    const mixed = mixOneColumn(col);
    setMcOutputState((prev) => {
      const next = [...prev];
      idx.forEach((i, r) => {
        next[i] = mixed[r];
      });
      return next;
    });
    setMcCursor((c) => c + 1);
  }, [mcCursor, mixColumnsInputState]);

  const handleMcPrev = useCallback(() => {
    setMcPlaying(false);
    if (mcCursor > 0) {
      const prevCol = mcCursor - 1;
      const idx = getColumnIndices(prevCol);
      setMcOutputState((prev) => {
        const next = [...prev];
        idx.forEach((i) => { next[i] = null; });
        return next;
      });
      setMcCursor(prevCol);
    }
  }, [mcCursor]);

  useEffect(() => {
    if (!mcPlaying) return;
    const t = setTimeout(mcAdvance, 550);
    mcTimerRef.current = t;
    return () => clearTimeout(t);
  }, [mcPlaying, mcCursor, mcAdvance]);

  useEffect(() => {
    if (!mixColumnsInputReady) {
      setMcOutputState(Array(16).fill(null));
      setMcCursor(0);
      setMcPlaying(false);
      return;
    }
  }, [mixColumnsInputReady]);

  const handleMcReset = useCallback(() => {
    setMcPlaying(false);
    setMcCursor(0);
    setMcOutputState(Array(16).fill(null));
  }, []);

  const handleShowMcResult = useCallback(() => {
    setMcPlaying(false);
    if (!mixColumnsInputReady) return;
    setMcOutputState(applyMixColumns(mixColumnsInputState));
    setMcCursor(4);
  }, [mixColumnsInputReady, mixColumnsInputState]);

  const canCompleteAllRound =
    subBytesInputState?.length === 16 && subBytesInputState.every((b) => b != null);

  useEffect(() => {
    if (!completeAllPendingRef.current) return;
    if (!shiftRowsInputReady || !subBytesOutput.every((b) => b != null)) return;
    completeAllPendingRef.current = false;
    const shifted = applyShiftRows(subBytesOutput);
    setShiftRowsWorkingState(shifted);
    setSrCursor(3);
    setSrPhase(0);
    if (!isLastRound) {
      setMcOutputState(applyMixColumns(shifted));
      setMcCursor(4);
      setMcPlaying(false);
    } else {
      setMcOutputState(Array(16).fill(null));
      setMcCursor(0);
    }
  }, [shiftRowsInputReady, subBytesOutput, isLastRound]);

  useEffect(() => {
    completeAllPendingRef.current = false;
    setSubBytesOutput(Array(16).fill(null));
    setSbCursor(0);
    setSbPhase(0);
    setSbPlaying(false);
    setShiftRowsWorkingState(Array(16).fill(null));
    setSrCursor(0);
    setSrPhase(0);
    setSrPlaying(false);
    setMcOutputState(Array(16).fill(null));
    setMcCursor(0);
    setMcPlaying(false);
  }, [initialState, roundKey, activeRound]);

  const rootLayout = embedded
    ? {
        position: "relative",
        flex: 1,
        minHeight: 0,
        zIndex: 1,
        overflow: "auto",
      }
    : {
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        overflow: "auto",
      };

  return (
    <div
      style={{
        ...rootLayout,
        background: "var(--aes-deck-gradient)",
        color: "var(--aes-deck-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "12px 20px",
          borderBottom: "1px solid var(--aes-deck-border)",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#111" }}>
          AES{derived?.isCtr ? " (CTR)" : ""} — Round {activeRound + 1} of 10
          {derived ? (
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--aes-deck-text-muted)", marginLeft: 10 }}>
              (using graph data)
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--aes-deck-text-faint)", marginLeft: 10 }}>
              (demo data)
            </span>
          )}
        </h1>
      </header>

      {/* Round + Step navigation at top */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          padding: "12px 20px",
          borderBottom: "1px solid var(--aes-deck-border)",
          flexShrink: 0,
          background: "var(--aes-deck-shade)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "#111", marginRight: 8, fontWeight: 600 }}>Round:</span>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isActive = activeRound === num - 1;
          return (
            <button
              key={num}
              type="button"
              className="nodrag"
              onClick={() => setActiveRound(num - 1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: isActive ? "2px solid var(--aes-deck-round-active-border)" : "1px solid var(--aes-deck-border-strong)",
                background: isActive ? "var(--aes-deck-round-active-bg)" : "var(--aes-deck-cell-bg)",
                color: "#111",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {num}
            </button>
          );
        })}
        <button
          type="button"
          className="nodrag"
          onClick={handleCompleteAllSteps}
          disabled={!canCompleteAllRound}
          title={
            canCompleteAllRound
              ? "Instantly complete SubBytes, ShiftRows, and MixColumns for this round"
              : "Round needs a full 16-byte input state"
          }
          style={{
            ...btnStyle,
            marginLeft: 10,
            opacity: canCompleteAllRound ? 1 : 0.5,
            cursor: canCompleteAllRound ? "pointer" : "not-allowed",
          }}
        >
          Complete all
        </button>
      </div>

      <div
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--aes-deck-border)",
          fontSize: 12,
          color: "var(--aes-deck-text-muted)",
          maxWidth: 920,
          margin: "0 auto",
          lineHeight: 1.45,
        }}
      >
        <strong>Note:</strong> This view shows only <strong>SubBytes</strong>, <strong>ShiftRows</strong>, and <strong>MixColumns</strong> (rounds 1–9). Initial AddRoundKey(K₀), per-round AddRoundKey, and the key schedule are applied internally so round boundaries stay correct — they are not animated here.
      </div>

      {/* ——— 1. SubBytes ——— */}
      <section style={{ padding: "20px 24px 24px", flex: "1 1 auto" }}>
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "var(--aes-deck-text)" }}>
          1. SubBytes
        </h2>
        <p style={{ fontSize: 13, color: "var(--aes-deck-text-muted)", marginBottom: 16 }}>
          Input = state at the start of this round (after internal whitening / round chaining). Each byte is replaced via the S-Box.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, marginBottom: 6, color: "var(--aes-deck-text)" }}>S-Box</div>
            <SBoxGrid cursor={sbCursor} phase={sbPhase} sboxCoord={sboxCoord} cellSize={CELL_SIZE_SBOX} />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 48,
            flexWrap: "wrap",
          }}
        >
          <StateGrid
            title="Input state (round entry)"
            values={subBytesInputState}
            outputState={subBytesOutput}
            cursor={sbCursor}
            phase={sbPhase}
            isOutput={false}
            cellSize={CELL_SIZE_STATE}
          />
          <StateGrid
            title="Output State (after SubBytes)"
            values={subBytesOutput}
            outputState={subBytesOutput}
            cursor={sbCursor}
            phase={sbPhase}
            isOutput={true}
            cellSize={CELL_SIZE_STATE}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="nodrag" style={btnStyle} onClick={() => (sbComplete ? (handleSbReset(), setSbPlaying(true)) : setSbPlaying((p) => !p))}>
            {sbComplete ? "▶ Play again" : sbPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleSbPrev} disabled={sbPlaying || (sbCursor === 0 && sbPhase === 0)}>
            Prev
          </button>
          <button className="nodrag" style={btnStyle} onClick={sbAdvance} disabled={sbPlaying || sbComplete || subBytesInputState[sbCursor] == null}>
            Next
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleSbReset}>
            Reset
          </button>
          <button
            className="nodrag"
            style={{
              ...btnStyle,
              background: "var(--aes-deck-btn-ghost-bg)",
              border: "1px solid var(--aes-deck-border-strong)",
              color: "var(--aes-deck-text)",
            }}
            onClick={handleShowSbResult}
            title="Skip animation and show final result"
            disabled={subBytesInputState.every((b) => b == null)}
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "var(--aes-deck-text-muted)" }}>
            Byte {Math.min(sbCursor, 15) + 1}/16
            {sbPhase === 0 && " — Input cell"}
            {sbPhase === 1 && " — S-Box lookup"}
            {sbPhase === 2 && " — Copy to output"}
          </span>
        </div>
      </section>

      {/* ——— 2. Shift Rows ——— */}
      <section
        style={{
          padding: "20px 24px 24px",
          borderTop: "1px solid var(--aes-deck-border)",
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "var(--aes-deck-text)" }}>
          2. Shift Rows
        </h2>
        <p style={{ fontSize: 13, color: "var(--aes-deck-text-muted)", marginBottom: 16 }}>
          Row 0 unchanged; row 1 shifts 1 left, row 2 shifts 2 left, row 3 shifts 3 left (cyclic).
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <ShiftRowsStaticGrid
            title="Input (SubBytes output)"
            values={shiftRowsInputState}
            cellSize={CELL_SIZE_STATE}
          />
          <ShiftRowsMiddleGrid
            title="Shift animation"
            workingState={shiftRowsWorkingState}
            srCursor={srCursor}
            srPhase={srPhase}
            cellSize={CELL_SIZE_STATE}
          />
          <ShiftRowsStaticGrid
            title="Output (after Shift Rows)"
            values={shiftRowsOutput}
            cellSize={CELL_SIZE_STATE}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            className="nodrag"
            style={btnStyle}
            onClick={() => (srComplete ? (handleSrReset(), setSrPlaying(true)) : setSrPlaying((p) => !p))}
            disabled={!shiftRowsInputReady}
          >
            {srComplete ? "▶ Play again" : srPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleSrPrev} disabled={srPlaying || !shiftRowsInputReady || (srCursor === 0 && srPhase === 0)}>
            Prev
          </button>
          <button
            className="nodrag"
            style={btnStyle}
            onClick={srAdvance}
            disabled={srPlaying || srComplete || !shiftRowsInputReady}
          >
            Next
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleSrReset} disabled={!shiftRowsInputReady}>
            Reset
          </button>
          <button
            className="nodrag"
            style={{
              ...btnStyle,
              background: "var(--aes-deck-btn-ghost-bg)",
              border: "1px solid var(--aes-deck-border-strong)",
              color: "var(--aes-deck-text)",
            }}
            onClick={handleShowSrResult}
            title="Skip animation and show final result"
            disabled={!shiftRowsInputReady}
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "var(--aes-deck-text-muted)" }}>
            Row {srCursor < 3 ? srCursor + 1 : 3}/3
            {srPhase === 0 && " — Highlight row"}
            {srPhase === 1 && " — Row sliding left"}
          </span>
        </div>
      </section>

      {!isLastRound && (
      <>
      {/* ——— 3. MixColumns ——— */}
      <section
        style={{
          padding: "20px 24px 24px",
          borderTop: "1px solid var(--aes-deck-border)",
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "var(--aes-deck-text)" }}>
          3. MixColumns
        </h2>
        <p style={{ fontSize: 13, color: "var(--aes-deck-text-muted)", marginBottom: 16 }}>
          Each column of the state is multiplied by the fixed matrix below (in GF(2^8)). Column 0, then 1, 2, 3.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 40,
            flexWrap: "wrap",
          }}
        >
          <MixColumnsInputGrid
            title="Input (Shift Rows output)"
            values={mixColumnsInputState}
            highlightColumn={mcComplete ? null : mcCursor}
            cellSize={CELL_SIZE_STATE}
          />
          <MixColumnsMatrixWithDetail
            currentColumn={mcComplete ? 3 : mcCursor}
            inputState={mixColumnsInputState}
            inputReady={mixColumnsInputReady}
          />
          <ShiftRowsStaticGrid
            title="Output (after MixColumns)"
            values={mcOutputState}
            cellSize={CELL_SIZE_STATE}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            className="nodrag"
            style={btnStyle}
            onClick={() => (mcComplete ? (handleMcReset(), setMcPlaying(true)) : setMcPlaying((p) => !p))}
            disabled={!mixColumnsInputReady}
          >
            {mcComplete ? "▶ Play again" : mcPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleMcPrev} disabled={mcPlaying || mcCursor === 0}>
            Prev
          </button>
          <button
            className="nodrag"
            style={btnStyle}
            onClick={mcAdvance}
            disabled={mcPlaying || mcComplete || !mixColumnsInputReady}
          >
            Next
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleMcReset} disabled={!mixColumnsInputReady}>
            Reset
          </button>
          <button
            className="nodrag"
            style={{
              ...btnStyle,
              background: "var(--aes-deck-btn-ghost-bg)",
              border: "1px solid var(--aes-deck-border-strong)",
              color: "var(--aes-deck-text)",
            }}
            onClick={handleShowMcResult}
            title="Skip animation and show final result"
            disabled={!mixColumnsInputReady}
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "var(--aes-deck-text-muted)" }}>
            Column {Math.min(mcCursor, 3) + 1}/4
          </span>
        </div>
      </section>
      </>
      )}

      {isLastRound && roundOutputs[9] && initialState?.length === 16 && roundKey?.length === 16 && (() => {
          const keyHex = roundKey.map((b) => b.toString(16).padStart(2, "0")).join("");
          let expectedFirstBlockHex = "";
          try {
            const key = CryptoJS.enc.Hex.parse(keyHex);
            const blockInputHex = initialState.map((b) => b.toString(16).padStart(2, "0")).join("");
            const blockWords = CryptoJS.enc.Hex.parse(blockInputHex);
            const encrypted = CryptoJS.AES.encrypt(blockWords, key, {
              mode: CryptoJS.mode.ECB,
              padding: CryptoJS.pad.NoPadding,
            });
            expectedFirstBlockHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex).slice(0, 32);
          } catch (e) {
            expectedFirstBlockHex = "(error)";
          }
          const stepsHex = roundOutputs[9].afterAddRoundKey.map((b) => b.toString(16).padStart(2, "0")).join("");
          const match = stepsHex.toLowerCase() === expectedFirstBlockHex.toLowerCase();
          return (
            <div style={{ marginTop: 16, padding: 12, background: "var(--aes-deck-shade)", borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: "var(--aes-deck-text)", marginBottom: 6 }}>
                Verification — single AES block (ECB, no padding): same 128-bit input as the graph (ECB block, CBC pre-cipher XOR, or CTR counter block)
              </div>
              <div style={{ color: "var(--aes-deck-text-muted)", fontFamily: "monospace", wordBreak: "break-all" }}>
                Step-by-step final state (hex): {stepsHex}
              </div>
              <div style={{ color: "var(--aes-deck-text-muted)", fontFamily: "monospace", wordBreak: "break-all" }}>
                Expected (CryptoJS): {expectedFirstBlockHex}
              </div>
              <div style={{ marginTop: 6, color: match ? "var(--aes-deck-match-ok)" : "var(--aes-deck-match-bad)" }}>
                {match ? "✓ Match" : "✗ Mismatch — check key and 128-bit block input from the graph"}
              </div>
            </div>
          );
        })()}

    </div>
  );
}

/** AES state: byte index i → grid (row, col). Display: column-major, top to bottom. */
function stateIndexToGrid(k) {
  const row = Math.floor(k / 4);
  const col = k % 4;
  return row + col * 4;
}

/** Fixed MixColumns matrix display (small 4×4 block). */
function MixColumnsMatrixDisplay() {
  const cellSize = 40;
  return (
    <div
      style={{
        display: "inline-grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 6,
        background: "var(--aes-deck-shade-deep)",
        padding: 10,
        borderRadius: 12,
        border: "1px solid var(--aes-deck-border)",
      }}
    >
      {MIX_COLUMNS_MATRIX.flatMap((row, rowIndex) =>
        row.map((val, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            style={{
              width: cellSize,
              height: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              fontFamily: "monospace",
              fontWeight: 600,
              fontSize: 14,
              background: "var(--step-accent-soft)",
              border: "1px solid var(--aes-deck-border-strong)",
            }}
          >
            {val.toString(16).toUpperCase().padStart(2, "0")}
          </div>
        ))
      )}
    </div>
  );
}

/** One row of MixColumns: formula with coeff·byte and term values, then result. */
function MixColumnRowDetail({ rowIndex, coeffs, terms, result, colBytes }) {
  return (
    <div
      style={{
        background: "var(--aes-deck-cell-bg)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 6,
        border: "1px solid var(--aes-deck-border)",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--aes-deck-text)", fontFamily: "monospace", marginBottom: 4 }}>
        <strong>Out[{rowIndex}]</strong> = {coeffs.map((co, i) => `${co.toString(16).toUpperCase().padStart(2, "0")}·${colBytes[i] != null ? colBytes[i].toString(16).toUpperCase().padStart(2, "0") : "?"}`).join(" ⊕ ")}
      </div>
      <div style={{ fontSize: 11, color: "var(--aes-deck-text-muted)", fontFamily: "monospace" }}>
        = ({terms.map((t) => (t != null ? t.toString(16).toUpperCase().padStart(2, "0") : "?")).join(") ⊕ (")}) = <strong style={{ color: "var(--aes-deck-xor-strong)" }}>{result != null ? result.toString(16).toUpperCase().padStart(2, "0") : "?"}</strong>
      </div>
    </div>
  );
}

/** Detail panel: current column bytes + per-row calculation. */
function MixColumnsDetailPanel({ currentColumn, inputState, inputReady }) {
  const idx = getColumnIndices(currentColumn);
  const colBytes = idx.map((i) => inputState[i]);
  const hasValues = colBytes.every((b) => b != null);
  const detail = hasValues ? getMixColumnDetail(colBytes) : null;
  return (
    <div style={{ minWidth: 320, maxWidth: 380 }}>
      <div style={{ fontSize: 13, marginBottom: 8, color: "var(--aes-deck-text)" }}>
        Column {currentColumn} — how it is computed
      </div>
      <div style={{ fontSize: 11, color: "var(--aes-deck-text-muted)", marginBottom: 8 }}>
        Column bytes [s₀, s₁, s₂, s₃] = [{colBytes.map((b) => (b != null ? b.toString(16).toUpperCase().padStart(2, "0") : "?")).join(", ")}]
      </div>
      {!inputReady || !hasValues ? (
        <div style={{ fontSize: 12, color: "var(--aes-deck-text-faint)", fontStyle: "italic" }}>
          Input not ready or column empty. Use Step to advance.
        </div>
      ) : (
        detail.map((row, r) => (
          <MixColumnRowDetail
            key={r}
            rowIndex={r}
            coeffs={row.coeffs}
            terms={row.terms}
            result={row.result}
            colBytes={colBytes}
          />
        ))
      )}
    </div>
  );
}

/** Center: matrix + detail panel for current column. */
function MixColumnsMatrixWithDetail({ currentColumn, inputState, inputReady }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        background: "var(--aes-deck-shade)",
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--aes-deck-border)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, marginBottom: 8, color: "var(--aes-deck-text)" }}>
          MixColumns matrix (GF(2^8))
        </div>
        <MixColumnsMatrixDisplay />
      </div>
      <MixColumnsDetailPanel
        currentColumn={currentColumn}
        inputState={inputState}
        inputReady={inputReady}
      />
    </div>
  );
}

/** 4×4 state grid with optional column highlight (for MixColumns input). */
function MixColumnsInputGrid({ title, values, highlightColumn, cellSize }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, marginBottom: 8, color: "var(--aes-deck-text)" }}>{title}</div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: GRID_GAP,
          background: "var(--aes-deck-shade-deep)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid var(--aes-deck-border)",
        }}
      >
        {Array.from({ length: 16 }, (_, k) => {
          const i = stateIndexToGrid(k);
          const val = values[i];
          const col = Math.floor(i / 4);
          const isHighlight = highlightColumn !== null && col === highlightColumn;
          const isHovered = hovered === i;
          const showBinary = isHovered && typeof val === "number";
          return (
            <motion.div
              key={i}
              animate={{
                backgroundColor: isHighlight ? "var(--aes-deck-cell-highlight-bg)" : "var(--aes-deck-cell-bg)",
                boxShadow: isHighlight ? "0 0 0 2px var(--surface)" : "none",
              }}
              transition={{ duration: 0.25 }}
              style={{
                width: cellSize,
                height: cellSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                fontFamily: "monospace",
                fontWeight: 600,
                fontSize: 12,
                overflow: "visible",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {val != null ? (
                <span style={{ fontSize: showBinary ? 9 : 12 }}>
                  {showBinary ? byteToBinaryStr(val) : val.toString(16).toUpperCase().padStart(2, "0")}
                </span>
              ) : (
                <span style={{ color: "var(--aes-deck-text-faint)" }}>—</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const GRID_GAP = 6;

/** Simple 4×4 state grid (no animation). */
function ShiftRowsStaticGrid({ title, values, cellSize }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, marginBottom: 8, color: "var(--aes-deck-text)" }}>{title}</div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: GRID_GAP,
          background: "var(--aes-deck-shade-deep)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid var(--aes-deck-border)",
        }}
      >
        {Array.from({ length: 16 }, (_, k) => {
          const i = stateIndexToGrid(k);
          const val = values[i];
          const isHovered = hovered === i;
          const showBinary = isHovered && typeof val === "number";
          return (
            <motion.div
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                fontFamily: "monospace",
                fontWeight: 600,
                fontSize: 12,
                background: "var(--aes-deck-cell-bg)",
                overflow: "visible",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {val != null ? (
                <span style={{ fontSize: showBinary ? 9 : 12 }}>
                  {showBinary ? byteToBinaryStr(val) : val.toString(16).toUpperCase().padStart(2, "0")}
                </span>
              ) : (
                <span style={{ color: "var(--aes-deck-text-faint)" }}>—</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** One row that slides left by n positions (marquee). */
function MarqueeRow({ rowValues, shiftBy, cellSize }) {
  const stepPx = cellSize + GRID_GAP;
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        display: "flex",
        gap: GRID_GAP,
        overflow: "hidden",
        width: cellSize * 4 + GRID_GAP * 3,
        margin: "0 auto",
        borderRadius: 8,
      }}
    >
      <motion.div
        style={{
          display: "flex",
          gap: GRID_GAP,
          flexShrink: 0,
        }}
        initial={{ x: 0 }}
        animate={{ x: -shiftBy * stepPx }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
      >
        {[...rowValues, ...rowValues.slice(0, shiftBy)].map((byte, c) => (
          <div
            key={c}
            style={{
              width: cellSize,
              height: cellSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              fontFamily: "monospace",
              fontWeight: 600,
              fontSize: 12,
              background: "var(--aes-deck-round-active-bg)",
              boxShadow: "0 0 0 2px var(--surface)",
              flexShrink: 0,
            }}
          >
            {byte != null ? byte.toString(16).toUpperCase().padStart(2, "0") : "—"}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** Middle grid: working state with marquee animation for current row. */
function ShiftRowsMiddleGrid({ title, workingState, srCursor, srPhase, cellSize }) {
  const [hovered, setHovered] = useState(null);
  const animatingRow = srPhase === 1 ? srCursor + 1 : null; // AES row 1,2,3 (r=1,2,3)
  const rows = [0, 1, 2, 3];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, marginBottom: 8, color: "var(--aes-deck-text)" }}>{title}</div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: GRID_GAP,
          background: "var(--aes-deck-shade-deep)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid var(--aes-deck-border)",
        }}
      >
        {rows.map((r) => {
          const idx = getShiftRowIndices(r);
          const rowVals = idx.map((i) => workingState[i]);
          const isAnimating = animatingRow === r && r >= 1;
          const isHighlight = srPhase === 0 && srCursor === r - 1 && r >= 1;
          if (isAnimating) {
            return (
              <MarqueeRow
                key={r}
                rowValues={rowVals}
                shiftBy={r}
                cellSize={cellSize}
              />
            );
          }
          return idx.map((i) => {
            const val = workingState[i];
            const isHovered = hovered === i;
            const showBinary = isHovered && typeof val === "number";
            return (
              <motion.div
                key={i}
                layout
                animate={{
                  backgroundColor: isHighlight ? "var(--aes-deck-cell-highlight-bg)" : "var(--aes-deck-cell-bg)",
                  boxShadow: isHighlight ? "0 0 0 2px var(--surface)" : "none",
                }}
                transition={{ duration: 0.25 }}
                style={{
                  width: cellSize,
                  height: cellSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  fontSize: 12,
                  overflow: "visible",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {val != null ? (
                  <span style={{ fontSize: showBinary ? 9 : 12 }}>
                    {showBinary ? byteToBinaryStr(val) : val.toString(16).toUpperCase().padStart(2, "0")}
                  </span>
                ) : (
                  <span style={{ color: "var(--aes-deck-text-faint)" }}>—</span>
                )}
              </motion.div>
            );
          });
        })}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "8px 14px",
  background: "var(--aes-deck-primary-btn)",
  border: "none",
  borderRadius: 8,
  color: "var(--step-on-deck)",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

function SBoxGrid({ cursor, phase, sboxCoord, cellSize }) {
  const [hovered, setHovered] = useState(null); // { row, col }
  const rows = useMemo(() => {
    const r = [];
    for (let row = 0; row < 16; row++) {
      const cells = [];
      for (let col = 0; col < 16; col++) {
        const value = AES_SBOX[row * 16 + col];
        cells.push({ row, col, value });
      }
      r.push(cells);
    }
    return r;
  }, []);

  return (
    <div
      style={{
        display: "inline-block",
        background: "var(--aes-deck-shade-deep)",
        borderRadius: 12,
        padding: 12,
        border: "1px solid var(--aes-deck-border)",
      }}
    >
      <table style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ width: cellSize, height: 20, fontSize: 10 }}></th>
            {Array.from({ length: 16 }, (_, i) => {
              const isHighlightCol = sboxCoord && sboxCoord.col === i;
              return (
                <th
                  key={i}
                  style={{
                    width: cellSize,
                    height: 20,
                    fontSize: 11,
                    fontWeight: isHighlightCol ? 700 : 400,
                    color: isHighlightCol ? "var(--aes-deck-text)" : "var(--aes-deck-text-muted)",
                    background: isHighlightCol ? "var(--aes-deck-cell-highlight-bg)" : "transparent",
                    borderRadius: 4,
                  }}
                >
                  {i.toString(16).toUpperCase()}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((rowCells, row) => {
            const isHighlightRow = sboxCoord && sboxCoord.row === row;
            return (
            <tr key={row}>
              <td
                style={{
                  height: cellSize,
                  width: cellSize,
                  fontSize: 11,
                  fontWeight: isHighlightRow ? 700 : 400,
                  color: isHighlightRow ? "var(--aes-deck-text)" : "var(--aes-deck-text-muted)",
                  background: isHighlightRow ? "var(--aes-deck-cell-highlight-bg)" : "transparent",
                  textAlign: "right",
                  paddingRight: 4,
                  borderRadius: 4,
                }}
              >
                {row.toString(16).toUpperCase()}
              </td>
              {rowCells.map(({ col, value }) => {
                const isHighlight =
                  phase >= 1 &&
                  sboxCoord &&
                  sboxCoord.row === row &&
                  sboxCoord.col === col;
                const isHovered = hovered && hovered.row === row && hovered.col === col;
                const showBinary = isHovered;
                return (
                  <td key={col} style={{ padding: 0 }}>
                    <motion.div
                      layout
                      initial={false}
                      animate={{
                        scale: isHighlight ? 1.15 : 1,
                        backgroundColor: isHighlight
                          ? "var(--aes-deck-cell-highlight-strong)"
                          : "var(--aes-deck-cell-bg)",
                        boxShadow: isHighlight
                          ? "0 0 0 2px var(--surface)"
                          : "none",
                      }}
                      transition={{ duration: 0.25 }}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: isHighlight ? 700 : 500,
                        borderRadius: 4,
                        overflow: "visible",
                        fontFamily: "monospace",
                      }}
                      onMouseEnter={() => setHovered({ row, col })}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <motion.div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transformOrigin: "center",
                        }}
                        animate={{ scale: isHovered ? 1.3 : 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={showBinary ? "bin" : "hex"}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            style={{
                              fontSize: showBinary ? 7 : 10,
                              lineHeight: 1.2,
                            }}
                          >
                            {showBinary ? byteToBinaryStr(value) : value.toString(16).toUpperCase().padStart(2, "0")}
                          </motion.span>
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StateGrid({
  title,
  values,
  outputState,
  cursor,
  phase,
  isOutput,
  cellSize,
  inputByte,
  sboxOutput,
}) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 14,
          marginBottom: 10,
          color: "var(--aes-deck-text)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          background: "var(--aes-deck-shade-deep)",
          padding: 14,
          borderRadius: 12,
          border: "1px solid var(--aes-deck-border)",
        }}
      >
        {Array.from({ length: 16 }, (_, k) => {
          const i = stateIndexToGrid(k);
          const val = values[i];
          const isInputHighlight = !isOutput && cursor === i && phase >= 0;
          const isOutputFilling = isOutput && cursor === i && phase === 2;
          const isOutputFilled = isOutput && outputState[i] != null;
          const showValue = isOutput ? (outputState[i] != null ? outputState[i] : null) : val;
          const isHovered = hovered === i;
          const showBinary = isHovered && typeof showValue === "number";

          return (
            <motion.div
              key={i}
              layout
              initial={false}
              animate={{
                backgroundColor: isInputHighlight
                  ? "var(--aes-deck-cell-highlight-bg)"
                  : isOutputFilling || isOutputFilled
                  ? "var(--aes-deck-success-cell)"
                  : "var(--aes-deck-cell-bg)",
                boxShadow:
                  isInputHighlight || isOutputFilling
                    ? "0 0 0 2px var(--surface)"
                    : "none",
                scale: isInputHighlight || isOutputFilling ? 1.08 : 1,
              }}
              transition={{ duration: 0.3 }}
              style={{
                width: cellSize,
                height: cellSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                fontFamily: "monospace",
                overflow: "visible",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <motion.div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transformOrigin: "center",
                  fontWeight: 600,
                }}
                animate={{ scale: isHovered ? 1.25 : 1 }}
                transition={{ duration: 0.2 }}
              >
                <AnimatePresence mode="wait">
                  {showValue != null ? (
                    <motion.span
                      key={showBinary ? "bin" : "hex"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ fontSize: showBinary ? 9 : 13, lineHeight: 1.2 }}
                    >
                      {showBinary ? byteToBinaryStr(showValue) : showValue.toString(16).toUpperCase().padStart(2, "0")}
                    </motion.span>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      style={{ color: "var(--aes-deck-text-faint)", fontSize: 13 }}
                    >
                      —
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default SubBytesView;
