// PlaintextNode.jsx
import { Handle, Position } from 'reactflow';

export default function PlaintextNode({ data }) {
  return (
    <div style={{ padding: 10, border: '1px solid #999', borderRadius: 8, background: '#fff' }}>
      <strong>Plaintext</strong>
      <input
        style={{ marginTop: 8, width: '100%' }}
        value={data.text || ''}
        onChange={(e) => data.onChange?.(data.id, { text: e.target.value })}
        placeholder="Enter plaintext"
      />
      {/* Altta çıkış */}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
