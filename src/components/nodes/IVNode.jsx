import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { checkModeForDeleteButton } from '../../utils/nodeHelpers';

const IV_BITS = 128;
const IV_HEX_LEN = IV_BITS / 4; // 32 hex chars

function hexToBits(hexStr) {
  const cleaned = String(hexStr || '').replace(/\s/g, '').replace(/[^0-9a-fA-F]/g, '').slice(0, IV_HEX_LEN);
  let out = '';
  for (let i = 0; i + 2 <= cleaned.length; i += 2) {
    const byte = parseInt(cleaned.slice(i, i + 2), 16);
    out += byte.toString(2).padStart(8, '0');
  }
  return out.slice(0, IV_BITS);
}

function bitsToHex(bitsStr) {
  const cleaned = String(bitsStr || '').replace(/\s/g, '').replace(/[^01]/g, '').slice(0, IV_BITS);
  const padded = cleaned.padEnd(IV_BITS, '0');
  const out = [];
  for (let i = 0; i < IV_BITS; i += 8) {
    const byte = padded.slice(i, i + 8);
    out.push(parseInt(byte || '0', 2).toString(16).toUpperCase().padStart(2, '0'));
  }
  return out.join(' ');
}

function generateRandom128Bits() {
  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += bytes[i].toString(2).padStart(8, '0');
  }
  return result;
}

function IVNode({ id, data }) {
  const instance = useReactFlow();
  const showLabels = !!data?.showHandleLabels;
  const bits = (data?.bits || '').replace(/[^01]/g, '').slice(0, IV_BITS);
  const hexDisplay = bitsToHex(bits);

  const onHexChange = (e) => {
    const rawHex = e.target.value;
    const newBits = hexToBits(rawHex);
    data.onChange?.(id, { bits: newBits });
  };

  const onBitsChange = (e) => {
    const raw = (e.target.value || '').replace(/[^01]/g, '');
    const cleaned = raw.slice(0, IV_BITS);
    data.onChange?.(id, { bits: cleaned });
  };

  const onRandom128 = () => {
    const result = generateRandom128Bits();
    data.onChange?.(id, { bits: result });
  };

  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #ff00007b',
        borderRadius: 6,
        background: 'lightcoral',
        position: 'relative',
        minWidth: 200,
      }}
    >
      <button
        onClick={() => instance.deleteElements({ nodes: [{ id }] })}
        id="delete-btn"
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: '#b00',
          fontWeight: 'bold',
          display: checkModeForDeleteButton(data?.mode),
        }}
      >
        ❌
      </button>
      <strong>IV</strong>
      <div style={{ marginTop: 6 }} className="nodrag">
        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Hex:</div>
        <textarea
          value={hexDisplay}
          onChange={onHexChange}
          placeholder="00 11 22 ... (32 hex = 128 bit)"
          style={{
            width: '100%',
            height: 48,
            fontFamily: 'monospace',
            fontSize: 10,
            padding: 4,
            resize: 'none',
            border: '1px solid #999',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4, marginTop: 6 }}>Bits:</div>
        <textarea
          value={bits}
          onChange={onBitsChange}
          placeholder="0 ve 1 (128 bit)"
          style={{
            width: '100%',
            minHeight: 60,
            fontFamily: 'monospace',
            fontSize: 10,
            padding: 4,
            resize: 'none',
            border: '1px solid #999',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ marginTop: 6 }}>
          <button
            onClick={onRandom128}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: 11,
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #999',
              background: '#fff',
            }}
          >
            🎲 128 bit
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ background: 'red' }} />
      {showLabels && (
        <div style={{ position: 'absolute', top: '46%', right: -24, fontSize: 10, color: '#b00' }}>
          out
        </div>
      )}
    </div>
  );
}

export default React.memo(IVNode);
