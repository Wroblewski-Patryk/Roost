import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  publicApiBaseUrl: process.env.COMPANYCORE_PUBLIC_API_BASE_URL,
  authTokenSecret: process.env.AUTH_TOKEN_SECRET ?? "dev-companycore-auth-secret-change-me",
  integrationSecretKey: process.env.INTEGRATION_SECRET_KEY ?? "dev-companycore-integration-secret-change-me",
  apiKeyHashSecret: process.env.API_KEY_HASH_SECRET ?? process.env.AUTH_TOKEN_SECRET ?? "dev-companycore-auth-secret-change-me"
};
