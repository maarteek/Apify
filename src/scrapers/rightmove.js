const { ScraperError } = require('../utils/errors');
const performanceMonitor = require('../utils/monitoring');

async function scrapePage(page) {
    const scrapeStart = performanceMonitor.startOperation('propertyDetails');
    try {
        // Enhanced page optimization
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Wait for critical elements with timeout
        await Promise.race([
            page.waitForSelector('[data-testid="property-details"]'),
            new Promise((_, reject) => {
                setTimeout(
                    () => reject(new Error('Timeout waiting for property details')),
                    30000,
                );
            }),
        ]);

        const propertyData = await page.evaluate(() => {
            const getData = (selector, attribute = 'textContent') => {
                const element = document.querySelector(selector);
                return element ? element[attribute].trim() : null;
            };

            const getMultipleData = (selector) => {
                return Array.from(document.querySelectorAll(selector))
                    .map((el) => el.textContent.trim())
                    .filter(Boolean);
            };

            return {
                basicInfo: {
                    id: getData('[data-testid="property-id"]'),
                    price: getData('.property-header-price'),
                    title: getData('h1'),
                    propertyType: getData('[data-testid="property-type"]'),
                    addedOn: getData('[data-testid="added-on-date"]'),
                    tenure: getData('[data-testid="tenure-type"]'),
                    councilTax: getData('[data-testid="council-tax-band"]'),
                },
                location: {
                    postcode: getData('[data-testid="postcode"]'),
                    address: getData('[data-testid="address"]'),
                    latitude: getData('#propertyMap', 'dataset')?.latitude,
                    longitude: getData('#propertyMap', 'dataset')?.longitude,
                    nearestStations: getMultipleData('[data-testid="nearest-stations"] li'),
                    schoolsNearby: getMultipleData('[data-testid="nearby-schools"] li'),
                },
                features: {
                    bedrooms: parseInt(getData('[data-testid="beds"]'), 10) || null,
                    bathrooms: parseInt(getData('[data-testid="baths"]'), 10) || null,
                    receptionRooms: parseInt(getData('[data-testid="receptions"]'), 10) || null,
                    keyFeatures: getMultipleData('[data-testid="key-features"] li'),
                    propertyFeatures: getMultipleData('[data-testid="property-features"] li'),
                },
                media: {
                    images: Array.from(document.querySelectorAll('[data-testid="gallery-image"]'))
                        .map((img) => ({
                            url: img.src,
                            caption: img.alt,
                        })),
                    floorplans: Array.from(document.querySelectorAll('[data-testid="floorplan-image"]'))
                        .map((img) => img.src),
                    virtualTour: getData('[data-testid="virtual-tour"]', 'href'),
                    videoTour: getData('[data-testid="video-tour"]', 'href'),
                },
                description: getData('[data-testid="property-description"]'),
                agent: {
                    name: getData('[data-testid="agent-name"]'),
                    phone: getData('[data-testid="agent-phone"]'),
                    email: getData('[data-testid="agent-email"]'),
                    branchName: getData('[data-testid="branch-name"]'),
                    branchAddress: getData('[data-testid="branch-address"]'),
                },
                pricing: {
                    currentPrice: parseFloat(getData('[data-testid="current-price"]')?.replace(/[£,]/g, '')) || null,
                    priceHistory: Array.from(document.querySelectorAll('[data-testid="price-history"] tr'))
                        .map((row) => ({
                            date: row.querySelector('td:first-child')?.textContent.trim(),
                            price: parseFloat(
                                row.querySelector('td:last-child')?.textContent.replace(/[£,]/g, ''),
                            ) || null,
                        })),
                },
                epcRating: {
                    current: getData('[data-testid="epc-rating-current"]'),
                    potential: getData('[data-testid="epc-rating-potential"]'),
                },
            };
        });

        // Validate critical data
        if (!propertyData.basicInfo.id || !propertyData.basicInfo.price) {
            throw new ScraperError(
                'Missing critical property data',
                'VALIDATION_ERROR',
                { url: page.url() },
            );
        }

        performanceMonitor.endOperation('propertyDetails', scrapeStart);
        return propertyData;
    } catch (error) {
        performanceMonitor.endOperation('propertyDetails', scrapeStart, error);
        throw new ScraperError(
            `Failed to scrape property page: ${error.message}`,
            'SCRAPE_ERROR',
            {
                url: page.url(),
                timestamp: new Date().toISOString(),
                errorDetails: error.stack,
            },
        );
    }
}

async function validateProperty(propertyData) {
    const validationStart = performanceMonitor.startOperation('validation');
    try {
        // Add validation logic here
        const requiredFields = ['id', 'price', 'title', 'propertyType'];
        const missingFields = requiredFields.filter((field) => !propertyData.basicInfo[field]);

        if (missingFields.length > 0) {
            throw new ScraperError(
                'Missing required fields',
                'VALIDATION_ERROR',
                { missingFields },
            );
        }

        performanceMonitor.endOperation('validation', validationStart);
        return true;
    } catch (error) {
        performanceMonitor.endOperation('validation', validationStart, error);
        throw error;
    }
}

module.exports = {
    scrapePage,
    validateProperty,
};
