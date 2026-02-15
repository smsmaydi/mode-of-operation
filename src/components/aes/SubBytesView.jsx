import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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

/** Compute next round key from current 16-byte key. roundIndex = 1..10 (Rcon(1) for K1, Rcon(2) for K2, ...). Returns { nextKey, detail }. */
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
  const nextKey = [...W4, ...W5, ...W6, ...W7];
  return {
    nextKey,
    detail: {
      W0, W1, W2, W3,
      rotW3,
      subRotW3,
      rcon1: rconVal,
      T,
      W4, W5, W6, W7,
    },
  };
}

/** Expand 16-byte key to 11 round keys (K0..K10) for AES-128. */
function expandKey(key16, subByteFn) {
  const keys = [key16];
  let prev = key16;
  for (let r = 0; r < 10; r++) {
    const { nextKey } = computeNextRoundKey(prev, subByteFn, r + 1);
    keys.push(nextKey);
    prev = nextKey;
  }
  return keys;
}

/** One full round (AddRoundKey → SubBytes → ShiftRows → MixColumns). Returns state after each step. */
function runFullRound(state, key) {
  const afterAddRk = state.map((b, i) => (b ^ key[i]) & 0xff);
  const afterSubBytes = afterAddRk.map((b) => subByte(b));
  const afterShiftRows = applyShiftRows(afterSubBytes);
  const afterMixColumns = applyMixColumns(afterShiftRows);
  return { afterAddRk, afterSubBytes, afterShiftRows, afterMixColumns };
}

/** Last round (no MixColumns): AddRoundKey(K9) → SubBytes → ShiftRows → AddRoundKey(K10) = ciphertext. */
function runLastRound(state, k9, k10) {
  const afterAddRk = state.map((b, i) => (b ^ k9[i]) & 0xff);
  const afterSubBytes = afterAddRk.map((b) => subByte(b));
  const afterShiftRows = applyShiftRows(afterSubBytes);
  const ciphertext = afterShiftRows.map((b, i) => (b ^ k10[i]) & 0xff);
  return { afterAddRk, afterSubBytes, afterShiftRows, ciphertext };
}

