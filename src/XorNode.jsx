// XorNode.jsx
import { Handle, Position } from 'reactflow';

export default function XorNode() {
  return (
    <div style={{ padding: 10, border: '1px solid #999', borderRadius: 8, background: '#fff' }}>
      <strong>XOR</strong>
      {/* Solda ve sağda 2 giriş */}
      <Handle type="target" position={Position.Left} id="a" />
      <Handle type="target" position={Position.Right} id="b" />
      {/* Altta tek çıkış */}
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
