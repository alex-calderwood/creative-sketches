# Build

docker build -t editors .

# Run

docker run -d --name editors-container -p 3000:3000 --restart unless-stopped editors

- 3001 (first number) = The port on your host machine (your computer)
- 3001 (second number) = The port inside the Docker container
