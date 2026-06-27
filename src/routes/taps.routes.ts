import Router from '@koa/router'
import { pourDrink, getStatus } from '../controllers/taps.controllers.js'

export const tapsRouter = new Router({ prefix: '/api/taps' });

tapsRouter.post("/:id/pour", pourDrink);
tapsRouter.get("/:id/status", getStatus);