import type { CSSProperties } from "react";
import { ImageResponse } from "next/og";
import { getPublicProfile, type PublicProfileResult } from "@/actions/profile/public-profile";
import { getDisplayName } from "@/utils/profile";

export const alt = "clouburstlab Member Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const color = {
  bg: "#09090b",
  text: "#fafafa",
  muted: "#a1a1aa",
  subtle: "#71717a",
  accent: "#818cf8",
  brand: "#4f46e5",
  surface: "#18181b",
};

const row: CSSProperties = { display: "flex", alignItems: "center" };
const centered: CSSProperties = { ...row, justifyContent: "center" };
const text = (fontSize: number, extra: CSSProperties = {}): CSSProperties => ({
  fontSize: `${fontSize}px`,
  margin: 0,
  ...extra,
});
const avatarBase: CSSProperties = { width: "140px", height: "140px", borderRadius: "50%" };

function getCardContent(result: PublicProfileResult, username: string) {
  switch (result.status) {
    case "found": {
      const { profile } = result;
      return {
        displayName: getDisplayName(profile.first_name, profile.last_name) || username,
        bio: profile.bio || "Member of the clouburstlab ecosystem.",
        avatarUrl: profile.avatar as string | null,
      };
    }
    case "private":
      return {
        displayName: `@${result.userMeta.username}`,
        bio: "This profile is private.",
        avatarUrl: null,
      };
    default:
      return { displayName: username, bio: "clouburstlab Community Member", avatarUrl: null };
  }
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { displayName, bio, avatarUrl } = getCardContent(await getPublicProfile(username), username);
  const initial = displayName.replace(/^@/, "").charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: color.bg,
          color: color.text,
          fontFamily: "sans-serif",
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)",
        }}
      >
        {/* Brand row */}
        <div style={{ ...row, gap: "14px" }}>
          <div
            style={{
              ...centered,
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              backgroundColor: color.brand,
              ...text(24, { fontWeight: 700, color: "#fff" }),
            }}
          >
            C
          </div>
          <span style={text(24, { fontWeight: 700, letterSpacing: "-0.5px" })}>clouburstlab</span>
          <span
            style={text(14, {
              fontWeight: 600,
              marginLeft: "6px",
              padding: "4px 10px",
              borderRadius: "9999px",
              color: color.accent,
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            })}
          >
            Identity
          </span>
        </div>

        {/* Profile row */}
        <div style={{ ...row, gap: "36px", margin: "20px 0" }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              width="140"
              height="140"
              style={{
                ...avatarBase,
                objectFit: "cover",
                border: "4px solid rgba(99, 102, 241, 0.4)",
              }}
            />
          ) : (
            <div
              style={{
                ...avatarBase,
                ...centered,
                backgroundColor: color.surface,
                border: "4px solid rgba(255, 255, 255, 0.1)",
                ...text(56, { fontWeight: 700, color: color.muted }),
              }}
            >
              {initial}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1 style={text(52, { fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: "8px" })}>
              {displayName}
            </h1>
            <p style={text(24, { fontWeight: 500, color: color.accent, marginBottom: "12px" })}>
              @{username}
            </p>
            <p style={text(20, { color: color.muted, maxWidth: "750px", lineHeight: 1.4 })}>{bio}</p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            ...row,
            justifyContent: "space-between",
            width: "100%",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            ...text(16, { color: color.subtle }),
          }}
        >
          <span>OIDC 2.0 & OAuth 2.0 Centralized Identity</span>
          <span>auth.clouburstlab.com</span>
        </div>
      </div>
    ),
    size
  );
}