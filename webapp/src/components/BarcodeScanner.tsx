import { useState } from 'react';
import './BarcodeScanner.css';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const [code, setCode] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim()) {
            if (navigator.vibrate) navigator.vibrate(100);
            onScan(code.trim());
        }
    };

    return (
        <div className="barcode-scanner-overlay" onClick={onClose}>
            <div className="barcode-scanner-container manual-only" onClick={(e) => e.stopPropagation()}>
                <div className="scanner-header">
                    <h2>🔧 Ajouter du Matériel</h2>
                    <button className="close-btn" onClick={onClose} type="button">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="manual-form">
                    <div className="form-group">
                        <label>Code-barres ou référence</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Entrez le code..."
                            className="form-input"
                            autoFocus
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="btn btn-success"
                            disabled={!code.trim()}
                        >
                            ✓ Ajouter
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
