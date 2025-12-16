import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

export default function IVNode({ id, data }) {
    const instance = useReactFlow();
    const [inputType, setInputType] = React.useState('bits');
    const [bits, setBits] = React.useState('');

    const onChange = (e) => {
        const cleaned = (e.target.value || '').replace(/[^01]/g, ''); // only 0 and 1
        setInputType('bits');
        setBits(cleaned);         // state update
        data.onChange?.(id, { 
            inputType: 'bits', 
            value: cleaned, 
        });
    };

    return(
        <div
            style={{
                padding:10,
                border: '1px solid #3b6613ff',
                borderRadius:6,
                background: 'lightred',
                position: 'relative',
                minWidth:200,
            }}
        >
            <button
                onClick={() => instance.deleteElements({ nodes: [{ id }] })}
                style={{
                position: "absolute",
                top: 2,
                right: 2,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#b00",
                fontWeight: "bold",
                }}
            >
            ❌
            </button>
            <strong>IV</strong>
            <div style={{ marginTop: 6 }}>
                <input
                style={{ width: "100%", fontFamily: "monospace" }}
                value={data.bits || ""}
                onChange={onChange}
                placeholder="for example 11001010"
                />
            </div>
            <Handle type="source" position={Position.Right} id="out" />
        </div>
    )
}