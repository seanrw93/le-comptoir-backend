import pkg from 'pg';

const { Pool } = pkg;

const SCHEMA = process.env.PG_TEST_SCHEMA || 'comptoir_test';

// Connects to the same comptoir database as production, but with search_path
// pinned to the isolated comptoir_test schema so unqualified queries (the app
// code never schema-qualifies its SQL) resolve against test tables only.
export const testPool = new Pool({
    connectionString: process.env.PG_URL,
    options: `-c search_path=${SCHEMA}`,
});

export const SEED_TAPS = [
    { id: 1, position: 1, current_ml: 20000, initial_ml: 20000 },
    { id: 2, position: 2, current_ml: 20000, initial_ml: 20000 },
    { id: 3, position: 3, current_ml: 20000, initial_ml: 20000 },
    { id: 4, position: 4, current_ml: 20000, initial_ml: 20000 },
];

export const SEED_KEG_STOCK = { id: 1, current_stock: 9, initial_stock: 10 };

export const resetTestDb = async () => {
    await testPool.query('TRUNCATE taps, kegs_stock RESTART IDENTITY');

    for (const tap of SEED_TAPS) {
        await testPool.query(
            'INSERT INTO taps (id, position, current_ml, initial_ml) VALUES ($1, $2, $3, $4)',
            [tap.id, tap.position, tap.current_ml, tap.initial_ml]
        );
    }

    await testPool.query(
        'INSERT INTO kegs_stock (id, current_stock, initial_stock) VALUES ($1, $2, $3)',
        [SEED_KEG_STOCK.id, SEED_KEG_STOCK.current_stock, SEED_KEG_STOCK.initial_stock]
    );

    await testPool.query("SELECT setval('taps_id_seq', (SELECT MAX(id) FROM taps))");
    await testPool.query("SELECT setval('kegs_stock_id_seq', (SELECT MAX(id) FROM kegs_stock))");
};
