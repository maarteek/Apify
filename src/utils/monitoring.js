const Apify = require('apify');
const { performance } = require('perf_hooks');

class PerformanceMonitor {
    constructor() {
        this.reset();
    }

    reset() {
        this.metrics = {
            startTime: null,
            endTime: null,
            operations: {},
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
            },
            memory: [],
            errors: [],
        };
    }

    startRun() {
        this.reset();
        this.metrics.startTime = performance.now();
        this.startMemoryMonitoring();
    }

    startOperation(name) {
        if (!this.metrics.operations[name]) {
            this.metrics.operations[name] = {
                count: 0,
                totalTime: 0,
                failures: 0,
            };
        }
        return performance.now();
    }

    endOperation(name, startTime, error = null) {
        const duration = performance.now() - startTime;
        this.metrics.operations[name].count++;
        this.metrics.operations[name].totalTime += duration;

        if (error) {
            this.metrics.operations[name].failures++;
            this.metrics.errors.push({
                operation: name,
                timestamp: new Date().toISOString(),
                error: error.message,
            });
        }
    }

    startMemoryMonitoring() {
        this.memoryInterval = setInterval(() => {
            const used = process.memoryUsage();
            this.metrics.memory.push({
                timestamp: new Date().toISOString(),
                heapUsed: Math.round(used.heapUsed / 1024 / 1024),
                heapTotal: Math.round(used.heapTotal / 1024 / 1024),
                external: Math.round(used.external / 1024 / 1024),
            });
        }, 30000); // Every 30 seconds
    }

    recordSuccess() {
        this.metrics.requests.total++;
        this.metrics.requests.successful++;
    }

    recordFailure() {
        this.metrics.requests.total++;
        this.metrics.requests.failed++;
    }

    async saveMetrics() {
        clearInterval(this.memoryInterval);
        this.metrics.endTime = performance.now();

        const duration = this.metrics.endTime - this.metrics.startTime;
        const successRate = (this.metrics.requests.successful / this.metrics.requests.total) * 100;

        const finalMetrics = {
            timestamp: new Date().toISOString(),
            duration: Math.round(duration),
            successRate: Math.round(successRate * 100) / 100,
            requests: this.metrics.requests,
            operations: Object.entries(this.metrics.operations).map(([name, data]) => ({
                name,
                count: data.count,
                averageTime: Math.round(data.totalTime / data.count),
                failureRate: (data.failures / data.count) * 100,
            })),
            memory: {
                measurements: this.metrics.memory,
                peak: Math.max(...this.metrics.memory.map((m) => m.heapUsed)),
            },
            errors: this.metrics.errors,
        };

        await Apify.setValue('PERFORMANCE_METRICS', finalMetrics);
        return finalMetrics;
    }
}

module.exports = new PerformanceMonitor();
