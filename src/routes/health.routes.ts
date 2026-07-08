import Router from '@koa/router';
import { getHealth } from '../controllers/health.controllers.js'

export const healthRouter = new Router({ prefix: '/api/health' });

healthRouter.get("/", getHealth);