const fs = require('fs');
const path = require('path');

const replacements = [
  { file: 'src/actions/auth/passkey.actions.ts', rules: [
    { from: /process\.env\.NEXT_PUBLIC_RP_ID\s*\|\|\s*["']localhost["']/g, to: 'getEnv("NEXT_PUBLIC_RP_ID")' },
    { from: /process\.env\.NEXT_PUBLIC_APP_NAME\s*\|\|\s*["']clouburstlab["']/g, to: 'getEnv("NEXT_PUBLIC_APP_NAME")' },
    { from: /process\.env\.NEXT_PUBLIC_APP_URL\s*\|\|\s*["']http:\/\/localhost:3000["']/g, to: 'getEnv("NEXT_PUBLIC_APP_URL")' }
  ]},
  { file: 'src/actions/auth/verification.actions.ts', rules: [
    { from: /process\.env\.NEXT_PUBLIC_RP_ID\s*\|\|\s*["']localhost["']/g, to: 'getEnv("NEXT_PUBLIC_RP_ID")' },
    { from: /process\.env\.NEXT_PUBLIC_APP_URL\s*\|\|\s*["']http:\/\/localhost:3000["']/g, to: 'getEnv("NEXT_PUBLIC_APP_URL")' }
  ]},
  { file: 'src/app/(auth)/signin/page.tsx', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']https:\/\/auth\.clouburstlab\.com["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/app/(auth)/signup/page.tsx', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']https:\/\/auth\.clouburstlab\.com["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/app/.well-known/openid-configuration/route.ts', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']http:\/\/localhost:3000["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/app/api/sso/v1/token/route.ts', rules: [
    { from: /process\.env\.NEXT_PUBLIC_APP_URL\s*\|\|\s*["']http:\/\/localhost:3000["']/g, to: 'getEnv("NEXT_PUBLIC_APP_URL")' }
  ]},
  { file: 'src/app/docs/page.tsx', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']https:\/\/auth\.clouburstlab\.com["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/app/layout.tsx', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']https:\/\/auth\.clouburstlab\.com["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/app/not-found.tsx', rules: [
    { from: /process\.env\.NEXT_PUBLIC_DEV_URL\s*\|\|\s*["']https:\/\/shawkath646\.dev["']/g, to: 'getEnv("NEXT_PUBLIC_DEV_URL")' },
    { from: /\$\{process\.env\.R2_PUBLIC_URL\}/g, to: '${getEnv("R2_PUBLIC_URL")}' }
  ]},
  { file: 'src/app/page.tsx', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']https:\/\/auth\.clouburstlab\.com["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/app/robots.ts', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']https:\/\/auth\.clouburstlab\.com["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/app/sitemap.ts', rules: [
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']https:\/\/auth\.clouburstlab\.com["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/lib/encryption.ts', rules: [
    { from: /process\.env\.ENCRYPTION_KEY\s*\|\|\s*process\.env\.JWT_SECRET\s*\|\|\s*["']default_insecure_secret_for_dev_only["']/g, to: '(process.env.ENCRYPTION_KEY || getEnv("JWT_SECRET"))' }
  ]},
  { file: 'src/lib/oauth/providers/github.provider.ts', rules: [
    { from: /process\.env\.GITHUB_CLIENT_ID\s*\|\|\s*["']/g, to: 'getEnv("GITHUB_CLIENT_ID")' },
    { from: /process\.env\.GITHUB_CLIENT_SECRET\s*\|\|\s*["']/g, to: 'getEnv("GITHUB_CLIENT_SECRET")' },
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']http:\/\/localhost:3000["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/lib/oauth/providers/google.provider.ts', rules: [
    { from: /process\.env\.GOOGLE_CLIENT_ID\s*\|\|\s*["']/g, to: 'getEnv("GOOGLE_CLIENT_ID")' },
    { from: /process\.env\.GOOGLE_CLIENT_SECRET\s*\|\|\s*["']/g, to: 'getEnv("GOOGLE_CLIENT_SECRET")' },
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']http:\/\/localhost:3000["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]},
  { file: 'src/lib/oauth/providers/microsoft.provider.ts', rules: [
    { from: /process\.env\.MICROSOFT_CLIENT_ID\s*\|\|\s*["']/g, to: 'getEnv("MICROSOFT_CLIENT_ID")' },
    { from: /process\.env\.MICROSOFT_CLIENT_SECRET\s*\|\|\s*["']/g, to: 'getEnv("MICROSOFT_CLIENT_SECRET")' },
    { from: /process\.env\.MICROSOFT_TENANT_ID\s*\|\|\s*["']common["']/g, to: 'getEnv("MICROSOFT_TENANT_ID")' },
    { from: /process\.env\.NEXT_PUBLIC_BASE_URL\s*\|\|\s*["']http:\/\/localhost:3000["']/g, to: 'getEnv("NEXT_PUBLIC_BASE_URL")' }
  ]}
];

for (const rep of replacements) {
  const filePath = path.join(process.cwd(), rep.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const rule of rep.rules) {
      if (content.match(rule.from)) {
        content = content.replace(rule.from, rule.to);
        changed = true;
      }
    }
    if (changed) {
      if (!content.includes('import { getEnv } from')) {
        const importStatement = 'import { getEnv } from "@/utils/env";\n';
        content = importStatement + content;
      }
      fs.writeFileSync(filePath, content);
      console.log('Updated ' + rep.file);
    }
  }
}
