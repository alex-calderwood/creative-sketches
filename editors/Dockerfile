FROM node:18-slim

WORKDIR /app

# Install Python and pip (for wordhoard/nlp etc)
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

COPY words/requirements.txt ./words/requirements.txt
RUN pip3 install --break-system-packages -r words/requirements.txt

# Copy server script
COPY index.html ./
COPY server.js ./

# Copy the editors directory
COPY editors/ ./editors/
COPY assets/ ./assets/
COPY words/ ./words/
COPY drifts/ ./drifts/
COPY vault/ ./vault/

# Debug - list what's in the container
RUN ls -la
RUN ls -la editors/

EXPOSE 3008

CMD ["npx", "concurrently", "python3 words/synonyms.py", "node server.js"]