function SubBytesView({ payload, onClose }) {
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
  const roundOutputs = useMemo(() => {
    if (!keyValid || allKeys.length !== 11) return [];
    const out = [];
    let state = [...initialState];
    for (let r = 0; r < 9; r++) {
      out.push(runFullRound(state, allKeys[r]));
      state = out[r].afterMixColumns;
    }
    out.push(runLastRound(state, allKeys[9], allKeys[10]));
    return out;
  }, [keyValid, allKeys, initialState]);

  const [activeRound, setActiveRound] = useState(() => payload?.initialRound ?? 0); // 0..9, display as Round 1..10
  const activeStep = 0; // no longer used (Prev/Next are per-section); kept so any stale ref doesn't throw

  const currentRoundInputState =
    activeRound === 0 ? initialState : roundOutputs[activeRound - 1]?.afterMixColumns ?? Array(16).fill(null);
  const currentRoundKey = allKeys[activeRound] ?? roundKey;
  const isLastRound = activeRound === 9;

  // —— AddRoundKey ——
  const [addRoundKeyOutput, setAddRoundKeyOutput] = useState(() => Array(16).fill(null));
  const [arkCursor, setArkCursor] = useState(0);
  const [arkPhase, setArkPhase] = useState(0);
  const [arkPlaying, setArkPlaying] = useState(false);
  const arkTimerRef = useRef(null);

  const arkComplete = arkCursor >= 16;
  const arkAdvance = useCallback(() => {
    if (arkCursor >= 16) {
      setArkPlaying(false);
      return;
    }
    if (arkPhase === 0) {
      setArkPhase(1);
      return;
    }
    if (arkPhase === 1) {
      setArkPhase(2);
      return;
    }
    setAddRoundKeyOutput((prev) => {
      const next = [...prev];
      next[arkCursor] = currentRoundInputState[arkCursor] ^ currentRoundKey[arkCursor];
      return next;
    });
    setArkCursor((c) => c + 1);
    setArkPhase(0);
  }, [arkCursor, arkPhase, currentRoundInputState, currentRoundKey]);

  const handleArkPrev = useCallback(() => {
    setArkPlaying(false);
    if (arkPhase === 2) {
      setArkPhase(1);
      return;
    }
    if (arkPhase === 1) {
      setArkPhase(0);
      return;
    }
    if (arkPhase === 0 && arkCursor > 0) {
      const prevCursor = arkCursor - 1;
      setAddRoundKeyOutput((prev) => {
        const next = [...prev];
        next[prevCursor] = null;
        return next;
      });
      setArkCursor(prevCursor);
      setArkPhase(2);
    }
  }, [arkCursor, arkPhase]);

  useEffect(() => {
    if (!arkPlaying) return;
    const delay = arkPhase === 2 ? 400 : 550;
    const t = setTimeout(arkAdvance, delay);
    arkTimerRef.current = t;
    return () => clearTimeout(t);
  }, [arkPlaying, arkCursor, arkPhase, arkAdvance]);

  // SubBytes input = AddRoundKey output
  const subBytesInputState = addRoundKeyOutput;

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

  const handleArkReset = () => {
    setArkPlaying(false);
    setArkCursor(0);
    setArkPhase(0);
    setAddRoundKeyOutput(Array(16).fill(null));
    setSubBytesOutput(Array(16).fill(null));
    setSbCursor(0);
    setSbPhase(0);
    setSbPlaying(false);
  };
  const handleSbReset = () => {
    setSbPlaying(false);
    setSbCursor(0);
    setSbPhase(0);
    setSubBytesOutput(Array(16).fill(null));
  };

  const handleShowArkResult = useCallback(() => {
    setArkPlaying(false);
    const full = Array.from({ length: 16 }, (_, i) => currentRoundInputState[i] ^ currentRoundKey[i]);
    setAddRoundKeyOutput(full);
    setArkCursor(16);
    setArkPhase(0);
  }, [currentRoundInputState, currentRoundKey]);

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
  const mixColumnsOutput = useMemo(() => {
    if (!mixColumnsInputReady) return Array(16).fill(null);
    return applyMixColumns(mixColumnsInputState);
  }, [mixColumnsInputReady, mixColumnsInputState]);
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

  // —— Round Key 1 (key schedule: Round 0 key → Round 1 key) ——
  const rk1InputReady = !isLastRound && currentRoundKey.length === 16 && currentRoundKey.every((b) => b != null && typeof b === "number");
  const rk1RoundIndex = activeRound + 1; // 1..10: which next key we derive (K1, K2, ... K10)
  const rk1Detail = useMemo(() => {
    if (!rk1InputReady) return null;
    return computeNextRoundKey(currentRoundKey, subByte, rk1RoundIndex);
  }, [rk1InputReady, currentRoundKey, rk1RoundIndex]);

  // —— K10 derivation (for Round 10: how K10 was obtained from K9) ——
  const rk10Detail = useMemo(() => {
    if (!keyValid || !allKeys[9] || allKeys.length < 11) return null;
    return computeNextRoundKey(allKeys[9], subByte, 10);
  }, [keyValid, allKeys]);
  const rk1FullOutput = useMemo(() => (rk1Detail ? rk1Detail.nextKey : Array(16).fill(null)), [rk1Detail]);
  const [rk1OutputState, setRk1OutputState] = useState(() => Array(16).fill(null));
  const [rk1Cursor, setRk1Cursor] = useState(0); // 0..3 = new column index (W4, W5, W6, W7)
  const [rk1Playing, setRk1Playing] = useState(false);
  const rk1TimerRef = useRef(null);

  const rk1Complete = rk1Cursor >= 4;
  const rk1Advance = useCallback(() => {
    if (rk1Cursor >= 4 || !rk1Detail) {
      setRk1Playing(false);
      return;
    }
    const cols = [rk1Detail.detail.W4, rk1Detail.detail.W5, rk1Detail.detail.W6, rk1Detail.detail.W7];
    const col = cols[rk1Cursor];
    const idx = getColumnIndices(rk1Cursor);
    setRk1OutputState((prev) => {
      const next = [...prev];
      idx.forEach((i, r) => {
        next[i] = col[r];
      });
      return next;
    });
    setRk1Cursor((c) => c + 1);
  }, [rk1Cursor, rk1Detail]);

  const handleRk1Prev = useCallback(() => {
    setRk1Playing(false);
    if (rk1Cursor > 0) {
      const prevCol = rk1Cursor - 1;
      const idx = getColumnIndices(prevCol);
      setRk1OutputState((prev) => {
        const next = [...prev];
        idx.forEach((i) => { next[i] = null; });
        return next;
      });
      setRk1Cursor(prevCol);
    }
  }, [rk1Cursor]);

  useEffect(() => {
    if (!rk1Playing) return;
    const t = setTimeout(rk1Advance, 600);
    rk1TimerRef.current = t;
    return () => clearTimeout(t);
  }, [rk1Playing, rk1Cursor, rk1Advance]);

  useEffect(() => {
    if (!rk1InputReady) {
      setRk1OutputState(Array(16).fill(null));
      setRk1Cursor(0);
      setRk1Playing(false);
    }
  }, [rk1InputReady]);

  const handleRk1Reset = useCallback(() => {
    setRk1Playing(false);
    setRk1Cursor(0);
    setRk1OutputState(Array(16).fill(null));
  }, []);

  const handleShowRk1Result = useCallback(() => {
    setRk1Playing(false);
    if (!rk1InputReady || !rk1Detail) return;
    setRk1OutputState(rk1Detail.nextKey);
    setRk1Cursor(4);
  }, [rk1InputReady, rk1Detail]);

  /** Complete all steps of the current round at once (fill from precomputed roundOutputs). */
  const handleCompleteAllRound = useCallback(() => {
    if (!roundOutputs[activeRound]) return;
    const out = roundOutputs[activeRound];
    setArkPlaying(false);
    setSbPlaying(false);
    setSrPlaying(false);
    setMcPlaying(false);
    setRk1Playing(false);
    setAddRoundKeyOutput(out.afterAddRk);
    setArkCursor(16);
    setArkPhase(0);
    setSubBytesOutput(out.afterSubBytes);
    setSbCursor(16);
    setSbPhase(0);
    setShiftRowsWorkingState(out.afterShiftRows);
    setSrCursor(3);
    setSrPhase(0);
    if (out.afterMixColumns) {
      setMcOutputState(out.afterMixColumns);
      setMcCursor(4);
    }
    if (!isLastRound && allKeys[activeRound + 1]) {
      setRk1OutputState(allKeys[activeRound + 1]);
      setRk1Cursor(4);
    }
  }, [activeRound, roundOutputs, isLastRound, allKeys]);

  useEffect(() => {
    setAddRoundKeyOutput(Array(16).fill(null));
    setArkCursor(0);
    setArkPhase(0);
    setArkPlaying(false);
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
    setRk1OutputState(Array(16).fill(null));
    setRk1Cursor(0);
    setRk1Playing(false);
  }, [initialState, roundKey, activeRound]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
        color: "#eee",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflow: "auto",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
          AES — Round {activeRound + 1} of 10
          {derived ? (
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginLeft: 10 }}>
              (using graph data)
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginLeft: 10 }}>
              (demo data)
            </span>
          )}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="nodrag"
            onClick={handleCompleteAllRound}
            disabled={!roundOutputs[activeRound]}
            style={{
              padding: "8px 14px",
              background: "rgba(34, 197, 94, 0.5)",
              border: "1px solid rgba(34, 197, 94, 0.8)",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
            title="Complete all steps of this round at once"
          >
            Complete all
          </button>
          <button
            onClick={() => onClose(activeRound)}
            className="nodrag"
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Back to graph
          </button>
        </div>
      </header>

      {/* Round + Step navigation at top */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
          background: "rgba(0,0,0,0.2)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginRight: 8 }}>Round:</span>
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
                border: isActive ? "2px solid rgba(99, 102, 241, 0.9)" : "1px solid rgba(255,255,255,0.25)",
                background: isActive ? "rgba(99, 102, 241, 0.35)" : "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* ——— 1. AddRoundKey ——— */}
      <section
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "rgba(255,255,255,0.95)" }}>
          1. AddRoundKey (K{activeRound})
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 16, maxWidth: 720 }}>
          State is XORed with Round Key {activeRound + 1}. 4×4 grid is <strong>column-major</strong>. Input state is {activeRound === 0 ? "plaintext" : "output of previous round MixColumns"}.
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
          <AddRoundKeyGrid title={`Round Key ${activeRound + 1} (K${activeRound})`} values={currentRoundKey} cursor={arkCursor} phase={arkPhase} highlightKey cellSize={CELL_SIZE_STATE} />
          <AddRoundKeyGrid title={activeRound === 0 ? "State (plaintext)" : "State (after previous MixColumns)"} values={currentRoundInputState} cursor={arkCursor} phase={arkPhase} highlightState cellSize={CELL_SIZE_STATE} />
          <AddRoundKeyGrid title="State ⊕ Round Key (output)" values={addRoundKeyOutput} cursor={arkCursor} phase={arkPhase} isOutput cellSize={CELL_SIZE_STATE} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="nodrag" style={btnStyle} onClick={() => (arkComplete ? (handleArkReset(), setArkPlaying(true)) : setArkPlaying((p) => !p))}>
            {arkComplete ? "▶ Play again" : arkPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleArkPrev} disabled={arkPlaying || (arkCursor === 0 && arkPhase === 0)}>
            Prev
          </button>
          <button className="nodrag" style={btnStyle} onClick={arkAdvance} disabled={arkPlaying || arkComplete}>
            Next
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleArkReset}>
            Reset
          </button>
          <button
            className="nodrag"
            style={{ ...btnStyle, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)" }}
            onClick={handleShowArkResult}
            title="Skip animation and show final result"
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            Byte {Math.min(arkCursor, 15) + 1}/16
            {arkPhase === 0 && " — State cell"}
            {arkPhase === 1 && " — Round key cell"}
            {arkPhase === 2 && " — XOR → output"}
          </span>
        </div>
      </section>

      {/* ——— 2. SubBytes ——— */}
      <section style={{ padding: "20px 24px 24px", flex: "1 1 auto" }}>
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "rgba(255,255,255,0.95)" }}>
          2. SubBytes
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 16 }}>
          Input state = AddRoundKey output. Each byte is replaced via the S-Box.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, marginBottom: 6, color: "rgba(255,255,255,0.8)" }}>S-Box</div>
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
            title="Input State (AddRoundKey output)"
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
            style={{ ...btnStyle, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)" }}
            onClick={handleShowSbResult}
            title="Skip animation and show final result"
            disabled={subBytesInputState.every((b) => b == null)}
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            Byte {Math.min(sbCursor, 15) + 1}/16
            {sbPhase === 0 && " — Input cell"}
            {sbPhase === 1 && " — S-Box lookup"}
            {sbPhase === 2 && " — Copy to output"}
          </span>
        </div>
      </section>

      {/* ——— 3. Shift Rows ——— */}
      <section
        style={{
          padding: "20px 24px 24px",
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "rgba(255,255,255,0.95)" }}>
          3. Shift Rows
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 16 }}>
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
            style={{ ...btnStyle, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)" }}
            onClick={handleShowSrResult}
            title="Skip animation and show final result"
            disabled={!shiftRowsInputReady}
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            Row {srCursor < 3 ? srCursor + 1 : 3}/3
            {srPhase === 0 && " — Highlight row"}
            {srPhase === 1 && " — Row sliding left"}
          </span>
        </div>
      </section>

      {isLastRound && roundOutputs[9] && (
        <section
          style={{
            padding: "20px 24px 24px",
            borderTop: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* 4. Round Key 10 (Key Schedule): between Shift Rows and Final AddRoundKey */}
          {rk10Detail && (
            <>
              <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "rgba(255,255,255,0.95)" }}>
                4. Round Key 10 (Key Schedule)
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 16, maxWidth: 720 }}>
                K10 (needed for the final step) is derived from K9 the same way as K1 from K0: RotWord(W3), SubWord, Rcon(10), then W4–W7.
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
                <ShiftRowsStaticGrid title="K9 (current)" values={allKeys[9]} cellSize={CELL_SIZE_STATE} />
                <RoundKey1DetailPanel
                  detail={rk10Detail}
                  roundIndex={10}
                  currentColumn={3}
                  inputReady={true}
                />
                <ShiftRowsStaticGrid title="K10 (new)" values={allKeys[10]} cellSize={CELL_SIZE_STATE} />
              </div>
            </>
          )}

          <h2 style={{ fontSize: 16, margin: rk10Detail ? "24px 0 8px" : "0 0 8px", color: "rgba(255,255,255,0.95)" }}>
            5. Final AddRoundKey (K10) → Ciphertext
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 16 }}>
            Last round has no MixColumns. State after Shift Rows is XORed with K10 (from step 4) to produce the ciphertext.
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
              title="State (after Shift Rows)"
              values={roundOutputs[9].afterShiftRows}
              cellSize={CELL_SIZE_STATE}
            />
            <ShiftRowsStaticGrid
              title="K10"
              values={allKeys[10]}
              cellSize={CELL_SIZE_STATE}
            />
            <ShiftRowsStaticGrid
              title="Ciphertext"
              values={roundOutputs[9].ciphertext}
              cellSize={CELL_SIZE_STATE}
            />
          </div>
          {/* Verification: compare Steps ciphertext with CryptoJS first block (same as Enc node) */}
          {initialState?.length === 16 && roundKey?.length === 16 && (() => {
            const keyHex = roundKey.map((b) => b.toString(16).padStart(2, "0")).join("");
            const plaintextStr = (typeof derived?.plaintextString === "string" && derived.plaintextString.length > 0)
              ? derived.plaintextString
              : String.fromCharCode(...initialState);
            let expectedFirstBlockHex = "";
            try {
              const key = CryptoJS.enc.Hex.parse(keyHex);
              if (derived?.isCbc && derived?.ivBytes?.length === 16) {
                const ivHex = derived.ivBytes.map((b) => b.toString(16).padStart(2, "0")).join("");
                const iv = CryptoJS.enc.Hex.parse(ivHex);
                const encrypted = CryptoJS.AES.encrypt(plaintextStr, key, {
                  mode: CryptoJS.mode.CBC,
                  iv,
                  padding: CryptoJS.pad.Pkcs7,
                });
                const fullHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
                expectedFirstBlockHex = fullHex.slice(0, 32);
              } else {
                const encrypted = CryptoJS.AES.encrypt(plaintextStr, key, {
                  mode: CryptoJS.mode.ECB,
                  padding: CryptoJS.pad.Pkcs7,
                });
                const fullHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
                expectedFirstBlockHex = fullHex.slice(0, 32);
              }
            } catch (e) {
              expectedFirstBlockHex = "(error)";
            }
            const stepsHex = roundOutputs[9].ciphertext.map((b) => b.toString(16).padStart(2, "0")).join("");
            const match = stepsHex.toLowerCase() === expectedFirstBlockHex.toLowerCase();
            return (
              <div style={{ marginTop: 16, padding: 12, background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 12 }}>
                <div style={{ color: "rgba(255,255,255,0.9)", marginBottom: 6 }}>Verification (first block = Enc node){derived?.isCbc ? " — CBC" : ""}</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace", wordBreak: "break-all" }}>
                  Steps: {stepsHex}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontFamily: "monospace", wordBreak: "break-all" }}>
                  Expected (CryptoJS): {expectedFirstBlockHex}
                </div>
                <div style={{ marginTop: 6, color: match ? "#7dd87d" : "#f08" }}>
                  {match ? "✓ Match" : "✗ Mismatch — check key/plaintext format or AES steps"}
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {!isLastRound && (
      <>
      {/* ——— 4. MixColumns ——— */}
      <section
        style={{
          padding: "20px 24px 24px",
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "rgba(255,255,255,0.95)" }}>
          4. MixColumns
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 16 }}>
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
            style={{ ...btnStyle, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)" }}
            onClick={handleShowMcResult}
            title="Skip animation and show final result"
            disabled={!mixColumnsInputReady}
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            Column {Math.min(mcCursor, 3) + 1}/4
          </span>
        </div>
      </section>

      {/* ——— 5. Round Key (Key Schedule) ——— */}
      <section
        style={{
          padding: "20px 24px 24px",
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "rgba(255,255,255,0.95)" }}>
          5. Round Key {activeRound + 1} (Key Schedule)
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 16, maxWidth: 720 }}>
          Derive next round key from current one. Current key = K{activeRound} (4 words W0–W3). Next key = K{activeRound + 1} (W4–W7).
          The next round key is W4, W5, W6, W7. We take the last word W3, rotate it left by one byte, apply the S-Box to each byte,
          XOR with a round constant Rcon({activeRound + 1}), then XOR that result T with W0 to get W4. The remaining columns are: W5 = W1 ⊕ W4, W6 = W2 ⊕ W5, W7 = W3 ⊕ W6.
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
            title={`K${activeRound} (current)`}
            values={currentRoundKey}
            cellSize={CELL_SIZE_STATE}
          />
          <RoundKey1DetailPanel
            detail={rk1Detail}
            roundIndex={rk1RoundIndex}
            currentColumn={rk1Complete ? 3 : rk1Cursor}
            inputReady={rk1InputReady}
          />
          <MixColumnsInputGrid
            title={`K${activeRound + 1} (new)`}
            values={rk1OutputState}
            highlightColumn={rk1Complete ? null : rk1Cursor}
            cellSize={CELL_SIZE_STATE}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            className="nodrag"
            style={btnStyle}
            onClick={() => (rk1Complete ? (handleRk1Reset(), setRk1Playing(true)) : setRk1Playing((p) => !p))}
            disabled={!rk1InputReady}
          >
            {rk1Complete ? "▶ Play again" : rk1Playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleRk1Prev} disabled={rk1Playing || rk1Cursor === 0}>
            Prev
          </button>
          <button
            className="nodrag"
            style={btnStyle}
            onClick={rk1Advance}
            disabled={rk1Playing || rk1Complete || !rk1InputReady}
          >
            Next
          </button>
          <button className="nodrag" style={btnStyle} onClick={handleRk1Reset} disabled={!rk1InputReady}>
            Reset
          </button>
          <button
            className="nodrag"
            style={{ ...btnStyle, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)" }}
            onClick={handleShowRk1Result}
            title="Skip animation and show final result"
            disabled={!rk1InputReady}
          >
            Show result
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            Column {Math.min(rk1Cursor, 3) + 1}/4 (W{Math.min(rk1Cursor, 3) + 4})
          </span>
        </div>
      </section>
      </>
      )}

      {/* Footer: Round navigation + Complete all */}
      <footer
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
          background: "rgba(0,0,0,0.2)",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginRight: 4 }}>Round:</span>
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
                border: isActive ? "2px solid rgba(99, 102, 241, 0.9)" : "1px solid rgba(255,255,255,0.25)",
                background: isActive ? "rgba(99, 102, 241, 0.35)" : "rgba(255,255,255,0.08)",
                color: "#fff",
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
          className="nodrag"
          onClick={handleCompleteAllRound}
          disabled={!roundOutputs[activeRound]}
          style={{
            marginLeft: 8,
            padding: "8px 14px",
            background: "rgba(34, 197, 94, 0.5)",
            border: "1px solid rgba(34, 197, 94, 0.8)",
            borderRadius: 8,
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
          title="Complete all steps of this round at once"
        >
          Complete all
        </button>
      </footer>
    </div>
  );
}

