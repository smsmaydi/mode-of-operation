import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { checkModeForDeleteButton } from '../../utils/nodeHelpers';

export default function IVNode({ id, data }) {
    const instance = useReactFlow();
    const showLabels = !!data?.showHandleLabels;
    const [inputType, setInputType] = React.useState('bits');
    const [bits, setBits] = React.useState('');

    const onChange = (e) => {
        const cleaned = (e.target.value || '').replace(/[^01]/g, ''); // only 0 and 1
        setBits(cleaned);         // state update
        data.onChange?.(id, { 
            bits: cleaned, 
        });
    };

    const generateRandomBits = (length) => {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += Math.random() < 0.5 ? '0' : '1';
        }
        setBits(result);
        data.onChange?.(id, { 
            bits: result, 
        });
    };

    return(
        <div
            style={{
                padding:10,
                border: '1px solid #ff00007b',
                borderRadius:6,
                background: 'lightcoral',
                position: 'relative',
                minWidth:200,
            }}
        >
            <button
                onClick={() => instance.deleteElements({ nodes: [{ id }] })}
                id='delete-btn'
                style={{
                position: "absolute",
                top: 2,
                right: 2,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#b00",
                fontWeight: "bold",
                display: checkModeForDeleteButton(data?.mode),
                }}
            >
            ❌
            </button>
            <strong>IV</strong>
            <div style={{ marginTop: 6 }} className="nodrag">
                <input
                style={{ width: "100%", fontFamily: "monospace", fontSize: 10 }}
                value={data.bits || ""}
                onChange={onChange}
                placeholder="for example 11001010"
                />
                <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
                    <button 
                        onClick={() => generateRandomBits(128)}
                        style={{ 
                            flex: 1, 
                            padding: '4px', 
                            fontSize: 10, 
                            cursor: 'pointer',
                            borderRadius: 4,
                            border: '1px solid #999',
                            background: '#fff'
                        }}
                    >
                        🎲 128
                    </button>
                    <button 
                        onClick={() => generateRandomBits(256)}
                        style={{ 
                            flex: 1, 
                            padding: '4px', 
                            fontSize: 10, 
                            cursor: 'pointer',
                            borderRadius: 4,
                            border: '1px solid #999',
                            background: '#fff'
                        }}
                    >
                        🎲 256
                    </button>
                </div>
            </div>
                        <Handle type="source" position={Position.Right} id="out" style={{ background: "red" }} />
                        {showLabels && (
                            <div style={{ position: "absolute", top: "46%", right: -24, fontSize: 10, color: "#b00" }}>
                                out
                            </div>
                        )}
        </div>
    )
}