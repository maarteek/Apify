FROM apify/actor-node:20

# Copy package files
COPY package.json ./

# Install dependencies including optional ones
RUN npm install --quiet

# Copy source code
COPY . ./

# Set the entry point
CMD [ "npm", "start" ]