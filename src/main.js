const { Actor } = require('apify');
const { PuppeteerCrawler, log } = require('crawlee');

Actor.main(async () => {
    // Get input and set defaults
    const input = await Actor.getInput() ?? {
        startUrls: ['https://www.rightmove.co.uk/property-for-sale/find.html'],
        maxItems: 5,
        searchArea: 'London',
        propertyType: 'All',
        maxPrice: '300000',
        minPrice: '200000'
    };

    log.info('Starting scraper', { input });

    const crawler = new PuppeteerCrawler({
        maxRequestsPerCrawl: input.maxItems,
        
        // Configure browser launcher
        launchContext: {
            launchOptions: {
                headless: true,
                args: [
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            }
        },
        
        async requestHandler({ page, request }) {
            log.info('Processing page', { url: request.url });
            
            // Add a longer timeout and user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36');
            await page.setDefaultTimeout(30000);
            
            await page.waitForSelector('.propertyCard-wrapper', { timeout: 30000 })
                .catch(() => {
                    throw new Error('No property listings found on page');
                });

            const properties = await page.$$eval('.propertyCard-wrapper', (cards) => {
                return cards.map(card => ({
                    price: card.querySelector('.propertyCard-priceValue')?.textContent?.trim() || '',
                    address: card.querySelector('.propertyCard-address')?.textContent?.trim() || '',
                    description: card.querySelector('.propertyCard-description')?.textContent?.trim() || '',
                    url: card.querySelector('a.propertyCard-link')?.href || ''
                }));
            });

            await Actor.pushData(properties);
            
            log.info('Extracted properties', { 
                count: properties.length,
                url: request.url 
            });
        },

        failedRequestHandler({ request, error }) {
            log.error('Request failed', {
                url: request.url,
                error: error.message
            });
        }
    });

    try {
        // Construct the search URL with parameters
        const searchUrl = new URL('https://www.rightmove.co.uk/property-for-sale/find.html');
        if (input.searchArea) searchUrl.searchParams.set('searchLocation', input.searchArea);
        if (input.maxPrice) searchUrl.searchParams.set('maxPrice', input.maxPrice);
        if (input.minPrice) searchUrl.searchParams.set('minPrice', input.minPrice);
        if (input.propertyType) searchUrl.searchParams.set('propertyTypes', input.propertyType);

        const requests = [{
            url: searchUrl.toString(),
            userData: {
                searchArea: input.searchArea,
                propertyType: input.propertyType,
                maxPrice: input.maxPrice,
                minPrice: input.minPrice
            }
        }];

        await crawler.run(requests);
        log.info('Scraper finished successfully');
    } catch (error) {
        log.error('Scraper failed', {
            error: error.message
        });
        throw error;
    }
});
