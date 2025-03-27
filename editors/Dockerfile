FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy server configuration
COPY server.js projects.json ./

# Define directories to copy (one per line for better readability)
ENV PROJECT_DIRS="corrEct"
                #   other-project \
                #   another-dir"

# Copy all directories in the list using a shell loop
COPY . /tmp/
RUN for dir in $PROJECT_DIRS; do \
      if [ -d "/tmp/$dir" ]; then \
        echo "Copying $dir directory"; \
        cp -r "/tmp/$dir" ./; \
      else \
        echo "Warning: Directory $dir not found"; \
      fi \
    done && \
    rm -rf /tmp/*

# Debug - list what's in the container
RUN ls -la
RUN ls -la corrEct || echo "corrEct directory not found"

EXPOSE 3000

CMD ["node", "server.js"]