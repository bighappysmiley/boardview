import {
  accessTokenFromRequest,
  createClientWithToken,
  userFromAccessToken,
} from "@/lib/neon";

/**
 * Data API client for route handlers. Pass the caller's Bearer token when
 * the request is authenticated; otherwise the anonymous role is used.
 */
export function createRouteHandlerClient(request: Request) {
  const token = accessTokenFromRequest(request);
  const db = createClientWithToken(token);
  return Object.assign(db, {
    auth: {
      async getUser() {
        return { data: { user: userFromAccessToken(token) }, error: null };
      },
      async getSession() {
        const user = userFromAccessToken(token);
        return {
          data: {
            session: user && token ? { user, access_token: token } : null,
          },
          error: null,
        };
      },
    },
  });
}
