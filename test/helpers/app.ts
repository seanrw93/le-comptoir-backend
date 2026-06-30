import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';

export const buildApp = (router: Router) => {
    const app = new Koa();

    app.use(bodyParser());

    app.use(async (ctx, next) => {
        try {
            await next();
        } catch (err: any) {
            ctx.status = err.status ?? 500;
            ctx.body = { error: err.message ?? 'Internal server error' };
        }
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    return app;
};
