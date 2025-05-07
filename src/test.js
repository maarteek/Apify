const { Actor } = require('apify');

async function testSetup() {
    console.log('Testing setup at:', new Date().toISOString());
    console.log('Node version:', process.version);
    console.log('Apify version:', require('apify/package.json').version);
    console.log('Puppeteer version:', require('puppeteer/package.json').version);
    
    try {
        // Initialize the actor
        await Actor.init();
        
        console.log('Actor initialized successfully');
        
        // Test storage
        const store = await Actor.openKeyValueStore();
        await store.setValue('test', { 
            works: true,
            timestamp: new Date().toISOString(),
            user: 'maarteek'
        });
        const value = await store.getValue('test');
        console.log('Storage test:', value);
        
        // Clean up
        await Actor.exit();
        
    } catch (error) {
        console.error('Setup test failed:', error);
        process.exit(1);
    }
}

testSetup()
    .then(() => console.log('Setup test complete'))
    .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });