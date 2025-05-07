const { scrapePage, validateProperty } = require('../../src/scrapers/rightmove');
const { ScraperError } = require('../../src/utils/errors');

describe('Rightmove Scraper Integration', () => {
    let mockPage;

    beforeEach(() => {
        mockPage = {
            setRequestInterception: jest.fn(),
            waitForSelector: jest.fn(),
            on: jest.fn(),
            evaluate: jest.fn(),
            url: jest.fn().mockReturnValue('https://www.rightmove.co.uk/properties/12345')
        };
    });

    describe('scrapePage', () => {
        it('should successfully scrape property details', async () => {
            mockPage.evaluate.mockResolvedValue({
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
                    bedrooms: 3
                }
            });

            const result = await scrapePage(mockPage);

            expect(result.basicInfo.id).toBe('12345');
            expect(mockPage.setRequestInterception).toHaveBeenCalled();
        });

        it('should handle missing critical data', async () => {
            mockPage.evaluate.mockResolvedValue({
                basicInfo: {
                    title: '3 Bedroom House',
                    propertyType: 'Semi-Detached'
                }
            });

            await expect(scrapePage(mockPage))
                .rejects
                .toThrow(ScraperError);
        });

        it('should handle page timeout', async () => {
            mockPage.waitForSelector.mockRejectedValue(
                new Error('Timeout waiting for property details')
            );

            await expect(scrapePage(mockPage))
                .rejects
                .toThrow(ScraperError);
        });
    });

    describe('validateProperty', () => {
        it('should validate complete property data', async () => {
            const validData = {
                basicInfo: {
                    id: '12345',
                    price: '£250,000',
                    title: '3 Bedroom House',
                    propertyType: 'Semi-Detached'
                }
            };

            const result = await validateProperty(validData);
            expect(result).toBe(true);
        });
    });
});