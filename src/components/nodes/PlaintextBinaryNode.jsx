import { Handle, Position } from 'reactflow';

export default function PlaintextBinaryNode({ data }) {
  const onChange = (e) => {
    const cleaned = (e.target.value || '').replace(/[^01]/g, '');
    data.onChange?.(data.id, { bits: cleaned });
  };

  return (
    <div style={{ padding: 10, border: '1px solid #999', borderRadius: 6, background: '#fff' }}>
      <strong>Plaintext</strong>
      <input
        style={{ marginTop: 6, width: '100%', fontFamily: 'monospace' }}
        value={data.bits || ''}
        onChange={onChange}
        placeholder="for example 10101010"
      />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
