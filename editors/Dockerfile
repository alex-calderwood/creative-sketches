FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy server configuration
COPY server.js projects.json ./

# Copy project directories
COPY editor_basic/ ./editor_basic/
# Add other project directories as needed
# COPY other-project/ ./other-project/

# Debug - list what's in the container
RUN ls -la
RUN ls -la editor_basic

EXPOSE 3000

CMD ["node", "server.js"]
