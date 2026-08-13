# Core Engine Audit — clouburstlab Authentication Provider

> **Audited on:** 2026-08-14  
> **Scope:** Theming, i18n, Sign-In State Machine, Frontend Fluency  
> **Codebase:** Next.js 15 App Router + React 19 + Prisma + Tailwind CSS 4

---

# 1. Theming & Locale Engine

## 1.1 Theme Persistence Bug — Cookie Never Written on Toggle  
**Severity: 🔴 Critical — FOUC on every page reload after toggling**

The inline `<Script>` in `layout.tsx:183` correctly reads the `theme_pref` cookie before hydration. However, the `ThemeProvider` in `theme-provider.tsx` **never writes the cookie back** when the user toggles themes. The `setTheme` function (line 39) updates React state and the DOM `classList`, but it never calls `document.cookie = ...`.

The cookie is only ever set server-side by `finalizeSignIn` in `auth.actions.ts:69` when the user's DB preferences contain a theme. First-time users and anyone toggling via `<ThemeToggle>` will see their choice lost on every refresh.

**Current broken code** — [`theme-provider.tsx:39–56`](file:///c:/Users/shawk/Projects/clou-auth/src/components/ui/theme-provider.tsx#L39-L56):
```tsx
const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches ? "dark" : "light";
      root.classList.add(systemTheme);
      return;
    }
    root.classList.add(newTheme);
    // ❌ Cookie is never written — theme is lost on refresh
};
```

**Fix:**
```tsx
const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    let resolved = newTheme;
    if (newTheme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark" : "light";
    }
    root.classList.add(resolved);

    // ✅ Persist to cookie so the blocking script picks it up on next load
    document.cookie = `theme_pref=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
};
```

---

## 1.2 `<Script strategy="beforeInteractive">` Misuse  
**Severity: 🟡 Medium — potential FOUC on some deploy targets**

In [`layout.tsx:182–184`](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx#L182-L184), you use `<Script strategy="beforeInteractive">` with an inline script body. Per the [Next.js docs](https://nextjs.org/docs/app/building-your-application/optimizing/scripts), `beforeInteractive` is designed for **external** scripts loaded from `src`. For inline blocking scripts, the correct approach is a raw `<script>` tag inside the `<head>`.

**Current code:**
```tsx
<Script id="theme-init" strategy="beforeInteractive">
  {`try{var m=document.cookie...}catch(_){}`}
</Script>
```

**Fix:**
```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `try{var m=document.cookie.match(new RegExp('(^| )theme_pref=([^;]+)'));var t=m?m[2]:null;if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(_){}`
    }}
  />
</head>
```

This guarantees the script runs synchronously in the `<head>` before any `<body>` paint, regardless of Next.js deployment target.

---

## 1.3 Conflicting Theme DOM Manipulation  
**Severity: 🟡 Medium — "double flash" on profile pages**

[`profile-layout-client.tsx:20–33`](file:///c:/Users/shawk/Projects/clou-auth/src/components/profile/profile-layout-client.tsx#L20-L33) manually toggles `document.documentElement.classList` inside a `useEffect` based on `profile.preferences.theme`. This directly competes with:
- The blocking `<script>` in `layout.tsx` (reads cookie)
- The `ThemeProvider` context (reads cookie in its own `useEffect`)

This creates a **three-way race condition**: script → `ThemeProvider` → `ProfileLayoutClient`, any of which can flash the wrong theme.

**Fix:** Remove the manual DOM manipulation from `profile-layout-client.tsx` entirely. Instead, have `finalizeSignIn` (which already syncs `theme_pref` cookie from DB) be the single source of truth. The blocking script reads the cookie, the `ThemeProvider` reads the cookie — done. The profile component should only call `setTheme(profile.preferences.theme)` through the context:

```tsx
// profile-layout-client.tsx
import { useTheme } from "@/components/ui/theme-provider";

