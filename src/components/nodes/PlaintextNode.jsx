import { Handle, Position, useReactFlow } from 'reactflow';

export default function PlaintextNode({ id, data }) {
  const instance = useReactFlow();

  const onTypeChange = (e) => {
    data.onChange?.(id, { inputType: e.target.value, value: '' });
  };

  const onValueChange = (e) => {
    let val = e.target.value;
    if (data.inputType === 'bits') {
      val = val.replace(/[^01]/g, ''); // sadece 0 ve 1 kalsın
    }
    data.onChange?.(id, { value: val });
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      data.onChange?.(id, { value: file });
    }
  };

  return (
    <div style={{
      padding: '10px 20px', border: '1px solid #999', borderRadius: 6, background: '#fff',
      minWidth: '225px', position: 'relative', height: '100px'
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

      <strong>Plaintext</strong>
      
          <select
              value={data.inputType}
              onChange={onTypeChange}
              style={{
                display: 'block',
                margin: '8px 0',
                width: '100%',
                height: 30,
                padding: '6px 10px',
                border: '1px solid #003c71',
                borderRadius: 10,
                backgroundColor: '#f9f9f9',
                fontSize: 12,
                fontWeight: 400,
                cursor: 'pointer'
              }}
          >
        <option value="bits" style={{ padding: '6px' }}>Bits (0/1)</option>
        <option value="text" style={{ padding: '6px' }}>Text (For Example HELLO)</option>
        <option value="image" style={{ padding: '6px' }}>Image (PNG/JPG)</option>
</select>


      {data.inputType === 'bits' && (
        <input
          style={{ width: '100%',
            borderRadius: 10,
            height: 20,
            padding: '6px 6px 6px 6px ', 
            fontSize: 12,
            border: '1px solid #003c71', 
            fontFamily: 'monospace' }}
          value={data.value || ''}
          onChange={onValueChange}
          placeholder="Input"
        />
      )}

      {data.inputType === 'text' && (
        <input
          style={{ width: '100%',
            borderRadius: 10,
            height: 20,
            padding: '6px 6px 6px 6px ', 
            fontSize: 12,
            border: '1px solid #003c71', 
            fontFamily: 'monospace' }}
          value={data.value || ''}
          onChange={onValueChange}
          placeholder="Input"
        />
      )}

      {data.inputType === 'image' && (
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={onFileChange}
          style={{ width: '100%'}}
        />
      )}

      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
