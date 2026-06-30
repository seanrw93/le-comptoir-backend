import Router from '@koa/router';
import { getKegStatus } from '../controllers/kegs.controllers.js'

export const kegsRouter = new Router({ prefix: '/api/kegs' });

kegsRouter.get('/status', getKegStatus);
