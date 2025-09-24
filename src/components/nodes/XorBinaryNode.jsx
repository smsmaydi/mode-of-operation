import { Handle, Position } from 'reactflow';

export default function XorBinaryNode({ data }) {
  const hasErr = !!data?.error;
  return (
    <div style={{
      padding: 10, border: '1px solid #999', borderRadius: 8,
      background: hasErr ? '#ffeaea' : '#fff', minWidth: 180
    }}>
      <strong>XOR</strong>
      <Handle type="target" position={Position.Left} id="a" />
      <Handle type="target" position={Position.Right} id="b" />
      <div style={{ fontSize: 12, color: hasErr ? '#b00' : '#666', marginTop: 6 }}>
        {hasErr ? data.error : (data?.preview ?? '2 giriş (a ve b) bağlayın')}
      </div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
