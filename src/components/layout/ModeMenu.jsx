import React from "react";

const modes = [
  { id: "ecb", label: "ECB" },
  { id: "cbc", label: "CBC" },
  { id: "ctr", label: "Counter Mode" },
];

/**
 * Top of the left column: operation-mode switches + handle-label toggle.
 * Renders `children` below (typically `GraphInputsPanel`).
 *
 * @param {object} props
 * @param {string} props.current — active mode id (`ecb` | `cbc` | `ctr`)
 * @param {function(string): void} props.onSelect
 * @param {boolean} [props.showHandleLabels]
 * @param {function(boolean): void} [props.onToggleHandleLabels]
 */
export default function ModeMenu({
  current,
  onSelect,
  showHandleLabels,
  onToggleHandleLabels,
  children,
}) {
  return (
    <aside className="mode-menu">
      <div className="mode-menu__heading">Modes</div>
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={`mode-menu__btn${current === m.id ? " mode-menu__btn--active" : ""}`}
        >
          {m.label}
        </button>
      ))}
      <div className="mode-menu__hint">Click a mode.</div>
      <div className="mode-menu__section">
        <label className="mode-menu__label">
          <input
            type="checkbox"
            checked={!!showHandleLabels}
            onChange={(e) => onToggleHandleLabels?.(e.target.checked)}
          />
          Show input/output labels
        </label>
      </div>
      {children}
    </aside>
  );
}
