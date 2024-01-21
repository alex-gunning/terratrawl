import express, { Express, Request, Response } from 'express';

const app: Express = express();
const hostname = process.env.HOSTNAME ?? 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.get('/',(req: Request<string>, res: Response)=>{
    res.status(200).send('Hello World!\n');
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
