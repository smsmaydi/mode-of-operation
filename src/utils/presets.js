// src/utils/presets.js
import StepEdge from './../components/layout/StepEdge';
import SineEdge from './../components/layout/SineEdge';

export function buildEcbPreset() {
  const nodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: 220, y: -260 },
      data: {
        inputType: 'bits',
        value: '01001000',  // "H" in binary
      }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -260, y: 80 },
      data: {
        bits: '01010101',
      }
    },
    { id: 'b1', type: 'blockcipher', position: { x: 220, y: 120 }, data: {} },
    { id: 'c1', type: 'ciphertext', position: { x: 220, y: 360 }, data: {} },
  ];

  const edges = [
    { id: 'e-p-b', source: 'p1', sourceHandle: 'out', target: 'b1', targetHandle: 'plaintext', animated: true, data: {}, style: { stroke: 'green' } },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', target: 'b1', targetHandle: 'key', animated: true, data: {}, style: { stroke: 'blue' } },
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out', target: 'c1', targetHandle: 'in', animated: true, data: {}, style: { stroke: 'orange' } },
  ];

  return { nodes, edges };
}
export function checkModeForDeleteButton(){
  
}

export function buildCbcPreset() {
    const nodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: 260, y: -400 },
      data: {
        inputType: 'bits',
        value: '00011100',
      }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -100, y: 160 },
      data: {
        bits: '01010101',
      }
    },
    { id: 'b1', type: 'blockcipher', position: { x: 260, y: 160 }, data: {} },
    { id: 'c1', type: 'ciphertext', position: { x: 260, y: 350 }, data: {} },
    { id: 'iv1', type: 'iv', position: { x: -100, y: -70 }, data: { bits: '00001111000011110000111100001111000011110000111100001111000011110000111100001111000011110000111100001111000011110000111100001111' } },
    { id: 'x1', type: 'xor', position: { x: 260, y: -70 }, data: {} },
  ];

  const edgeTypes = {
    step: StepEdge,
    sine: SineEdge,
  };

  const edges = [
    { id: 'e-p-x', source: 'p1', sourceHandle: 'out', target: 'x1', targetHandle: 'pt', animated: true, data: {}, style: { stroke: 'green' } , type: "step" },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', target: 'b1', targetHandle: 'key', animated: true, data: {}, style: { stroke: 'blue' } , type: "step"},
    { id: 'e-b-c', source: 'b1', sourceHandle: 'out', target: 'c1', targetHandle: 'in', animated: true, data: {}, style: { stroke: 'orange' } , type: "step"},
    { id: 'e-iv-x', source: 'iv1', sourceHandle: 'out', target: 'x1', targetHandle: 'pc', animated: true, data: {}, style: { stroke: 'red' } , type: "step"},
    { id: 'e-x-b', source: 'x1', sourceHandle: 'out', target: 'b1', targetHandle: 'xor', animated: true, data: {}, style: { stroke: 'purple' }, type: "step"},
  ];

  return { nodes, edges };
}


export function buildCtrPreset() {
  const nodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: -280, y: 260 },
      data: {
        inputType: 'bits',
        value: '10110010',
      }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -240, y: 80 },
      data: {
        bits: '01010101',
      }
    },
    {
      id: 'ctr1',
      type: 'ctr',
      position: { x: 0, y: -220 },
      data: {
        nonceBits: '00110011',
        counterBits: '00000000',
      }
    },
    { id: 'b1', type: 'blockcipher', position: { x: 40, y: 80 }, data: {} },
    { id: 'x1', type: 'xor', position: { x: 40, y: 260 }, data: {} },
    { id: 'c1', type: 'ciphertext', position: { x: 0, y: 560 }, data: {}, draggable: false },
  ];

  const edges = [
    { id: 'e-p-x', source: 'p1', sourceHandle: 'outRight', target: 'x1', targetHandle: 'ptLeft', animated: true, data: {}, style: { stroke: 'green' } },
    { id: 'e-k-b', source: 'k1', sourceHandle: 'out', target: 'b1', targetHandle: 'key', animated: true, data: {}, style: { stroke: 'blue' } },
    { id: 'e-ctr-b', source: 'ctr1', sourceHandle: 'out', target: 'b1', targetHandle: 'ctr', animated: true, data: {}, style: { stroke: '#5a4ecb' } },
    { id: 'e-b-x', source: 'b1', sourceHandle: 'out', target: 'x1', targetHandle: 'pcTop', animated: true, data: {}, style: { stroke: 'orange' } },
    { id: 'e-x-c', source: 'x1', sourceHandle: 'out', target: 'c1', targetHandle: 'in', animated: true, data: {}, style: { stroke: 'pink' } },
  ];

  return { nodes, edges };
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