export function ProfileLayoutClient({ profile, children }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Sync provider state with DB preference; provider handles DOM + cookie
    if (profile.preferences?.theme) {
      setTheme(profile.preferences.theme as Theme);
    }
  }, [profile.preferences?.theme, setTheme]);
  // ...
}
```

---

## 1.4 Missing `<meta name="color-scheme">`  
**Severity: 🟢 Low — cosmetic mismatch on native browser controls**

There is no `<meta name="color-scheme" content="light dark">` in the `<head>`. Without it, browser-native elements (scrollbars, `<select>` dropdowns, `<input>` autofill backgrounds) won't adapt to dark mode and will appear white against a dark background.

**Fix — add to the `<head>` block in** [`layout.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx#L139-L140):
```tsx
<head>
  <meta name="color-scheme" content="light dark" />
  <script dangerouslySetInnerHTML={{ __html: `...` }} />
</head>
```

---

## 1.5 Hardcoded `<html lang="en">` Breaks i18n  
**Severity: 🔴 Critical — SEO, accessibility, screen reader failure for non-English locales**

[`layout.tsx:135`](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx#L135) hardcodes `lang="en"`. The app supports 6 locales (`en`, `bn`, `ko`, `es`, `ar`, `zh`). When an Arabic or Bengali user visits, the `<html>` still announces English, which:
- Breaks screen reader pronunciation
- Prevents browser translation prompts
- Hurts SEO for localized content
- Produces wrong `dir` attribute (Arabic needs `dir="rtl"`)

**Fix — make `RootLayout` async and read the locale:**
```tsx
import { getLocale } from "@/lib/i18n/server";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={cn("h-full", "antialiased", ...)}
      suppressHydrationWarning
    >
    {/* ... */}
    </html>
  );
}
```

> **Note:** This means `getLocale()` (which reads `cookies()`) will be called at the root layout, making the entire app dynamically rendered. See §1.7 for the full i18n architecture recommendation.

---

## 1.6 Locale Switching Triggers Full Page Reload  
**Severity: 🔴 Critical — destroys SPA experience**

[`client.ts:9`](file:///c:/Users/shawk/Projects/clou-auth/src/lib/i18n/client.ts#L9) calls `window.location.reload()` to apply a locale change. This flushes all client-side React state, unmounts every component, re-downloads all JavaScript, and re-runs every server query. It's the nuclear option.

**Current code:**
```ts
export function setUserLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
  window.location.reload(); // ❌ Full page reload
}
```

**Fix — use `useTransition` + `router.refresh()` for a non-blocking soft refresh:**
```ts
// client.ts — just export the cookie setter
export function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000`;
}
```

```tsx
// In the locale switcher component:
"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleCookie } from "@/lib/i18n/client";

export function LocaleSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (locale: string) => {
    setLocaleCookie(locale);
    startTransition(() => {
      router.refresh(); // ✅ Soft RSC refresh — no full reload
    });
  };

  return (
    <select onChange={(e) => handleChange(e.target.value)} disabled={isPending}>
      {/* options */}
    </select>
  );
}
```

---

## 1.7 i18n Architecture Forces Dynamic Rendering Globally  
**Severity: 🟡 Medium — cannot statically generate or cache any page**

`getLocale()` in [`server.ts:5–28`](file:///c:/Users/shawk/Projects/clou-auth/src/lib/i18n/server.ts#L5-L28) calls `cookies()` and `headers()`, which opt every consuming page into full dynamic SSR. This means no ISR, no static generation, and no edge caching for any page that calls a translation function — which is every page.

**Recommendation:** The established Next.js i18n pattern uses **URL-based locale segments** (`/en/signin`, `/bn/signin`):

1. Add a `[locale]` dynamic segment: `src/app/[locale]/layout.tsx`
2. Use Next.js Middleware to detect the preferred locale from cookies/headers and redirect to the correct segment
3. Remove `cookies()`/`headers()` from `getLocale()` — read it from params instead
4. Pages at `/en/signin` can be statically generated because the locale is a build-time param

This is a larger refactor, but it's the standard pattern for a reason: it enables SSG, makes localized URLs shareable, and eliminates the current de-optimization.

---

## 1.8 Dictionary Bypass in Landing Page  
**Severity: 🟢 Low — inconsistency, not a bug**

[`page.tsx:24`](file:///c:/Users/shawk/Projects/clou-auth/src/app/page.tsx#L24) manually calls `await import(...)` to load the landing dictionary instead of using the centralized `getDictionary()`:

```tsx
const dict = await import(`@/lib/i18n/locales/${locale}/landing.json`).then(m => m.default);
```

This bypasses the structured loader in `server.ts` and could diverge if the dictionary structure changes. Use the existing utility:

```tsx
const dict = await getDictionary(locale, 'landing');
```

---

## 1.9 Entire Dictionary Serialized to Client via Context  
**Severity: 🟡 Medium — payload bloat at scale**

The `I18nProvider` is a `"use client"` component. Every dictionary passed to it via props (e.g., `<I18nProvider messages={dict}>`) is **serialized into the RSC payload** and embedded in the client JavaScript. At 6 locales × 14 namespaces, this will grow quickly.

**Recommendation:** Prefer consuming translations directly inside Server Components via `getServerTranslations()` and pass only the specific translated strings as props to Client Components:

```tsx
// Server Component (no serialization overhead)
export default async function SignInPage() {
  const { t } = await getServerTranslations("signin");
  return <SignInForm labels={{ title: t("title"), submit: t("submitBtn") }} />;
}
```

---

## 1.10 Context Value Not Memoized — Excess Re-renders  
**Severity: 🟢 Low**

[`provider.tsx:37`](file:///c:/Users/shawk/Projects/clou-auth/src/lib/i18n/provider.tsx#L37) creates a new `{ locale, messages, setLocale }` object every render, causing all `useTranslations()` consumers to re-render even when nothing changed.

**Fix:**
```tsx
const contextValue = React.useMemo(
  () => ({ locale: mergedLocale, messages: mergedMessages, setLocale: setUserLocale }),
  [mergedLocale, mergedMessages]
);

