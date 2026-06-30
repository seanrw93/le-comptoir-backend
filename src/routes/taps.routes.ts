import Router from '@koa/router'
import { getTaps, pourDrink, replaceKeg } from '../controllers/taps.controllers.js'

export const tapsRouter = new Router({ prefix: '/api/taps' });

tapsRouter.get("/", getTaps);
tapsRouter.post("/:id/pour", pourDrink);
tapsRouter.post("/:id/replace-keg", replaceKeg);