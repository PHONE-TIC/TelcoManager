import { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    suggestions: string[];
    placeholder?: string;
    required?: boolean;
    style?: React.CSSProperties;
    isInvalid?: boolean;
}

const AutocompleteInput = ({ value, onChange, label, suggestions, placeholder, required, style, isInvalid }: AutocompleteInputProps) => {
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const userInput = e.target.value;
        onChange(userInput);

        // Filter suggestions
        const filtered = suggestions.filter(
            suggestion =>
                suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1 &&
                suggestion.toLowerCase() !== userInput.toLowerCase() // Don't show if exact match
        );

        setFilteredSuggestions(filtered);
        setShowSuggestions(true);
    };

    const handleSelect = (suggestion: string) => {
        onChange(suggestion);
        setFilteredSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
            <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
            }}>
                {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={() => {
                    // Show all or filtered on focus
                    const filtered = value ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value) : suggestions;
                    setFilteredSuggestions(filtered);
                    setShowSuggestions(true);
                }}
                placeholder={placeholder}
                className="form-input-premium"
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: isInvalid ? '1px solid #ef4444' : '1px solid var(--border-color)',
                    transition: 'border-color 0.2s',
                    outline: 'none'
                }}
            />

            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    padding: 0,
                    listStyle: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                    {filteredSuggestions.map((suggestion, index) => (
                        <li
                            key={index}
                            onClick={() => handleSelect(suggestion)}
                            style={{
                                padding: '10px 16px',
                                cursor: 'pointer',
                                borderBottom: index === filteredSuggestions.length - 1 ? 'none' : '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                transition: 'background-color 0.1s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AutocompleteInput;
