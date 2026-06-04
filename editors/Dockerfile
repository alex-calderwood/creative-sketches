FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy server script
COPY index.html ./
COPY server.js ./

# Copy the editors directory
COPY editors/ ./editors/

# Copy the assets directory
COPY assets/ ./assets/

# Debug - list what's in the container
RUN ls -la
RUN ls -la editors/

EXPOSE 3008

CMD ["node", "server.js"]