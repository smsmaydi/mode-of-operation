import { Handle, Position, useReactFlow } from 'reactflow';

export default function XorBinaryNode({ data }) {
  const hasErr = !!data?.error;
  return (
    <div style={{
      padding: 10, border: '1px solid var(--border)', borderRadius: 8,
      background: hasErr ? "var(--danger-soft)" : "var(--surface)", minWidth: 180
    }}>
      <strong>XOR</strong>
      <Handle type="target" position={Position.Left} id="a" />
      <Handle type="target" position={Position.Right} id="b" />
      <div style={{ fontSize: 12, color: hasErr ? 'var(--danger)' : 'var(--text-muted)', marginTop: 6 }}>
        {hasErr ? data.error : (data?.preview ?? '2 input bits')}
      </div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
