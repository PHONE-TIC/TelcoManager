import { useState, useRef } from "react";
import "./PhotoCapture.css";

interface Photo {
  id: string;
  dataUrl: string;
  timestamp: Date;
  type: "before" | "after" | "other";
  caption?: string;
}

interface PhotoCaptureProps {
  photos: Photo[];
  onPhotoAdd: (photo: Photo) => void;
  onPhotoRemove: (photoId: string) => void;
  readOnly?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function PhotoCapture({
  photos,
  onPhotoAdd,
  onPhotoRemove,
  readOnly = false,
  style,
  className,
}: PhotoCaptureProps) {
  const [photoType, setPhotoType] = useState<"before" | "after" | "other">(
    "before"
  );
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
        type: photoType,
      };

      onPhotoAdd(newPhoto);
    };
    reader.readAsDataURL(file);

    // Reset inputs
    event.target.value = "";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "before":
        return "📸 Avant";
      case "after":
        return "✅ Après";
      default:
        return "📷 Autre";
    }
  };

  const beforePhotos = photos.filter((p) => p.type === "before");
  const afterPhotos = photos.filter((p) => p.type === "after");
  const otherPhotos = photos.filter((p) => p.type === "other");

  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedPhoto(null);
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  return (
    <div className={`photo-capture ${className || ""}`} style={style}>
      <div className="photo-header">
        <h3>📸 Photos d'intervention</h3>
        {!readOnly && (
          <div className="photo-type-selector">
            <select
              value={photoType}
              onChange={(e) =>
                setPhotoType(e.target.value as "before" | "after" | "other")
              }
              className="type-select"
            >
              <option value="before">📸 Avant intervention</option>
              <option value="after">✅ Après intervention</option>
              <option value="other">📷 Autre</option>
            </select>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="photo-actions">
          <button
            className="photo-btn camera-btn"
            onClick={() => cameraInputRef.current?.click()}
          >
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

          {/* Native Camera Input */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {/* Gallery Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* Photos Gallery */}
      <div className="photos-gallery">
        {beforePhotos.length > 0 && (
          <div className="photo-section">
            <h4>📸 Avant intervention ({beforePhotos.length})</h4>
            <div className="photo-grid">
              {beforePhotos.map((photo) => (
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
              {afterPhotos.map((photo) => (
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
              {otherPhotos.map((photo) => (
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
        <div
          className={`photo-modal ${isClosing ? "closing" : ""}`}
          onClick={handleClose}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={handleClose}>
              ✕
            </button>
            <img src={selectedPhoto.dataUrl} alt="Preview" />
            <div className="photo-info">
              <span className="photo-type-badge">
                {getTypeLabel(selectedPhoto.type)}
              </span>
              <span className="photo-time">
                🕒 {selectedPhoto.timestamp.toLocaleString("fr-FR")}
              </span>
            </div>

            <div className="modal-actions">
              <a
                href={selectedPhoto.dataUrl}
                download={`photo_${selectedPhoto.type}_${
                  selectedPhoto.timestamp.toISOString().split("T")[0]
                }.jpg`}
                className="modal-btn download-btn"
                onClick={(e) => e.stopPropagation()}
              >
                📥 Télécharger
              </a>
              <button
                className="modal-btn close-footer-btn"
                onClick={handleClose}
              >
                ✕ Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
