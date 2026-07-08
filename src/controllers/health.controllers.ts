import { Context } from 'koa';
import { pool } from "../db/db.js";

export const getHealth = async (ctx: Context) => {
    try {
        await pool.query('SELECT 1');
        ctx.status = 200;
        ctx.body = {
            status: "ok",
            db: "connected"
        };
    } catch (err) {
        ctx.status = 500;
        ctx.body = {
            status: "error",
            db: "down"
        };
    }
}