// Jest hook (registered via setupFilesAfterEnv), runs automatically before
// every integration test run. Resets/reseeds the comptoir_test schema before
// each test and closes pg connections after the suite.
// For one-time schema provisioning, see db/provision-schema.mjs instead.
import { beforeEach, afterAll } from '@jest/globals';
import { resetTestDb, testPool } from './db/testDb.js';
import { pool as appPool } from '../../src/db/db.js';

beforeEach(async () => {
    await resetTestDb();
});

afterAll(async () => {
    await testPool.end();
    await appPool.end();
});
