import Router from '@koa/router'
import { pourDrink } from '../controllers/taps.controllers.js'

export const tapsRouter = new Router({ prefix: '/api/taps' });

tapsRouter.post("/:id/pour", pourDrink);