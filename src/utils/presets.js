// src/utils/presets.js

export function buildEcbPreset() {
  const nodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: 80, y: 40 },
      data: { id: 'p1', bits: '10110010' }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: 340, y: 40 },
      data: { id: 'k1', bits: '01010101' }
    },
    { id: 'b1', type: 'blockcipher', position: { x: 210, y: 160 }, data: {} },
    { id: 'c1', type: 'ciphertext', position: { x: 210, y: 300 }, data: {} },
  ];
  const edges = [
    { id: 'e-p-b', source: 'p1', sourceHandle: 'out', target: 'b1', targetHandle: 'plaintext' },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', target: 'b1', targetHandle: 'key' },
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out', target: 'c1', targetHandle: 'in' },
  ];
  return { nodes, edges };
}

export function buildCbcPreset() {
  return buildEcbPreset(); // şimdilik aynı
}

export function buildCtrPreset() {
  return buildEcbPreset(); // şimdilik aynı
}

export function buildFreePreset() {
  return { nodes: [], edges: [] };
}

// 🔑 BUNU MUTLAKA EXPORT ET
export function buildPreset(mode) {
  if (mode === 'ecb') return buildEcbPreset();
  if (mode === 'cbc') return buildCbcPreset();
  if (mode === 'ctr') return buildCtrPreset();
  return buildFreePreset();
}
