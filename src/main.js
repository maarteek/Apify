const { Actor } = require('apify');
const { PuppeteerCrawler, RequestList } = require('crawlee');

Actor.main(async () => {
    const { log } = Actor.utils;

    log.info('Starting Rightmove scraper', {
        timestamp: new Date().toISOString(),
        user: 'maarteek'
    });

    try {
        // Get input
        const input = await Actor.getInput() || {
            startUrls: ['https://www.rightmove.co.uk/property-for-sale/find.html'],
            maxItems: 10,
            searchArea: '',
            propertyType: 'All',
            maxPrice: '',
            minPrice: ''
        };

        log.info('Actor input', input);

        // Initialize storage
        const dataset = await Actor.openDataset();
        const keyValueStore = await Actor.openKeyValueStore();

        // Create request list
        const requestList = await RequestList.open(null, input.startUrls);

        // Configure crawler
        const crawler = new PuppeteerCrawler({
            requestList,
            maxRequestsPerCrawl: input.maxItems,
            requestHandler: async ({ page, request }) => {
                log.info('Processing', {
                    url: request.url,
                    timestamp: new Date().toISOString()
                });

                // Wait for essential elements
                await page.waitForSelector('.propertyCard-wrapper');

                // Extract property data
                const properties = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('.propertyCard-wrapper')).map(card => ({
                        id: card.getAttribute('data-test') || '',
                        price: card.querySelector('.propertyCard-priceValue')?.textContent?.trim() || '',
                        address: card.querySelector('.propertyCard-address')?.textContent?.trim() || '',
                        description: card.querySelector('.propertyCard-description')?.textContent?.trim() || '',
                        bedrooms: card.querySelector('.property-information-icons span')?.textContent?.trim() || '',
                        url: card.querySelector('a.propertyCard-link')?.href || '',
                        addedOn: card.querySelector('.propertyCard-branchSummary-addedOrReduced')?.textContent?.trim() || '',
                        agent: card.querySelector('.propertyCard-branchLogo img')?.alt || ''
                    }));
                });

                // Save the results
                await dataset.pushData(properties.map(property => ({
                    ...property,
                    scrapedAt: new Date().toISOString(),
                    searchParams: input
                })));

                log.info(`Extracted ${properties.length} properties from ${request.url}`);
            },
            handleFailedRequestFunction: async ({ request, error }) => {
                log.error('Request failed', {
                    url: request.url,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            },
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
            }
        });

        log.info('Starting the crawl...');
        await crawler.run();
        
        log.info('Crawl finished');

        // Save final stats
        await keyValueStore.setValue('STATS', {
            finishedAt: new Date().toISOString(),
            totalPages: await dataset.getInfo().then(info => info.itemCount),
            status: 'SUCCEEDED'
        });

    } catch (error) {
        log.error('Scraper failed', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
});