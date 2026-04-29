FROM node:20-bookworm-slim

# Install FFmpeg for audio/video processing
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose HTTP (3000) and RTMP (1935) ports
EXPOSE 3000
EXPOSE 1935

# Start the custom Next.js + WebSocket + Node-Media-Server backend
CMD ["npm", "start"]
