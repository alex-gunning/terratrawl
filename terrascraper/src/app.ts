import express, { Express, Request, Response } from 'express';
import playwright from 'playwright';


const app: Express = express();
const hostname = process.env.HOSTNAME ?? 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.get('/', async (req: Request<string>, res: Response)=>{
  const browserType = 'chromium';
  const browser = await playwright[browserType].launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto("https://amazon.com")
  await page.screenshot({ path: 'page.png' })
  await browser.close()

  res.status(200).send('Visited amazon.com');
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
