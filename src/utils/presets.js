// src/utils/presets.js
import { mergePipelineIntoGraph, countByteBlocksFromPlaintext } from './dynamicBlockGraph';

export function buildEcbPreset() {
  const baseNodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: -400, y: -120 },
      data: {
        inputType: 'bits',
        value: '01001000011001010110110001101100',
      }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -400, y: 360 },
      data: {
        bits: '01010101',
      }
    },
  ];
  const baseEdges = [];
  const n = countByteBlocksFromPlaintext(baseNodes.find((x) => x.id === 'p1'));
  return mergePipelineIntoGraph(baseNodes, baseEdges, n, 'ecb');
}
export function checkModeForDeleteButton(){
  
}

export function buildCbcPreset() {
  const baseNodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: -420, y: -140 },
      data: {
        inputType: 'bits',
        value: '01001000011001010110110001101100',
      }
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -420, y: 380 },
      data: {
        bits: '01010101',
      }
    },
    {
      id: 'iv1',
      type: 'iv',
      position: { x: -420, y: -300 },
      data: {
        bits: '00001111000011110000111100001111000011110000111100001111000011110000111100001111000011110000111100001111000011110000111100001111',
      },
    },
  ];
  const baseEdges = [];
  const n = countByteBlocksFromPlaintext(baseNodes.find((x) => x.id === 'p1'));
  return mergePipelineIntoGraph(baseNodes, baseEdges, n, 'cbc');
}


export function buildCtrPreset() {
  const baseNodes = [
    {
      id: 'p1',
      type: 'plaintext',
      position: { x: -420, y: -140 },
      data: {
        inputType: 'bits',
        value: '10110010',
      },
    },
    {
      id: 'k1',
      type: 'key',
      position: { x: -420, y: 380 },
      data: {
        bits: '01010101',
      },
    },
    {
      id: 'ctr1',
      type: 'ctr',
      position: { x: -5000, y: -5000 },
      hidden: true,
      data: {
        nonceBits: '00110011',
        counterBits: '0'.repeat(64),
      },
    },
  ];
  const baseEdges = [];
  const n = countByteBlocksFromPlaintext(baseNodes.find((x) => x.id === 'p1'));
  return mergePipelineIntoGraph(baseNodes, baseEdges, n, 'ctr');
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
