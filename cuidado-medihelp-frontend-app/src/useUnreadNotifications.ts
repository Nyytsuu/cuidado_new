import { useEffect, useState } from "react";
import { apiUrl } from "./sharedBackendFetch";

type RawNotification = {
  is_read?: number | string | boolean | null;
  unread?: boolean | null;
};

export const NOTIFICATIONS_UPDATED_EVENT = "cuidado:notifications-updated";

export const notifyNotificationsChanged = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
};

const getStoredUserId = () => {
  const directId = localStorage.getItem("userId");
  if (directId) return directId;

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}") as {
      id?: number | string;
    };
    return user.id ? String(user.id) : "";
  } catch {
    return "";
  }
};

const isUnreadNotification = (item: RawNotification) => {
  if (typeof item.unread === "boolean") return item.unread;
  return Number(item.is_read) === 0;
};

export function useUnreadNotifications(userIdInput?: number | string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = userIdInput ? String(userIdInput) : getStoredUserId();

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const res = await fetch(apiUrl(`/api/users/${userId}/notifications`), {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => [])) as RawNotification[];

        if (!cancelled && res.ok && Array.isArray(data)) {
          setUnreadCount(data.filter(isUnreadNotification).length);
        }
      } catch (error) {
        console.warn("Failed to load unread notifications:", error);
      }
    };

    void loadUnreadCount();

    const refresh = () => {
      void loadUnreadCount();
    };
    const interval = window.setInterval(refresh, 30_000);

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);

  return unreadCount;
}
