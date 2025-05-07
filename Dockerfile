# Use the official Apify Node.js image
FROM apify/actor-node:18

# Copy package files
COPY package*.json ./

# Install dependencies and clean npm cache
RUN npm install --quiet --only=prod \
    && npm cache clean --force

# Copy source code
COPY . ./

# Set up environment
ENV NODE_ENV=production \
    APIFY_DISABLE_OUTDATED_WARNING=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:8000/health || exit 1

# Run actor
CMD ["npm", "start"]