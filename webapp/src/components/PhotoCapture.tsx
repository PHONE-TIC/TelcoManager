import { useState, useRef } from 'react';
import './PhotoCapture.css';

interface Photo {
    id: string;
    dataUrl: string;
    timestamp: Date;
    type: 'before' | 'after' | 'other';
    caption?: string;
}

interface PhotoCaptureProps {
    photos: Photo[];
    onPhotoAdd: (photo: Photo) => void;
    onPhotoRemove: (photoId: string) => void;
    readOnly?: boolean;
}

export default function PhotoCapture({
    photos,
    onPhotoAdd,
    onPhotoRemove,
    readOnly = false
}: PhotoCaptureProps) {
    const [showCamera, setShowCamera] = useState(false);
    const [photoType, setPhotoType] = useState<'before' | 'after' | 'other'>('before');
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            setStream(mediaStream);
            setShowCamera(true);

            // Wait a bit for the video element to be rendered
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play().catch(console.error);
                    };
                }
            }, 100);

        } catch (error) {
            console.error('Erreur d\'accès à la caméra:', error);
            alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        }
    };

    const stopCamera = () => {
        // Stop stream
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
                console.log('PhotoCapture: Track stopped', track.label);
            });
            setStream(null);
        }

        // Stop video element
        if (videoRef.current) {
            videoRef.current.pause();
            if (videoRef.current.srcObject) {
                const s = videoRef.current.srcObject as MediaStream;
                s.getTracks().forEach(t => t.stop());
                videoRef.current.srcObject = null;
            }
        }

        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        const newPhoto: Photo = {
            id: `photo-${Date.now()}`,
            dataUrl,
            timestamp: new Date(),
            type: photoType
        };

        onPhotoAdd(newPhoto);
        stopCamera();

        // Vibration feedback
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;

            const newPhoto: Photo = {
                id: `photo-${Date.now()}`,
                dataUrl,
                timestamp: new Date(),
                type: photoType
            };

            onPhotoAdd(newPhoto);
        };
        reader.readAsDataURL(file);
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'before': return '📸 Avant';
            case 'after': return '✅ Après';
            default: return '📷 Autre';
        }
    };

    const beforePhotos = photos.filter(p => p.type === 'before');
    const afterPhotos = photos.filter(p => p.type === 'after');
    const otherPhotos = photos.filter(p => p.type === 'other');

    return (
        <div className="photo-capture">
            <div className="photo-header">
                <h3>📸 Photos d'intervention</h3>
                {!readOnly && (
                    <div className="photo-type-selector">
                        <select
                            value={photoType}
                            onChange={(e) => setPhotoType(e.target.value as any)}
                            className="type-select"
                        >
                            <option value="before">📸 Avant intervention</option>
                            <option value="after">✅ Après intervention</option>
                            <option value="other">📷 Autre</option>
                        </select>
                    </div>
                )}
            </div>

            {!readOnly && !showCamera && (
                <div className="photo-actions">
                    <button className="photo-btn camera-btn" onClick={startCamera}>
                        <span className="btn-icon">📷</span>
                        <span className="btn-text">Prendre une photo</span>
                    </button>
                    <button
                        className="photo-btn gallery-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="btn-icon">🖼️</span>
                        <span className="btn-text">Galerie</span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                </div>
            )}

            {showCamera && (
                <div className="camera-container">
                    {/* Top Bar */}
                    <div className="camera-top-bar">
                        <span className="camera-type-badge">
                            {photoType === 'before' ? '📸 Avant' : photoType === 'after' ? '✅ Après' : '📷 Autre'}
                        </span>
                        <button className="camera-close-btn" onClick={stopCamera}>✕</button>
                    </div>

                    {/* Video Preview */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-preview"
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Bottom Controls */}
                    <div className="camera-controls">
                        <button className="cancel-camera-btn" onClick={stopCamera}>
                            Annuler
                        </button>
                        <button className="capture-btn" onClick={capturePhoto}>
                            <span className="capture-ring"></span>
                        </button>
                        <div style={{ width: '100px' }}></div> {/* Spacer for symmetry */}
                    </div>
                </div>
            )}

            {/* Photos Gallery */}
            <div className="photos-gallery">
                {beforePhotos.length > 0 && (
                    <div className="photo-section">
                        <h4>📸 Avant intervention ({beforePhotos.length})</h4>
                        <div className="photo-grid">
                            {beforePhotos.map(photo => (
                                <div
                                    key={photo.id}
                                    className="photo-item"
                                    onClick={() => setSelectedPhoto(photo)}
                                >
                                    <img src={photo.dataUrl} alt="Avant" />
                                    {!readOnly && (
                                        <button
                                            className="remove-photo-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPhotoRemove(photo.id);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {afterPhotos.length > 0 && (
                    <div className="photo-section">
                        <h4>✅ Après intervention ({afterPhotos.length})</h4>
                        <div className="photo-grid">
                            {afterPhotos.map(photo => (
                                <div
                                    key={photo.id}
                                    className="photo-item"
                                    onClick={() => setSelectedPhoto(photo)}
                                >
                                    <img src={photo.dataUrl} alt="Après" />
                                    {!readOnly && (
                                        <button
                                            className="remove-photo-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPhotoRemove(photo.id);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {otherPhotos.length > 0 && (
                    <div className="photo-section">
                        <h4>📷 Autres photos ({otherPhotos.length})</h4>
                        <div className="photo-grid">
                            {otherPhotos.map(photo => (
                                <div
                                    key={photo.id}
                                    className="photo-item"
                                    onClick={() => setSelectedPhoto(photo)}
                                >
                                    <img src={photo.dataUrl} alt="Autre" />
                                    {!readOnly && (
                                        <button
                                            className="remove-photo-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPhotoRemove(photo.id);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {photos.length === 0 && (
                    <div className="no-photos">
                        <p>📷 Aucune photo pour le moment</p>
                        <small>Prenez des photos avant et après l'intervention</small>
                    </div>
                )}
            </div>

            {/* Photo Viewer Modal */}
            {selectedPhoto && (
                <div className="photo-modal" onClick={() => setSelectedPhoto(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button
                            className="close-modal-btn"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            ✕
                        </button>
                        <img src={selectedPhoto.dataUrl} alt="Preview" />
                        <div className="photo-info">
                            <span className="photo-type-badge">
                                {getTypeLabel(selectedPhoto.type)}
                            </span>
                            <span className="photo-time">
                                {selectedPhoto.timestamp.toLocaleString('fr-FR')}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
