FROM node:20-alpine AS base

# Install system dependencies (ffmpeg required by fluent-ffmpeg)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Install dependencies first for better caching
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]


