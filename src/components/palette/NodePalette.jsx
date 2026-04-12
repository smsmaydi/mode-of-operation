import React from "react";

export default function NodePalette() {
  const onDragStart = (e, payload) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const Item = ({ label, type }) => (
    <div
      draggable
      className="node-palette__item"
      onDragStart={(e) => onDragStart(e, { type })}
    >
      {label}
    </div>
  );

  return (
    <aside className="node-palette">
      <div className="node-palette__title">Palette</div>
      <Item label="Plaintext" type="plaintext" />
      <Item label="Key" type="key" />
      <Item label="Key (by block)" type="keysnap" />
      <Item label="BlockCipher" type="blockcipher" />
      <Item label="Ciphertext" type="ciphertext" />
      <Item label="XOR" type="xor" />
      <Item label="IV" type="iv" />
      <Item label="Nonce+Counter" type="ctr" />
      <div className="node-palette__hint">Drag & Drop to the canvas.</div>
    </aside>
  );
}
