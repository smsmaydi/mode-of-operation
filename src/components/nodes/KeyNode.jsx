import { Handle, Position } from 'reactflow';

export default function KeyNode({ data }) {
  const onChange = (e) => {
    const cleaned = (e.target.value || '').replace(/[^01]/g, '');
    data.onChange?.(data.id, { bits: cleaned });
  };

  return (
    <div style={{ padding: 10, border: '1px solid #666', borderRadius: 6, background: '#eef' }}>
      <strong>Key</strong>
      <input
        style={{ marginTop: 6, width: '100%', fontFamily: 'monospace' }}
        value={data.bits || ''}
        onChange={onChange}
        placeholder="ör. 11001010"
      />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
