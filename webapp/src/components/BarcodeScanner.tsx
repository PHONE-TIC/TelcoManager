import { useState, useRef, useEffect } from 'react';
import { AppIcon } from './AppIcon';
import './BarcodeScanner.css';

interface BarcodeScannerProps {
    onScan: (barcode: string, keepOpen?: boolean) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const [code, setCode] = useState('');
    const [isBatch, setIsBatch] = useState(false);
    const [scannedHistory, setScannedHistory] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep focus on input in batch mode or upon opening
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Synth beep sound using Web Audio API
    const playBeep = () => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const audioCtx = new AudioContextClass();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); // 900 Hz frequency
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // Subtle volume
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.12); // Short beep duration (120ms)
        } catch (e) {
            console.warn("Failed to play scanner beep:", e);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedCode = code.trim();
        if (trimmedCode) {
            // Signal feedback: short vibration (100ms) and synthesizer beep
            if (navigator.vibrate) navigator.vibrate(100);
            playBeep();

            if (isBatch) {
                // Call parent scan callback asking to keep scanner open
                onScan(trimmedCode, true);
                setScannedHistory((prev) => [trimmedCode, ...prev]);
                setCode('');
                
                // Immediately refocus input
                setTimeout(() => {
                    inputRef.current?.focus();
                }, 50);
            } else {
                onScan(trimmedCode, false);
            }
        }
    };

    return (
        <div className="barcode-scanner-overlay" onClick={onClose}>
            <div className="barcode-scanner-container manual-only" onClick={(e) => e.stopPropagation()}>
                <div className="scanner-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AppIcon name="stock" size={22} /> Ajouter du Matériel
                    </h2>
                    <button className="close-btn" onClick={onClose} type="button">
                        <AppIcon name="close" size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="manual-form" style={{ padding: '20px' }}>
                    {/* Batch Scanning Mode Switch */}
                    <div className="scanner-batch-toggle" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        marginBottom: '16px', 
                        padding: '10px 14px', 
                        backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.03))', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-color, rgba(0,0,0,0.08))' 
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.2rem' }}>⚡</span>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Mode Rafale</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Scanner plusieurs codes sans fermer</div>
                            </div>
                        </div>
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                            <input 
                                type="checkbox" 
                                checked={isBatch} 
                                onChange={(e) => {
                                    setIsBatch(e.target.checked);
                                    setTimeout(() => inputRef.current?.focus(), 50);
                                }}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: isBatch ? 'var(--primary-color, #f97316)' : '#ccc',
                                transition: '.3s',
                                borderRadius: '24px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '18px',
                                    width: '18px',
                                    left: isBatch ? '23px' : '3px',
                                    bottom: '3px',
                                    backgroundColor: 'white',
                                    transition: '.3s',
                                    borderRadius: '50%'
                                }} />
                            </span>
                        </label>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            Code-barres ou référence
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={isBatch ? "Scannez/Saisissez le code puis validez..." : "Entrez le code..."}
                            className="form-input"
                            style={{ 
                                width: '100%', 
                                padding: '10px 14px', 
                                border: '2px solid var(--border-color)', 
                                borderRadius: '8px', 
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                    </div>

                    {/* Scanned History for Batch Mode */}
                    {isBatch && scannedHistory.length > 0 && (
                        <div className="scanner-history" style={{ 
                            marginTop: '16px', 
                            borderTop: '1px solid var(--border-color)', 
                            paddingTop: '12px',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Session en cours ({scannedHistory.length})
                                </span>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setScannedHistory([]);
                                        inputRef.current?.focus();
                                    }}
                                    style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        color: '#ef4444', 
                                        fontSize: '0.75rem', 
                                        cursor: 'pointer', 
                                        fontWeight: 500 
                                    }}
                                >
                                    Vider
                                </button>
                            </div>
                            <div style={{ 
                                maxHeight: '110px', 
                                overflowY: 'auto', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '6px' 
                            }}>
                                {scannedHistory.map((h, i) => (
                                    <div key={i} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        padding: '6px 10px', 
                                        backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.02))', 
                                        borderRadius: '8px', 
                                        fontSize: '0.85rem', 
                                        border: '1px solid var(--border-color, rgba(0,0,0,0.05))' 
                                    }}>
                                        <span>⚙️</span>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>{h}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>#{scannedHistory.length - i}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Fermer
                        </button>
                        {!isBatch && (
                            <button
                                type="submit"
                                className="btn btn-success"
                                disabled={!code.trim()}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <AppIcon name="plus" size={16} /> Ajouter
                                </span>
                            </button>
                        )}
                        {isBatch && (
                            <button
                                type="submit"
                                className="btn btn-success"
                                disabled={!code.trim()}
                                style={{ backgroundColor: 'var(--primary-color, #f97316)', borderColor: 'var(--primary-color, #f97316)' }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    Valider le code
                                </span>
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
