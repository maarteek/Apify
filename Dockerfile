FROM apify/actor-node:16

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --include=dev

# Copy source code
COPY . ./

# Run tests on build
CMD [ "npm", "test" ]