"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function MomentRealtimeRefresh({
  coupleId,
  unseenCount,
}: {
  coupleId?: string;
  unseenCount?: number;
}) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof unseenCount !== "number" || !("setAppBadge" in navigator)) return;
    const badge = navigator as Navigator & {
      clearAppBadge(): Promise<void>;
      setAppBadge(count?: number): Promise<void>;
    };
    void (unseenCount > 0 ? badge.setAppBadge(unseenCount) : badge.clearAppBadge()).catch(() => undefined);
  }, [unseenCount]);

  useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 180);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    const checkinSubscription = coupleId
      ? { event: "*" as const, schema: "public", table: "checkins", filter: `couple_id=eq.${coupleId}` }
      : { event: "*" as const, schema: "public", table: "checkins" };
    const channel = supabase.channel(`moments-live-${coupleId ?? "viewer"}`)
      .on("postgres_changes", checkinSubscription, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "moment_reactions" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "moment_replies" }, scheduleRefresh)
      .subscribe();

    window.addEventListener("focus", scheduleRefresh);
    window.addEventListener("online", scheduleRefresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      window.removeEventListener("focus", scheduleRefresh);
      window.removeEventListener("online", scheduleRefresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [coupleId, router]);

  return null;
}
