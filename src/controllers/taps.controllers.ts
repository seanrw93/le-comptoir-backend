import { Context } from 'koa';
import { POUR_VOLUMES, PourSize, TapStatus } from '../types/taps.types.js'
import { pool } from '../db/db.js';

export const pourDrink = async (ctx: Context) => {
    const tapId = Number(ctx.params.id);
    const { pourSize } = ctx.request.body as { pourSize: PourSize}; 
    const volumeMl = POUR_VOLUMES[pourSize];

    const result = await pool.query(
        `
            UPDATE taps
            SET remaining_ml = remaining_ml - $1
            WHERE id = $2 AND remaining_ml >= $1
            RETURNING *
        `, [volumeMl, tapId]
    );

    if (result.rowCount === 0) {
        ctx.throw(409, 'Tap not found or insufficient volume remaining');
    }

    ctx.body = result.rows[0];
    console.table(ctx.body);
}

export const getStatus = async (ctx: Context) => {
    const tapId = Number(ctx.params.id);

    const result = await pool.query(
        `
            SELECT remaining_ml, capacity_ml FROM taps WHERE id = $1
        `, [tapId]
    );

    if (result.rowCount === 0) {
        ctx.throw(409, 'Tap not found');
    }

    const { remaining_ml, capacity_ml } = result.rows[0];
    const ratio = remaining_ml / capacity_ml;
    const status: TapStatus = ratio >= 0.5 ? 'full' : ratio >= 0.25 ? 'low' : remaining_ml > 0 ? 'critical' : 'empty';

    ctx.body = { status };
}