import { Handle, Position, useReactFlow } from 'reactflow';

export default function CiphertextNode({ id, data }) {
  const instance = useReactFlow();

  // check both result and outUrl for image
  const imageSrc =
    (typeof data?.result === 'string' && data.result.startsWith('data:image'))
      ? data.result
      : (typeof data?.outUrl === 'string' && data.outUrl.startsWith('data:image'))
        ? data.outUrl
        : null;

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
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt="cipher"
              style={{ maxWidth: '100%', borderRadius: 4 }}
            />
            <div style={{ marginTop: 6 }}>
              <a href={imageSrc} download="cipher.png">
                Download
              </a>
            </div>
          </>
        ) : (
          <div style={{ fontFamily: 'monospace' }}>
            {data?.result ?? '— (connect BlockCipher)'}
          </div>
        )}
      </div>
    </div>
  );
}
