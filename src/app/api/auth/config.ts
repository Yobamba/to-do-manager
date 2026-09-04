import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

// Extend the built-in session type
interface ExtendedSession extends Session {
  accessToken?: string;
  error?: string;
}

// Extend the built-in JWT type
interface ExtendedToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
}

async function refreshAccessToken(
  token: ExtendedToken,
): Promise<ExtendedToken> {
  try {
    // Ensure we have a refresh token before attempting to call Google
    if (!token.refreshToken) {
      console.error("No refresh token available for token refresh");
      return {
        ...token,
        error: "NoRefreshToken",
      };
    }
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken!,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Non-OK response refreshing token:", refreshedTokens);
      // If Google indicates the refresh token is invalid/expired, clear it
      if (refreshedTokens?.error === "invalid_grant") {
        return {
          ...token,
          error: "RefreshAccessTokenError",
          refreshToken: undefined,
        };
      }

      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }): Promise<ExtendedToken> {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : 0,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token as ExtendedToken;
      }

      // Access token has expired, try to update it
      try {
        return await refreshAccessToken(token as ExtendedToken);
      } catch (err) {
        console.error("JWT callback refresh failed:", err);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }): Promise<ExtendedSession> {
      const extendedToken = token as ExtendedToken;
      return {
        ...session,
        accessToken: extendedToken.accessToken,
        error: extendedToken.error,
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
};
