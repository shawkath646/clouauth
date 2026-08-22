const fs = require('fs');
const files = [
  'src/lib/oauth/providers/github.provider.ts',
  'src/lib/oauth/providers/google.provider.ts',
  'src/lib/oauth/providers/microsoft.provider.ts'
];
for(const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/getEnv\("([A-Z_]+)"\)"/g, 'getEnv("$1")');
  fs.writeFileSync(f, c);
}
