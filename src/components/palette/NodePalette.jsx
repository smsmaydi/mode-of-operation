import React from 'react';

export default function NodePalette() {
  const onDragStart = (e, payload) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const Item = ({ label, type }) => (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, { type })}
      style={{ marginBottom: 10, padding: 6, border: '1px solid #ccc', borderRadius: 6, cursor: 'grab', background: '#fff' }}
    >
      {label}
    </div>
  );

  return (
    <aside style={{ width: 220, borderLeft: '1px solid #ddd', background: '#fafafa', padding: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Palette</div>
      <Item label="Plaintext" type="plaintext" />
      <Item label="Key"       type="key" />
      <Item label="BlockCipher" type="blockcipher" />
      <Item label="Ciphertext"  type="ciphertext" />
      <Item label="IV"          type="iv" />
      <Item label="Nonce+Counter" type="ctr" />
      <div style={{ fontSize: 12, color: '#666' }}>
        Drag & Drop to the canvas.
      </div>
    </aside>
  );
}
