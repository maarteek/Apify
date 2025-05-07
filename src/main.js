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
        
        async requestHandler({ page, request }) {
            log.info('Processing page', { url: request.url });
            
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
        // Convert URLs to proper request objects
        const requests = input.startUrls.map(url => ({
            url: url,
            userData: {
                searchArea: input.searchArea,
                propertyType: input.propertyType,
                maxPrice: input.maxPrice,
                minPrice: input.minPrice
            }
        }));

        await crawler.run(requests);
        log.info('Scraper finished successfully');
    } catch (error) {
        log.error('Scraper failed', {
            error: error.message
        });
        throw error;
    }
});
