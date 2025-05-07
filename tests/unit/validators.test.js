const { validateAndClean } = require('../../src/validators');
const { ScraperError } = require('../../src/utils/errors');

describe('Validators', () => {
    let validPropertyData;

    beforeEach(() => {
        validPropertyData = {
            basicInfo: {
                id: '12345',
                price: '£250,000',
                title: '3 Bedroom House',
                propertyType: 'Semi-Detached'
            },
            location: {
                postcode: 'SW1A 1AA',
                address: '10 Downing Street'
            },
            features: {
                bedrooms: '3',
                bathrooms: '2',
                receptionRooms: '1'
            }
        };
    });

    describe('validateAndClean', () => {
        it('should validate and clean valid property data', async () => {
            const result = await validateAndClean(validPropertyData);
            
            expect(result.basicInfo.price).toBe(250000);
            expect(result.features.bedrooms).toBe(3);
            expect(result.metadata).toBeDefined();
            expect(result.metadata.version).toBe('1.0.0');
        });

        it('should throw error for missing required fields', async () => {
            delete validPropertyData.basicInfo.id;

            await expect(validateAndClean(validPropertyData))
                .rejects
                .toThrow(ScraperError);
        });

        it('should handle invalid numeric values', async () => {
            validPropertyData.features.bedrooms = 'invalid';
            const result = await validateAndClean(validPropertyData);
            
            expect(result.features.bedrooms).toBeNull();
        });

        it('should add metadata to cleaned data', async () => {
            const result = await validateAndClean(validPropertyData);
            
            expect(result.metadata).toHaveProperty('scrapedAt');
            expect(result.metadata).toHaveProperty('version');
        });
    });
});