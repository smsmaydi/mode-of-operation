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
    { id: 'e-p-b', source: 'p1', sourceHandle: 'out', target: 'b1', targetHandle: 'plaintext', animated: true, data: {}, style: { stroke: 'green' } },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', target: 'b1', targetHandle: 'key', animated: true, data: {}, style: { stroke: 'blue' } },
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out', target: 'c1', targetHandle: 'in', animated: true, data: {}, style: { stroke: 'orange' } },
  ];

  return { nodes, edges };
}

export function buildCbcPreset() {
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
    { id: 'iv1', type: 'iv', position: { x: -100, y: -50 }, data: { bits: '00001111' } },
  ];

  const edges = [
    { id: 'e-p-b', source: 'p1', sourceHandle: 'out', target: 'b1', targetHandle: 'plaintext', animated: true, data: {}, style: { stroke: 'green' } },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', target: 'b1', targetHandle: 'key', animated: true, data: {}, style: { stroke: 'blue' } },
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out', target: 'c1', targetHandle: 'in', animated: true, data: {}, style: { stroke: 'orange' } },
    { id: 'e-iv-b', source: 'iv1', sourceHandle: 'out', target: 'b1', targetHandle: 'iv', animated: true, data: {}, style: { stroke: 'red' } },
  ];

  return { nodes, edges };
}


export function buildCtrPreset() {
  return buildEcbPreset();
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
