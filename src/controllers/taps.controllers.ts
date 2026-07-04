import { Context } from 'koa';
import { POUR_VOLUMES, PourSize } from '../types/taps.types.js';
import { getSupplyStatus } from '../utils/supplyStatus.js'
import { pool } from '../db/db.js';

export const getTaps = async (ctx: Context) => {
    const result = await pool.query(`SELECT * FROM taps ORDER BY position`);
    ctx.body = result.rows.map((tap) => ({
        ...tap,
        status: getSupplyStatus(tap.current_ml, tap.initial_ml),
    }));
}

export const pourDrink = async (ctx: Context) => {
    const tapId = Number(ctx.params.id);
    const { pourSize } = ctx.request.body as { pourSize: PourSize};
    const volumeMl = POUR_VOLUMES[pourSize];

    if (volumeMl === undefined) {
        ctx.throw(400, 'Pour size not recognised');
    }

    const result = await pool.query(
        `
            UPDATE taps
            SET current_ml = current_ml - $1
            WHERE id = $2 AND current_ml >= $1
            RETURNING *
        `, [volumeMl, tapId]
    );

    if (result.rowCount === 0) {
        ctx.throw(409, 'Tap not found or insufficient volume remaining');
    }

    const { current_ml, initial_ml } = result.rows[0];
    const status = getSupplyStatus(current_ml, initial_ml);

    ctx.body = { ...result.rows[0], status };
}

export const replaceKeg = async (ctx: Context) => {
    const tapId = Number(ctx.params.id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const kegResult = await client.query(
            `
                UPDATE kegs_stock SET current_stock = current_stock - 1
                WHERE current_stock >= 1 
                RETURNING *
            `
        );

        if (kegResult.rowCount === 0) {
            ctx.throw(409, 'Out of keg stock');
        }

        const tapResult = await client.query(
            `
                UPDATE taps SET current_ml = initial_ml 
                WHERE id = $1 
                RETURNING *
            `, [tapId]
        );

        if (tapResult.rowCount === 0) {
            ctx.throw(404, 'Tap not found');
        }

        await client.query('COMMIT');
        ctx.body = { keg: kegResult.rows[0], tap: tapResult.rows[0] };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

