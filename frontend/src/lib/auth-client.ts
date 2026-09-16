import { createAuthClient } from 'better-auth/react';

const getAuthBaseUrl = (): string => {
  if (import.meta.env.PROD) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  return (
    import.meta.env.VITE_AUTH_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '') ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  );
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
});

export const { signIn, signOut, useSession, getSession } = authClient;

