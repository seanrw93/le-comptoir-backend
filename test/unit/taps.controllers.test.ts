import { jest } from '@jest/globals';
import request from 'supertest';

const query = jest.fn();
const connect = jest.fn();

jest.unstable_mockModule('../../src/db/db.js', () => ({
    pool: { query, connect },
}));

const { tapsRouter } = await import('../../src/routes/taps.routes.js');
const { buildApp } = await import('../helpers/app.js');

const app = buildApp(tapsRouter);

beforeEach(() => {
    query.mockReset();
    connect.mockReset();
});

describe('GET /api/taps', () => {
    it('returns all taps from the db', async () => {
        const taps = [
            { id: 1, position: 1, current_ml: 20000, initial_ml: 20000 },
            { id: 2, position: 2, current_ml: 18000, initial_ml: 20000 },
            { id: 3, position: 3, current_ml: 20000, initial_ml: 20000 },
            { id: 4, position: 4, current_ml: 20000, initial_ml: 20000 },
        ];
        query.mockResolvedValueOnce({ rows: taps, rowCount: taps.length });

        const res = await request(app.callback()).get('/api/taps');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(taps);
        expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM taps'));
    });
});

describe('POST /api/taps/:id/pour', () => {
    it('decrements current_ml by the half pour volume', async () => {
        query.mockResolvedValueOnce({
            rows: [{ id: 1, position: 1, current_ml: 19750, initial_ml: 20000 }],
            rowCount: 1,
        });

        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({ pourSize: 'half' });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ current_ml: 19750, status: 'full' });
        expect(query).toHaveBeenCalledWith(expect.any(String), [250, 1]);
    });

    it('decrements current_ml by the pint pour volume', async () => {
        query.mockResolvedValueOnce({
            rows: [{ id: 1, position: 1, current_ml: 19500, initial_ml: 20000 }],
            rowCount: 1,
        });

        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({ pourSize: 'pint' });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ current_ml: 19500 });
        expect(query).toHaveBeenCalledWith(expect.any(String), [500, 1]);
    });

    it('rejects an invalid pour size with 400 and does not touch the db', async () => {
        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({ pourSize: 'growler' });

        expect(res.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it('rejects a missing pour size with 400', async () => {
        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({});

        expect(res.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it('responds 409 when the pour would exceed remaining volume (db guard returns 0 rows)', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app.callback())
            .post('/api/taps/1/pour')
            .send({ pourSize: 'pint' });

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/insufficient volume/i);
    });

    it('responds 409 when the tap id does not exist', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app.callback())
            .post('/api/taps/999/pour')
            .send({ pourSize: 'half' });

        expect(res.status).toBe(409);
    });
});

describe('POST /api/taps/:id/replace-keg', () => {
    it('resets current_ml to initial_ml and decrements keg stock', async () => {
        const clientQuery = jest.fn();
        const release = jest.fn();
        connect.mockResolvedValueOnce({ query: clientQuery, release });

        clientQuery.mockImplementation(async (sql: string) => {
            if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT')) return {};
            if (sql.includes('kegs_stock')) {
                return { rows: [{ id: 1, current_stock: 8, initial_stock: 10 }], rowCount: 1 };
            }
            if (sql.includes('UPDATE taps')) {
                return { rows: [{ id: 1, position: 1, current_ml: 20000, initial_ml: 20000 }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        });

        const res = await request(app.callback()).post('/api/taps/1/replace-keg');

        expect(res.status).toBe(200);
        expect(res.body.tap.current_ml).toBe(20000);
        expect(res.body.keg.current_stock).toBe(8);
        expect(clientQuery).toHaveBeenCalledWith('BEGIN');
        expect(clientQuery).toHaveBeenCalledWith('COMMIT');
        expect(release).toHaveBeenCalled();
    });

    it('rolls back and 409s when keg stock is exhausted', async () => {
        const clientQuery = jest.fn();
        const release = jest.fn();
        connect.mockResolvedValueOnce({ query: clientQuery, release });

        clientQuery.mockImplementation(async (sql: string) => {
            if (sql.startsWith('BEGIN') || sql.startsWith('ROLLBACK')) return {};
            if (sql.includes('kegs_stock')) return { rows: [], rowCount: 0 };
            return { rows: [], rowCount: 0 };
        });

        const res = await request(app.callback()).post('/api/taps/1/replace-keg');

        expect(res.status).toBe(409);
        expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
        expect(release).toHaveBeenCalled();
    });

    it('rolls back and 404s when the tap does not exist', async () => {
        const clientQuery = jest.fn();
        const release = jest.fn();
        connect.mockResolvedValueOnce({ query: clientQuery, release });

        clientQuery.mockImplementation(async (sql: string) => {
            if (sql.startsWith('BEGIN') || sql.startsWith('ROLLBACK')) return {};
            if (sql.includes('kegs_stock')) {
                return { rows: [{ id: 1, current_stock: 8, initial_stock: 10 }], rowCount: 1 };
            }
            if (sql.includes('UPDATE taps')) return { rows: [], rowCount: 0 };
            return { rows: [], rowCount: 0 };
        });

        const res = await request(app.callback()).post('/api/taps/999/replace-keg');

        expect(res.status).toBe(404);
        expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    });
});
