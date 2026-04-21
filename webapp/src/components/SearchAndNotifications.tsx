import { Suspense } from "react";
import { useAuth } from "../contexts/useAuth";
import GlobalSearch from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";

export function SearchAndNotifications() {
  const { user } = useAuth();

  if (!user || (user.role !== "admin" && user.role !== "gestionnaire")) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <div className="search-notifications-bar">
        <div className="search-notifications-bar__search">
          <GlobalSearch />
        </div>
        <div className="search-notifications-bar__notification">
          <NotificationCenter />
        </div>
      </div>
    </Suspense>
  );
}
