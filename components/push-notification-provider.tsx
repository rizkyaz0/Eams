"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

export function PushNotificationProvider({ userId }: { userId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    // Request permission for OS-level Push Notifications
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications?unread=true");
        const data = await res.json();

        if (data.success && data.data.length > 0) {
          const storedIds = JSON.parse(localStorage.getItem(`notifs_${userId}`) || "[]");
          const newNotifications = data.data.filter((n: any) => !storedIds.includes(n.id));

          newNotifications.forEach((notif: any) => {
            // Trigger OS Push Notification
            if ("Notification" in window && Notification.permission === "granted") {
              const notification = new Notification("EAMS Alert: " + notif.title, {
                body: notif.message,
                icon: "/vercel.svg", // Optional
              });
              notification.onclick = () => {
                if (notif.link) {
                  window.open(notif.link, "_blank");
                }
              };
            }
            
            // Trigger App-level Toast Notification
            toast.info(notif.title, {
              description: notif.message,
              duration: 10000,
            });
            
            storedIds.push(notif.id);
          });

          // Keep localStorage up to date with max 100 ids
          localStorage.setItem(`notifs_${userId}`, JSON.stringify(storedIds.slice(-100)));
        }
      } catch (e) {
        // Silent block for dev clarity
      }
    };

    // Fetch once on mount or route change instead of polling every 15s
    fetchNotifications();
  }, [userId, pathname]);

  return null; // This is a headless component
}
