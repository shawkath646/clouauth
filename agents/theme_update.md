Yes — the answer is **`next-themes`**. It's the de facto standard, built specifically for the App Router, and it solves every constraint you listed.

## Why `next-themes` is the right fit

| Requirement | How `next-themes` handles it |
|---|---|
| Toggle without login | Persists to `localStorage` automatically, works anonymously |
| No FOUC | Injects a blocking `<script>` in `<head>` before paint — zero flicker |
| No dynamic rendering | Server never reads the theme — the client-side script patches `<html>` before hydration using `suppressHydrationWarning`. Pages stay **fully static/ISR-compatible** |
| Sync with DB after login | You sync the DB value into `next-themes` via a one-line `setTheme()` call on mount |

## How it works architecturally

```
Static HTML from server (no theme knowledge needed)
        │
        ▼
Blocking <script> in <head> reads localStorage → sets .dark class
        │
        ▼
React hydrates with suppressHydrationWarning (no mismatch)
        │
        ▼
next-themes <ThemeProvider> takes over for runtime toggling
```

The server **never reads a cookie or header** for the theme, so nothing goes dynamic.

## The two-layer strategy

**Layer 1 — Guest / anonymous:** `next-themes` reads from `localStorage`. Toggle works instantly, persists across visits, zero server involvement.

**Layer 2 — After login:** Your `finalizeSignIn` already writes the user's DB preference to a `theme_pref` cookie. On the profile layout, you read it once and sync:

```tsx
// profile-layout-client.tsx
import { useTheme } from "next-themes";

useEffect(() => {
  if (profile.preferences?.theme) {
    setTheme(profile.preferences.theme); // syncs DB → next-themes → localStorage
  }
}, [profile.preferences?.theme]);
```

After that, `next-themes` owns the state. If the user toggles again, it updates `localStorage`. You can optionally sync that back to DB:

```tsx
const handleToggle = async (newTheme: string) => {
  setTheme(newTheme);                          // instant UI update
  await updateThemePreference(newTheme);        // fire-and-forget to DB
};
```

## Implementation

It's a drop-in replacement for your current `theme-provider.tsx`:

```bash
npm install next-themes
```

**Root layout** — [`layout.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/app/layout.tsx):
```tsx
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"          // uses .dark class (matches your Tailwind setup)
          defaultTheme="system"      // respects OS preference for first-timers
          enableSystem               // listens to prefers-color-scheme
          disableTransitionOnChange  // optional: prevents flash during swap
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

That's it. Delete your custom [`theme-provider.tsx`](file:///c:/Users/shawk/Projects/clou-auth/src/components/ui/theme-provider.tsx), the `<Script>` tag at line 182–184, and the manual DOM manipulation in [`profile-layout-client.tsx:20–33`](file:///c:/Users/shawk/Projects/clou-auth/src/components/profile/profile-layout-client.tsx#L20-L33). The [`ThemeToggle`](file:///c:/Users/shawk/Projects/clou-auth/src/components/ui/theme-toggle.tsx) stays nearly identical — just change the import:

```tsx
import { useTheme } from "next-themes";
```

This eliminates the cookie-not-written bug, the three-way race condition, and the `beforeInteractive` script misuse — all in one swap.