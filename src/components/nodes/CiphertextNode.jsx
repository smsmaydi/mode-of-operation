import { Handle, Position } from 'reactflow';

export default function CiphertextNode({ data }) {
  return (
    <div style={{
      padding: 10, border: '1px solid #999', borderRadius: 6, background: '#fff', minWidth: 220
    }}>
      <strong>Ciphertext</strong>
      <Handle type="target" position={Position.Top} id="in" />
      <Handle type="target" position={Position.Top} style={{left: '50%'}} id="in2" />
      <div style={{ marginTop: 8, fontFamily: 'monospace' }}>
        {data?.result ?? '— (BlockCipher bağla)'}
      </div>
    </div>
  );
}
