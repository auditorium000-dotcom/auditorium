import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL:
    import.meta.env.VITE_AUTH_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin),
});

export const { signIn, signOut, useSession, getSession } = authClient;
