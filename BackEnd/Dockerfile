# syntax = docker/dockerfile:1.4
FROM node:20-alpine
WORKDIR /app

# Install dependencies first to maximize Docker layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy app source (exclude via .dockerignore)
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]