import { Actor } from 'apify';
import { PuppeteerCrawler, Dataset } from 'crawlee';

// Initialize the actor
await Actor.init();

// Get input and set defaults
const input = await Actor.getInput() ?? {
    startUrls: ['https://www.rightmove.co.uk/property-for-sale/find.html'],
    maxItems: 5,
    searchArea: 'London',
    propertyType: 'All',
    maxPrice: '300000',
    minPrice: '200000'
};

const crawler = new PuppeteerCrawler({
    // Limit the number of concurrent requests
    maxConcurrency: 2,
    maxRequestsPerCrawl: input.maxItems,
    
    // Handle each page
    async requestHandler({ page, request, log }) {
        log.info('Processing page', { url: request.url });
        
        // Ensure we're on a search results page
        await page.waitForSelector('.propertyCard-wrapper', { timeout: 10000 })
            .catch(() => {
                throw new Error('No property listings found on page');
            });

        // Extract data from the page
        const properties = await page.$$eval('.propertyCard-wrapper', (cards) => {
            return cards.map(card => ({
                id: card.getAttribute('id') || '',
                price: card.querySelector('.propertyCard-priceValue')?.textContent?.trim() || '',
                address: card.querySelector('.propertyCard-address')?.textContent?.trim() || '',
                description: card.querySelector('.propertyCard-description')?.textContent?.trim() || '',
                bedrooms: card.querySelector('.property-information span:first-child')?.textContent?.trim() || '',
                url: card.querySelector('a.propertyCard-link')?.href || '',
                addedOn: card.querySelector('.propertyCard-branchSummary-addedOrReduced')?.textContent?.trim() || '',
                agent: card.querySelector('.propertyCard-branchLogo img')?.getAttribute('alt') || ''
            }));
        });

        // Add metadata to each property
        const enrichedProperties = properties.map(property => ({
            ...property,
            scrapedAt: new Date().toISOString(),
            searchParams: {
                searchArea: input.searchArea,
                propertyType: input.propertyType,
                maxPrice: input.maxPrice,
                minPrice: input.minPrice
            }
        }));

        // Save the results
        await Dataset.pushData(enrichedProperties);
        
        log.info('Extracted properties', { 
            count: properties.length,
            url: request.url 
        });

        // Handle pagination if needed
        const nextPageUrl = await page.$eval('.pagination-button.button.button--secondary.button--next', 
            el => el.href
        ).catch(() => null);

        if (nextPageUrl) {
            log.info('Found next page', { url: nextPageUrl });
            await crawler.addRequests([nextPageUrl]);
        }
    },

    // Handle failed requests
    failedRequestHandler({ request, error, log }) {
        log.error('Request failed', {
            url: request.url,
            error: error.message
        });
    },

    // Browser settings
    proxyConfiguration: await Actor.createProxyConfiguration(),
    browserPoolOptions: {
        useFingerprints: true,
        puppeteerOptions: {
            args: [
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        }
    }
});

// Start the crawl
log.info('Starting the scraper', { input });

try {
    await crawler.run([input.startUrls]);
    
    log.info('Scraper finished successfully');

    // Save final stats
    await Actor.setValue('STATS', {
        finishedAt: new Date().toISOString(),
        totalPages: (await Actor.getValue('DEFAULT')).itemCount,
        status: 'SUCCEEDED'
    });

} catch (error) {
    log.error('Scraper failed', {
        error: error.message,
        stack: error.stack
    });
    throw error;

} finally {
    await Actor.exit();
}
