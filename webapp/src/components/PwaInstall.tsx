import { usePwaInstall } from "../hooks/usePwaInstall";

// Desktop install button component
export function PwaInstallButton() {
  const { isInstallable, promptInstall } = usePwaInstall();

  if (!isInstallable) {
    return null;
  }

  return (
    <button
      onClick={promptInstall}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        backgroundColor: "var(--primary-color)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: 600,
        transition: "all 0.2s",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
      }}
      title="Installer l'application"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Installer
    </button>
  );
}

// Mobile install popup component
export function PwaInstallPopup() {
  const { showMobilePrompt, promptInstall, dismissPrompt } = usePwaInstall();

  if (!showMobilePrompt) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "16px",
        right: "16px",
        backgroundColor: "var(--card-bg)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        zIndex: 9999,
        animation: "slideUp 0.3s ease-out",
        border: "1px solid var(--border-color)",
      }}
    >
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>

      {/* Close button */}
      <button
        onClick={dismissPrompt}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          color: "var(--text-secondary)",
        }}
        aria-label="Fermer"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Content */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* App Icon */}
        <div
          style={{
            width: "56px",
            height: "56px",
            backgroundColor: "var(--primary-color)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "28px" }}>📦</span>
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: "0 0 4px 0",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Installer TelcoManager
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            Accédez rapidement à l'appli depuis votre écran d'accueil
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        <button
          onClick={dismissPrompt}
          style={{
            flex: 1,
            padding: "12px",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Plus tard
        </button>
        <button
          onClick={promptInstall}
          style={{
            flex: 1,
            padding: "12px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: "var(--primary-color)",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Installer
        </button>
      </div>
    </div>
  );
}