return (
  <I18nContext.Provider value={contextValue}>
    {children}
  </I18nContext.Provider>
);
```

---

## 1.11 Sequential Data Fetching on Landing Page  
**Severity: 🟡 Medium — waterfall delay**

[`page.tsx:20–24`](file:///c:/Users/shawk/Projects/clou-auth/src/app/page.tsx#L20-L24) calls `getMinimalProfile()` and then `getServerTranslations()` sequentially:

```tsx
const profileResult = await getMinimalProfile();       // Fetch 1
const { locale } = await getServerTranslations("landing"); // Fetch 2
const dict = await import(`.../${locale}/landing.json`);   // Fetch 3
```

**Fix:** Parallelize independent fetches:
```tsx
const [profileResult, { locale }] = await Promise.all([
  getMinimalProfile(),
  getServerTranslations("landing"),
]);
const dict = await getDictionary(locale, "landing");
```

---

# 2. Sign-In State Machine & Auth Flow

## 2.1 State Machine Overview — Current Architecture

The sign-in flow is managed by a **single monolithic Client Component** ([`signin-form.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/signin-form.tsx)) using ad-hoc `useState` calls:

```
currentStep: "CREDENTIALS" | "METHOD_SELECTION" | "VERIFICATION" | "AGREEMENT" | "REENABLE_ACCOUNT"
selectedMethod: VerificationMethod | null
tempSessionId: string | null
availableMethods: VerificationMethod[]
passkeyOptions: any
isGranting: boolean
```

This is a **state bag, not a state machine**. There are no guards, no transition rules, and no impossible-state prevention. The following subsections detail the specific issues.

---

## 2.2 Temp Session Model — Well Designed ✅

Before listing issues, credit where it's due: the **temp session architecture** is solid. After credentials pass:

