FROM apify/actor-node:20
WORKDIR /usr/src/app

# First, copy just package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --quiet

# Then copy the rest of your actor's source code
COPY . ./

# Run the actor
CMD [ "npm", "start" ]
