import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import dotenv from 'dotenv';
import { tapsRouter } from './routes/taps.routes.js';
import { kegsRouter } from './routes/kegs.routes.js';
import { healthRouter } from './routes/health.routes.js';

dotenv.config();

const app = new Koa();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(bodyParser());

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err: any) {
        ctx.status = err.status ?? 500;
        ctx.body = { error: err.message ?? 'Internal server error' };
    }
});

app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

app.use(tapsRouter.routes());
app.use(tapsRouter.allowedMethods());

app.use(kegsRouter.routes());
app.use(kegsRouter.allowedMethods());

app.listen(PORT, () => {
    console.log("Listening on Port " + PORT);
}).on("error", (err) => {
    console.log("Failed to start server:", err);
});
