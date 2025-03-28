FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy server configuration
COPY server.js projects.json ./

# directories to copy
ENV PROJECT_DIRS="corrEct delay dream-delay sounding"

# TODO move things into an 'public' folder and just copy that

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
th
# Debug - list what's in the container
RUN ls -la

EXPOSE 3000

CMD ["node", "server.js"]
