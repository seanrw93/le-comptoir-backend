import request from 'supertest';
import { kegsRouter } from '../../src/routes/kegs.routes.js';
import { buildApp } from '../helpers/app.js';
import { testPool, SEED_KEG_STOCK } from './db/testDb.js';

const app = buildApp(kegsRouter);

describe('GET /api/kegs', () => {
    it('returns current stock and status', async () => {
        const res = await request(app.callback()).get('/api/kegs');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            current_stock: SEED_KEG_STOCK.current_stock,
            initial_stock: SEED_KEG_STOCK.initial_stock,
            status: 'full',
        });
    });
});

describe('POST /api/kegs/restock', () => {
    it('increments current_stock and initial_stock by quantity', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 10 });

        expect(res.status).toBe(200);
        expect(res.body.current_stock).toBe(SEED_KEG_STOCK.current_stock + 10);
        expect(res.body.initial_stock).toBe(SEED_KEG_STOCK.current_stock + 10);

        const { rows } = await testPool.query('SELECT current_stock, initial_stock FROM kegs_stock WHERE id = $1', [SEED_KEG_STOCK.id]);
        expect(rows[0].current_stock).toBe(SEED_KEG_STOCK.current_stock + 10);
        expect(rows[0].initial_stock).toBe(SEED_KEG_STOCK.current_stock + 10);
    });

    it('returns status in the response', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 10 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status');
        expect(['full', 'low', 'critical', 'empty']).toContain(res.body.status);
    });

    it('rejects quantity below 10 with 400 and leaves stock unchanged', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 9 });

        expect(res.status).toBe(400);

        const { rows } = await testPool.query('SELECT current_stock FROM kegs_stock WHERE id = $1', [SEED_KEG_STOCK.id]);
        expect(rows[0].current_stock).toBe(SEED_KEG_STOCK.current_stock);
    });

    it('rejects quantity above 30 with 400 and leaves stock unchanged', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 31 });

        expect(res.status).toBe(400);

        const { rows } = await testPool.query('SELECT current_stock FROM kegs_stock WHERE id = $1', [SEED_KEG_STOCK.id]);
        expect(rows[0].current_stock).toBe(SEED_KEG_STOCK.current_stock);
    });

    it('rejects a non-integer quantity with 400', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 15.5 });

        expect(res.status).toBe(400);
    });
});
