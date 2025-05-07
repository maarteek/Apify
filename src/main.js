const Apify = require('apify');
const { scrapePage } = require('./scrapers/rightmove');
const { validateAndClean } = require('./validators');
const { handleError } = require('./utils/errors');
const performanceMonitor = require('./utils/monitoring');
const webhookManager = require('./utils/webhooks');

Apify.main(async () => {
    console.log('Starting Rightmove scraper...');
    await webhookManager.initialize();
    const input = await Apify.getInput();
    const { startUrls, maxItems } = input;

    const requestList = await Apify.openRequestList('start-urls', startUrls);
    const requestQueue = await Apify.openRequestQueue();
    const dataset = await Apify.openDataset();

    performanceMonitor.startRun();

    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        requestQueue,
        maxRequestsPerCrawl: maxItems,
        launchContext: {
            launchOptions: {
                args: [
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            }
        },
        handlePageFunction: async ({ request, page }) => {
            const scrapeStart = performanceMonitor.startOperation('scrape');
            try {
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                const data = await scrapePage(page);
                const cleanData = await validateAndClean(data);
                await dataset.pushData(cleanData);
                
                performanceMonitor.recordSuccess();
                performanceMonitor.endOperation('scrape', scrapeStart);
                
                await webhookManager.sendWebhook('ITEM_SCRAPED', {
                    url: request.url,
                    propertyId: data.basicInfo.id
                });
            } catch (error) {
                performanceMonitor.recordFailure();
                performanceMonitor.endOperation('scrape', scrapeStart, error);
                await handleError(error, request);
                await webhookManager.sendWebhook('ITEM_FAILED', {
                    url: request.url,
                    error: error.message
                });
            }
        },
        handleFailedRequestFunction: async ({ request, error }) => {
            performanceMonitor.recordFailure();
            await Apify.pushData({
                '#debug': {
                    url: request.url,
                    errors: request.errorMessages,
                    error: error.message
                }
            });
        },
    });

    try {
        await crawler.run();
        const metrics = await performanceMonitor.saveMetrics();
        await webhookManager.sendWebhook('RUN_FINISHED', {
            status: 'SUCCESS',
            metrics
        });
    } catch (error) {
        await webhookManager.sendWebhook('RUN_FINISHED', {
            status: 'FAILED',
            error: error.message
        });
        throw error;
    }
});