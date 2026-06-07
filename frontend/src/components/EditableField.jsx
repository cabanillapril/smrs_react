import React, { useState, useEffect, useRef } from 'react';

/**
 * A component that displays text normally (allowing natural wrapping)
 * and only switches to an input "box" when clicked.
 * Perfect for verifying scanned OCR data without clipping long names.
 */
export default function EditableField({
    value,
    onSave,
    label,
    className = "",
    type = "text",
    options = []
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const textareaRef = useRef(null);

    // Keep internal state in sync with external value (e.g. from a new scan)
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    // Auto-resize textarea height to fit content during editing
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [currentValue, isEditing]);

    const handleSave = () => {
        setIsEditing(false);
        if (currentValue !== value) {
            onSave(currentValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setCurrentValue(value);
            setIsEditing(false);
        }
    };

    return (
        <div className={`editable-field-group ${className}`} style={{ marginBottom: '12px' }}>
            {label && (
                <div style={{
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted, #888)',
                    letterSpacing: '0.05em',
                    marginBottom: '4px',
                    fontWeight: '600'
                }}>
                    {label}
                </div>
            )}

            {isEditing ? (
                type === 'select' ? (
                    <select
                        autoFocus
                        value={currentValue || ''}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onBlur={handleSave}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            border: '1px solid var(--accent-primary, #007bff)',
                            borderRadius: '4px',
                            background: 'var(--bg-card, #1a1a1a)',
                            color: 'inherit',
                            outline: 'none'
                        }}
                    >
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <textarea
                        ref={textareaRef}
                        autoFocus
                        value={currentValue || ''}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            border: '1px solid var(--accent-primary, #007bff)',
                            borderRadius: '4px',
                            background: 'rgba(0,0,0,0.2)',
                            color: 'inherit',
                            resize: 'none',
                            display: 'block',
                            outline: 'none',
                            overflow: 'hidden'
                        }}
                    />
                )
            ) : (
                <div
                    onClick={() => setIsEditing(true)}
                    style={{
                        cursor: 'pointer',
                        minHeight: '1.2em',
                        padding: '2px 0',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        whiteSpace: 'pre-wrap', // Ensures long text wraps and shows fully
                        color: value ? 'inherit' : 'var(--text-muted, #666)',
                        borderBottom: '1px solid transparent',
                        display: 'block',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    {value || <span style={{ opacity: 0.4 }}>—</span>}
                </div>
            )}
        </div>
    );
}