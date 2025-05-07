const { ScraperError } = require('../utils/errors');
const performanceMonitor = require('../utils/monitoring');

async function validateAndClean(data) {
    const validationStart = performanceMonitor.startOperation('validation');
    try {
        // Validate required fields
        const requiredFields = {
            basicInfo: ['id', 'price', 'title', 'propertyType'],
            location: ['postcode', 'address'],
            features: ['bedrooms'],
        };

        for (const [section, fields] of Object.entries(requiredFields)) {
            const missingFields = fields.filter((field) => !data[section]?.[field]);
            if (missingFields.length > 0) {
                throw new ScraperError(
                    `Missing required fields in ${section}`,
                    'VALIDATION_ERROR',
                    { section, missingFields },
                );
            }
        }

        // Clean and normalize data
        const cleanData = {
            ...data,
            basicInfo: {
                ...data.basicInfo,
                price: parseFloat(data.basicInfo.price?.replace(/[£,]/g, '')) || null,
                id: String(data.basicInfo.id),
            },
            features: {
                ...data.features,
                bedrooms: parseInt(data.features.bedrooms, 10) || null,
                bathrooms: parseInt(data.features.bathrooms, 10) || null,
                receptionRooms: parseInt(data.features.receptionRooms, 10) || null,
            },
            metadata: {
                scrapedAt: new Date().toISOString(),
                version: '1.0.0',
            },
        };

        performanceMonitor.endOperation('validation', validationStart);
        return cleanData;
    } catch (error) {
        performanceMonitor.endOperation('validation', validationStart, error);
        throw error;
    }
}

module.exports = {
    validateAndClean,
};
