import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema",
  datasource: {
    url: process.env.LOCAL_DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
