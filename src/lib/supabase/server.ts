import { createServerClient } from "@supabase/ssr";
import type { NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * For use inside Route Handlers, where cookies read from the incoming
 * request and any refreshed session must be written onto the outgoing
 * NextResponse.
 */
export function createRouteHandlerClient(
  request: Request,
  response: NextResponse
) {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie") ?? "";
        return cookieHeader
          .split(";")
          .map((pair) => pair.trim())
          .filter(Boolean)
          .map((pair) => {
            const index = pair.indexOf("=");
            return {
              name: decodeURIComponent(pair.slice(0, index)),
              value: decodeURIComponent(pair.slice(index + 1)),
            };
          });
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
