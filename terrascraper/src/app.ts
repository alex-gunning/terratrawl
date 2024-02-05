import express, { Express, NextFunction, Request, Response } from 'express';
import playwright from 'playwright';
import { extractError, logger } from './logger';

const app: Express = express();
const hostname = process.env.HOSTNAME ?? 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.get('/', async (req: Request<string>, res: Response) => {
  res.status(200).send('App should be delivered on this route.')
})

interface FundaRequest {
  url: string;
}

app.use(express.json());

/*********************************************************************************************************
* Example:
* curl -X POST \
*      -H "Content-Type: application/JSON" \
*      -d '{ "url": "https://www.funda.nl/koop/nieuw-vennep/appartement-43464176-habanera-89/" }' \
*      http://localhost:3000/funda
*********************************************************************************************************/
app.post('/funda', async (req: Request<FundaRequest>, res: Response)=>{
  const fundaUrl = req.body.url

  const browserType = 'firefox';
  const browser = await playwright[browserType].launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(fundaUrl)
  /*
   * These should all be parallelized or pulled and the resulting DOM queried.
   */
  const streetAddress = await page.$eval('.object-header__container .object-header__title', title => { return title.innerHTML })
  const postalCode = await page.$eval('.object-header__container .object-header__subtitle', code => { return code.textContent?.split('\n')[0] })
  const meters = await page.$eval('.object-header__container section > ul > li:nth-child(1) > span:nth-child(2)', meters => { return meters.textContent?.replace(/\D/g, '') })
  const bedrooms = await page.$eval('.object-header__container section > ul > li:nth-child(2) > span:nth-child(2)', meters => { return meters.textContent })

  await browser.close()

  const result = {
    streetAddress,
    postalCode,
    meters,
    bedrooms
  }

  res.status(200).send(result);
});


app.use((error: Error, req: Request<string>, res: Response, _: NextFunction) => {
  logger.error(extractError(error))
  res.status(500).send('Something broke see console!')
})

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
