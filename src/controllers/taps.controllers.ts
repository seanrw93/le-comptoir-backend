import { Context } from 'koa';
import { POUR_VOLUMES, PourSize } from '../types/taps.types.js'
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