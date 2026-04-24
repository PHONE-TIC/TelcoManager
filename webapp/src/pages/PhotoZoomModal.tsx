import type { MutableRefObject } from "react";
import { AppIcon } from "../components/AppIcon";

interface PhotoZoomModalProps {
  photoUrl: string | null;
  zoomLevel: number;
  onClose: () => void;
  onZoomChange: (zoom: number) => void;
  enableTouchZoom?: boolean;
  initialPinchDistance?: MutableRefObject<number | null>;
  initialZoomLevel?: MutableRefObject<number>;
}

export default function PhotoZoomModal({
  photoUrl,
  zoomLevel,
  onClose,
  onZoomChange,
  enableTouchZoom = false,
  initialPinchDistance: initialPinchDistanceRef,
  initialZoomLevel: initialZoomLevelRef,
}: PhotoZoomModalProps) {
  if (!photoUrl) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.2)",
          color: "white",
          fontSize: "24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppIcon name="close" size={20} />
      </button>

      <div
        style={{
          position: "absolute",
          bottom: "30px",
          display: "flex",
          gap: "15px",
          alignItems: "center",
          background: "rgba(0,0,0,0.6)",
          padding: "10px 20px",
          borderRadius: "30px",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.25))}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          −
        </button>
        <span
          style={{
            color: "white",
            fontSize: "14px",
            minWidth: "3.5rem",
            textAlign: "center",
          }}
        >
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => onZoomChange(Math.min(4, zoomLevel + 0.25))}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          +
        </button>
        <button
          onClick={() => onZoomChange(1)}
          style={{
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      <div
        style={{
          overflow: "auto",
          maxWidth: "90vw",
          maxHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={photoUrl}
          alt="Photo agrandie"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "center center",
            transition: enableTouchZoom
              ? "transform 0.1s ease"
              : "transform 0.2s ease",
            maxWidth: zoomLevel === 1 ? "90vw" : "none",
            maxHeight: zoomLevel === 1 ? "80vh" : "none",
            objectFit: "contain",
            ...(enableTouchZoom ? { touchAction: "none" } : {}),
          }}
          onTouchStart={
            enableTouchZoom && initialPinchDistanceRef && initialZoomLevelRef
              ? (event) => {
                  if (event.touches.length === 2) {
                    const dx = event.touches[0].clientX - event.touches[1].clientX;
                    const dy = event.touches[0].clientY - event.touches[1].clientY;
                    initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
                    initialZoomLevelRef.current = zoomLevel;
                  }
                }
              : undefined
          }
          onTouchMove={
            enableTouchZoom && initialPinchDistanceRef && initialZoomLevelRef
              ? (event) => {
                  if (event.touches.length === 2 && initialPinchDistanceRef.current) {
                    event.preventDefault();
                    const dx = event.touches[0].clientX - event.touches[1].clientX;
                    const dy = event.touches[0].clientY - event.touches[1].clientY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const scale = distance / initialPinchDistanceRef.current;
                    const newZoom = Math.max(
                      0.5,
                      Math.min(4, initialZoomLevelRef.current * scale)
                    );
                    onZoomChange(newZoom);
                  }
                }
              : undefined
          }
          onTouchEnd={
            enableTouchZoom && initialPinchDistanceRef
              ? () => {
                  initialPinchDistanceRef.current = null;
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
