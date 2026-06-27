import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import dotenv from 'dotenv';

dotenv.config();

const app = new Koa();
const PORT = process.env.PORT ?? '3001';

app.use(cors());
app.use(bodyParser());

app.listen(PORT, () => {
    console.log("Listening on Port " + PORT);
}).on("error", (err) => {
    console.log("Failed to start server:", err);
});
