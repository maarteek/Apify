FROM apify/actor-node-puppeteer-chrome:18

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --include=dev

# Copy source code
COPY . ./
