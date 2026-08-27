const STAY_KEY = "bv_stay";
const ALIVE_KEY = "bv_alive";

export function safeNextPath(value: string | null | undefined, fallback = "/account") {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return fallback;
}

export function wantsStaySignedIn() {
  try {
    return localStorage.getItem(STAY_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setStaySignedIn(stay: boolean) {
  try {
    localStorage.setItem(STAY_KEY, stay ? "1" : "0");
    if (stay) {
      sessionStorage.removeItem(ALIVE_KEY);
    } else {
      sessionStorage.setItem(ALIVE_KEY, "1");
    }
  } catch {
    /* private mode */
  }
}

/** If they did not choose stay signed in, drop the session when the browser is new. */
export async function endSessionIfBrowserClosed(
  signOut: () => Promise<unknown>
) {
  if (typeof window === "undefined") return;
  if (wantsStaySignedIn()) return;
  try {
    if (sessionStorage.getItem(ALIVE_KEY) === "1") return;
  } catch {
    return;
  }
  await signOut();
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "That took too long. Check your connection and try again."
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
