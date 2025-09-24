import { Handle, Position } from 'reactflow';

export default function BlockCipherNode({ data }) {
  const hasErr = !!data?.error;

  return (
    <div style={{
      padding: 10, border: '1px solid #999', borderRadius: 6,
      background: hasErr ? '#ffeaea' : '#fff', minWidth: 200
    }}>
      <strong>Block Cipher</strong>
      <Handle type="target" position={Position.Left} id="plaintext" />
      <Handle type="target" position={Position.Right} id="key" />
      <div style={{ marginTop: 8, fontSize: 12, color: hasErr ? '#b00' : '#666' }}>
        {hasErr ? data.error : (data?.preview ?? 'Input plaintext and key')}
      </div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
