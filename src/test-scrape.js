const { Actor, log } = require('apify');
const { PuppeteerCrawler, RequestList } = require('crawlee');

Actor.main(async () => {
    log.info('Starting test scrape', {
        timestamp: '2025-05-07 11:26:02',
        user: 'maarteek'
    });

    try {
        // Test input
        const input = {
            startUrls: ['https://example.com'], // Using example.com for testing
            maxItems: 1,
            timeZone: 'UTC'
        };

        await Actor.setValue('INPUT', input);
        log.info('Input set successfully', input);

        // Initialize storage
        const keyValueStore = await Actor.openKeyValueStore();
        const dataset = await Actor.openDataset();

        // Create request list
        const requestList = await RequestList.open(null, input.startUrls);
        
        // Test crawler initialization
        const crawler = new PuppeteerCrawler({
            requestList,
            maxRequestsPerCrawl: 1,
            requestHandler: async ({ page, request }) => {
                log.info('Test page loaded', {
                    url: request.url,
                    title: await page.title(),
                    timestamp: '2025-05-07 11:26:02'
                });
                
                // Test data storage
                await dataset.pushData({
                    url: request.url,
                    title: await page.title(),
                    timestamp: '2025-05-07 11:26:02'
                });
            },
        });

        log.info('Crawler initialized successfully');

        // Run the crawler
        await crawler.run();

        // Test dataset
        await dataset.pushData({
            testData: true,
            timestamp: '2025-05-07 11:26:02'
        });

        log.info('Dataset write successful');
        
        // Test key-value store
        await keyValueStore.setValue('TEST_RESULT', {
            success: true,
            timestamp: '2025-05-07 11:26:02',
            user: 'maarteek'
        });

        log.info('All components tested successfully');

    } catch (error) {
        log.error('Test scrape failed', {
            error: error.message,
            stack: error.stack,
            timestamp: '2025-05-07 11:26:02'
        });
        throw error;
    }
});