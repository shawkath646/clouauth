import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/utils/env";

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export function GET(request: NextRequest) {
  const baseURL =
    getEnv("NEXT_PUBLIC_BASE_URL", true) ||
    getEnv("NEXT_PUBLIC_APP_URL", true) ||
    request.nextUrl.origin;

  const docsMarkdown = `# ClouAuth Inter-Service Bridge API Reference (v1)

> **For AI Agents & Internal Applications**  
> This specification documents the internal inter-service bridge APIs for the **clouburstlab** identity provider ecosystem. Use these endpoints to verify user sessions across subdomains (\`*.clouburstlab.com\`) and retrieve decrypted cloud drive credentials (Google Drive, OneDrive, Dropbox).

---

## 1. Architecture & Security Model

### Domain Boundary & Cookie Propagation
- **Parent Domain:** \`.clouburstlab.com\` (or \`localhost\` during development).
- **Session Cookie:** \`session_token\`. The cookie is scoped with \`Domain=.clouburstlab.com\`, \`HttpOnly\`, \`Secure\`, and \`SameSite=Lax\`.
- **Browser Requests:** Any front-end app hosted on a subdomain (e.g. \`https://drive.clouburstlab.com\`, \`https://app.clouburstlab.com\`) making requests to \`https://auth.clouburstlab.com/api/inter-services/v1/*\` must use:
  \`\`\`typescript
  fetch(url, { credentials: "include", headers: { Authorization: "Bearer <APP_TOKEN>" } })
  \`\`\`
- **Server-to-Server Requests:** Backend microservices without access to browser cookies may authenticate using their application Bearer token and pass \`?user_id=<USER_ID>\` or header \`x-user-id: <USER_ID>\`.

### App Authentication Requirements
Every request to the bridge endpoints **MUST** include an \`Authorization\` header:
\`\`\`http
Authorization: Bearer <APP_JWT_TOKEN>
\`\`\`
The Bearer token can be:
1. **OAuth2 Client Credentials Token:** Obtained from \`POST /api/sso/v1/token\` using your app's \`client_id\` and \`client_secret\`.
2. **Internal Service Token:** Signed with the cluster's \`JWT_SECRET\` or \`INTERNAL_SERVICE_SECRET\` with \`type: "internal_service"\` or \`role: "internal"\`.
3. **User Access Token:** Issued by ClouAuth for a client app via authorization code flow.

---

## 2. Endpoints Reference

### 2.1 \`GET /api/inter-services/v1/user-session\`
Inspects the calling user's active session and returns filtered profile attributes based on requested scopes.

- **URL:** \`${baseURL}/api/inter-services/v1/user-session\`
- **Method:** \`GET\` (or \`POST\`)
- **Headers:**
  - \`Authorization: Bearer <APP_TOKEN>\` *(required)*
  - \`Cookie: session_token=...\` *(required for browser requests)*
  - \`x-user-id: <USER_ID>\` *(optional fallback for backend machine-to-machine calls)*
- **Query Parameters:**
  - \`scope\` *(string, optional, default: \`id,firstname,lastname,email\`)*: Comma- or space-separated list of fields.
    - Supported scope fields:
      - \`id\`: User unique identifier (always included)
      - \`username\`: User handle
      - \`firstname\` / \`first_name\` / \`given_name\`: First name
      - \`lastname\` / \`last_name\` / \`family_name\`: Last name
      - \`email\` / \`primary_email\`: Primary verified/unverified email address
      - \`email_verified\`: Boolean flag for primary email verification
      - \`avatar\` / \`picture\` / \`image\`: Profile image URL / Data URL
      - \`bio\`: User biography
      - \`pronouns\`: Gender pronouns
      - \`date_of_birth\` / \`dob\`: Date of birth
      - \`created_on\` / \`created_at\`: Account creation timestamp
      - \`updated_on\` / \`updated_at\`: Last account update timestamp
      - \`preferences\`: JSON object containing \`{ theme, language, timezone }\`
      - \`addresses\`: Array of saved user addresses
      - \`phones\` / \`phone\`: Array of saved user phone numbers
      - \`profile\`: Standard OIDC alias expanding to \`[firstname, lastname, username, avatar]\`

#### Response: User Authenticated (200 OK)
\`\`\`json
{
  "authenticated": true,
  "user": {
    "id": "cm0a1b2c3d4e5f6g7h8i9j0k",
    "username": "shawkath",
    "first_name": "Shawkath",
    "last_name": "Ali",
    "email": "shawkath646@gmail.com",
    "email_verified": true,
    "avatar": "https://lh3.googleusercontent.com/a/..."
  },
  "scopes": ["id", "firstname", "lastname", "email", "avatar", "username"]
}
\`\`\`

#### Response: No User Session (200 OK)
\`\`\`json
{
  "authenticated": false,
  "message": "No active user session found.",
  "user": null
}
\`\`\`

#### Response: App Unauthorized (401 / 403)
\`\`\`json
{
  "authenticated": false,
  "error": "The requesting application is currently disabled."
}
\`\`\`

---

### 2.2 \`GET /api/inter-services/v1/connected-drives\`
Retrieves decrypted OAuth access and refresh credentials for the user's connected cloud storage drives (Google Drive, OneDrive, Dropbox).

- **URL:** \`${baseURL}/api/inter-services/v1/connected-drives\`
- **Method:** \`GET\` (or \`POST\`)
- **Headers:**
  - \`Authorization: Bearer <APP_TOKEN>\` *(required)*
  - \`Cookie: session_token=...\` *(required for browser requests)*
  - \`x-user-id: <USER_ID>\` *(optional fallback for backend machine-to-machine calls)*
- **Query Parameters:**
  - \`provider\` *(string, optional)*: Filter by specific provider: \`google_drive\`, \`onedrive\`, or \`dropbox\`.
  - \`refresh\` *(boolean, optional, default: \`false\`)*: If \`true\`, forces an immediate token refresh with Google/Microsoft/Dropbox, updates the database with new encrypted tokens, and returns active credentials.

#### Response: Success (200 OK)
\`\`\`json
{
  "success": true,
  "user_id": "cm0a1b2c3d4e5f6g7h8i9j0k",
  "count": 2,
  "drives": [
    {
      "id": "acc_gdrive_123",
      "provider": "google_drive",
      "provider_user_id": "108394857201948572019",
      "access_token": "ya29.a0AfH6SMBx...",
      "refresh_token": "1//04_AbCdEf...",
      "expires_at": 1727400000,
      "expires_in": 3540,
      "is_expired": false,
      "created_on": "2026-09-27T02:00:00.000Z"
    },
    {
      "id": "acc_onedrive_456",
      "provider": "onedrive",
      "provider_user_id": "ms_user_id_xyz",
      "access_token": "EwB4A8l6BAAU...",
      "refresh_token": "M.R3_BAY...",
      "expires_at": 1727403600,
      "expires_in": 7140,
      "is_expired": false,
      "created_on": "2026-09-27T03:30:00.000Z"
    }
  ]
}
\`\`\`

#### How to Use Returned Drive Tokens
- **Google Drive API:**
  Pass the returned \`access_token\` in:
  \`\`\`http
  GET https://www.googleapis.com/drive/v3/files
  Authorization: Bearer ya29.a0AfH6SMBx...
  \`\`\`
- **Microsoft OneDrive (Graph API):**
  Pass the returned \`access_token\` in:
  \`\`\`http
  GET https://graph.microsoft.com/v1.0/me/drive/root/children
  Authorization: Bearer EwB4A8l6BAAU...
  \`\`\`
- **Dropbox API:**
  Pass the returned \`access_token\` in:
  \`\`\`http
  POST https://api.dropboxapi.com/2/files/list_folder
  Authorization: Bearer <DROPBOX_TOKEN>
  \`\`\`

---

### 2.3 \`/api/inter-services/v1/email-queue\`
Serves queued transactional and notification emails to background dispatchers, workers, or notification microservices. Supports enqueuing new emails, pulling due items, batch acknowledgements, and retry reporting.

- **URL:** \`${baseURL}/api/inter-services/v1/email-queue\`
- **Authentication:** \`Authorization: Bearer <APP_TOKEN>\` *(required)*

#### A. Pull Queued Emails (\`GET\`)
- **Method:** \`GET\`
- **Query Parameters:**
  - \`status\` *(string, optional, default: \`pending\`)*: \`pending\` (only incomplete), \`completed\`, or \`all\`.
  - \`limit\` *(number, optional, default: \`20\`, max: \`100\`)*: Number of emails to retrieve.
  - \`due_only\` *(boolean, optional, default: \`true\`)*: If \`true\`, returns only items where \`next_retry_at <= now()\`.
  - \`user_id\` *(string, optional)*: Filter by recipient user ID.
  - \`template_id\` *(string, optional)*: Filter by template name (e.g. \`welcome\`, \`password_changed\`).

**Response (200 OK):**
\`\`\`json
{
  "success": true,
  "count": 1,
  "total_pending": 4,
  "status_filter": "pending",
  "emails": [
    {
      "id": "cm0a1b2c3d4e5f6g7h8i9j0k",
      "userId": "cmuser1234567890",
      "to": "alex@clouburstlab.com",
      "subject": "Welcome to ClouburstLab!",
      "templateId": "welcome",
      "data": { "name": "Alex" },
      "retryCount": 0,
      "isComplete": false,
      "nextRetryAt": "2026-09-27T08:00:00.000Z",
      "createdAt": "2026-09-27T07:55:00.000Z",
      "updatedAt": "2026-09-27T07:55:00.000Z",
      "user": {
        "id": "cmuser1234567890",
        "username": "alex",
        "name": "Alex Mercer",
        "primaryEmail": "alex@clouburstlab.com"
      }
    }
  ]
}
\`\`\`

#### B. Enqueue or Manage Emails (\`POST\`)
- **Method:** \`POST\`
- **Supported Actions:**
  1. **Enqueue a new email:**
     \`\`\`json
     {
       "user_id": "cmuser1234567890",
       "template_id": "welcome",
       "to": "alex@clouburstlab.com",
       "subject": "Welcome to our platform!",
       "data": { "name": "Alex" }
     }
     \`\`\`
  2. **Mark as completed (dispatched):**
     \`\`\`json
     {
       "action": "mark_complete",
       "ids": ["cm0a1b2c3d4e5f6g7h8i9j0k"]
     }
     \`\`\`
  3. **Mark as failed / schedule retry:**
     \`\`\`json
     {
       "action": "mark_failed",
       "id": "cm0a1b2c3d4e5f6g7h8i9j0k",
       "error": "SMTP delivery timed out",
       "retry_in_seconds": 300
     }
     \`\`\`

#### C. Batch Status Update (\`PATCH\`)
- **Method:** \`PATCH\`
- **Body:**
  \`\`\`json
  {
    "ids": ["cm0a1b2c3d4e5f6g7h8i9j0k"],
    "is_complete": true
  }
  \`\`\`

#### D. Purge Completed Items (\`DELETE\`)
- **Method:** \`DELETE\`
- **Query:** \`?status=completed\` or body \`{ "ids": [...] }\`

---

### 2.4 \`POST /api/sso/v1/token\`
OAuth2 / OIDC token endpoint supporting client credentials, authorization code exchange, and token refresh.

#### Client Credentials Flow (M2M Bridge Authentication)
\`\`\`http
POST ${baseURL}/api/sso/v1/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=cbl_your_client_id&client_secret=cbl_sec_your_secret&scope=internal_service
\`\`\`

**Response:**
\`\`\`json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "internal_service"
}
\`\`\`

---

## 3. Quickstart Implementation for AI Agents (TypeScript / Node.js)

Here is a complete, copy-pasteable client class to integrate any internal application with the ClouAuth Bridge:

\`\`\`typescript
export class ClouAuthBridge {
  private authBaseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(options: { authBaseUrl?: string; clientId: string; clientSecret: string }) {
    this.authBaseUrl = options.authBaseUrl || "https://auth.clouburstlab.com";
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  /**
   * Fetches an App Bearer token using OAuth2 Client Credentials
   */
  async getAppToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.tokenExpiresAt > now + 60) {
      return this.cachedToken;
    }

    const res = await fetch(\`\${this.authBaseUrl}/api/sso/v1/token\`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(\`Failed to authenticate app: \${err}\`);
    }

    const data = await res.json();
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in || 3600);
    return this.cachedToken!;
  }

  /**
   * Resolves the user session from the incoming browser cookie
   */
  async getUserSession(cookieHeader?: string, scope: string = "id,firstname,lastname,email,avatar") {
    const appToken = await this.getAppToken();
    const headers: Record<string, string> = {
      Authorization: \`Bearer \${appToken}\`,
    };
    if (cookieHeader) headers["Cookie"] = cookieHeader;

    const res = await fetch(\`\${this.authBaseUrl}/api/inter-services/v1/user-session?scope=\${encodeURIComponent(scope)}\`, {
      headers,
    });
    return res.json();
  }

  /**
   * Fetches decrypted drive credentials for the user
   */
  async getConnectedDrives(options?: { cookieHeader?: string; userId?: string; provider?: string; refresh?: boolean }) {
    const appToken = await this.getAppToken();
    const headers: Record<string, string> = {
      Authorization: \`Bearer \${appToken}\`,
    };
    if (options?.cookieHeader) headers["Cookie"] = options.cookieHeader;
    if (options?.userId) headers["x-user-id"] = options.userId;

    const params = new URLSearchParams();
    if (options?.provider) params.set("provider", options.provider);
    if (options?.refresh) params.set("refresh", "true");

    const query = params.toString() ? \`?\${params.toString()}\` : "";
    const res = await fetch(\`\${this.authBaseUrl}/api/inter-services/v1/connected-drives\${query}\`, {
      headers,
    });
    return res.json();
  }
}
\`\`\`

---

## 4. Quickstart Implementation (Python)

\`\`\`python
import requests
import time

class ClouAuthBridge:
    def __init__(self, client_id: str, client_secret: str, auth_base_url: str = "https://auth.clouburstlab.com"):
        self.auth_base_url = auth_base_url.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self.cached_token = None
        self.token_expires_at = 0

    def get_app_token(self) -> str:
        now = int(time.time())
        if self.cached_token and self.token_expires_at > now + 60:
            return self.cached_token

        res = requests.post(
            f"{self.auth_base_url}/api/sso/v1/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            }
        )
        res.raise_for_status()
        data = res.json()
        self.cached_token = data["access_token"]
        self.token_expires_at = now + data.get("expires_in", 3600)
        return self.cached_token

    def get_user_session(self, cookie_header: str = None, scope: str = "id,firstname,lastname,email"):
        token = self.get_app_token()
        headers = {"Authorization": f"Bearer {token}"}
        if cookie_header:
            headers["Cookie"] = cookie_header

        res = requests.get(
            f"{self.auth_base_url}/api/inter-services/v1/user-session",
            params={"scope": scope},
            headers=headers
        )
        return res.json()

    def get_connected_drives(self, cookie_header: str = None, user_id: str = None, provider: str = None, refresh: bool = False):
        token = self.get_app_token()
        headers = {"Authorization": f"Bearer {token}"}
        if cookie_header:
            headers["Cookie"] = cookie_header
        if user_id:
            headers["x-user-id"] = user_id

        params = {}
        if provider:
            params["provider"] = provider
        if refresh:
            params["refresh"] = "true"

        res = requests.get(
            f"{self.auth_base_url}/api/inter-services/v1/connected-drives",
            params=params,
            headers=headers
        )
        return res.json()
\`\`\`

---

## 5. Summary Cheat-Sheet

| Method | Endpoint | Purpose | Key Parameters |
| :--- | :--- | :--- | :--- |
| \`GET\` | \`/api/inter-services/v1/user-session\` | Check user session & return scoped profile | \`?scope=id,firstname,lastname,email,avatar\` |
| \`GET\` | \`/api/inter-services/v1/connected-drives\` | Return decrypted Google/MS/Dropbox drive tokens | \`?provider=google_drive&refresh=true\` |
| \`GET, POST\` | \`/api/inter-services/v1/email-queue\` | Pull, enqueue, or acknowledge queued emails | \`?status=pending&due_only=true&limit=20\` |
| \`POST\` | \`/api/sso/v1/token\` | M2M client token or refresh token | \`grant_type=client_credentials\` |
| \`GET\` | \`/api/inter-services/v1/docs\` | This AI-friendly bridge documentation | \`Accept: text/markdown\` |
`;

  const acceptHeader = request.headers.get("accept") || "";
  const formatQuery = request.nextUrl.searchParams.get("format");

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Cache-Control": "public, max-age=1800, s-maxage=3600",
  };

  if (formatQuery === "json" || (acceptHeader.includes("application/json") && !acceptHeader.includes("text/markdown"))) {
    headers["Content-Type"] = "application/json; charset=utf-8";
    return new NextResponse(
      JSON.stringify({
        title: "ClouAuth Inter-Service Bridge API Documentation",
        version: "v1",
        docs: docsMarkdown,
      }),
      { status: 200, headers }
    );
  }

  headers["Content-Type"] = "text/markdown; charset=utf-8";
  return new NextResponse(docsMarkdown, {
    status: 200,
    headers,
  });
}