1. An opaque `tempSessionId` (Prisma UUID) is created server-side (`createTempSession` in [`session.ts:239`](file:///c:/Users/shawk/Projects/clou-auth/src/lib/session.ts#L239-L249))
2. The temp session has a 15-minute expiration
3. All subsequent 2FA operations validate the temp session
4. No raw `userId` is ever sent to the client — only the opaque `tempSessionId`
5. The temp session is deleted after `finalizeSignIn`

This is a proper challenge-token pattern and avoids user ID leakage.

---

## 2.3 Credential Validation — Correct Ordering ✅

The `signIn` action in [`auth.actions.ts:101–161`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/auth.actions.ts#L101-L161) correctly:
- Returns `"Invalid credentials."` for both missing users (line 123) and wrong passwords (line 147) — **no user enumeration**
- Checks lockout status **before** password comparison (line 128)
- Implements progressive lockout (5 attempts → 15-minute lock, lines 136–148)
- Resets failed attempts on successful login (lines 150–155)

---

## 2.4 Account Status Check — Post-Auth Gap  
**Severity: 🟡 Medium**

Account status (`is_active`) is checked in `finalizeSignIn` ([`auth.actions.ts:50–60`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/auth.actions.ts#L50-L60)), which runs **after** both credential validation and 2FA completion. This means:
- A disabled account can still pass credential + 2FA steps before being told "Account is disabled"
- The user experience is frustrating: they complete the whole flow only to be rejected

**Recommendation:** Add an early account status check in `signIn()` right after finding the user (before `bcrypt.compare`):

```tsx
// In signIn(), after finding the user but before checking password:
const accountStatus = await prisma.accountStatus.findUnique({
  where: { user_id: user.id }
});

if (accountStatus && !accountStatus.is_active) {
  if (accountStatus.self_enable) {
    const tempSession = await createTempSession(user.id);
    return { success: true, requireReenable: true, tempSessionId: tempSession.id };
  }
  return { success: false, error: "Invalid credentials." }; // Generic message
}
```

> **Important:** Return the same generic error message to prevent account status enumeration.

---

## 2.5 2FA Method Discovery — Properly Implemented ✅

The `getAvailableMethods` function ([`auth.actions.ts:208–234`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/auth.actions.ts#L208-L234)) correctly:
- Requires a valid, non-expired `tempSessionId`
- Returns only `{ id, type }` for each method — no user PII leaked
- Is called client-side in `signin-form.tsx:51` after URL-based 2FA handoff

---

## 2.6 TOTP Replay — No Code Consumption Guard  
**Severity: 🟡 Medium**

The authenticator/TOTP flow in `triggerVerificationMethod` ([`verification.actions.ts:46`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/verification.actions.ts#L46)) simply returns a message for the user to enter their TOTP code. However, `resolveCodeVerification` at line 147 uses the **email verification code path** (bcrypt-hashed codes stored in DB) — it doesn't actually validate TOTP codes from an authenticator app.

This suggests that the "authenticator" method type re-uses the email code flow rather than implementing standard TOTP validation (RFC 6238 with `otplib` or similar). If true TOTP is intended, it needs a separate resolver:

```tsx
// Separate TOTP validation
case "authenticator":
  // Read the user's TOTP secret from DB
  // Verify code using otplib: authenticator.check(code, secret)
  // Include window tolerance for clock skew
```

---

## 2.7 Email Verification Code — Rate Limiting ✅ but Missing Lockout Feedback  
**Severity: 🟢 Low**

`resolveCodeVerification` ([`verification.actions.ts:147–197`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/verification.actions.ts#L147-L197)) correctly:
- Has a 5-attempt limit with 15-minute lockout
- Returns differentiated errors: "Verification code expired" vs "Too many failed attempts" vs "Invalid verification code"
- Marks codes as consumed after use

However, the lockout error at line 163 only shows "Try again in X minutes" — consider also showing the number of remaining attempts before lockout for a better UX.

---

## 2.8 Passkey/WebAuthn Flow — Well Implemented ✅

The passkey flow across [`verification.actions.ts:109–272`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/auth/verification.actions.ts#L109-L272) is properly implemented:
- Challenge is stored server-side on the `tempSession` record
- `@simplewebauthn/server` handles the cryptographic verification
- Sign count is incremented (replay detection)
- `last_used_on` is tracked
- User verification is set to `"preferred"` (appropriate for 2FA)

---

## 2.9 Phone Verification — Stub/Placeholder  
**Severity: 🟠 High — incomplete feature shipped to production**

[`phone-verification.tsx:20–23`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/phone-verification.tsx#L20-L23) uses a simulated `setTimeout`:

```tsx
const handleVerify = async () => {
    setIsLoading(true);
    // Simulate API call
    const response = await new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1500));
    setIsLoading(false);
    onComplete(response);
};
```

This will authenticate **any user** who reaches the phone verification step, completely bypassing 2FA. Either remove the `"phone"` method type from the available methods or implement real SMS/push verification.

---

## 2.10 OAuth Consent Screen — Functional but Incomplete  
**Severity: 🟡 Medium**

The consent screen exists ([`agreement-step.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/agreement-step.tsx)) and `grantOAuthAccess` ([`oauth.actions.ts:11–66`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/oauth/oauth.actions.ts#L11-L66)) correctly:
- Reads the `oauth_auth_req` JWT from cookie
- Generates a stateless authorization code (signed JWT)
- Includes `code_challenge`, `nonce`, `scope`, and `state`
- Redirects to the `redirect_uri` with the code

**Issues found:**

### 2.10.1 Hardcoded Scopes — Ignores Client Request  
The consent UI at [`agreement-step.tsx:39`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/agreement-step.tsx#L39) hardcodes:
```tsx
{["Username", "Full name", "Email address", "Phone number"].map(...)}
```

The actual requested `scope` from the OAuth JWT (`openid profile email`) is never decoded and displayed. The user always sees the same 4 items regardless of what the client requested.

**Fix:** Pass the actual scopes from the OAuth cookie and map them:
```tsx
interface AgreementStepProps {
  onAgree: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  requestedScopes: string[];  // ← from decoded JWT
  clientName: string;          // ← from registered client
}
```

### 2.10.2 No `redirect_uri` Validation  
[`oauth.actions.ts:31`](file:///c:/Users/shawk/Projects/clou-auth/src/actions/oauth/oauth.actions.ts#L31) checks `if (!redirect_uri)` but doesn't validate it against the registered client's allowed redirect URIs. An attacker could modify the JWT (if they obtain the signing key) to redirect to a malicious URL.

**Fix:** Look up the OAuth client by `client_id` and verify `redirect_uri` matches a registered URI:
```tsx
const client = await prisma.oAuthClient.findUnique({ where: { id: client_id } });
if (!client || !client.redirect_uris.includes(redirect_uri)) {
    return { success: false, error: "Invalid redirect URI." };
}
```

### 2.10.3 Consent Screen Text Not Localized  
The entire consent screen ([`agreement-step.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/agreement-step.tsx)) uses hardcoded English strings ("Authorization Request", "Agree and Continue", etc.) instead of `t()` translation calls.

---

## 2.11 State Machine Refactor — Discriminated Union  
**Severity: 🟠 High — fragile multi-state bugs**

The current `signin-form.tsx` manages 5+ pieces of independent state that must be kept in sync. This is fragile. Consider a **discriminated union** approach:

```tsx
type SignInState =
  | { step: "CREDENTIALS" }
  | { step: "METHOD_SELECTION"; tempSessionId: string; methods: VerificationMethod[] }
  | { step: "VERIFICATION"; tempSessionId: string; method: VerificationMethod; passkeyOptions?: any }
  | { step: "AGREEMENT"; tempSessionId?: string }
  | { step: "REENABLE_ACCOUNT"; tempSessionId: string }
  | { step: "REDIRECTING"; url: string };

function signInReducer(state: SignInState, action: SignInAction): SignInState {
  switch (action.type) {
    case "CREDENTIALS_PASSED":
      if (action.require2FA) {
        return {
          step: "METHOD_SELECTION",
          tempSessionId: action.tempSessionId,
          methods: action.methods,
        };
      }
      if (action.requireReenable) {
        return { step: "REENABLE_ACCOUNT", tempSessionId: action.tempSessionId };
      }
      if (action.action === "CONSENT_SCREEN") {
        return { step: "AGREEMENT" };
      }
      return { step: "REDIRECTING", url: action.redirectUrl || "/profile" };

    case "METHOD_SELECTED":
      return {
        step: "VERIFICATION",
        tempSessionId: state.step === "METHOD_SELECTION" ? state.tempSessionId : "",
        method: action.method,
        passkeyOptions: action.passkeyOptions,
      };

    case "VERIFICATION_COMPLETE":
      if (action.requireReenable) {
        return { step: "REENABLE_ACCOUNT", tempSessionId: action.tempSessionId };
      }
      if (action.action === "CONSENT_SCREEN") {
        return { step: "AGREEMENT" };
      }
      return { step: "REDIRECTING", url: action.redirectUrl || "/profile" };

    default:
      return state;
  }
}
```

This makes impossible states unrepresentable. You can't have a `tempSessionId` without being in a step that requires one.

---

## 2.12 URL-Based 2FA State — Good Pattern, Minor Issue  

The sign-in form in [`signin-form.tsx:31–61`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/signin-form.tsx#L31-L61) reads `require2FA` and `tempSessionId` from URL params (for social login callbacks that need 2FA). It then **strips them from the URL** immediately:

```tsx
window.history.replaceState({}, "", url.toString());
```

This is good for security (temp session IDs shouldn't linger in the URL/history). However, the URL param stripping runs inside `useEffect` — there's a brief moment where the `tempSessionId` is visible in the address bar and browser history.

**Recommendation:** Handle this in Next.js Middleware instead, parsing the params server-side and setting them in a short-lived cookie.

---

# 3. Frontend Fluency & UX

## 3.1 `window.location.href` Used for All Post-Auth Redirects  
**Severity: 🔴 Critical — full page reload on every successful login**

Found **11 instances** of `window.location.href = ...` or `window.location.reload()` across the codebase:

| File | Line | Usage |
|------|------|-------|
| [`signin-form.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/signin-form.tsx#L78) | 78 | `window.location.href = result.redirectUrl \|\| "/profile"` |
| [`signin-form.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/signin-form.tsx#L112) | 112 | `window.location.href = result.redirectUrl \|\| "/profile"` |
| [`signin-form.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/signin-form.tsx#L123) | 123 | `window.location.href = result.redirectUrl` (OAuth redirect) |
| [`reenable-account-step.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/reenable-account-step.tsx#L28) | 28, 31, 77 | Three instances |
| [`client.ts`](file:///c:/Users/shawk/Projects/clou-auth/src/lib/i18n/client.ts#L9) | 9 | `window.location.reload()` |
| [`sign-out-button.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/components/profile/sign-out-button.tsx#L23) | 23 | `window.location.href = "/api/sso/v1/logout"` |
| [`danger-zone-section.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/components/profile/danger-zone-section.tsx#L25) | 25 | `window.location.href = "/signin"` |

**Context matters:** `window.location.href` to `/profile` after sign-in forces a complete browser reload — re-downloading JS bundles, re-running React hydration, and losing any cached RSC data. For internal navigation, `router.push()` or `router.replace()` preserves the React tree and is instant.

**However:** `window.location.href` to an **external OAuth redirect_uri** (line 123) is correct — you must do a full navigation to leave the app.

**Fix for internal redirects:**
```tsx
"use client";
import { useRouter } from "next/navigation";

// Inside the component:
const router = useRouter();

// Replace:
window.location.href = result.redirectUrl || "/profile";
// With:
if (result.redirectUrl?.startsWith("/")) {
  router.replace(result.redirectUrl);  // Internal: soft navigation
} else if (result.redirectUrl) {
  window.location.href = result.redirectUrl;  // External: full navigation
} else {
  router.replace("/profile");
}
```

---

## 3.2 Manual `isLoading` State Instead of `formState.isSubmitting`  
**Severity: 🟡 Medium — redundant boilerplate, misaligned state**

[`credentials-step.tsx:40`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/credentials-step.tsx#L40) manages a manual `useState(false)` for loading state alongside `react-hook-form`:

```tsx
const [isLoading, setIsLoading] = useState(false);
// ...
async function onSubmit(data) {
    setIsLoading(true);
    try { ... } finally { setIsLoading(false); }
}
```

Since `react-hook-form` already tracks this, the manual state is redundant and can desynchronize:

**Fix:**
```tsx
const form = useForm<...>({ ... });
const { isSubmitting } = form.formState;

// Remove useState, setIsLoading(true/false) calls
// Use isSubmitting directly:
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? <Loader2 className="animate-spin" /> : t('submitBtn')}
</Button>
```

---

## 3.3 Zero `loading.tsx` Files — No Route Transition Feedback  
**Severity: 🟠 High — UI appears frozen during navigation**

There are **no `loading.tsx` files** anywhere in the app. When navigating between `/signin` → `/profile`, the UI shows nothing while the server renders the new page.

**Fix:** Add `loading.tsx` to critical routes:

```tsx
// src/app/(auth)/signin/loading.tsx
export default function Loading() {
  return (
    <div className="w-full flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
```

```tsx
// src/app/profile/loading.tsx
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto py-8 animate-pulse">
      <div className="h-32 bg-muted rounded-xl mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="h-96 bg-muted rounded-xl" />
        <div className="lg:col-span-3 h-96 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
```

---

## 3.4 Zero `error.tsx` Files — Unhandled Errors Show White Screen  
**Severity: 🟠 High**

No `error.tsx` error boundaries exist. If a Server Action throws or a component errors, the user sees Next.js's default error page (or a white screen in production).

**Fix:**
```tsx
// src/app/(auth)/error.tsx
"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="text-muted-foreground mb-6">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded-lg">
        Try again
      </button>
    </div>
  );
}
```

---

## 3.5 No `useTransition` or `useActionState` Anywhere  
**Severity: 🟡 Medium — UI blocks during server calls**

A codebase-wide search confirms:
- Zero uses of `useTransition`
- Zero uses of `useActionState` (React 19)
- Zero uses of `useFormStatus`
- Zero uses of `useOptimistic`

All server interactions use manual `useState` + `try/catch` patterns. While functional, this means:
- The UI thread blocks during server action execution
- React cannot prioritize urgent updates (like input typing) over pending server responses
- No progressive enhancement — forms don't work without JavaScript

**Recommendation:** For forms that call Server Actions, migrate to `useActionState`:

```tsx
"use client";
import { useActionState } from "react";
import { signIn } from "@/actions/auth/auth.actions";

function CredentialsStep({ onNext }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState, formData) => {
      const result = await signIn({
        username: formData.get("username") as string,
        password: formData.get("password") as string,
        rememberMe: formData.get("rememberMe") === "on",
      });
      if (result.success) {
        onNext(result);
        return { error: null };
      }
      return { error: result.error };
    },
    { error: null }
  );

  return (
    <form action={formAction}>
      {state.error && <div className="text-destructive">{state.error}</div>}
      <input name="username" ... />
      <input name="password" type="password" ... />
      <SubmitButton isPending={isPending} />
    </form>
  );
}

function SubmitButton({ isPending }) {
  return (
    <button type="submit" disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : "Sign In"}
    </button>
  );
}
```

---

## 3.6 Missing Focus Management After Form Errors  
**Severity: 🟡 Medium — accessibility (WCAG 2.1 4.1.3)**

After a form submission fails, focus stays where it was (usually the submit button). Screen readers have no way to know an error appeared. The error message is rendered but not announced.

**Fix:**
```tsx
const errorRef = useRef<HTMLDivElement>(null);

// After setting error:
useEffect(() => {
  if (errorMsg) {
    errorRef.current?.focus();
  }
}, [errorMsg]);

// In JSX:
{errorMsg && (
  <div ref={errorRef} tabIndex={-1} role="alert" className="...">
    {errorMsg}
  </div>
)}
```

---

## 3.7 No Theme Transition Animation  
**Severity: 🟢 Low — cosmetic but noticeable**

Switching between light and dark modes is instant — the entire page snaps to the new colors. A smooth transition makes this feel intentional rather than jarring.

**Fix — add to** [`globals.css`](file:///c:/Users/shawk/Projects/clou-auth/src/app/globals.css):
```css
/* Smooth theme transition (disabled during initial load to prevent FOUC) */
html.theme-transition,
html.theme-transition *,
html.theme-transition *::before,
html.theme-transition *::after {
  transition: background-color 0.3s ease, color 0.2s ease, border-color 0.3s ease !important;
}
```

Then in the theme toggle:
```tsx
const setTheme = (newTheme: Theme) => {
  document.documentElement.classList.add("theme-transition");
  // ... apply theme ...
  setTimeout(() => {
    document.documentElement.classList.remove("theme-transition");
  }, 350);
};
```

This avoids adding the transition globally (which would cause FOUC on initial load).

---

## 3.8 Large Blur Effects — GPU Tax on Mobile  
**Severity: 🟢 Low — performance on low-end devices**

The auth layout ([`(auth)/layout.tsx:31–32`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/layout.tsx#L31-L32)) uses `blur-3xl` (72px) on large pulsing elements:
```html
<div className="w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
```

On mobile devices, large blur radii over large surfaces are GPU-intensive and can cause jank during scroll. Consider:
- Reducing blur radius for mobile: `blur-xl md:blur-3xl`
- Using `will-change: filter` for GPU compositing
- Disabling the animation on `prefers-reduced-motion`

---

## 3.9 Sign-In Page is a Monolithic Client Component  
**Severity: 🟢 Low — larger client bundle than necessary**

The entire [`signin-form.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/(auth)/signin/signin-form.tsx) (186 lines) plus all its child step components are `"use client"`. The static text, branding, and layout could remain server-rendered while only the interactive form becomes a client component.

The current architecture with `AnimatePresence` wrapping all steps makes this harder to split. If the state machine refactor (§2.11) is adopted, consider making each step a separate `page.tsx` under a route group (e.g., `/signin/2fa`) instead of client-side step switching.

---

## Summary Table

| # | Category | Severity | Issue |
|---|----------|----------|-------|
| 1.1 | Theme | 🔴 Critical | Cookie never written on theme toggle |
| 1.2 | Theme | 🟡 Medium | `<Script beforeInteractive>` misuse for inline script |
| 1.3 | Theme | 🟡 Medium | Three-way theme DOM manipulation race |
| 1.4 | Theme | 🟢 Low | Missing `<meta name="color-scheme">` |
| 1.5 | i18n | 🔴 Critical | Hardcoded `<html lang="en">` for 6-locale app |
| 1.6 | i18n | 🔴 Critical | `window.location.reload()` on locale switch |
| 1.7 | i18n | 🟡 Medium | Cookie-based locale forces dynamic rendering globally |
| 1.8 | i18n | 🟢 Low | Manual `import()` bypasses `getDictionary()` |
| 1.9 | i18n | 🟡 Medium | Full dictionary serialized into RSC client payload |
| 1.10 | i18n | 🟢 Low | Context value not memoized |
| 1.11 | Perf | 🟡 Medium | Sequential data fetching on landing page |
| 2.4 | Auth | 🟡 Medium | Account status checked only post-2FA |
| 2.6 | Auth | 🟡 Medium | TOTP not truly implemented (reuses email code flow) |
| 2.9 | Auth | 🟠 High | Phone verification is a stub that auto-approves |
| 2.10.1 | OAuth | 🟡 Medium | Consent screen shows hardcoded scopes |
| 2.10.2 | OAuth | 🟡 Medium | No `redirect_uri` validation against registered client |
| 2.10.3 | OAuth | 🟢 Low | Consent screen text not localized |
| 2.11 | Auth | 🟠 High | No formal state machine — ad-hoc useState flags |
| 3.1 | UX | 🔴 Critical | `window.location.href` for all internal redirects |
| 3.2 | UX | 🟡 Medium | Manual `isLoading` instead of `formState.isSubmitting` |
| 3.3 | UX | 🟠 High | Zero `loading.tsx` files |
| 3.4 | UX | 🟠 High | Zero `error.tsx` error boundaries |
| 3.5 | UX | 🟡 Medium | No React concurrent APIs used |
| 3.6 | UX | 🟡 Medium | No focus management after form errors |
| 3.7 | UX | 🟢 Low | No theme transition animation |
| 3.8 | UX | 🟢 Low | Large blur effects tax mobile GPU |
| 3.9 | UX | 🟢 Low | Monolithic client component for sign-in |
