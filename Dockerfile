FROM apify/actor-node-puppeteer-chrome:18

# Copy package.json and package-lock.json files
COPY package.json package-lock.json ./

# Install NPM packages
RUN npm install --include=dev

# Copy the rest of the application files
COPY . ./

# Set the user to avoid running as root
USER myuser
