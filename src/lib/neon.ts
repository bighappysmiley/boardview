import { createClient as createNeonClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

const neonUrl = process.env.NEXT_PUBLIC_NEON_URL;
const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL;

export const isNeonConfigured = Boolean(neonUrl || (authUrl && dataApiUrl));

export type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    school?: string;
    name?: string;
  };
};

type AuthError = { message: string } | null;

type AuthSession = {
  user: AuthUser;
  access_token: string;
};

type AuthResult<T> = Promise<{ data: T; error: AuthError }>;

type NeonAuth = {
  signInWithPassword: (creds: {
    email: string;
    password: string;
  }) => AuthResult<{ user: AuthUser | null; session: AuthSession | null }>;
  signUp: (creds: {
    email: string;
    password: string;
    options?: { data?: Record<string, string>; emailRedirectTo?: string };
  }) => AuthResult<{ user: AuthUser | null; session: AuthSession | null }>;
  signOut: () => Promise<{ error: AuthError }>;
  getSession: () => AuthResult<{ session: AuthSession | null }>;
  getUser: () => AuthResult<{ user: AuthUser | null }>;
  onAuthStateChange: (
    callback: (event: string, session: AuthSession | null) => void
  ) => { data: { subscription: { unsubscribe: () => void } } };
  verifyOtp: (creds: {
    email?: string;
    token: string;
    type: "email" | "signup" | "recovery";
  }) => AuthResult<{ user: AuthUser | null; session: AuthSession | null }>;
  resend: (creds: {
    type: "signup" | "email";
    email: string;
  }) => AuthResult<Record<string, never>>;
  updateUser: (creds: {
    password?: string;
    data?: Record<string, string>;
  }) => AuthResult<{ user: AuthUser | null }>;
  resetPasswordForEmail: (
    email: string,
    options?: { redirectTo?: string }
  ) => AuthResult<Record<string, never>>;
};

function resolveUrls() {
  if (authUrl && dataApiUrl) {
    return { auth: authUrl, dataApi: dataApiUrl };
  }
  if (!neonUrl) {
    throw new Error(
      "Neon is not configured. Set NEXT_PUBLIC_NEON_URL (or NEXT_PUBLIC_NEON_AUTH_URL and NEXT_PUBLIC_NEON_DATA_API_URL)."
    );
  }
  const parsed = new URL(neonUrl);
  const [first, ...rest] = parsed.hostname.split(".");
  const path = parsed.pathname.replace(/\/$/, "");
  return {
    auth: `${parsed.protocol}//${first}.neonauth.${rest.join(".")}${path}/auth`,
    dataApi: `${parsed.protocol}//${first}.apirest.${rest.join(".")}${path}/rest/v1`,
  };
}

type NeonDb = Omit<ReturnType<typeof createNeonClient>, "auth"> & {
  auth: NeonAuth;
};

function makeClient(): NeonDb {
  if (!isNeonConfigured) {
    throw new Error(
      "Neon is not configured. Set NEXT_PUBLIC_NEON_URL (or NEXT_PUBLIC_NEON_AUTH_URL and NEXT_PUBLIC_NEON_DATA_API_URL)."
    );
  }
  const urls = resolveUrls();
  return createNeonClient({
    auth: {
      adapter: SupabaseAuthAdapter(),
      url: urls.auth,
      allowAnonymous: true,
    },
    dataApi: { url: urls.dataApi },
  } as never) as unknown as NeonDb;
}

let browserClient: NeonDb | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    return makeClient();
  }
  if (!browserClient) browserClient = makeClient();
  return browserClient;
}

/** Anonymous Data API client for route handlers (desk RPCs, visitor chat). */
export function createAnonClient() {
  return makeClient();
}

export function createClientWithToken(accessToken: string | null) {
  if (!accessToken) return makeClient();
  const { dataApi } = resolveUrls();
  return createNeonClient({
    dataApi: {
      url: dataApi,
      getToken: async () => accessToken,
    },
  });
}

export function accessTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  return null;
}

export function userFromAccessToken(token: string | null): AuthUser | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as {
      sub?: string;
      email?: string;
      name?: string;
    };
    if (!json.sub) return null;
    return {
      id: json.sub,
      email: json.email ?? null,
      user_metadata: {
        full_name: json.name,
        name: json.name,
      },
    };
  } catch {
    return null;
  }
}

export async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  if (!isNeonConfigured) return extra ?? {};
  const { data } = await createClient().auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...(extra ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function asAuthUser(
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    user_metadata?: AuthUser["user_metadata"];
  } | null
): AuthUser | null {
  if (!user) return null;
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.name ??
    undefined;
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      ...user.user_metadata,
      full_name: fullName,
      name: fullName,
    },
  };
}