/** AES state: byte index i → grid (row, col). Display: column-major, top to bottom. */
function stateIndexToGrid(k) {
  const row = Math.floor(k / 4);
  const col = k % 4;
  return row + col * 4;
}

/** Format 4-byte word as hex. */
function wordHex(w) {
  return w.map((b) => (b != null ? b.toString(16).toUpperCase().padStart(2, "0") : "?")).join(" ");
}

/** Key schedule detail: explanatory step-by-step in English. roundIndex = 1..10 (which key we derive). */
function RoundKey1DetailPanel({ detail, roundIndex = 1, currentColumn, inputReady }) {
  const stepBox = (title, desc, value, highlight) => (
    <div
      style={{
        background: highlight ? "rgba(99, 102, 241, 0.25)" : "rgba(255,255,255,0.06)",
        border: highlight ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 8,
        fontFamily: "monospace",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.95)", marginBottom: 2 }}>
        {title}
      </div>
      {desc && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", marginBottom: 4, lineHeight: 1.3 }}>
          {desc}
        </div>
      )}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)" }}>
        {value}
      </div>
    </div>
  );
  if (!inputReady) {
    return (
      <div
        style={{
          minWidth: 300,
          background: "rgba(0,0,0,0.2)",
          padding: 14,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>
          How Round Key {roundIndex} is computed
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
          The Round 0 key must be 16 bytes. Enter a key in the graph (Key node, 128-bit hex).
        </div>
      </div>
    );
  }
  if (!detail) {
    return (
      <div style={{ minWidth: 300, padding: 14, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
        Computing…
      </div>
    );
  }
  const d = detail.detail;
  return (
    <div
      style={{
        minWidth: 300,
        maxWidth: 380,
        background: "rgba(0,0,0,0.2)",
        padding: 14,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "rgba(255,255,255,0.9)" }}>
        How Round Key {roundIndex} is computed
      </div>
      {stepBox(
        "1. W3 (last column of current key)",
        `We use the fourth 4-byte word of K${roundIndex - 1}.`,
        wordHex(d.W3),
        false
      )}
      {stepBox(
        "2. RotWord(W3)",
        "Rotate left by one byte: [a,b,c,d] → [b,c,d,a].",
        wordHex(d.rotW3),
        false
      )}
      {stepBox(
        "3. SubWord(RotWord(W3))",
        "Apply the AES S-Box to each byte of the rotated word.",
        wordHex(d.subRotW3),
        false
      )}
      {stepBox(
        `4. Rcon(${roundIndex})`,
        `Round constant for round ${roundIndex}: first byte = 0x${(d.rcon1 && d.rcon1[0] != null ? d.rcon1[0].toString(16).toUpperCase().padStart(2, "0") : "01")}, rest zero. Prevents symmetry.`,
        wordHex(d.rcon1),
        false
      )}
      {stepBox(
        `5. T = SubWord(RotWord(W3)) ⊕ Rcon(${roundIndex})`,
        "XOR the S-Box result with the round constant. This is the \"temp\" word.",
        wordHex(d.T),
        false
      )}
      {stepBox(
        "6. W4 = W0 ⊕ T",
        "First column of the new key: XOR first column of old key with T.",
        wordHex(d.W4),
        currentColumn === 0
      )}
      {stepBox(
        "7. W5 = W1 ⊕ W4",
        "Second column: XOR second column of old key with W4.",
        wordHex(d.W5),
        currentColumn === 1
      )}
      {stepBox(
        "8. W6 = W2 ⊕ W5",
        "Third column: XOR third column of old key with W5.",
        wordHex(d.W6),
        currentColumn === 2
      )}
      {stepBox(
        "9. W7 = W3 ⊕ W6",
        "Fourth column: XOR fourth column of old key with W6.",
        wordHex(d.W7),
        currentColumn === 3
      )}
    </div>
  );
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
        background: "rgba(0,0,0,0.25)",
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
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
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
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
  const labels = ["s₀", "s₁", "s₂", "s₃"];
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 6,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontFamily: "monospace", marginBottom: 4 }}>
        <strong>Out[{rowIndex}]</strong> = {coeffs.map((co, i) => `${co.toString(16).toUpperCase().padStart(2, "0")}·${colBytes[i] != null ? colBytes[i].toString(16).toUpperCase().padStart(2, "0") : "?"}`).join(" ⊕ ")}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontFamily: "monospace" }}>
        = ({terms.map((t) => (t != null ? t.toString(16).toUpperCase().padStart(2, "0") : "?")).join(") ⊕ (")}) = <strong style={{ color: "rgba(34, 197, 94, 0.95)" }}>{result != null ? result.toString(16).toUpperCase().padStart(2, "0") : "?"}</strong>
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
      <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>
        Column {currentColumn} — how it is computed
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
        Column bytes [s₀, s₁, s₂, s₃] = [{colBytes.map((b) => (b != null ? b.toString(16).toUpperCase().padStart(2, "0") : "?")).join(", ")}]
      </div>
      {!inputReady || !hasValues ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
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
        background: "rgba(0,0,0,0.2)",
        padding: 16,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>
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
      <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>{title}</div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: GRID_GAP,
          background: "rgba(0,0,0,0.25)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
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
                backgroundColor: isHighlight ? "rgba(99, 102, 241, 0.5)" : "rgba(255,255,255,0.08)",
                boxShadow: isHighlight ? "0 0 0 2px rgba(255,255,255,0.9)" : "none",
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
                <span style={{ color: "rgba(255,255,255,0.4)" }}>—</span>
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
      <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>{title}</div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: GRID_GAP,
          background: "rgba(0,0,0,0.25)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
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
                background: "rgba(255,255,255,0.08)",
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
                <span style={{ color: "rgba(255,255,255,0.4)" }}>—</span>
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
              background: "rgba(99, 102, 241, 0.35)",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
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
      <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>{title}</div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: GRID_GAP,
          background: "rgba(0,0,0,0.25)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
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
                  backgroundColor: isHighlight ? "rgba(99, 102, 241, 0.5)" : "rgba(255,255,255,0.08)",
                  boxShadow: isHighlight ? "0 0 0 2px rgba(255,255,255,0.9)" : "none",
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
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>—</span>
                )}
              </motion.div>
            );
          });
        })}
      </div>
    </div>
  );
}

