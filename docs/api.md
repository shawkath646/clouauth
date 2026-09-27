# 📡 API Reference & OpenID Connect Specifications

ClouAuth implements standard **OpenID Connect Core 1.0** and **OAuth 2.0 (RFC 6749 / RFC 7636)** protocols, in addition to dedicated ecosystem inter-service endpoints.

---

## 🔍 OpenID Connect Discovery

### Discovery Document
Retrieves OpenID Provider metadata.

```http
GET /.well-known/openid-configuration HTTP/1.1
Host: auth.clouburstlab.com
Accept: application/json
```

**Response (`200 OK`):**
```json
{
  "issuer": "https://auth.clouburstlab.com",
  "authorization_endpoint": "https://auth.clouburstlab.com/signin",
  "token_endpoint": "https://auth.clouburstlab.com/api/sso/v1/token",
  "userinfo_endpoint": "https://auth.clouburstlab.com/api/sso/v1/userinfo",
  "revocation_endpoint": "https://auth.clouburstlab.com/api/sso/v1/revoke",
  "jwks_uri": "https://auth.clouburstlab.com/api/sso/v1/jwks.json",
  "response_types_supported": ["code"],
  "response_modes_supported": ["query", "form_post"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email", "phone", "offline_access"],
  "token_endpoint_auth_methods_supported": [
    "client_secret_post",
    "client_secret_basic",
    "none"
  ],
  "claims_supported": [
    "sub", "iss", "aud", "exp", "iat", "name", "given_name",
    "family_name", "preferred_username", "email", "email_verified",
    "picture", "nonce", "auth_time"
  ],
  "code_challenge_methods_supported": ["S256"],
  "grant_types_supported": [
    "authorization_code",
    "refresh_token",
    "client_credentials"
  ]
}
```

---

## 🔑 Authentication Endpoints

### 1. Authorization Endpoint
Initiates user authentication and consent flow. Supports Proof Key for Code Exchange (PKCE).

```http
GET /signin?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=openid%20profile%20email&state={STATE}&code_challenge={CHALLENGE}&code_challenge_method=S256 HTTP/1.1
Host: auth.clouburstlab.com
```

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `client_id` | `string` | **Yes** | Client ID registered in developer settings |
| `redirect_uri` | `string` | **Yes** | Whitelisted callback URL |
| `response_type` | `string` | **Yes** | Must be `code` |
| `scope` | `string` | No | Space-delimited scopes (e.g. `openid profile email offline_access`) |
| `state` | `string` | **Yes** | Cryptographic CSRF state token |
| `code_challenge` | `string` | **Yes** (for public clients) | Base64URL-encoded SHA-256 hash of `code_verifier` |
| `code_challenge_method`| `string` | **Yes** (with challenge) | Must be `S256` |

---

### 2. Token Endpoint
Exchanges authorization code, refresh token, or client credentials for access and ID tokens.

```http
POST /api/sso/v1/token HTTP/1.1
Host: auth.clouburstlab.com
Content-Type: application/x-www-form-urlencoded
```

#### Flow A: Authorization Code Exchange (with PKCE)
```bash
curl -X POST "https://auth.clouburstlab.com/api/sso/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=https://yourapp.com/callback" \
  -d "code_verifier=YOUR_PKCE_CODE_VERIFIER"
```

#### Flow B: Refresh Token Grant
```bash
curl -X POST "https://auth.clouburstlab.com/api/sso/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "refresh_token=YOUR_REFRESH_TOKEN"
```

#### Flow C: Client Credentials Grant (M2M)
```bash
curl -X POST "https://auth.clouburstlab.com/api/sso/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your_client_id" \
  -d "client_secret=your_client_secret" \
  -d "scope=internal_service"
```

**Token Response (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "clou_rt_7f9a2b...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email"
}
```

---

### 3. UserInfo Endpoint
Returns claims about the authenticated user based on granted scopes.

```http
GET /api/sso/v1/userinfo HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (`200 OK`):**
```json
{
  "sub": "cm0a1b2c3d4e5f6g7h8i9j0k",
  "name": "Shawkat Hossain Maruf",
  "given_name": "Shawkat",
  "family_name": "Maruf",
  "preferred_username": "shawkath646",
  "email": "contact@shawkath646.dev",
  "email_verified": true,
  "picture": "https://assets.clouburstlab.com/avatars/user_123.webp",
  "updated_at": 1727400000
}
```

---

### 4. JSON Web Key Set (JWKS)
Returns the public RSA verification keys used by ClouAuth to sign RS256 ID tokens.

```http
GET /api/sso/v1/jwks.json HTTP/1.1
Host: auth.clouburstlab.com
```

**Response (`200 OK`):**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "clou_68a9b2f1",
      "n": "u5K7w...p9L",
      "e": "AQAB"
    }
  ]
}
```

---

### 5. Token Revocation (RFC 7009)
Revokes an active access token or refresh token.

```http
POST /api/sso/v1/revoke HTTP/1.1
Host: auth.clouburstlab.com
Content-Type: application/x-www-form-urlencoded

token=YOUR_TOKEN_STRING&token_type_hint=refresh_token
```

---

## 🌉 Inter-Services Bridge Endpoints

Dedicated endpoints for **clouburstlab** internal microservices and apps:

### 1. User Session Resolution
```http
GET /api/inter-services/v1/user-session?scope=id,firstname,lastname,email,avatar HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_SERVICE_OR_APP_TOKEN
Cookie: clou_session=... (optional, for browser cross-subdomain calls)
```

### 2. Connected Drives Bridge
Retrieves refreshed, decrypted OAuth tokens for third-party cloud drives:
```http
GET /api/inter-services/v1/connected-drives?provider=google_drive&refresh=true HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_SERVICE_TOKEN
```

### 3. Asynchronous Email Queue
Dispatches transactional system emails through the queued retry pipeline:
```http
POST /api/inter-services/v1/email-queue HTTP/1.1
Host: auth.clouburstlab.com
Authorization: Bearer YOUR_SERVICE_TOKEN
Content-Type: application/json

{
  "userId": "user_cuid_123",
  "to": "recipient@example.com",
  "subject": "Security Alert: New Sign-in",
  "templateId": "login_alert",
  "data": "{\"browser\":\"Edge\",\"ip\":\"192.168.1.1\"}"
}
```
