import { Handle, Position, useReactFlow } from 'reactflow';

export default function CiphertextNode({ id, data }) {
  const instance = useReactFlow();

  // Check if result is an image URL (data:image/...)
  const isImageUrl =
    typeof data?.result === 'string' && data.result.startsWith('data:image');

  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #999',
        borderRadius: 6,
        background: '#fff',
        minWidth: 220,
        position: 'relative',
      }}
    >
      {/* Delete button */}
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

      <strong>Ciphertext</strong>
      <Handle type="target" position={Position.Top} id="in" />

      <div style={{ marginTop: 8, textAlign: 'center' }}>
        {isImageUrl ? (
          <>
            <img
              src={data.result}
              alt="cipher"
              style={{ maxWidth: '100%', borderRadius: 4 }}
            />
            <div style={{ marginTop: 6 }}>
              <a href={data.result} download="cipher.png">
                Download
              </a>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: 'monospace' }}>
            {typeof data?.result === 'string'
              ? data.result
              : data?.result instanceof File
              ? '📂 Image selected (waiting for Run XOR)'
              : '— (connect BlockCipher)'}
          </div>
        )}
      </div>
    </div>
  );
}
