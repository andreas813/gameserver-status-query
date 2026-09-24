FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY fetch-stats.js ./
CMD ["node", "fetch-stats.js"]