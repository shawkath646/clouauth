import { ImageResponse } from "next/og";
import { getPublicProfile } from "@/actions/profile/public-profile";

export const runtime = "nodejs";
export const alt = "clouburstlab Member Profile";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const result = await getPublicProfile(username, { checkOwnerSession: false });

  let displayName = username;
  let bio = "clouburstlab Community Member";
  let avatarUrl: string | null = null;

  if (result.status === "found") {
    displayName = `${result.profile.first_name} ${result.profile.last_name}`.trim() || username;
    bio = result.profile.bio || "Member of the clouburstlab ecosystem.";
    avatarUrl = result.profile.avatar;
  } else if (result.status === "private") {
    displayName = `@${result.userMeta.username}`;
    bio = "This profile is private.";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              backgroundColor: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            C
          </div>
          <span style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>
            clouburstlab
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              color: "#818cf8",
              padding: "4px 10px",
              borderRadius: "9999px",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              marginLeft: "6px",
            }}
          >
            Identity
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "36px", margin: "20px 0" }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              width="140"
              height="140"
              style={{
                borderRadius: "50%",
                border: "4px solid rgba(99, 102, 241, 0.4)",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                backgroundColor: "#18181b",
                border: "4px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "56px",
                fontWeight: 700,
                color: "#a1a1aa",
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1
              style={{
                fontSize: "52px",
                fontWeight: 800,
                letterSpacing: "-1.5px",
                margin: "0 0 8px 0",
                lineHeight: 1.1,
              }}
            >
              {displayName}
            </h1>
            <p style={{ fontSize: "24px", color: "#818cf8", margin: "0 0 12px 0", fontWeight: 500 }}>
              @{username}
            </p>
            <p
              style={{
                fontSize: "20px",
                color: "#a1a1aa",
                margin: 0,
                maxWidth: "750px",
                lineHeight: 1.4,
              }}
            >
              {bio}
            </p>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: "16px",
            color: "#71717a",
          }}
        >
          <span>OIDC 2.0 & OAuth 2.0 Centralized Identity</span>
          <span>auth.clouburstlab.com</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