function AddRoundKeyGrid({ title, values, cursor, phase, isOutput, highlightKey, highlightState, cellSize }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, marginBottom: 8, color: "rgba(255,255,255,0.85)" }}>{title}</div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          background: "rgba(0,0,0,0.25)",
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {Array.from({ length: 16 }, (_, k) => {
          const i = stateIndexToGrid(k);
          const val = values[i];
          const isHighlight =
            (phase === 0 && highlightState && cursor === i) ||
            (phase === 1 && highlightKey && cursor === i);
          const isFilling = isOutput && cursor === i && phase === 2;
          const isFilled = isOutput && values[i] != null;
          const showVal = isOutput ? values[i] : val;
          const isHovered = hovered === i;
          const showBinary = isHovered && typeof showVal === "number";

          return (
            <motion.div
              key={i}
              layout
              initial={false}
              animate={{
                backgroundColor: isHighlight
                  ? "rgba(99, 102, 241, 0.5)"
                  : isFilling || isFilled
                  ? "rgba(34, 197, 94, 0.35)"
                  : "rgba(255,255,255,0.08)",
                boxShadow: isHighlight || isFilling ? "0 0 0 2px rgba(255,255,255,0.9)" : "none",
                scale: isHighlight || isFilling ? 1.08 : 1,
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
                  {showVal != null ? (
                    <motion.span
                      key={showBinary ? "bin" : "hex"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        fontSize: showBinary ? 9 : 12,
                        lineHeight: 1.2,
                      }}
                    >
                      {showBinary ? byteToBinaryStr(showVal) : showVal.toString(16).toUpperCase().padStart(2, "0")}
                    </motion.span>
                  ) : (
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>—</span>
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

const btnStyle = {
  padding: "8px 14px",
  background: "rgba(99, 102, 241, 0.9)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
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
        background: "rgba(0,0,0,0.25)",
        borderRadius: 12,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.12)",
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
                    color: isHighlightCol ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.8)",
                    background: isHighlightCol ? "rgba(99, 102, 241, 0.5)" : "transparent",
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
                  color: isHighlightRow ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.8)",
                  background: isHighlightRow ? "rgba(99, 102, 241, 0.5)" : "transparent",
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
                          ? "rgba(99, 102, 241, 0.7)"
                          : "rgba(255,255,255,0.08)",
                        boxShadow: isHighlight
                          ? "0 0 0 2px rgba(255,255,255,0.9)"
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
          color: "rgba(255,255,255,0.85)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          background: "rgba(0,0,0,0.25)",
          padding: 14,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
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
                  ? "rgba(99, 102, 241, 0.5)"
                  : isOutputFilling || isOutputFilled
                  ? "rgba(34, 197, 94, 0.35)"
                  : "rgba(255,255,255,0.08)",
                boxShadow:
                  isInputHighlight || isOutputFilling
                    ? "0 0 0 2px rgba(255,255,255,0.9)"
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
                      style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}
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
