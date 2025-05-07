const rightmove = require('./rightmove');
const { ScraperError } = require('../utils/errors');
const performanceMonitor = require('../utils/monitoring');

class ScraperManager {
    constructor() {
        this.scrapers = {
            rightmove
        };
        this.retryDelays = [1000, 2000, 5000]; // Retry delays in milliseconds
    }

    async scrapePage(page, source = 'rightmove', retryCount = 0) {
        const scrapeStart = performanceMonitor.startOperation('scrape');
        try {
            if (!this.scrapers[source]) {
                throw new ScraperError(
                    `Unsupported source: ${source}`,
                    'CONFIGURATION_ERROR'
                );
            }

            await this.preprocessPage(page);
            const data = await this.scrapers[source].scrapePage(page);
            await this.scrapers[source].validateProperty(data);

            performanceMonitor.endOperation('scrape', scrapeStart);
            return data;
        } catch (error) {
            performanceMonitor.endOperation('scrape', scrapeStart, error);
            
            if (retryCount < this.retryDelays.length) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelays[retryCount]));
                return this.scrapePage(page, source, retryCount + 1);
            }
            
            throw error;
        }
    }

    async preprocessPage(page) {
        const prepStart = performanceMonitor.startOperation('preprocess');
        try {
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Optimize page loading
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            // Add custom error handling
            page.on('error', error => {
                throw new ScraperError('Page crashed', 'PAGE_CRASH', { error: error.message });
            });

            page.on('pageerror', error => {
                console.error('Page error:', error.message);
            });

            performanceMonitor.endOperation('preprocess', prepStart);
        } catch (error) {
            performanceMonitor.endOperation('preprocess', prepStart, error);
            throw new ScraperError(
                'Failed to preprocess page',
                'PREPROCESSING_ERROR',
                { error: error.message }
            );
        }
    }
}

module.exports = new ScraperManager();