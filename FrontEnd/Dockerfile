# syntax = docker/dockerfile:1.4
FROM node:20-alpine
WORKDIR /app

# Install dependencies first to maximize Docker layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy app source
COPY server.js ./
COPY public ./public
COPY src ./src

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["npm", "start"]