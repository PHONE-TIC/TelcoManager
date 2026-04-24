import type { CSSProperties } from "react";

export type AppIconName =
  | "dashboard"
  | "interventions"
  | "clients"
  | "users"
  | "stock"
  | "inventory"
  | "reports"
  | "ip-links"
  | "vehicle"
  | "bell"
  | "search"
  | "sun"
  | "moon"
  | "close"
  | "warning"
  | "location"
  | "home"
  | "mailbox"
  | "navigation"
  | "map"
  | "signal"
  | "history"
  | "filter"
  | "document"
  | "comment"
  | "attachment"
  | "clock"
  | "check-circle"
  | "x-circle"
  | "ban"
  | "eye"
  | "edit"
  | "trash"
  | "return"
  | "label"
  | "box"
  | "warehouse"
  | "technician"
  | "save"
  | "plus"
  | "printer"
  | "image"
  | "download"
  | "user";

interface AppIconProps {
  name: AppIconName;
  className?: string;
  size?: number;
  style?: CSSProperties;
}

export function AppIcon({ name, className = "", size = 22, style }: AppIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: `app-icon ${className}`.trim(),
    style,
    "aria-hidden": true,
    focusable: false,
  } as const;

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" />
          <path d="M7.5 15.5V12.5M12 15.5V8.5M16.5 15.5V10.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "interventions":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="3" fill="#ffedd5" stroke="#ea580c" strokeWidth="1.6" />
          <path d="M8 3.8V6.5M16 3.8V6.5M4 9.5H20" stroke="#ea580c" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M8 13H12M8 16H15.5" stroke="#ea580c" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "clients":
      return (
        <svg {...common}>
          <circle cx="9" cy="10" r="2.5" fill="#dbeafe" stroke="#4f46e5" strokeWidth="1.6" />
          <circle cx="15.5" cy="9.2" r="2.1" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.6" />
          <path d="M5.8 17.3C6.7 15.5 8.3 14.5 10.3 14.5C12.3 14.5 13.9 15.5 14.8 17.3" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14.8 16.4C15.4 15.4 16.4 14.8 17.7 14.8C18.5 14.8 19.3 15.1 19.8 15.7" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M12 4L18 6.4V11.2C18 15.1 15.4 18.5 12 19.8C8.6 18.5 6 15.1 6 11.2V6.4L12 4Z" fill="#dcfce7" stroke="#059669" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9.6 11.9L11.2 13.5L14.7 10" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "stock":
      return (
        <svg {...common}>
          <path d="M4.5 8.5L12 4.5L19.5 8.5L12 12.5L4.5 8.5Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M4.5 8.5V15.5L12 19.5L19.5 15.5V8.5" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 12.5V19.5" stroke="#d97706" strokeWidth="1.6" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="5" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.6" />
          <path d="M14.2 14.2L19 19" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10.5 8V13M8 10.5H13" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="#ffe4e6" stroke="#e11d48" strokeWidth="1.6" />
          <path d="M8 15V12M12 15V9M16 15V11" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "ip-links":
      return (
        <svg {...common}>
          <rect x="4.5" y="6" width="15" height="12" rx="3" fill="#ecfccb" stroke="#65a30d" strokeWidth="1.6" />
          <path d="M8 12H10.5M13.5 12H16" stroke="#65a30d" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill="#65a30d" />
          <path d="M12 6V4.5M12 19.5V18M4.5 12H3M21 12H19.5" stroke="#65a30d" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "vehicle":
      return (
        <svg {...common}>
          <path d="M5 15.5L7.4 9.5H16.6L19 15.5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="8.5" cy="16.5" r="1.8" fill="#fff" stroke="#0284c7" strokeWidth="1.6" />
          <circle cx="15.5" cy="16.5" r="1.8" fill="#fff" stroke="#0284c7" strokeWidth="1.6" />
          <path d="M9.1 15.5H14.9" stroke="#0284c7" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M8 17H16L15 15V10.8C15 9 13.7 7.5 12 7.2C10.3 7.5 9 9 9 10.8V15L8 17Z" fill="#ffedd5" stroke="#f97316" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M10.5 18.2C10.9 19 11.4 19.4 12 19.4C12.6 19.4 13.1 19 13.5 18.2" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 4.6V5.8" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="5" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" />
          <path d="M14.2 14.2L19 19" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.6" />
          <path d="M12 4V6.2M12 17.8V20M4 12H6.2M17.8 12H20M6.3 6.3L7.8 7.8M16.2 16.2L17.7 17.7M6.3 17.7L7.8 16.2M16.2 7.8L17.7 6.3" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M14.8 4.8C12.1 5 10 7.2 10 10C10 13 12.4 15.4 15.4 15.4C16.2 15.4 17 15.2 17.7 14.9C16.7 17.3 14.4 19 11.7 19C8.1 19 5.2 16.1 5.2 12.5C5.2 8.9 8.1 6 11.7 6C12.8 6 13.9 6.3 14.8 6.9V4.8Z" fill="#c7d2fe" stroke="#4f46e5" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M7 7L17 17M17 7L7 17" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M12 4.5L20 18.5H4L12 4.5Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 9V13" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.1" r="1" fill="#d97706" />
        </svg>
      );
    case "location":
      return (
        <svg {...common}>
          <path d="M12 20C15.5 16.1 17.2 13.4 17.2 10.4C17.2 7.4 14.9 5 12 5C9.1 5 6.8 7.4 6.8 10.4C6.8 13.4 8.5 16.1 12 20Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.6" />
          <circle cx="12" cy="10.3" r="2.2" fill="#ef4444" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="M4.5 11.5L12 5.5L19.5 11.5V18.5H14.5V14H9.5V18.5H4.5V11.5Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "mailbox":
      return (
        <svg {...common}>
          <rect x="5" y="6" width="14" height="12" rx="2.5" fill="#f3e8ff" stroke="#7c3aed" strokeWidth="1.6" />
          <path d="M7 9L12 13L17 9" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "navigation":
      return (
        <svg {...common}>
          <path d="M18.5 5.5L14.8 18.5L11.2 12.8L5.5 9.2L18.5 5.5Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M4.5 6.5L9.5 4.5L14.5 6.5L19.5 4.5V17.5L14.5 19.5L9.5 17.5L4.5 19.5V6.5Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9.5 4.5V17.5M14.5 6.5V19.5" stroke="#16a34a" strokeWidth="1.6" />
        </svg>
      );
    case "signal":
      return (
        <svg {...common}>
          <path d="M5 16.5H7.5V19H5V16.5ZM9 13H11.5V19H9V13ZM13 9.5H15.5V19H13V9.5ZM17 6H19.5V19H17V6Z" fill="#0ea5e9" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M5.5 8.5V4.8L2.8 7.5" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.8 7.5C7 5.9 9 5 11.2 5C14.9 5 18 8.1 18 11.8C18 15.5 14.9 18.5 11.2 18.5C8.5 18.5 6.1 16.9 5 14.5" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M11.2 8.3V12L13.7 13.5" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common}>
          <path d="M5 6H19L14 11.5V17L10 19V11.5L5 6Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "document":
      return (
        <svg {...common}>
          <path d="M7 4.5H14L18 8.5V19H7V4.5Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 4.5V8.5H18" stroke="#0284c7" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9.5 12H15.5M9.5 15H15.5" stroke="#0284c7" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "comment":
      return (
        <svg {...common}>
          <path d="M5 6.5H19V15.5H11L7.5 18V15.5H5V6.5Z" fill="#fae8ff" stroke="#c026d3" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "attachment":
      return (
        <svg {...common}>
          <path d="M9 12.5L13.8 7.7C15 6.5 16.8 6.5 18 7.7C19.2 8.9 19.2 10.7 18 11.9L11.5 18.4C9.9 20 7.4 20 5.8 18.4C4.2 16.8 4.2 14.3 5.8 12.7L11.8 6.7" stroke="#475569" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.6" />
          <path d="M12 8.5V12L14.8 13.8" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.6" />
          <path d="M8.6 12.1L10.8 14.3L15.4 9.7" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "x-circle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.6" />
          <path d="M9.3 9.3L14.7 14.7M14.7 9.3L9.3 14.7" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "ban":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.6" />
          <path d="M8.7 15.3L15.3 8.7" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M3.5 12C5.4 8.8 8.3 7.2 12 7.2C15.7 7.2 18.6 8.8 20.5 12C18.6 15.2 15.7 16.8 12 16.8C8.3 16.8 5.4 15.2 3.5 12Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="2.4" fill="#2563eb" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M6 16.8L16.6 6.2L18.8 8.4L8.2 19H6V16.8Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M15.4 7.4L17.6 9.6" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M7.5 8.5V18M12 8.5V18M16.5 8.5V18M5 6.5H19" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8.5 6.5L9.3 4.8H14.7L15.5 6.5M6.5 6.5H17.5V19.2C17.5 19.6 17.1 20 16.7 20H7.3C6.9 20 6.5 19.6 6.5 19.2V6.5Z" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "return":
      return (
        <svg {...common}>
          <path d="M9 8L5 12L9 16" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 12H14.5C16.4 12 18 13.6 18 15.5V16" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "label":
      return (
        <svg {...common}>
          <path d="M4.5 11.5L11.5 4.5H18.5V11.5L11.5 18.5L4.5 11.5Z" fill="#cffafe" stroke="#0891b2" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="15.2" cy="7.8" r="1.2" fill="#0891b2" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M4.5 8.5L12 4.5L19.5 8.5L12 12.5L4.5 8.5Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M4.5 8.5V15.5L12 19.5L19.5 15.5V8.5" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 12.5V19.5" stroke="#d97706" strokeWidth="1.6" />
        </svg>
      );
    case "warehouse":
      return (
        <svg {...common}>
          <path d="M4.5 10L12 5L19.5 10V18.5H4.5V10Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 18.5V13.5H16V18.5M8 9.5H8.01M12 9.5H12.01M16 9.5H16.01" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "technician":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.6" />
          <path d="M6.5 18C7.5 15.5 9.5 14.2 12 14.2C14.5 14.2 16.5 15.5 17.5 18" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "save":
      return (
        <svg {...common}>
          <path d="M5 5.5H16.5L19 8V18.5H5V5.5Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 5.5V10H15V5.5M8.5 18.5V13.5H15.5V18.5" stroke="#16a34a" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.6" />
          <path d="M12 8.5V15.5M8.5 12H15.5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "printer":
      return (
        <svg {...common}>
          <rect x="7" y="4.5" width="10" height="5" rx="1.2" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.6" />
          <rect x="5" y="9" width="14" height="7" rx="2" fill="#f8fafc" stroke="#4f46e5" strokeWidth="1.6" />
          <rect x="7.5" y="14.5" width="9" height="5" rx="1" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.4" />
          <circle cx="16.2" cy="11.8" r="0.9" fill="#4f46e5" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="4.5" y="5.5" width="15" height="13" rx="2.2" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.6" />
          <circle cx="9" cy="10" r="1.5" fill="#16a34a" />
          <path d="M6.5 16L10.2 12.3L12.8 14.9L15.3 12.4L17.5 14.6V16H6.5Z" fill="#86efac" stroke="#16a34a" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 5.5V14.2" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.8 11.5L12 14.7L15.2 11.5" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 18H18" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.6" />
          <path d="M6.8 18C7.7 15.6 9.5 14.4 12 14.4C14.5 14.4 16.3 15.6 17.2 18" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
