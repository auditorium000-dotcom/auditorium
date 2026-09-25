import crypto from 'node:crypto';
import { google } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates and returns an OAuth2 client configured with application credentials.
 * Throws a safe configuration error if required environment variables are absent.
 */
export function createGoogleOAuthClient(): OAuth2Client {
  const clientId = config.GOOGLE_CLIENT_ID;
  const clientSecret = config.GOOGLE_CLIENT_SECRET;
  const redirectUri = config.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google Drive OAuth is not configured. Ensure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set.'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates a cryptographically secure, signed OAuth state payload.
 * Structure: `<nonce>.<timestamp>.<hmacSignature>`
 */
export function generateOAuthState(): string {
  const nonce = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${nonce}.${timestamp}`;

  const hmac = crypto.createHmac('sha256', config.BETTER_AUTH_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  return `${payload}.${signature}`;
}

/**
 * Validates the returned OAuth state parameter against the expected cookie state
 * and cryptographic HMAC signature.
 */
export function validateOAuthState(
  returnedState: string | undefined,
  expectedCookieState: string | null | undefined
): { valid: boolean; error?: string } {
  if (!returnedState || typeof returnedState !== 'string' || !returnedState.trim()) {
    return { valid: false, error: 'OAuth state parameter is missing from the callback request.' };
  }

  if (
    !expectedCookieState ||
    typeof expectedCookieState !== 'string' ||
    !expectedCookieState.trim()
  ) {
    return {
      valid: false,
      error: 'OAuth session state cookie is missing or expired. Please re-initiate authorization.',
    };
  }

  // Constant-time comparison between returned state and expected cookie state
  const returnedBuf = Buffer.from(returnedState);
  const expectedBuf = Buffer.from(expectedCookieState);

  if (
    returnedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(returnedBuf, expectedBuf)
  ) {
    return {
      valid: false,
      error: 'OAuth state mismatch. The request may have been forged, expired, or intercepted.',
    };
  }

  const parts = returnedState.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed OAuth state parameter format.' };
  }

  const [nonce, timestampStr, signature] = parts;
  if (!nonce || !timestampStr || !signature) {
    return { valid: false, error: 'Malformed OAuth state structure.' };
  }

  // Verify cryptographic HMAC signature
  const payload = `${nonce}.${timestampStr}`;
  const hmac = crypto.createHmac('sha256', config.BETTER_AUTH_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return { valid: false, error: 'Invalid OAuth state signature.' };
  }

  // Verify expiration (10 minutes)
  const timestamp = parseInt(timestampStr, 10);
  if (
    isNaN(timestamp) ||
    Date.now() - timestamp > STATE_MAX_AGE_MS ||
    timestamp > Date.now() + 60000
  ) {
    return {
      valid: false,
      error: 'OAuth authorization request has expired (10-minute limit). Please try again.',
    };
  }

  return { valid: true };
}

/**
 * Generates the Google OAuth 2.0 authorization URL requesting offline access,
 * consent prompt, and secure state.
 */
export function getGoogleAuthorizationUrl(state: string): string {
  const oauth2Client = createGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_DRIVE_SCOPE],
    state,
  });
}

/**
 * Exchanges the one-time authorization code returned by Google for OAuth tokens.
 */
export async function exchangeGoogleAuthorizationCode(code: string): Promise<Credentials> {
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new Error('A valid authorization code is required for Google OAuth token exchange.');
  }

  const oauth2Client = createGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code.trim());

  return tokens;
}
