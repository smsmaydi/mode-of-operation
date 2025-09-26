import { Handle, Position, useReactFlow } from 'reactflow';

export default function BlockCipherNode({ id, data }) {
  const instance = useReactFlow();
  const hasErr = !!data?.error;

  return (
    <div style={{
      padding: 10, border: '1px solid #999', borderRadius: 6,
      background: hasErr ? '#ffeaea' : '#fff', minWidth: 200,
      position: 'relative'
    }}>
      {/* ❌ Silme butonu */}
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
          fontWeight: 'bold'
        }}
      >
        ❌
      </button>

      <strong>Block Cipher</strong>
      <Handle type="target" position={Position.Left} id="plaintext" />
      <Handle type="target" position={Position.Right} id="key" />
      <Handle type="target" position={Position.Top} id="key" />
      <div style={{ marginTop: 8, fontSize: 12, color: hasErr ? '#b00' : '#666' }}>
        {hasErr ? data.error : (data?.preview ?? 'plaintext + key bağla')}
      </div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
