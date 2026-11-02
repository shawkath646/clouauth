/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generic OAuth 2.0 / OpenID Connect (OIDC) Test Client
 * 
 * Features:
 * - Dynamic Discovery via /.well-known/openid-configuration
 * - Authorization Code Flow with PKCE (RFC 7636, S256)
 * - Standard Token Exchange (RFC 6749)
 * - Standard UserInfo Claim Fetching (OIDC Core 1.0)
 * - Zero external npm dependencies (uses native Node.js http, crypto, fetch)
 */

const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

// Configuration
const PORT = 3001;
const ISSUER_URL = process.env.ISSUER_URL || 'http://localhost:3000';
const CLIENT_ID = process.env.CLIENT_ID || 'cbl_2ed42a6a5ac71a045388a294';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'cbl_sec_a51dae0611feae85203b97ec080e3d17859a2580c8b54d74';
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = 'openid profile email';

// In-memory state storage (state -> { codeVerifier, createdAt })
const pendingAuthRequests = new Map();

// Clean up stale requests older than 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [state, data] of pendingAuthRequests.entries()) {
    if (data.createdAt < cutoff) pendingAuthRequests.delete(state);
  }
}, 60 * 1000);


/**
 * Base64URL encoder (RFC 7636)
 */
function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}


/**
 * Generates a cryptographic PKCE Code Verifier and Code Challenge (S256)
 */
function generatePKCE() {
  const verifier = base64URLEncode(crypto.randomBytes(32));
  const challenge = base64URLEncode(
    crypto.createHash('sha256').update(verifier).digest()
  );
  return { verifier, challenge };
}


/**
 * Fetches OpenID Connect Provider Discovery Document
 */
