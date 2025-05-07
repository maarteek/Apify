const { Actor } = require('apify');

Actor.main(async () => {
    const { log } = Actor.utils;
    
    try {
        log.info('Testing actor build', {
            timestamp: '2025-05-07 11:42:52',
            user: 'maarteek'
        });

        // Test actor environment
        const input = await Actor.getInput() || {};
        log.info('Actor environment test', {
            actorId: process.env.APIFY_ACTOR_ID,
            runId: process.env.APIFY_ACTOR_RUN_ID,
            taskId: process.env.APIFY_TASK_ID
        });

        // Test storage
        const keyValueStore = await Actor.openKeyValueStore();
        await keyValueStore.setValue('TEST_BUILD', {
            success: true,
            timestamp: '2025-05-07 11:42:52'
        });

        log.info('Build test complete');
        
    } catch (error) {
        log.error('Build test failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
});