import Router from '@koa/router';
import { restockKegs, getCurrentStock } from '../controllers/kegs.controllers.js'

export const kegsRouter = new Router({ prefix: '/api/kegs' });

kegsRouter.post('/restock', restockKegs);

kegsRouter.get('/', getCurrentStock)
