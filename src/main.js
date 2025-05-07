const { Actor } = require('apify');
const { PuppeteerCrawler } = require('crawlee');

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

    Actor.log.info('Starting scraper', { input });

    const crawler = new PuppeteerCrawler({
        maxRequestsPerCrawl: input.maxItems,
        
        async requestHandler({ page, request }) {
            Actor.log.info('Processing page', { url: request.url });
            
            await page.waitForSelector('.propertyCard-wrapper', { timeout: 10000 })
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
            
            Actor.log.info('Extracted properties', { 
                count: properties.length,
                url: request.url 
            });
        },

        failedRequestHandler({ request, error }) {
            Actor.log.error('Request failed', {
                url: request.url,
                error: error.message
            });
        }
    });

    try {
        await crawler.run([input.startUrls]);
        Actor.log.info('Scraper finished successfully');
    } catch (error) {
        Actor.log.error('Scraper failed', {
            error: error.message
        });
        throw error;
    }
});
