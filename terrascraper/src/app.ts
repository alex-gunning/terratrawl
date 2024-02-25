import express, { Express, NextFunction, Request, Response } from 'express';
import playwright, { Page } from 'playwright';
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
const furnishingTranslation = {
  gestoffeerd: 'Upholstered',
  gemeubileerd: 'Furnished',
  kaal: 'Unupholstered',
}

app.post('/funda', async (req: Request<FundaRequest>, res: Response)=>{
  const fundaUrl = req.body.url


  const browserType = 'firefox';
  const browser = await playwright[browserType].launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(fundaUrl)

  /*
   * Dismiss cookie consent popup.
   */
  await page.locator('button:has-text("Voorkeuren wijzigen")').click()
  await page.locator('button:has-text("Alles weigeren")').last().click()

  /*
   * Pull the various head items out of the DOM.
   */
  const isToHire: boolean = new URL(fundaUrl).pathname.split('/')[1] === 'huur';
  const streetAddress = await extractText(page, '.object-header__container .object-header__title', title => { return title.map(t => t.innerHTML) })
  const postalCode = (await page.$$eval('.object-header__container .object-header__subtitle', code => { return code.map(t => t.textContent?.split('\n')[0]) }))[0]

  const bedrooms = await page.getByRole('listitem')
    .filter({ hasText: 'slaapkamers' })
    .allTextContents()
    .then(rawData => rawData[0].replace(/\D/g, ''))
  const meters = await page.getByRole('listitem')
    .filter({ hasText: 'wonen' })
    .allTextContents()
    .then(rawData => rawData[0].replace(/\D/g, ''))

  const primaryPrice = await extractText(page, '.object-header__price', price => { return price.map(t => t.textContent!.replace(/\D/g, '')) })
  const secondaryPrice = await extractText(page, '.object-header__secondary-price', price => { return price.map(t => t.textContent!.replace(/\D/g, '')) })

  // Open the description, if there is one
  const readMore = page.locator('button.object-description-open-button')
  if(await readMore.count() > 0) await readMore.click()

  const description = await extractText(page, 'div[data-object-description-body]')
  const available = (await extractText(page, 'dl.object-kenmerken-list > dt:text("status") + dd')) === 'beschikbaar' ? true : false
  const builtIn = (await extractText(page, 'dl.object-kenmerken-list > dt:text("Bouwperiode") + dd'))
  const furnishingText = (await extractText(page, 'dl.object-kenmerken-list > dt:text("Specifiek") + dd')).toLowerCase()


  await browser.close()

  const result = {
    streetAddress,
    postalCode,
    meters,
    bedrooms,
    isToHire,
    primaryPrice,
    secondaryPrice,
    description,
    available,
    builtIn,
    furnishings: furnishingText,
  }

  res.status(200).send(result);
});

const textContentMappingFn = (elements: Element[]) => elements.map(element => element.textContent!.replace(/(\r\n|\n|\r)/gm, "").trim())
const extractText = async (page: Page, selector: string, mappingFn: (elements: Element[]) => string[] = textContentMappingFn) => {
  const item = (await page.$$eval(selector, mappingFn))[0]
  return item ? item : ''
}


app.use((error: Error, req: Request<string>, res: Response, _: NextFunction) => {
  logger.error(extractError(error))
  res.status(500).send('Something broke see console!')
})

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
