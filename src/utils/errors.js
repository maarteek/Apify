const Apify = require('apify');

const { log } = Apify.utils;

class ScraperError extends Error {
    constructor(message, type = 'SCRAPER_ERROR', data = {}) {
        super(message);
        this.name = 'ScraperError';
        this.type = type;
        this.data = {
            ...data,
            timestamp: new Date().toISOString(),
        };
    }
}

const handleError = async (error, request) => {
    const errorData = {
        url: request.url,
        errorMessage: error.message,
        errorType: error.type || error.name,
        errorData: error.data || {},
        timestamp: new Date().toISOString(),
    };

    // Replace console.error with log.error
    log.error('Error occurred while processing request:', errorData);

    await Apify.pushData({
        '#debug': errorData,
    });
};

module.exports = {
    ScraperError,
    handleError,
};
