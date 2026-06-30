// One-time, manual provisioning: creates the isolated `comptoir_test` schema
// inside the existing comptoir database and applies schema.sql to it.
// comptoir_user lacks CREATEDB, so a schema (not a separate database) is the
// isolation boundary. Run with: npm run test:db:setup
// Safe to re-run; CREATE SCHEMA/TABLE IF NOT EXISTS make this idempotent.
// This does NOT run automatically before each test — see jest.setup.ts for
// the per-test reset/reseed that does.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pkg;

const SCHEMA = process.env.PG_TEST_SCHEMA || 'comptoir_test';

async function main() {
    const client = new Client({ connectionString: process.env.PG_URL });
    await client.connect();
    try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await client.query(`SET search_path TO "${SCHEMA}"`);
        await client.query(schemaSql);
        console.log(`Schema "${SCHEMA}" ready with taps/kegs_stock tables`);
    } finally {
        await client.end();
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Failed to set up test schema:', err.message);
        process.exit(1);
    });
