import { Context } from 'koa';
import { pool } from '../db/db.js'
import { getSupplyStatus } from '../utils/supplyStatus.js';

export const restockKegs = async (ctx: Context) => {
    const { quantity } = ctx.request.body as { quantity: number };

    const minVal = 10;
    const maxVal = 30;

    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
        ctx.throw(400, 'Quantity must be a whole number');
    }

    if (quantity < minVal) {
        ctx.throw(400, 'Insufficient order quantity');
    }

    if (quantity > maxVal) {
        ctx.throw(400, 'Order quantity is too high');
    }

    const result = await pool.query(
        `
            UPDATE kegs_stock SET initial_stock = current_stock + $1, current_stock = current_stock + $1
            RETURNING *
        `, [quantity]
    )

    if (result.rowCount === 0) {
        ctx.throw(404, 'Keg stock not found');
    }

    const { current_stock, initial_stock } = result.rows[0];
    const status = getSupplyStatus(current_stock, initial_stock);
    ctx.body = { ...result.rows[0], status };

}

export const getCurrentStock = async (ctx: Context) => {
    const result = await pool.query(
        `
            SELECT current_stock, initial_stock FROM kegs_stock
        `
    );

    if (result.rowCount === 0) {
        ctx.throw(404, 'Keg stock not found');
    }

    const { current_stock, initial_stock } = result.rows[0];
    const status = getSupplyStatus(current_stock, initial_stock);

    ctx.body = { ...result.rows[0], status };
}
