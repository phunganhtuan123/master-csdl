FROM node:22-alpine
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY api/src ./src
COPY db ../db
EXPOSE 4000
CMD ["npm", "start"]
