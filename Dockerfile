FROM node:22-alpine

WORKDIR /app

# Copy package files and local tgz dependency
COPY package.json yarn.lock *.tgz ./

# Skip puppeteer chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy all files
COPY . .

# Build the application
RUN yarn build

# Expose port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]

