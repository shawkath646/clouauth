export function getEnv(key: string, optional: boolean = false): string {
  const value = process.env[key];
  if (!value && !optional) {
    throw new Error(`Environment variable ${key} is required but not defined.`);
  }
  return value || "";
}
