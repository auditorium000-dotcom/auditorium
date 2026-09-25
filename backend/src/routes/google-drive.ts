import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config/index.js';
import {
  generateOAuthState,
  validateOAuthState,
  getGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleDriveConnection,
} from '../services/google-drive.js';
import { createDatabaseBackup } from '../services/backup.js';

interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

const STATE_COOKIE_NAME = 'gdrive_oauth_state';

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
}

function setOAuthStateCookie(reply: FastifyReply, state: string): void {
  const isProd = config.NODE_ENV === 'production';
  const cookieOptions = [
    `${STATE_COOKIE_NAME}=${encodeURIComponent(state)}`,
    'Path=/api/google-drive',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600', // 10 minutes
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  reply.header('Set-Cookie', cookieOptions);
}

function clearOAuthStateCookie(reply: FastifyReply): void {
  const isProd = config.NODE_ENV === 'production';
  const cookieOptions = [
    `${STATE_COOKIE_NAME}=`,
    'Path=/api/google-drive',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  reply.header('Set-Cookie', cookieOptions);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const googleDriveRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/google-drive/backup/test
   * Protected test/manual backup endpoint.
   * Creates a structured PostgreSQL snapshot and uploads it to the configured Google Drive hierarchy.
   */
  fastify.post('/google-drive/backup/test', { preHandler: requireAuth }, async (request, reply) => {
    try {
      request.log.info('Starting manual database backup to Google Drive...');
      const backupResult = await createDatabaseBackup();
      request.log.info(
        { fileName: backupResult.fileName, sizeBytes: backupResult.sizeBytes },
        'Database backup successfully uploaded to Google Drive'
      );

      return reply.code(200).send({
        success: true,
        backup: {
          fileId: backupResult.fileId,
          fileName: backupResult.fileName,
          createdAt: backupResult.createdAt,
          sizeBytes: backupResult.sizeBytes,
        },
      });
    } catch (err: unknown) {
      request.log.error(err, 'Manual database backup failed');
      return reply.code(500).send({
        success: false,
        error: 'Database backup failed',
      });
    }
  });

  /**
   * GET /api/google-drive/status
   * Protected diagnostic endpoint to verify that the configured Google Drive refresh token works.
   */
  fastify.get('/google-drive/status', { preHandler: requireAuth }, async (_request, reply) => {
    try {
      await verifyGoogleDriveConnection();
      return reply.code(200).send({
        connected: true,
        service: 'google-drive',
      });
    } catch {
      return reply.code(200).send({
        connected: false,
        service: 'google-drive',
        error: 'Google Drive authentication failed',
      });
    }
  });

  /**
   * GET /api/google-drive/auth
   * Protected endpoint for authenticated managers to initiate Google Drive OAuth flow.
   * Generates a cryptographically signed state, stores it in a secure cookie, and returns the authorization URL.
   */
  fastify.get('/google-drive/auth', { preHandler: requireAuth }, async (_request, reply) => {

    try {
      const state = generateOAuthState();
      setOAuthStateCookie(reply, state);
      const authorizationUrl = getGoogleAuthorizationUrl(state);

      return reply.code(200).send({ authorizationUrl });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate Google authorization URL.';
      return reply.code(500).send({
        error: 'CONFIG_ERROR',
        message: errorMessage,
      });
    }
  });

  /**
   * GET /api/google-drive/callback
   * Public callback endpoint reached by Google OAuth redirect.
   * Validates state protection before exchanging code, then presents the refresh token setup view.
   */
  fastify.get<{ Querystring: CallbackQuery }>(
    '/google-drive/callback',
    async (request, reply) => {
      const { code, state, error, error_description } = request.query;

      // Extract expected state from HTTP-only cookie and immediately clear it to prevent replay attacks
      const expectedCookieState = parseCookie(request.headers.cookie, STATE_COOKIE_NAME);
      clearOAuthStateCookie(reply);

      // Handle OAuth error returned by Google
      if (error) {
        const safeError = escapeHtml(error);
        const safeDesc = error_description
          ? escapeHtml(error_description)
          : 'Google OAuth consent was denied or encountered an error.';

        const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Drive Authorization Failed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 12px 0; color: #f8fafc; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; }
    .details { background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #fca5a5; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Authorization Error</div>
    <h1>Google Drive Authorization Failed</h1>
    <p>Google returned an error during the OAuth process:</p>
    <div class="details">${safeError}${safeDesc ? `: ${safeDesc}` : ''}</div>
    <p style="margin-top: 16px; font-size: 13px; color: #64748b;">Please verify your Google Cloud OAuth Consent Screen configuration and try again.</p>
  </div>
</body>
</html>`;
        return reply.type('text/html').code(400).send(errorHtml);
      }

      // Enforce cryptographic state validation before any code exchange
      const stateValidation = validateOAuthState(state, expectedCookieState);
      if (!stateValidation.valid) {
        const stateErrorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid OAuth State</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 12px 0; color: #f8fafc; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; }
    .details { background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #fca5a5; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Security Error</div>
    <h1>Invalid or Expired OAuth State</h1>
    <p>The state verification check failed to validate:</p>
    <div class="details">${escapeHtml(stateValidation.error || 'State validation failed.')}</div>
    <p style="margin-top: 16px; font-size: 13px; color: #64748b;">Please return to the application and re-initiate the Google Drive authorization flow.</p>
  </div>
</body>
</html>`;
        return reply.type('text/html').code(400).send(stateErrorHtml);
      }

      // Verify presence of authorization code
      if (!code) {
        const noCodeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid OAuth Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; }
    h1 { font-size: 20px; color: #f87171; margin-top: 0; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Missing Authorization Code</h1>
    <p>No authorization code was supplied in the callback request. Please initiate the authorization flow from the administrator portal.</p>
  </div>
</body>
</html>`;
        return reply.type('text/html').code(400).send(noCodeHtml);
      }

      // Exchange validated authorization code for OAuth tokens
      try {
        const tokens = await exchangeGoogleAuthorizationCode(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
          const noRefreshHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>No Refresh Token Returned</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 540px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 12px 0; color: #f8fafc; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Notice</div>
    <h1>No Refresh Token Returned</h1>
    <p>Google authenticated the request but did not return a new refresh token. This typically occurs if access was previously granted without re-prompting for consent.</p>
    <p>Please revoke access in your Google Account security settings or re-initiate authorization with <code>prompt=consent</code> to generate a new refresh token.</p>
  </div>
</body>
</html>`;
          return reply.type('text/html').code(200).send(noRefreshHtml);
        }

        const safeRefreshToken = escapeHtml(refreshToken);

        const successHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Drive Authorization Successful</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 90vh; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; max-width: 620px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
    .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 12px 0; color: #f8fafc; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; }
    .token-box { position: relative; background: #020617; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .token-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #38bdf8; word-break: break-all; user-select: all; line-height: 1.5; }
    .copy-btn { margin-top: 12px; background: #4f46e5; color: #ffffff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .copy-btn:hover { background: #4338ca; }
    .warning-box { background: rgba(245,158,11,0.08); border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 20px; }
    .warning-text { color: #fbbf24; font-size: 13px; font-weight: 500; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Setup Complete</div>
    <h1>Google Drive authorization successful.</h1>
    <p>Google returned a refresh token. Store it securely as <strong>GOOGLE_REFRESH_TOKEN</strong> in the backend environment variables. Never commit this value to Git.</p>
    
    <div class="token-box">
      <div id="token" class="token-value">${safeRefreshToken}</div>
      <button class="copy-btn" onclick="copyToken()">Copy Refresh Token</button>
    </div>

    <div class="warning-box">
      <p class="warning-text">⚠️ <strong>Security Notice:</strong> Treat this refresh token like a password. Do not share it or commit it to Git.</p>
    </div>
  </div>

  <script>
    function copyToken() {
      const token = document.getElementById('token').innerText;
      navigator.clipboard.writeText(token).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.innerText = 'Copied to Clipboard!';
        setTimeout(() => { btn.innerText = 'Copy Refresh Token'; }, 2500);
      });
    }
  </script>
</body>
</html>`;

        return reply.type('text/html').code(200).send(successHtml);
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to exchange authorization code.';

        const exchangeFailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Token Exchange Failed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; }
    .badge { display: inline-block; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 12px 0; color: #f8fafc; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .details { background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 13px; color: #fca5a5; word-break: break-word; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Exchange Error</div>
    <h1>Token Exchange Failed</h1>
    <p>Could not exchange the authorization code with Google:</p>
    <div class="details">${escapeHtml(errorMsg)}</div>
    <p style="margin-top: 16px; font-size: 13px; color: #64748b;">The code may have expired or already been used. Please re-initiate authorization.</p>
  </div>
</body>
</html>`;
        return reply.type('text/html').code(500).send(exchangeFailHtml);
      }
    }
  );
};
