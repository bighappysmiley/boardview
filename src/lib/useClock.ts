"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

/**
 * Current time as "10:42", or null during server render / first paint so the
 * markup matches on both sides. useSyncExternalStore is the supported way to
 * read a moving external value like the clock without setState-in-effect.
 */
export function useClock(): string | null {
  const minuteStamp = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60_000),
    () => null
  );

  if (minuteStamp === null) return null;

  return new Date(minuteStamp * 60_000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
