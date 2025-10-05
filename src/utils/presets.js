// src/utils/presets.js

export function buildEcbPreset() {
  const nodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: 280, y: -50 },
      data: {
        inputType: 'bits',
        value: '10110010',
      }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -100, y: 140 },
      data: {
        bits: '01010101',
      }
    },
    { id: 'b1', type: 'blockcipher', position: { x: 210, y: 160 }, data: {} },
    { id: 'c1', type: 'ciphertext', position: { x: 210, y: 300 }, data: {} },
  ];

  const edges = [
    { id: 'e-p-b', source: 'p1', sourceHandle: 'out', target: 'b1', targetHandle: 'plaintext', animated: true, data: {}, style: { stroke: 'lightgreen' } },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', target: 'b1', targetHandle: 'key', animated: true, data: {}, style: { stroke: 'lightblue' } },
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out', target: 'c1', targetHandle: 'in', animated: true, data: {}, style: { stroke: 'orange' } },
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

export function buildPreset(mode) {
  if (mode === 'ecb') return buildEcbPreset();
  if (mode === 'cbc') return buildCbcPreset();
  if (mode === 'ctr') return buildCtrPreset();
  return buildFreePreset();
}
