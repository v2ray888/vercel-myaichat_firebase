import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_4FlvkMDuc3rs@ep-wispy-butterfly-a1s6o3ws-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
  verbose: true,
  strict: true,
});