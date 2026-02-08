import React from 'react';

const modes = [
  { id: 'ecb', label: 'ECB' },
  { id: 'cbc', label: 'CBC' },
  { id: 'ctr', label: 'Counter Mode' },
  { id: 'free', label: 'Free Mode' },
];

export default function ModeMenu({ current, onSelect, showHandleLabels, onToggleHandleLabels, isDarkTheme, onToggleDarkTheme }) {
  return (
    <aside style={{ 
      width: 220, 
      borderRight: '1px solid #ddd', 
      background: isDarkTheme ? '#1e1e1e' : '#fafafa',
      color: isDarkTheme ? '#fff' : '#000',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ padding: 12, fontWeight: 700 }}>Modes</div>
      {modes.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '10px 12px',
            border: 'none',
            background: current === m.id ? (isDarkTheme ? '#364957' : '#e8f0fe') : 'transparent',
            color: isDarkTheme ? '#fff' : '#000',
            cursor: 'pointer',
            fontWeight: current === m.id ? 700 : 300,
            transition: 'background-color 0.2s ease'
          }}
        >
          {m.label}
        </button>
      ))}
      <div style={{ padding: 12, fontSize: 12, color: isDarkTheme ? '#888' : '#666' }}>
        Click a mode.
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${isDarkTheme ? '#333' : '#eee'}` }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!showHandleLabels}
            onChange={(e) => onToggleHandleLabels?.(e.target.checked)}
          />
          Show input/output labels
        </label>
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${isDarkTheme ? '#333' : '#eee'}` }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!isDarkTheme}
            onChange={(e) => onToggleDarkTheme?.(e.target.checked)}
          />
          Dark theme 🌙
        </label>
      </div>
    </aside>
  );
}
