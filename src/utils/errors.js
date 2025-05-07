class ScraperError extends Error {
    constructor(message, type = 'SCRAPER_ERROR', data = {}) {
        super(message);
        this.name = 'ScraperError';
        this.type = type;
        this.data = {
            ...data,
            timestamp: new Date().toISOString()
        };
    }
}

const handleError = async (error, request) => {
    console.error('Error occurred while processing request:', {
        url: request.url,
        errorMessage: error.message,
        errorType: error.type || error.name,
        errorData: error.data || {},
        timestamp: new Date().toISOString()
    });

    await Apify.pushData({
        '#debug': {
            url: request.url,
            errorMessage: error.message,
            errorType: error.type || error.name,
            errorData: error.data || {},
            timestamp: new Date().toISOString()
        },
    });
};

module.exports = {
    ScraperError,
    handleError,
};