async function discoverOidcEndpoints() {
  const wellKnownUrl = `${ISSUER_URL.replace(/\/$/, '')}/.well-known/openid-configuration`;
  console.log(`\n🔍 [Discovery] Fetching OIDC configuration from: ${wellKnownUrl}`);
  
  const response = await fetch(wellKnownUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Discovery failed (${response.status} ${response.statusText}). Make sure ClouAuth is running on ${ISSUER_URL}`
    );
  }

  const config = await response.json();
  console.log('✅ [Discovery] Endpoints successfully resolved:');
  console.log(`   - Authorization: ${config.authorization_endpoint}`);
  console.log(`   - Token:         ${config.token_endpoint}`);
  console.log(`   - UserInfo:      ${config.userinfo_endpoint}`);

  return {
    authorizationEndpoint: config.authorization_endpoint,
    tokenEndpoint: config.token_endpoint,
    userinfoEndpoint: config.userinfo_endpoint,
  };
}


/**
 * HTML UI Template Builder
 */
function renderHtml({ title, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — OAuth Test Client</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card: #121217;
      --border: #27272a;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --text: #f4f4f5;
      --muted: #a1a1aa;
      --success: #10b981;
      --error: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 36px;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
    }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 8px; }
    p.subtitle { color: var(--muted); font-size: 14px; margin-bottom: 24px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--primary);
      color: #fff;
      font-weight: 600;
      padding: 12px 24px;
      border-radius: 12px;
      text-decoration: none;
      transition: background 0.2s;
      cursor: pointer;
      border: none;
      font-size: 15px;
    }
    .btn:hover { background: var(--primary-hover); }
    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    .avatar {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 3px solid var(--primary);
      object-fit: cover;
      background: #27272a;
    }
    .profile-info h2 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .profile-info .email { color: var(--muted); font-size: 14px; display: flex; align-items: center; gap: 6px; }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    .detail-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 16px;
    }
    .detail-label { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: 0.5px; margin-bottom: 4px; }
    .detail-val { font-size: 14px; font-weight: 600; word-break: break-all; }
    pre {
      background: #000;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #93c5fd;
      overflow-x: auto;
      max-height: 240px;
      margin-top: 12px;
    }
    details { margin-top: 16px; border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: rgba(0,0,0,0.2); }
    summary { font-size: 13px; font-weight: 600; color: var(--muted); cursor: pointer; user-select: none; }
  </style>
</head>
<body>
  <div class="card">
    ${content}
  </div>
</body>
</html>`;
}

async function startServer() {
  let endpoints;
  try {
    endpoints = await discoverOidcEndpoints();
  } catch (err) {
    console.error(`\n❌ [Fatal] Could not resolve OIDC endpoints: ${err.message}`);
    console.error('Make sure your ClouAuth Next.js application is running (e.g. npm run dev on port 3000).\n');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = reqUrl.pathname;

    // Route: GET /
    if (pathname === '/') {
      const html = renderHtml({
        title: 'ClouAuth OAuth 2.0 Tester',
        content: `
          <h1>ClouAuth OAuth 2.0 Test Client</h1>
          <p class="subtitle">Standard Generic OpenID Connect Relying Party Test</p>
          <div class="detail-grid" style="margin-bottom: 24px;">
            <div class="detail-item">
              <div class="detail-label">Client ID</div>
              <div class="detail-val">${CLIENT_ID}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Redirect URI</div>
              <div class="detail-val">${REDIRECT_URI}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Requested Scopes</div>
              <div class="detail-val">${SCOPES}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Auth Method</div>
              <div class="detail-val">Authorization Code + PKCE (S256)</div>
            </div>
          </div>
          <div style="text-align: center;">
            <a href="/login" class="btn">🚀 Sign In with ClouAuth</a>
          </div>
        `,
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // Route: GET /login (Initiate generic OIDC flow)
    if (pathname === '/login') {
      const state = crypto.randomBytes(16).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');
      const { verifier, challenge } = generatePKCE();

      pendingAuthRequests.set(state, {
        codeVerifier: verifier,
        createdAt: Date.now(),
      });

      const authUrl = new URL(endpoints.authorizationEndpoint);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('nonce', nonce);
      authUrl.searchParams.set('code_challenge', challenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      console.log(`\n➡️  [Initiate Flow] Redirecting user to authorization endpoint:`);
      console.log(`   URL: ${authUrl.toString()}`);
      console.log(`   State: ${state}`);
      console.log(`   Code Challenge (S256): ${challenge}`);

      res.writeHead(302, { Location: authUrl.toString() });
      res.end();
      return;
    }

    // Route: GET /callback (Handle Authorization Code Response)
    if (pathname === '/callback') {
      const code = reqUrl.searchParams.get('code');
      const state = reqUrl.searchParams.get('state');
      const error = reqUrl.searchParams.get('error');
      const errorDescription = reqUrl.searchParams.get('error_description');

      console.log(`\n⬅️  [Callback Received] Query params:`, Object.fromEntries(reqUrl.searchParams.entries()));

      if (error) {
        console.error(`❌ [Callback Error] ${error}: ${errorDescription}`);
        const html = renderHtml({
          title: 'Authorization Error',
          content: `
            <h1 style="color: var(--error);">Authorization Failed</h1>
            <p class="subtitle">${error}: ${errorDescription || 'No description provided'}</p>
            <a href="/" class="btn" style="background: var(--border);">Back to Home</a>
          `,
        });
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (!state || !pendingAuthRequests.has(state)) {
        console.error(`❌ [State Mismatch] Received unknown or expired state: ${state}`);
        const html = renderHtml({
          title: 'State Verification Error',
          content: `
            <h1 style="color: var(--error);">Security Check Failed</h1>
            <p class="subtitle">Invalid, tampered, or expired 'state' parameter. Possible CSRF attempt.</p>
            <a href="/" class="btn" style="background: var(--border);">Restart Login</a>
          `,
        });
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      const { codeVerifier } = pendingAuthRequests.get(state);
      pendingAuthRequests.delete(state);

      try {
        // Step 1: Exchange Authorization Code for Tokens at Token Endpoint
        console.log(`\n🔄 [Token Exchange] Calling ${endpoints.tokenEndpoint}...`);
        
        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code_verifier: codeVerifier,
        });

        const tokenResponse = await fetch(endpoints.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: tokenParams.toString(),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(
            `Token endpoint returned ${tokenResponse.status}: ${tokenData.error || 'Unknown error'} (${tokenData.error_description || ''})`
          );
        }

        console.log('✅ [Token Exchange Success] Received Tokens:');
        console.log(`   - Access Token: ${tokenData.access_token ? tokenData.access_token.slice(0, 20) + '...' : 'None'}`);
        console.log(`   - ID Token:     ${tokenData.id_token ? tokenData.id_token.slice(0, 20) + '...' : 'None'}`);
        console.log(`   - Expires In:   ${tokenData.expires_in} seconds`);

        // Step 2: Fetch User Profile from UserInfo Endpoint
        console.log(`\n👤 [UserInfo] Requesting user profile from ${endpoints.userinfoEndpoint}...`);
        const userinfoResponse = await fetch(endpoints.userinfoEndpoint, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
          },
        });

        const userInfo = await userinfoResponse.json();

        if (!userinfoResponse.ok) {
          throw new Error(
            `UserInfo endpoint returned ${userinfoResponse.status}: ${userInfo.error || 'Unknown error'}`
          );
        }

        console.log('🎉 [Success] User Profile Fetched:');
        console.log('   - Sub/ID:   ', userInfo.sub);
        console.log('   - Name:     ', userInfo.name);
        console.log('   - Email:    ', userInfo.email);
        console.log('   - Username: ', userInfo.preferred_username);
        console.log('   - Avatar:   ', userInfo.picture);

        // Step 3: Render User Profile Dashboard
        const avatarUrl = userInfo.picture || 'https://assets.clouburstlab.com/default-avatar.png';
        const displayName = userInfo.name || userInfo.preferred_username || 'Authenticated User';
        const emailVerified = userInfo.email_verified
          ? `<span class="badge">Verified</span>`
          : `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: var(--error);">Unverified</span>`;

        const html = renderHtml({
          title: 'Authenticated — ' + displayName,
          content: `
            <div class="profile-header">
              <img src="${avatarUrl}" alt="${displayName}" class="avatar" onerror="this.src='https://assets.clouburstlab.com/default-avatar.png';" />
              <div class="profile-info">
                <h2>${displayName}</h2>
                <div class="email">
                  ${userInfo.email || 'No email provided'} ${userInfo.email ? emailVerified : ''}
                </div>
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">Subject ID (Sub)</div>
                <div class="detail-val">${userInfo.sub || 'N/A'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Username</div>
                <div class="detail-val">@${userInfo.preferred_username || 'N/A'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">First Name</div>
                <div class="detail-val">${userInfo.given_name || 'N/A'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Last Name</div>
                <div class="detail-val">${userInfo.family_name || 'N/A'}</div>
              </div>
            </div>

            <details>
              <summary>📦 View UserInfo Response Claims (JSON)</summary>
              <pre>${JSON.stringify(userInfo, null, 2)}</pre>
            </details>

            <details>
              <summary>🔑 View Token Response (Access Token & ID Token)</summary>
              <pre>${JSON.stringify(tokenData, null, 2)}</pre>
            </details>

            <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
              <a href="/login" class="btn">Test Again</a>
            </div>
          `,
        });

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        console.error('❌ [Processing Error]:', err.message);
        const html = renderHtml({
          title: 'OAuth Processing Error',
          content: `
            <h1 style="color: var(--error);">Token / UserInfo Exchange Failed</h1>
            <p class="subtitle">${err.message}</p>
            <a href="/" class="btn" style="background: var(--border);">Try Again</a>
          `,
        });
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      }
      return;
    }

    // 404 Fallback
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Generic OAuth 2.0 Test Server listening on http://localhost:${PORT}`);
    console.log(`👉 Open http://localhost:${PORT} in your browser to test.`);
    console.log(`======================================================\n`);
  });
}

startServer();
