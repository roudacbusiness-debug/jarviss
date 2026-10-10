"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverDefault = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

export const useIsDesktop = () => useMediaQuery("(min-width: 768px)", true);
export const useIsWide = () => useMediaQuery("(min-width: 1180px)", true);
