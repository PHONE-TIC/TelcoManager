import { useState, useEffect, useMemo } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Type for iOS Safari's navigator.standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface UsePwaInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isMobile: boolean;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
  showMobilePrompt: boolean;
}

// Helper functions outside the hook
const checkMobile = () => {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768
  );
};

const checkInstalled = () => {
  if (typeof window === "undefined") return false;
  // Check display-mode
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  // Check iOS Safari
  if ((navigator as NavigatorWithStandalone).standalone === true) {
    return true;
  }
  return false;
};

export function usePwaInstall(): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Initialize state with computed values
  const initialIsMobile = useMemo(() => checkMobile(), []);
  const initialIsInstalled = useMemo(() => checkInstalled(), []);

  const [isInstalled, setIsInstalled] = useState(initialIsInstalled);
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(initialIsMobile);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show mobile prompt if on mobile and not dismissed before
      if (checkMobile() && !localStorage.getItem("pwa-install-dismissed")) {
        setShowMobilePrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowMobilePrompt(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Handle resize
    const handleResize = () => {
      setIsMobile(checkMobile());
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowMobilePrompt(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error prompting install:", error);
      return false;
    }
  };

  const dismissPrompt = () => {
    setShowMobilePrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  return {
    isInstallable: !!deferredPrompt && !isInstalled,
    isInstalled,
    isMobile,
    promptInstall,
    dismissPrompt,
    showMobilePrompt: showMobilePrompt && !isInstalled,
  };
}
