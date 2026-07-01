import request from 'supertest';
import { tapsRouter } from '../../src/routes/taps.routes.js';
import { kegsRouter } from '../../src/routes/kegs.routes.js';
import { buildApp } from '../helpers/app.js';
import { testPool, SEED_TAPS, SEED_KEG_STOCK } from './db/testDb.js';

const app = buildApp(tapsRouter);
const kegsApp = buildApp(kegsRouter);

describe('GET /api/taps', () => {
    it('returns all 4 seeded taps', async () => {
        const res = await request(app.callback()).get('/api/taps');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(4);
        expect(res.body.map((t: any) => t.id).sort()).toEqual([1, 2, 3, 4]);
        expect(res.body[0]).toMatchObject({ current_ml: 20000, initial_ml: 20000 });
    });
});

describe('POST /api/taps/:id/pour', () => {
    it('decrements remaining volume for a half pour', async () => {
        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({ pourSize: 'half' });

        expect(res.status).toBe(200);
        expect(res.body.current_ml).toBe(20000 - 250);

        const { rows } = await testPool.query('SELECT current_ml FROM taps WHERE id = 1');
        expect(rows[0].current_ml).toBe(20000 - 250);
    });

    it('decrements remaining volume for a pint pour', async () => {
        const res = await request(app.callback())
            .post('/api/taps/2/pour')
            .send({ pourSize: 'pint' });

        expect(res.status).toBe(200);
        expect(res.body.current_ml).toBe(20000 - 500);
    });

    it('rejects an invalid pour size with 400 and leaves current_ml unchanged', async () => {
        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({ pourSize: 'growler' });

        expect(res.status).toBe(400);

        const { rows } = await testPool.query('SELECT current_ml FROM taps WHERE id = 1');
        expect(rows[0].current_ml).toBe(20000);
    });

    it('rejects a pour that would exceed remaining volume with 409 and leaves current_ml unchanged', async () => {
        await testPool.query('UPDATE taps SET current_ml = 100 WHERE id = 1');

        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({ pourSize: 'half' });

        expect(res.status).toBe(409);

        const { rows } = await testPool.query('SELECT current_ml FROM taps WHERE id = 1');
        expect(rows[0].current_ml).toBe(100);
    });

    it('404/409s for a tap id that does not exist', async () => {
        const res = await request(app.callback())
            .post('/api/taps/999/pour')
            .send({ pourSize: 'half' });

        expect(res.status).toBe(409);
    });
});

describe('POST /api/taps/:id/replace-keg', () => {
    it('resets current_ml to 20000 and decrements keg stock', async () => {
        await testPool.query('UPDATE taps SET current_ml = 500 WHERE id = 3');

        const res = await request(app.callback()).post('/api/taps/3/replace-keg');

        expect(res.status).toBe(200);
        expect(res.body.tap.current_ml).toBe(20000);
        expect(res.body.keg.current_stock).toBe(SEED_KEG_STOCK.current_stock - 1);

        const { rows } = await testPool.query('SELECT current_ml FROM taps WHERE id = 3');
        expect(rows[0].current_ml).toBe(20000);
    });

    it('reflects the decremented keg stock via GET /api/kegs', async () => {
        await request(app.callback()).post('/api/taps/1/replace-keg');

        const res = await request(kegsApp.callback()).get('/api/kegs');

        expect(res.status).toBe(200);
        expect(res.body.current_stock).toBe(SEED_KEG_STOCK.current_stock - 1);
    });

    it('404s for a tap id that does not exist, and rolls back the keg decrement', async () => {
        const res = await request(app.callback()).post('/api/taps/999/replace-keg');

        expect(res.status).toBe(404);

        const { rows } = await testPool.query('SELECT current_stock FROM kegs_stock WHERE id = $1', [SEED_KEG_STOCK.id]);
        expect(rows[0].current_stock).toBe(SEED_KEG_STOCK.current_stock);
    });

    it('409s when keg stock is exhausted, and leaves current_ml unchanged', async () => {
        await testPool.query('UPDATE kegs_stock SET current_stock = 0');
        await testPool.query('UPDATE taps SET current_ml = 500 WHERE id = 1');

        const res = await request(app.callback()).post('/api/taps/1/replace-keg');

        expect(res.status).toBe(409);

        const { rows } = await testPool.query('SELECT current_ml FROM taps WHERE id = 1');
        expect(rows[0].current_ml).toBe(500);
    });
});
