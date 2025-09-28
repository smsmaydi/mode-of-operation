import { Handle, Position, useReactFlow } from 'reactflow';
import { xorImageFileWithKey } from '../../utils/xorImageFile'; // ayrı utils dosyası (aşağıda vereceğim)

export default function KeyNode({ id, data }) {
  const instance = useReactFlow();

  const onChange = (e) => {
    const cleaned = (e.target.value || '').replace(/[^01]/g, '');
    data.onChange?.(id, { bits: cleaned });
  };

  const runXor = () => {
    // sadece image için özel XOR
    if (data.onRunXor) {
      data.onRunXor(data.bits);
    }
  };

  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #666',
        borderRadius: 6,
        background: '#eef',
        position: 'relative',
        minWidth: 200,
      }}
    >
      {/* ❌ Delete button */}
      <button
        onClick={() => instance.deleteElements({ nodes: [{ id }] })}
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: '#b00',
          fontWeight: 'bold',
        }}
      >
        ❌
      </button>

      <strong>Key</strong>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          style={{ flex: 1, fontFamily: 'monospace' }}
          value={data.bits || ''}
          onChange={onChange}
          placeholder="ör. 11001010"
        />
        <button onClick={runXor}>Run XOR</button>
      </div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
