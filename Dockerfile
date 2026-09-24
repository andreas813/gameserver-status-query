FROM node:20-alpine

# Erstellt das Verzeichnis und gibt dem unprivilegierten "node"-User die Rechte
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app

# Wechselt vom Root-User auf den sicheren "node"-User
USER node

# Kopiert Dateien und übergibt die Besitzrechte direkt an "node"
COPY --chown=node:node package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node fetch-stats.js ./

CMD ["node", "fetch-stats.js"]