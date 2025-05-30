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
        maxConcurrency: 1, // Limit concurrent requests to avoid blocking
        navigationTimeoutSecs: 30, // 30 second timeout for navigation
        requestHandlerTimeoutSecs: 60, // 1 minute timeout for processing
        
        // Configure browser launcher
        launchContext: {
            launchOptions: {
                headless: true,
                args: [
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-javascript', // Since we only need static content
                    '--no-zygote',
                    '--single-process'
                ]
            }
        },
        
        async requestHandler({ page, request }) {
            log.info('Processing page', { url: request.url });
            
            // Set strict timeouts
            page.setDefaultNavigationTimeout(30000); // 30 seconds
            page.setDefaultTimeout(30000);
            
            // Block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const resourceType = req.resourceType();
                if (['image', 'stylesheet', 'font', 'script'].includes(resourceType)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // Set a realistic user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36');
            
            // Navigate with timeout
            try {
                await page.goto(request.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
            } catch (error) {
                throw new Error(`Navigation failed: ${error.message}`);
            }

            // Wait for the property cards with timeout
            try {
                await page.waitForSelector('.propertyCard-wrapper', { 
                    timeout: 10000,
                    visible: true 
                });
            } catch (error) {
                throw new Error('No property listings found on page');
            }

            // Extract data with timeout
            const properties = await Promise.race([
                page.$$eval('.propertyCard-wrapper', (cards) => {
                    return cards.map(card => ({
                        price: card.querySelector('.propertyCard-priceValue')?.textContent?.trim() || '',
                        address: card.querySelector('.propertyCard-address')?.textContent?.trim() || '',
                        description: card.querySelector('.propertyCard-description')?.textContent?.trim() || '',
                        url: card.querySelector('a.propertyCard-link')?.href || ''
                    }));
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Data extraction timed out')), 10000)
                )
            ]);

            if (!properties.length) {
                throw new Error('No properties found on page');
            }

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

        // Set a global timeout for the entire crawl
        const timeout = setTimeout(() => {
            log.error('Crawler exceeded maximum runtime of 3 minutes');
            process.exit(1);
        }, 180000); // 3 minutes

        await crawler.run(requests);
        clearTimeout(timeout);
        log.info('Scraper finished successfully');
    } catch (error) {
        log.error('Scraper failed', {
            error: error.message
        });
        throw error;
    }
});
