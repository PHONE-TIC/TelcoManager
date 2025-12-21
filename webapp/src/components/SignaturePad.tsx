import { useRef, useState, useEffect } from 'react';
import './SignaturePad.css';

interface SignaturePadProps {
    onSignatureChange: (signature: string | null) => void;
    initialSignature?: string;
    readOnly?: boolean;
    label?: string;
}

export default function SignaturePad({
    onSignatureChange,
    initialSignature,
    readOnly = false,
    label = "Signature du client"
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);

        // Set drawing style
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw initial signature if provided
        if (initialSignature) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
                setHasSignature(true);
            };
            img.src = initialSignature;
        }
    }, [initialSignature]);

    const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
        if (readOnly) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing || readOnly) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
    };

    const endDrawing = () => {
        if (!isDrawing) return;

        setIsDrawing(false);

        const canvas = canvasRef.current;
        if (canvas && hasSignature) {
            const signature = canvas.toDataURL('image/png');
            onSignatureChange(signature);
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onSignatureChange(null);
    };

    return (
        <div className="signature-pad-container">
            <div className="signature-header">
                <label className="signature-label">✍️ {label}</label>
                {!readOnly && hasSignature && (
                    <button
                        type="button"
                        className="btn-clear-signature"
                        onClick={clearSignature}
                    >
                        🗑️ Effacer
                    </button>
                )}
            </div>

            <div className={`signature-canvas-wrapper ${readOnly ? 'readonly' : ''}`}>
                <canvas
                    ref={canvasRef}
                    className="signature-canvas"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />
                {!hasSignature && !readOnly && (
                    <div className="signature-placeholder">
                        Signez ici
                    </div>
                )}
            </div>

            {hasSignature && (
                <p className="signature-hint">✅ Signature enregistrée</p>
            )}
        </div>
    );
}
