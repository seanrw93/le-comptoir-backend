import { jest } from '@jest/globals';
import request from 'supertest';

const query = jest.fn();

jest.unstable_mockModule('../../src/db/db.js', () => ({
    pool: { query },
}));

const { kegsRouter } = await import('../../src/routes/kegs.routes.js');
const { buildApp } = await import('../helpers/app.js');

const app = buildApp(kegsRouter);

beforeEach(() => {
    query.mockReset();
});

describe('GET /api/kegs', () => {
    it('returns current stock with status', async () => {
        query.mockResolvedValueOnce({
            rows: [{ current_stock: 9, initial_stock: 10 }],
            rowCount: 1,
        });

        const res = await request(app.callback()).get('/api/kegs');

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ current_stock: 9, initial_stock: 10, status: 'full' });
    });

    it('responds 409 when no kegs_stock row exists', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app.callback()).get('/api/kegs');

        expect(res.status).toBe(409);
    });
});

describe('POST /api/kegs/restock', () => {
    it('increments current_stock and initial_stock by quantity and returns status', async () => {
        query.mockResolvedValueOnce({
            rows: [{ id: 1, current_stock: 19, initial_stock: 20 }],
            rowCount: 1,
        });

        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 10 });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ current_stock: 19, initial_stock: 20, status: 'full' });
        expect(query).toHaveBeenCalledWith(expect.any(String), [10]);
    });

    it('rejects a non-number quantity with 400 and does not touch the db', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 'ten' });

        expect(res.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it('rejects a float quantity with 400 and does not touch the db', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 10.5 });

        expect(res.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it('rejects a missing quantity with 400', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({});

        expect(res.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it('rejects quantity below minimum with 400', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 9 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/insufficient order quantity/i);
        expect(query).not.toHaveBeenCalled();
    });

    it('rejects quantity above maximum with 400', async () => {
        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 31 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/too high/i);
        expect(query).not.toHaveBeenCalled();
    });

    it('accepts the minimum boundary value of 10', async () => {
        query.mockResolvedValueOnce({
            rows: [{ id: 1, current_stock: 19, initial_stock: 20 }],
            rowCount: 1,
        });

        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 10 });

        expect(res.status).toBe(200);
    });

    it('accepts the maximum boundary value of 30', async () => {
        query.mockResolvedValueOnce({
            rows: [{ id: 1, current_stock: 39, initial_stock: 40 }],
            rowCount: 1,
        });

        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 30 });

        expect(res.status).toBe(200);
    });

    it('responds 409 when no kegs_stock row exists', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app.callback())
            .post('/api/kegs/restock')
            .send({ quantity: 10 });

        expect(res.status).toBe(409);
    });
});
