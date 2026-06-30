import { Context } from 'koa';
import { pool } from '../db/db.js'
import { getSupplyStatus } from '../utils/supplyStatus.js';

export const getKegStatus = async (ctx: Context) => {
    const result = await pool.query(
        `
            SELECT current_stock, initial_stock FROM kegs_stock
        `
    );

    if (result.rowCount === 0) {
        ctx.throw(409, 'Keg stock not found');
    }

    const { current_stock, initial_stock } = result.rows[0];
    const status = getSupplyStatus(current_stock, initial_stock);

    ctx.body = { ...result.rows[0], status };
}
