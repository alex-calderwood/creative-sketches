FROM node:18-slim

WORKDIR /app

# Install Python and pip (for wordhoard/nlp etc)
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY editors/package.json editors/package-lock.json ./

# Install dependencies
RUN npm install

COPY editors/words/requirements.txt ./words/requirements.txt
COPY text/word_cache/requirements.txt ./word_cache/requirements.txt
RUN pip3 install --break-system-packages -r words/requirements.txt -r word_cache/requirements.txt

# Copy server script
COPY editors/index.html ./
COPY editors/server.js ./

# Copy the editors directory
COPY editors/editors/ ./editors/
COPY editors/assets/ ./assets/
COPY editors/words/ ./words/
COPY editors/drifts/ ./drifts/
COPY editors/vault/ ./vault/
COPY text/word_cache/ ./word_cache/
COPY text/synonym_cache.db ./synonym_cache.db

# Debug - list what's in the container
RUN ls -la
RUN ls -la editors/

# Only expose 3008
# We proxy some other ports using server.py
# and the actual servers are run from the config in package.json
# i.e. 3019 3020 
EXPOSE 3008

ENV WORD_CACHE_DB=/app/synonym_cache.db
CMD ["npx", "concurrently", "python3 words/synonyms_online.py", "python3 word_cache/word_cache.py", "node server.js"]
# CMD ["npm", "run", "servers"]