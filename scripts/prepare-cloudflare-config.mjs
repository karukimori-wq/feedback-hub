import { readFileSync, writeFileSync } from 'node:fs';

const configPath = new URL('../wrangler.jsonc', import.meta.url);
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

if (!databaseId) {
  throw new Error('CLOUDFLARE_D1_DATABASE_ID is required');
}

const config = readFileSync(configPath, 'utf8');
const nextConfig = config.replace('REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID', databaseId);

if (nextConfig === config) {
  throw new Error('Cloudflare D1 database id placeholder was not found');
}

writeFileSync(configPath, nextConfig);
