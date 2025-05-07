const Apify = require('apify');

class WebhookManager {
    constructor() {
        this.webhooks = [];
        this.retryCount = 3;
        this.retryDelay = 1000; // 1 second
    }

    async initialize() {
        const input = await Apify.getInput();
        if (input.webhooks) {
            this.webhooks = input.webhooks;
            console.log(`Initialized ${this.webhooks.length} webhooks`);
        }
    }

    async sendWebhook(event, payload, attempt = 1) {
        const relevantWebhooks = this.webhooks.filter(
            webhook => webhook.eventTypes.includes(event)
        );

        for (const webhook of relevantWebhooks) {
            try {
                await Apify.utils.requestAsBrowser({
                    url: webhook.url,
                    method: 'POST',
                    payload: {
                        event,
                        payload,
                        timestamp: new Date().toISOString(),
                        actorId: process.env.APIFY_ACTOR_ID,
                        runId: process.env.APIFY_ACTOR_RUN_ID,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Event': event,
                        'X-Run-Id': process.env.APIFY_ACTOR_RUN_ID
                    },
                    timeoutSecs: 30,
                });
            } catch (error) {
                console.error(`Webhook delivery failed (attempt ${attempt}):`, error.message);
                if (attempt < this.retryCount) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                    await this.sendWebhook(event, payload, attempt + 1);
                } else {
                    await Apify.pushData({
                        '#webhook-failure': {
                            event,
                            url: webhook.url,
                            error: error.message,
                            attempts: attempt
                        }
                    });
                }
            }
        }
    }
}

module.exports = new WebhookManager();